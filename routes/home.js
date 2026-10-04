const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  return res.render('home', {
    title: res.locals.t('page.home')
  });
});

module.exports = router;
