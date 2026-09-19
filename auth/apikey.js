const crypto = require('crypto');

function requireApiKey(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  const validKey = process.env.EXTERNAL_API_KEY;

  if (!validKey) {
    return res.status(500).json({ error: true, message: 'EXTERNAL_API_KEY ez dago konfiguratuta zerbitzarian.' });
  }

  const tokenBuffer = Buffer.from(token || '');
  const keyBuffer = Buffer.from(validKey);
  const isValid = tokenBuffer.length === keyBuffer.length
    && crypto.timingSafeEqual(tokenBuffer, keyBuffer);

  if (!isValid) {
    return res.status(401).json({ error: true, message: 'Baimena ukatu da. API key baliogabea.' });
  }

  next();
}

module.exports = requireApiKey;
