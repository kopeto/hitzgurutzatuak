function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function serializeUser(user) {
  if (!user) return null;

  return {
    id: user._id ? String(user._id) : undefined,
    username: user.username,
    master: Boolean(user.master)
  };
}

function serializePuzzleSummary(puzzle) {
  const gameType = puzzle.gameType || (puzzle.format === 'spl' ? 'spiral' : 'crossword');
  return {
    _id: puzzle._id ? String(puzzle._id) : undefined,
    name: puzzle.name,
    author: puzzle.author,
    width: puzzle.width,
    height: puzzle.height,
    gameType,
    format: puzzle.format,
    cellCount: gameType === 'spiral' ? puzzle.spiral?.cells?.length || 0 : undefined,
    createdAt: puzzle.createdAt
  };
}

function renderReact(res, page, data = {}, options = {}) {
  const title = options.title || res.locals.t('site.name');
  const state = {
    page,
    data,
    user: serializeUser(res.locals.user),
    flash: res.locals.flash || {},
    messages: res.locals.clientMessages
  };

  return res.status(options.status || 200).render('react', {
    title,
    pageClass: page === 'spiralBuilder' ? 'spiral-builder-page' : '',
    appState: safeJson(state),
    useVite: process.env.NODE_ENV === 'development'
  });
}

module.exports = { renderReact, serializePuzzleSummary };
