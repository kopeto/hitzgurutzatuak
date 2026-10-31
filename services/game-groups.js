const mongoose = require('mongoose');
const GameGroup = require('../models/gamegroup');
const Crossword = require('../models/crosswords');
const PuzzleUploadBatch = require('../models/puzzleuploadbatch');

class GroupError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'GroupError';
    this.statusCode = statusCode;
  }
}

const isId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const idOf = value => value == null ? null : String(value);
let initialization;
let writeTail = Promise.resolve();

// Serialize structural edits and membership writes within this application process.
function withGroupWrite(work) {
  const pending = writeTail.then(work);
  writeTail = pending.catch(() => {});
  return pending;
}

function groupUrl(group) {
  if (group.systemKey === 'root') return '/jokoak';
  if (group.systemKey === 'all') return '/jokoak/guztiak';
  return `/jokoak/taldeak/${group._id}`;
}

function serializeGroup(group) {
  return {
    _id: String(group._id), name: group.name, description: group.description || '',
    parentId: idOf(group.parentId), sortOrder: group.sortOrder || 0,
    systemKey: group.systemKey || null, url: groupUrl(group)
  };
}

function sortGroups(groups) {
  return [...groups].sort((a, b) => Number(a.systemKey === 'all') - Number(b.systemKey === 'all')
    || a.sortOrder - b.sortOrder || String(a._id).localeCompare(String(b._id)));
}

function flattenGroups(groups) {
  const children = new Map();
  groups.forEach(group => {
    const parent = idOf(group.parentId);
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(group);
  });
  const result = [];
  const seen = new Set();
  function visit(parentId, depth, names) {
    for (const group of sortGroups(children.get(parentId) || [])) {
      if (seen.has(group._id)) continue;
      seen.add(group._id);
      const path = [...names, group.name];
      result.push({ ...group, depth, path: path.join(' / ') });
      visit(group._id, depth + 1, path);
    }
  }
  visit(null, 0, []);
  return result;
}

