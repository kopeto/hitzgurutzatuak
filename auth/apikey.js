/**
 * API Key middleware for external API access.
 * Expects header:  Authorization: Bearer <EXTERNAL_API_KEY>
 */
function requireApiKey(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  const validKey = process.env.EXTERNAL_API_KEY;

  if (!validKey) {
    return res.status(500).json({ error: true, message: 'EXTERNAL_API_KEY ez dago konfiguratuta zerbitzarian.' });
  }

  if (!token || token !== validKey) {
    return res.status(401).json({ error: true, message: 'Baimena ukatu da. API key baliogabea.' });
  }

  next();
}

module.exports = requireApiKey;
