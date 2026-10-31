const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, spawnSync, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const express = require('express');
const mongoose = require('mongoose');
const pug = require('pug');
const Crossword = require('../models/crosswords');
const GameGroup = require('../models/gamegroup');
const PlaySession = require('../models/playsession');
const GameState = require('../models/gamestate');
const PuzzleUploadBatch = require('../models/puzzleuploadbatch');
const groups = require('../services/game-groups');
const { importPuzzle } = require('../services/puzzle-import');
const { resumePendingPuzzleUploadBatches } = require('../services/puzzle-upload-queue');
const { translate: t, clientMessages } = require('../services/i18n');
const upload = require('../config/uploadconfig');

const run = promisify(execFile);
const mongod = process.env.MONGOD_BINARY || 'mongod';
const hasMongo = spawnSync(mongod, ['--version'], { stdio: 'ignore' }).status === 0;

function render(data) {
  return pug.renderFile(path.join(__dirname, '../views/pages/puzzles.pug'), {
    data: { group: { name: 'Taldea', description: '' }, breadcrumbs: [], children: [], puzzles: [], statusMap: {}, ...data },
    t, user: null, puzzleListStyle: 'compact'
  });
}

test('only populated public sections render, for every combination of text, links and games', () => {
  for (let mask = 0; mask < 8; mask++) {
    const html = render({
      group: { name: 'Taldea', description: mask & 1 ? 'Lehen lerroa\nBigarrena <script>alert(1)</script>' : '  \n ' },
      children: mask & 2 ? [{ name: 'Azpitaldea', url: '/jokoak/taldeak/example' }] : [],
      puzzles: mask & 4 ? [{ _id: 'test', name: 'Jokoa', width: 2, height: 2 }] : []
    });
    assert.equal(html.includes('class="group-description"'), Boolean(mask & 1));
    assert.equal(html.includes('class="group-links"'), Boolean(mask & 2));
    assert.equal(html.includes('class="catalog-games"'), Boolean(mask & 4));
    assert.equal(html.includes('catalog-controls'), Boolean(mask & 4));
    assert.equal(html.includes('empty-state'), false);
    assert.equal(html.includes('<script>'), false);
  }
});

test('group tree keeps Guztiak last and preserves nested paths without mutating input', () => {
  const data = [
    { _id: 'root', name: 'Jokoak', systemKey: 'root', parentId: null, sortOrder: 0 },
    { _id: 'all', name: 'Guztiak', systemKey: 'all', parentId: 'root', sortOrder: 0 },
    { _id: 'a', name: 'A', parentId: 'root', sortOrder: 20 },
    { _id: 'b', name: 'B', parentId: 'root', sortOrder: 10 },
    { _id: 'child', name: 'Haurra', parentId: 'b', sortOrder: 0 }
  ];
  assert.deepEqual(groups.flattenGroups(data).map(group => group._id), ['root', 'b', 'child', 'a', 'all']);
  assert.equal(groups.flattenGroups(data)[2].path, 'Jokoak / B / Haurra');
  assert.equal(data[1]._id, 'all');
  assert.throws(() => groups.parseGroupIds(['bad']), groups.GroupError);
  assert.throws(() => groups.parseGroupIds([{ $ne: null }]), groups.GroupError);
});

async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

const ipuz = title => JSON.stringify({
  kind: ['http://ipuz.org/crossword#1'], title,
  dimensions: { width: 2, height: 2 }, puzzle: [[1, 2], [3, 0]],
  solution: [['A', 'B'], ['C', 'D']],
  clues: { Across: [[1, 'AB'], [3, 'CD']], Down: [[1, 'AC'], [2, 'BD']] }
});

