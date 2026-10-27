const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const mongoose = require('mongoose');

const upload = require('../config/uploadconfig');
const CrosswordModel = require('../models/crosswords');
const PuzzleUploadBatch = require('../models/puzzleuploadbatch');
const { importPuzzle, PuzzleImportError } = require('../services/puzzle-import');
const puzzlesRouter = require('../routes/puzzles');

const puzHeader = Buffer.alloc(0x34);
puzHeader.write('ACROSS&DOWN', 2, 'ascii');
puzHeader.writeUInt8(2, 0x2c);
puzHeader.writeUInt8(2, 0x2d);
puzHeader.writeUInt16LE(4, 0x2e);
const fixtures = [
  {
    filename: 'grid.puz',
    content: Buffer.concat([puzHeader, Buffer.from('ABCD----Title\0Author\0Copyright\0AB\0AC\0BD\0CD\0')])
  },
  {
    filename: 'grid.ipuz',
    content: Buffer.from(JSON.stringify({
      kind: ['http://ipuz.org/crossword#1'],
      dimensions: { width: 2, height: 2 },
      puzzle: [[1, 2], [3, 0]],
      solution: [['A', 'B'], ['C', 'D']],
      clues: { Across: [{ number: 1, clue: 'AB' }, { number: 3, clue: 'CD' }],
        Down: [{ number: 1, clue: 'AC' }, { number: 2, clue: 'BD' }] }
    }))
  },
  {
    filename: 'spiral.spl',
    content: Buffer.from(JSON.stringify({
      format: 'spl',
      answer: 'AB',
      cells: [{ index: 1, path: 'M0 0h1v1z' }, { index: 2, path: 'M1 0h1v1z' }],
      clues: ['Spiral clue']
    }))
  }
];

function mockPuzzleDatabase(t) {
  t.mock.method(CrosswordModel, 'findOne', () => ({ select: () => ({ lean: async () => null }) }));
  t.mock.method(CrosswordModel.prototype, 'save', async function () { return this; });
}

function trackFiles(t) {
  const filenames = [];
  t.after(async () => {
    for (const filename of filenames) await fs.rm(filename, { force: true });
    for (const directory of new Set(filenames.map(filename => path.dirname(filename)))) {
      if (directory === upload.uploadDirectory) continue;
      await fs.rmdir(directory).catch(error => {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error;
      });
    }
  });
  return filenames;
}

async function serve(t, app) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return `http://127.0.0.1:${server.address().port}`;
}

function formFor(files) {
  const form = new FormData();
  for (const file of files) form.append('filename', new Blob([file.content]), file.filename);
  return form;
}

test('single PUZ, IPUZ and SPL uploads survive import in the Madrid date folder', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2099-01-01T23:30:00Z') });
  mockPuzzleDatabase(t);
  const filenames = trackFiles(t);
  const app = express();
  app.post('/upload', upload, async (req, res, next) => {
    try {
      filenames.push(req.file.path);
      const puzzle = await importPuzzle(req.file);
      filenames.push(req.file.path);
      res.status(201).json({ file: req.file, format: puzzle.format });
    } catch (error) { next(error); }
  });
  const baseUrl = await serve(t, app);

  for (const fixture of fixtures) {
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor([fixture]) });
    assert.equal(response.status, 201);
    const { file, format } = await response.json();
    assert.equal(path.dirname(file.path), path.join(upload.uploadDirectory, '2099-01-02'));
    assert.equal(file.filename, fixture.filename);
    assert.equal(format, path.extname(fixture.filename).slice(1));
    assert.deepEqual(await fs.readFile(file.path), fixture.content);
  }
  assert.deepEqual((await fs.readdir(path.join(upload.uploadDirectory, '2099-01-02'))).sort(),
    fixtures.map(fixture => fixture.filename).sort());
});

test('batches keep original names, process on a later day and continue after a name collision', { timeout: 10000 }, async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2099-07-01T22:30:00Z') });
  mockPuzzleDatabase(t);
  const filenames = trackFiles(t);
  let batch;
  let finish;
  const completed = new Promise(resolve => { finish = resolve; });
  t.mock.method(PuzzleUploadBatch, 'create', async data => {
    batch = {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      files: data.files.map(file => ({ ...file, _id: new mongoose.Types.ObjectId() })),
      save: async function () {
        if (this.status === 'completed' || this.status === 'completed_with_errors') finish();
        return this;
      }
    };
    filenames.push(...batch.files.map(file => path.join(upload.uploadDirectory, file.storedFilename)));
    return batch;
  });
  t.mock.method(PuzzleUploadBatch, 'findById', async () => {
    t.mock.timers.setTime(new Date('2099-07-03T12:00:00Z').getTime());
    return batch;
  });
  const app = express();
  app.use((req, res, next) => {
    req.isAuthenticated = () => true;
    req.user = { _id: new mongoose.Types.ObjectId(), master: true };
    next();
  });
  app.use('/jokoak', puzzlesRouter);
  const baseUrl = await serve(t, app);
  const files = [
    fixtures[1],
    { ...fixtures[1], content: Buffer.concat([fixtures[1].content, Buffer.from('\n')]) },
    { ...fixtures[1], content: Buffer.concat([fixtures[1].content, Buffer.from('\n\n')]) },
    fixtures[2]
  ];
  const response = await fetch(`${baseUrl}/jokoak/upload/batches`, { method: 'POST', body: formFor(files) });
  assert.equal(response.status, 202);
  await response.json();
  await completed;
  const archivedFiles = batch.files.map(file => path.join(upload.uploadDirectory, file.storedFilename));
  filenames.push(...archivedFiles);

  assert.equal(batch.status, 'completed');
  assert.equal(new Set(batch.files.map(file => file.storedFilename)).size, files.length);
  for (const [index, file] of batch.files.entries()) {
    assert.equal(file.status, 'imported');
    assert.equal(path.dirname(file.storedFilename), '2099-07-02');
    const expectedName = index === 0 ? 'grid.ipuz'
      : index === 1 ? 'grid_2.ipuz'
        : index === 2 ? 'grid_3.ipuz' : 'spiral.spl';
    assert.equal(path.basename(file.storedFilename), expectedName);
    assert.deepEqual(await fs.readFile(archivedFiles[index]), files[index].content);
  }
});

