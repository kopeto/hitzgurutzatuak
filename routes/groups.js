const express = require('express');
const Crossword = require('../models/crosswords');
const { renderPage, serializePuzzleSummary } = require('../services/page-view');
const {
  GroupError, listGroups, flattenGroups, createGroup, updateGroup, deleteGroup, changeMembership
} = require('../services/game-groups');
const { logError } = require('../utils');

const router = express.Router();
router.use((req, res, next) => {
  if (req.isAuthenticated() && req.user.master) return next();
  return res.status(403).json({ error: 'Sarbidea ukatua.' });
});

function handle(work) {
  return async (req, res) => {
    try { await work(req, res); }
    catch (error) {
      if (!(error instanceof GroupError)) logError(error);
      return res.status(error instanceof GroupError ? error.statusCode : 500)
        .json({ error: error instanceof GroupError ? error.message : 'Ezin izan dira aldaketak gorde.' });
    }
  };
}

router.get('/', handle(async (req, res) => {
  const groups = flattenGroups(await listGroups());
  const puzzles = await Crossword.find({}).select('name author width height gameType format spiral.cells createdAt groupIds').lean();
  return renderPage(res, 'groups', { groups, puzzles: puzzles.map(serializePuzzleSummary) }, {
    title: res.locals.t('groups.management')
  });
}));
router.post('/', handle(async (req, res) => res.status(201).json({ group: await createGroup(req.body) })));
router.patch('/:id', handle(async (req, res) => res.json({ group: await updateGroup(req.params.id, req.body) })));
router.delete('/:id', handle(async (req, res) => {
  await deleteGroup(req.params.id);
  return res.json({ deletedId: req.params.id });
}));
router.post('/memberships', handle(async (req, res) => res.json(await changeMembership(req.body))));

module.exports = router;