test('persistent group management and public pages with an isolated MongoDB', {
  skip: !hasMongo && 'Install mongod or set MONGOD_BINARY to run database integration tests', timeout: 60000
}, async suite => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'hitz-groups-'));
  const port = await freePort();
  const uri = `mongodb://127.0.0.1:${port}/game_groups_test`;
  let server;
  let mongo;
  const uploadedFiles = new Set();
  suite.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect();
    if (mongo && mongo.exitCode === null) {
      const stopped = new Promise(resolve => mongo.once('exit', resolve));
      mongo.kill('SIGTERM');
      await stopped;
    }
    for (const filename of uploadedFiles) await fs.rm(filename, { force: true });
    await fs.rm(directory, { recursive: true, force: true });
  });
  mongo = spawn(mongod, ['--bind_ip', '127.0.0.1', '--port', String(port), '--dbpath', directory, '--nounixsocket', '--quiet'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    let logs = '';
    const timer = setTimeout(() => reject(new Error(`MongoDB startup timed out: ${logs}`)), 15000);
    mongo.once('error', reject);
    mongo.once('exit', code => { clearTimeout(timer); reject(new Error(`MongoDB exited ${code}: ${logs}`)); });
    mongo.stdout.on('data', chunk => {
      logs = (logs + chunk).slice(-6000);
      if (logs.includes('Waiting for connections')) { clearTimeout(timer); resolve(); }
    });
    mongo.stderr.on('data', chunk => { logs = (logs + chunk).slice(-6000); });
  });
  await mongoose.connect(uri);
  // Insert raw legacy data without the new field, as an existing deployment would have it.
  const legacyId = new mongoose.Types.ObjectId();
  await Crossword.collection.insertOne({ _id: legacyId, name: 'Legacy game', width: 2, height: 2 });
  await groups.ensureGameGroups();
  const initial = await groups.listGroups();
  const root = initial.find(group => group.systemKey === 'root');
  const all = initial.find(group => group.systemKey === 'all');
  const userId = new mongoose.Types.ObjectId();
  const app = express();
  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'pug');
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/vendor/bootstrap/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));
  app.use(express.json());
  app.use((req, res, next) => {
    const role = req.get('x-test-role');
    req.user = role ? { _id: userId, username: 'Tester', master: role === 'master' } : null;
    req.isAuthenticated = () => Boolean(req.user);
    req.flash = () => [];
    req.session = {};
    Object.assign(res.locals, { user: req.user, t, clientMessages: clientMessages(), flash: {} });
    next();
  });
  app.use('/jokoak', require('../routes/puzzles'));
  app.use('/master/groups', require('../routes/groups'));
  server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = (url, method = 'GET', body, role = 'master') => fetch(baseUrl + url, {
    method, headers: { 'Content-Type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  async function create(name, parentId = root._id, sortOrder = 0, description = '') {
    const response = await request('/master/groups', 'POST', { name, parentId, sortOrder, description });
    assert.equal(response.status, 201, await response.clone().text());
    return (await response.json()).group;
  }
  const fields = (group, changes) => ({ name: group.name, description: group.description, parentId: group.parentId, sortOrder: group.sortOrder, ...changes });
  let a, b, c, child, puzzle;

  await suite.test('migration keeps legacy games in Guztiak without root memberships, and management stays protected', async () => {
    assert.deepEqual((await Crossword.findById(legacyId)).groupIds.map(String), []);
    for (const role of [null, 'user']) {
      for (const [url, method, body] of [
        ['/master/groups', 'GET'], ['/master/groups', 'POST', {}],
        [`/master/groups/${root._id}`, 'PATCH', {}], [`/master/groups/${root._id}`, 'DELETE'],
        ['/master/groups/memberships', 'POST', {}]
      ]) assert.equal((await request(url, method, body, role)).status, 403);
    }
  });

  await suite.test('nested pages, descriptions, sibling order and stable links', async () => {
    a = await create('A', root._id, 20, 'Azalpena\nBeste paragrafoa <b>Testua</b>');
    b = await create('B', root._id, 10);
    c = await create('C', root._id, 30);
    child = await create('Child', a._id);
    const html = await (await request('/jokoak', 'GET', undefined, null)).text();
    assert.ok(html.indexOf(`href="${b.url}"`) < html.indexOf(`href="${a.url}"`));
    assert.ok(html.indexOf(`href="${c.url}"`) < html.indexOf(`href="${all.url}"`));
    const childHtml = await (await request(a.url, 'GET', undefined, null)).text();
    assert.ok(childHtml.includes('Azalpena\nBeste paragrafoa &lt;b&gt;Testua&lt;/b&gt;'));
    assert.ok(childHtml.includes(`href="${child.url}"`));
    assert.equal(childHtml.includes('catalog-controls'), false);
    assert.equal((await request('/jokoak/taldeak/not-an-id', 'GET', undefined, null)).status, 404);
    assert.equal((await request(`/jokoak/taldeak/${new mongoose.Types.ObjectId()}`, 'GET', undefined, null)).status, 404);
    const moved = await request(`/master/groups/${child._id}`, 'PATCH', fields(child, { name: 'Renamed', parentId: b._id }));
    assert.equal(moved.status, 200);
    assert.equal((await moved.json()).group.url, child.url);
    const renamedHtml = await (await request(child.url, 'GET', undefined, null)).text();
    assert.ok(renamedHtml.includes('Renamed'));
    assert.ok(renamedHtml.includes(`href="${b.url}"`));
  });

  await suite.test('cycles, protected groups, invalid fields and nonempty deletion are rejected', async () => {
    assert.equal((await request(`/master/groups/${b._id}`, 'PATCH', fields(b, { parentId: child._id }))).status, 400);
    assert.equal((await request(`/master/groups/${b._id.toUpperCase()}`, 'PATCH', fields(b, { parentId: b._id }))).status, 400);
    assert.equal((await request(`/master/groups/${root._id}`, 'PATCH', fields(root, { name: 'Other' }))).status, 400);
    assert.equal((await request(`/master/groups/${all._id}`, 'PATCH', fields(all, { sortOrder: 1 }))).status, 400);
    assert.equal((await request(`/master/groups/${all._id}`, 'DELETE')).status, 400);
    assert.equal((await request(`/master/groups/${root._id}`, 'DELETE')).status, 400);
    assert.equal((await request(`/master/groups/${b._id}`, 'DELETE')).status, 409);
    assert.equal((await request('/master/groups', 'POST', { name: 'Bad', parentId: all._id, description: '', sortOrder: 0 })).status, 400);
    assert.equal((await request('/master/groups', 'POST', { name: 'Bad', parentId: root._id, description: '', sortOrder: -1 })).status, 400);
    assert.equal((await request(`/master/groups/${all._id}`, 'PATCH', fields(all, { description: 'Denak hemen' }))).status, 200);
  });

  await suite.test('Jokoak is a landing page; assignment and uploads reject it, and migration removes old root memberships', async () => {
    const legacyRootGame = await Crossword.create({ name: 'Former root game', width: 2, height: 2, groupIds: [root._id, c._id] });
    const legacyBatch = await PuzzleUploadBatch.create({ ownerId: userId, groupIds: [root._id, c._id], files: [] });
    const rootHtml = await (await request('/jokoak', 'GET', undefined, null)).text();
    assert.equal(rootHtml.includes('catalog-games'), false);
    assert.equal(rootHtml.includes('Former root game'), false);
    assert.ok(rootHtml.includes(`href="${all.url}"`));
    for (const payload of [
      { action: 'add', targetId: root._id },
      { action: 'move', sourceId: c._id, targetId: root._id },
      { action: 'remove', sourceId: root._id }
    ]) assert.equal((await request('/master/groups/memberships', 'POST', {
      ...payload, puzzleIds: [String(legacyRootGame._id)]
    })).status, 400);
    const uploadHtml = await (await request('/jokoak/upload')).text();
    assert.equal(uploadHtml.includes(`<option value="${root._id}">`), false);
    assert.equal(uploadHtml.includes(`<option value="${all._id}">`), false);
    const form = new FormData();
    form.append('filename', new Blob([ipuz('Blocked root upload')]), 'blocked.ipuz');
    form.append('groupIds', root._id);
    const rejected = await fetch(baseUrl + '/jokoak/upload/batches', { method: 'POST', headers: { 'x-test-role': 'master' }, body: form });
    assert.equal(rejected.status, 400);
    assert.equal(await Crossword.countDocuments({ name: 'Blocked root upload' }), 0);
    const blockedPath = path.join(directory, 'blocked-root.ipuz');
    await fs.writeFile(blockedPath, ipuz('Blocked root import'));
    await assert.rejects(importPuzzle({ path: blockedPath, originalname: 'blocked-root.ipuz' }, { groupIds: [root._id] }), groups.GroupError);
    await assert.rejects(fs.stat(blockedPath), { code: 'ENOENT' });
    await run(process.execPath, [path.join(__dirname, '../scripts/migrate-game-groups.js')], { env: { ...process.env, DB_CONNECTION: uri } });
    assert.deepEqual((await Crossword.findById(legacyRootGame._id)).groupIds.map(String), [c._id]);
    assert.deepEqual((await PuzzleUploadBatch.findById(legacyBatch._id)).groupIds.map(String), [c._id]);
    assert.equal(await Crossword.countDocuments({ groupIds: root._id }), 0);
    const allHtml = await (await request('/jokoak/guztiak', 'GET', undefined, null)).text();
    assert.ok(allHtml.includes('Former root game'));
    assert.ok(allHtml.includes('Legacy game'));
  });

  await suite.test('add, move and remove preserve other memberships and existing progress', async () => {
    puzzle = await Crossword.create({ name: 'Multi group', width: 2, height: 2, groupIds: [a._id, c._id] });
    const session = await PlaySession.create({ userId: String(userId), puzzleId: String(puzzle._id), elapsedSeconds: 42 });
    await GameState.create({ playerId: String(userId), puzzleId: String(puzzle._id), elapsedSeconds: 42 });
    const membership = async (action, sourceId, targetId, expected = 200) => {
      const response = await request('/master/groups/memberships', 'POST', { action, sourceId, targetId, puzzleIds: [String(puzzle._id)] });
      assert.equal(response.status, expected, await response.clone().text());
      if (expected === 200) {
        const result = await response.json();
        assert.deepEqual(result.puzzles, [{
          _id: String(puzzle._id), groupIds: (await Crossword.findById(puzzle._id)).groupIds.map(String)
        }]);
      }
    };
    await membership('move', a._id, b._id);
    assert.deepEqual((await Crossword.findById(puzzle._id)).groupIds.map(String).sort(), [b._id, c._id].sort());
    await membership('add', null, b._id);
    assert.equal((await Crossword.findById(puzzle._id)).groupIds.length, 2);
    await membership('remove', b._id);
    await membership('remove', c._id);
    assert.deepEqual((await Crossword.findById(puzzle._id)).groupIds.map(String), []);
    await membership('add', null, all._id, 400);
    await membership('add', null, root._id, 400);
    await membership('move', a._id, b._id, 400);
    assert.equal((await PlaySession.findById(session._id)).elapsedSeconds, 42);
    assert.equal((await GameState.findOne({ puzzleId: String(puzzle._id) })).elapsedSeconds, 42);
    const allHtml = await (await request('/jokoak/guztiak', 'GET', undefined, null)).text();
    assert.ok(allHtml.includes('Multi group'));
    assert.ok(allHtml.includes('Denak hemen'));
    const trailingSlashHtml = await (await request('/jokoak/guztiak/', 'GET', undefined, null)).text();
    assert.ok(trailingSlashHtml.includes('Multi group'));
    const aHtml = await (await request(a.url, 'GET', undefined, null)).text();
    assert.equal(aHtml.includes('Multi group'), false);
    assert.equal((await request(`/master/groups/${a._id}`, 'DELETE')).status, 200);
  });

  await suite.test('permanent deletion removes games from Guztiak, all subgroups and saved progress', async () => {
    const victims = await Crossword.create([
      { name: 'Delete everywhere single', width: 2, height: 2, groupIds: [b._id, c._id] },
      { name: 'Delete everywhere bulk', width: 2, height: 2, groupIds: [b._id, c._id] }
    ]);
    const ids = victims.map(game => String(game._id));
    for (const id of ids) {
      await PlaySession.create({ userId: String(userId), puzzleId: id, elapsedSeconds: 7 });
      await GameState.create({ playerId: String(userId), puzzleId: id, elapsedSeconds: 7 });
    }
    const denied = await fetch(baseUrl + '/jokoak/game', {
      method: 'DELETE', redirect: 'manual',
      headers: { 'Content-Type': 'application/json', 'x-test-role': 'user' }, body: JSON.stringify({ ids })
    });
    assert.equal(denied.status, 302);
    assert.equal(await Crossword.countDocuments({ _id: { $in: ids } }), 2);
    assert.equal((await request('/jokoak/game', 'DELETE', { ids: ['invalid'] })).status, 400);
    assert.equal((await request(`/jokoak/game/${ids[0]}`, 'DELETE')).status, 200);
    const bulk = await request('/jokoak/game', 'DELETE', { ids: [ids[1], ids[1]] });
    assert.equal(bulk.status, 200);
    assert.deepEqual((await bulk.json()).deletedIds, [ids[1]]);
    assert.equal(await Crossword.countDocuments({ _id: { $in: ids } }), 0);
    assert.equal(await PlaySession.countDocuments({ puzzleId: { $in: ids } }), 0);
    assert.equal(await GameState.countDocuments({ puzzleId: { $in: ids } }), 0);
    assert.ok(await Crossword.findById(puzzle._id));
    for (const url of ['/jokoak/guztiak', b.url, c.url]) {
      const html = await (await request(url, 'GET', undefined, null)).text();
      assert.equal(html.includes('Delete everywhere'), false);
    }
  });

  await suite.test('uploads persist chosen groups and pending batches prevent deletion', async () => {
    const queuedGroup = await create('Upload destination');
    const uploadPath = path.join(upload.uploadDirectory, `groups-${port}.ipuz`);
    await fs.mkdir(upload.uploadDirectory, { recursive: true });
    await fs.writeFile(uploadPath, ipuz('Queued game'));
    uploadedFiles.add(uploadPath);
    const batch = await PuzzleUploadBatch.create({
      ownerId: userId, groupIds: [queuedGroup._id, c._id],
      files: [{ filename: `groups-${port}.ipuz`, storedFilename: path.basename(uploadPath), status: 'queued' }]
    });
    assert.equal((await request(`/master/groups/${queuedGroup._id}`, 'DELETE')).status, 409);
    await resumePendingPuzzleUploadBatches();
    let current;
    for (let i = 0; i < 150; i++) {
      current = await PuzzleUploadBatch.findById(batch._id);
      if (current.status === 'completed' || current.status === 'completed_with_errors') break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(current.status, 'completed', current.files[0].message);
    const imported = await Crossword.findById(current.files[0].puzzleId);
    assert.deepEqual(imported.groupIds.map(String).sort(), [queuedGroup._id, c._id].sort());
    uploadedFiles.add(path.join(upload.uploadDirectory, current.files[0].storedFilename));
    const unassignedPath = path.join(directory, 'unassigned.ipuz');
    await fs.writeFile(unassignedPath, ipuz('Unassigned game'));
    const unassigned = await importPuzzle({ path: unassignedPath, originalname: 'unassigned.ipuz' });
    assert.equal(unassigned.groupIds.length, 0);
    const allHtml = await (await request('/jokoak/guztiak', 'GET', undefined, null)).text();
    assert.ok(allHtml.includes('Unassigned game'));
    const uploadPage = await (await request('/jokoak/upload')).text();
    assert.ok(uploadPage.includes('data-upload-groups'));
    const invalidBody = new FormData();
    invalidBody.append('filename', new Blob([ipuz('Invalid destination')]), 'invalid.ipuz');
    invalidBody.append('groupIds', all._id);
    const invalid = await fetch(baseUrl + '/jokoak/upload/batches', { method: 'POST', headers: { 'x-test-role': 'master' }, body: invalidBody });
    assert.equal(invalid.status, 400);
    assert.equal(await Crossword.countDocuments({ name: 'Invalid destination' }), 0);

    const destinations = await Promise.all(Array.from({ length: 6 }, (_, index) => create(`Batch group ${index}`)));
    const body = new FormData();
    body.append('filename', new Blob([ipuz('Many destinations')]), `many-${port}.ipuz`);
    destinations.forEach(group => body.append('groupIds', group._id));
    const accepted = await fetch(baseUrl + '/jokoak/upload/batches', { method: 'POST', headers: { 'x-test-role': 'master' }, body });
    assert.equal(accepted.status, 202);
    const acceptedId = (await accepted.json()).id;
    let many;
    for (let i = 0; i < 150; i++) {
      many = await PuzzleUploadBatch.findById(acceptedId);
      if (many.status === 'completed' || many.status === 'completed_with_errors') break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    uploadedFiles.add(path.join(upload.uploadDirectory, many.files[0].storedFilename));
    assert.equal(many.status, 'completed', many.files[0].message);
    assert.deepEqual((await Crossword.findById(many.files[0].puzzleId)).groupIds.map(String).sort(), destinations.map(group => group._id).sort());
  });

  await suite.test('reconnection and a fresh migration process preserve saved data and removed memberships', async () => {
    await mongoose.disconnect();
    await mongoose.connect(uri);
    assert.ok((await groups.listGroups()).some(group => group.name === 'Renamed' && group.parentId === b._id));
    await run(process.execPath, [path.join(__dirname, '../scripts/migrate-game-groups.js')], {
      env: { ...process.env, DB_CONNECTION: uri }
    });
    assert.equal(await GameGroup.countDocuments({ systemKey: { $exists: true } }), 2);
    assert.deepEqual((await Crossword.findById(puzzle._id)).groupIds.map(String), []);
    const response = await request('/master/groups');
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes('data-group-manager'));
    assert.ok(html.includes('data-membership-action'));
  });

  if (process.env.GROUPS_BROWSER_TEST === '1') {
    await suite.test('Chrome: management forms, native drag and drop, multiple games, live counts and persistence', async () => {
      const companion = await Crossword.create({ name: 'Drag companion', groupIds: [b._id, c._id], width: 2, height: 2 });
      const result = await require('./helpers/group-browser')({
        baseUrl, directory, rootId: root._id, bId: b._id, cId: c._id,
        puzzleId: String(puzzle._id), companionId: String(companion._id)
      });
      assert.equal(await Crossword.countDocuments({ _id: { $in: result.deletedIds } }), 0);
      assert.equal(await PlaySession.countDocuments({ puzzleId: { $in: result.deletedIds } }), 0);
      assert.equal(await GameState.countDocuments({ puzzleId: { $in: result.deletedIds } }), 0);
    });
  }
});