test('same-name files reuse identical content and suffix different content without overwriting', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2099-03-01T12:00:00Z') });
  mockPuzzleDatabase(t);
  const filenames = trackFiles(t);
  const app = express();
  app.post('/upload', upload, async (req, res) => {
    filenames.push(req.file.path);
    try {
      await importPuzzle(req.file);
      filenames.push(req.file.path);
      res.sendStatus(201);
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });
  const baseUrl = await serve(t, app);
  const fixture = fixtures[1];
  const accepted = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor([fixture]) });
  assert.equal(accepted.status, 201);
  await accepted.text();

  const conflicting = { ...fixture, content: Buffer.concat([fixture.content, Buffer.from('\n')]) };
  const collision = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor([conflicting]) });
  assert.equal(collision.status, 201);
  await collision.text();

  const identical = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor([fixture]) });
  assert.equal(identical.status, 201);
  await identical.text();

  t.mock.method(CrosswordModel, 'findOne', () => ({ select: () => ({ lean: async () => ({ _id: 'existing' }) }) }));
  const duplicate = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor([{ ...fixture, filename: 'duplicate.ipuz' }]) });
  assert.equal(duplicate.status, 409);
  await duplicate.json();

  const directory = path.join(upload.uploadDirectory, '2099-03-01');
  assert.deepEqual(await fs.readFile(path.join(directory, fixture.filename)), fixture.content);
  assert.deepEqual(await fs.readFile(path.join(directory, 'grid_2.ipuz')), conflicting.content);
  assert.deepEqual((await fs.readdir(directory)).sort(), ['grid.ipuz', 'grid_2.ipuz']);
  assert.equal(CrosswordModel.prototype.save.mock.callCount(), 3);
});

test('an archive with the original name is removed if saving the game fails', async t => {
  mockPuzzleDatabase(t);
  const failure = new Error('Database save failed');
  t.mock.method(CrosswordModel.prototype, 'save', async () => { throw failure; });
  const filenames = trackFiles(t);
  const directory = path.join(upload.uploadDirectory, '2099-04-01');
  const temporary = path.join(directory, '.abcdef.tmp');
  const archive = path.join(directory, fixtures[1].filename);
  filenames.push(temporary, archive);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(temporary, fixtures[1].content);

  await assert.rejects(importPuzzle({ path: temporary, originalname: fixtures[1].filename }), failure);
  await assert.rejects(fs.access(archive), { code: 'ENOENT' });
  await assert.rejects(fs.access(temporary), { code: 'ENOENT' });
});

test('failed imports still remove the uploaded file', async t => {
  mockPuzzleDatabase(t);
  const failure = new Error('Database save failed');
  t.mock.method(CrosswordModel.prototype, 'save', async () => { throw failure; });
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'puzzle-upload-failure-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, fixtures[1].filename);
  await fs.writeFile(filename, fixtures[1].content);

  await assert.rejects(importPuzzle({ path: filename, originalname: fixtures[1].filename }), failure);
  await assert.rejects(fs.access(filename), { code: 'ENOENT' });
});

test('invalid and duplicate games are not retained', async t => {
  for (const duplicate of [false, true]) {
    await t.test(duplicate ? 'duplicate' : 'invalid', async t => {
      mockPuzzleDatabase(t);
      if (duplicate) {
        t.mock.method(CrosswordModel, 'findOne', () => ({ select: () => ({
          lean: async () => ({ _id: new mongoose.Types.ObjectId() })
        }) }));
      }
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'puzzle-upload-rejected-'));
      t.after(() => fs.rm(directory, { recursive: true, force: true }));
      const filename = path.join(directory, 'spiral.spl');
      await fs.writeFile(filename, duplicate ? fixtures[2].content : '{"format":"spl","cells":[]}');

      await assert.rejects(importPuzzle({ path: filename, originalname: 'spiral.spl' }), error => (
        duplicate ? error instanceof PuzzleImportError && error.statusCode === 409 : /laukirik/.test(error.message)
      ));
      assert.equal(CrosswordModel.prototype.save.mock.callCount(), 0);
      await assert.rejects(fs.access(filename), { code: 'ENOENT' });
    });
  }
});

test('up to 1000 files can be uploaded at once and 1001 are rejected', { timeout: 20000 }, async t => {
  assert.equal(upload.maxBatchFiles, 1000);
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2099-02-01T12:00:00Z') });
  const filenames = trackFiles(t);
  const app = express();
  app.post('/upload', upload.multiple, (req, res) => {
    filenames.push(...(req.files || []).map(file => file.path).filter(Boolean));
    res.status(req.uploadFatal ? req.uploadFatalStatus : 200)
      .json({ count: req.files?.length || 0, errors: req.uploadErrors || [] });
  });
  const baseUrl = await serve(t, app);
  const files = Array.from({ length: 1000 }, () => fixtures[1]);
  const accepted = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor(files) });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).count, 1000);

  const rejected = await fetch(`${baseUrl}/upload`, { method: 'POST', body: formFor([...files, fixtures[1]]) });
  assert.equal(rejected.status, 400);
  assert.match((await rejected.json()).errors[0].message, /1000/);
  assert.equal((await fs.readdir(path.join(upload.uploadDirectory, '2099-02-01'))).length, 1000);
});