async function ensureGameGroups() {
  if (!initialization) {
    initialization = (async () => {
      await GameGroup.init();
      const root = await GameGroup.findOneAndUpdate({ systemKey: 'root' }, {
        $setOnInsert: { name: 'Jokoak', description: '', parentId: null, sortOrder: 0 }
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
      await GameGroup.findOneAndUpdate({ systemKey: 'all' }, {
        $setOnInsert: { name: 'Guztiak', description: '', parentId: root._id, sortOrder: 0 }
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
      // Only legacy documents are migrated. Re-running never reassigns classified games.
      await Crossword.updateMany({ groupIds: { $exists: false } }, { $set: { groupIds: [root._id] } });
    })().catch(error => { initialization = undefined; throw error; });
  }
  return initialization;
}

async function listGroups() {
  await ensureGameGroups();
  return (await GameGroup.find({}).lean()).map(serializeGroup);
}

function parseGroupIds(value) {
  if (value === undefined || value === null || value === '') return [];
  const ids = Array.isArray(value) ? value : [value];
  if (ids.length > 100 || ids.some(id => !isId(id))) {
    throw new GroupError('Taldeen zerrenda ez da baliozkoa.');
  }
  return [...new Set(ids.map(id => id.toLowerCase()))];
}

async function validateAssignableGroups(ids) {
  const groupIds = parseGroupIds(ids);
  if (!groupIds.length) return [];
  await ensureGameGroups();
  const groups = await GameGroup.find({ _id: { $in: groupIds } }).lean();
  if (groups.length !== groupIds.length || groups.some(group => group.systemKey === 'all')) {
    throw new GroupError('Hautatutako taldea ez dago erabilgarri. Guztiak automatikoa da.');
  }
  return groupIds;
}

function groupFields(input, current) {
  if (!input || typeof input.name !== 'string' || typeof input.description !== 'string'
    || !Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 1000000) {
    throw new GroupError('Taldearen datuak ez dira baliozkoak.');
  }
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || name.length > 200 || description.length > 20000) {
    throw new GroupError('Izena edo azalpena ez da baliozkoa.');
  }
  if (current?.systemKey) {
    if (name !== current.name || idOf(input.parentId) !== idOf(current.parentId)
      || input.sortOrder !== current.sortOrder) {
      throw new GroupError('Jokoak eta Guztiak talde babestuak dira; azalpena bakarrik alda daiteke.');
    }
  } else if (!isId(input.parentId)) {
    throw new GroupError('Hautatu guraso talde bat.');
  }
  return { name, description, parentId: input.parentId ? input.parentId.toLowerCase() : null, sortOrder: input.sortOrder };
}

async function validateParent(parentId, groupId) {
  if (parentId === null) return;
  const groups = await listGroups();
  const byId = new Map(groups.map(group => [group._id, group]));
  let parent = byId.get(parentId);
  if (!parent || parent.systemKey === 'all') throw new GroupError('Guraso taldea ez da baliozkoa.');
  const visited = new Set(groupId ? [groupId] : []);
  while (parent) {
    if (visited.has(parent._id)) throw new GroupError('Talde bat ezin da bere ondorengo baten barruan jarri.');
    visited.add(parent._id);
    parent = byId.get(parent.parentId);
  }
}

async function createGroup(input) {
  return withGroupWrite(async () => {
    await ensureGameGroups();
    const fields = groupFields(input);
    await validateParent(fields.parentId);
    return serializeGroup(await GameGroup.create(fields));
  });
}

async function updateGroup(id, input) {
  return withGroupWrite(async () => {
    if (!isId(id)) throw new GroupError('Taldea ez da aurkitu.', 404);
    id = id.toLowerCase();
    const current = await GameGroup.findById(id).lean();
    if (!current) throw new GroupError('Taldea ez da aurkitu.', 404);
    const fields = groupFields(input, current);
    await validateParent(fields.parentId, id);
    return serializeGroup(await GameGroup.findByIdAndUpdate(id, { $set: fields }, { new: true, runValidators: true }));
  });
}

async function deleteGroup(id) {
  return withGroupWrite(async () => {
    if (!isId(id)) throw new GroupError('Taldea ez da aurkitu.', 404);
    id = id.toLowerCase();
    const group = await GameGroup.findById(id).lean();
    if (!group) throw new GroupError('Taldea ez da aurkitu.', 404);
    if (group.systemKey) throw new GroupError('Talde babestua ezin da ezabatu.');
    const [child, puzzle, pendingUpload] = await Promise.all([
      GameGroup.exists({ parentId: id }), Crossword.exists({ groupIds: id }),
      PuzzleUploadBatch.exists({ groupIds: id, status: { $in: ['queued', 'processing'] } })
    ]);
    if (child || puzzle || pendingUpload) {
      throw new GroupError('Mugitu lehenik azpitaldeak eta jokoak; amaitu zain dauden kargak.', 409);
    }
    await GameGroup.deleteOne({ _id: id });
  });
}

async function changeMembership(input) {
  return withGroupWrite(async () => {
    const { action, sourceId, targetId } = input || {};
    const requested = input?.puzzleIds;
    if (!['add', 'remove', 'move'].includes(action) || !Array.isArray(requested)
      || !requested.length || requested.length > 500 || requested.some(id => !isId(id))) {
      throw new GroupError('Hautatu jokoak eta baliozko ekintza bat.');
    }
    const puzzleIds = [...new Set(requested.map(id => id.toLowerCase()))];
    const needsSource = action !== 'add';
    const needsTarget = action !== 'remove';
    if ((needsSource && !isId(sourceId)) || (needsTarget && !isId(targetId))
      || (action === 'move' && sourceId.toLowerCase() === targetId.toLowerCase())) {
      throw new GroupError('Jatorri eta helburu taldeak ez dira baliozkoak.');
    }
    await validateAssignableGroups([...(needsSource ? [sourceId] : []), ...(needsTarget ? [targetId] : [])]);
    const puzzles = await Crossword.find({ _id: { $in: puzzleIds } }).select('_id groupIds').lean();
    if (puzzles.length !== puzzleIds.length) throw new GroupError('Jokoren bat ez da aurkitu.', 404);
    if (needsSource && puzzles.some(puzzle => !(puzzle.groupIds || []).some(id => String(id) === sourceId.toLowerCase()))) {
      throw new GroupError('Hautatutako joko guztiak jatorri taldean egon behar dira.');
    }
    let update;
    if (action === 'add') update = { $addToSet: { groupIds: targetId } };
    else if (action === 'remove') update = { $pull: { groupIds: sourceId } };
    else update = [{ $set: { groupIds: { $setUnion: [
      { $setDifference: [{ $ifNull: ['$groupIds', []] }, [new mongoose.Types.ObjectId(sourceId)]] },
      [new mongoose.Types.ObjectId(targetId)]
    ] } } }];
    await Crossword.updateMany({ _id: { $in: puzzleIds } }, update);
    return { count: puzzleIds.length };
  });
}

module.exports = {
  GroupError, isId, withGroupWrite, ensureGameGroups, listGroups, sortGroups, flattenGroups,
  groupUrl, serializeGroup, parseGroupIds, validateAssignableGroups,
  createGroup, updateGroup, deleteGroup, changeMembership
};
