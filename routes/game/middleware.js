const rateLimit = require('express-rate-limit');

const startLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Eskaera gehiegi. Saiatu berriro minutu batzuen buruan.' }
});

const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Eskaera gehiegi. Saiatu berriro minutu baten buruan.' }
});

function requireGameSession(req, res, next) {
  if (!req.session.currentGame) {
    return res.status(400).json({
      error: true,
      message: 'Ez dago joko aktiborik saioan'
    });
  }
  next();
}

module.exports = { startLimiter, actionLimiter, requireGameSession };
