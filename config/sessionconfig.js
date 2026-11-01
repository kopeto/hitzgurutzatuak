const isProduction = process.env.NODE_ENV === 'production';
const configuredSecret = process.env.MY_SECRET;
const configuredSecureCookie = process.env.SESSION_COOKIE_SECURE;

if (configuredSecureCookie !== undefined && !['true', 'false'].includes(configuredSecureCookie.toLowerCase())) {
  throw new Error('SESSION_COOKIE_SECURE true edo false izan behar da.');
}

if (isProduction && !configuredSecret) {
  throw new Error('MY_SECRET ingurune-aldagaia beharrezkoa da produkzioan.');
}

const maxAge = Number.parseInt(process.env.SESSION_MAX_AGE_MS || '604800000', 10);

module.exports = {
  name: 'hitzgurutzatuak.sid',
  secret: configuredSecret || 'development-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: configuredSecureCookie === undefined ? isProduction : configuredSecureCookie.toLowerCase() === 'true',
    sameSite: 'lax',
    maxAge: Number.isFinite(maxAge) && maxAge > 0 ? maxAge : 604800000
  }
};
