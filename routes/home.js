const express = require('express');
const router = express.Router();

const { renderReact } = require('../services/react-view');

router.get('/', (req, res) => {
  return renderReact(res, 'home', {}, { title: res.locals.t('page.home') });
});

module.exports = router;
