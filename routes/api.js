const express = require('express');
const router = express.Router();
router.use(require('./game/sessions'));
router.use(require('./game/checks'));
router.use(require('./game/hints'));
router.use(require('./game/history'));
module.exports = router;
