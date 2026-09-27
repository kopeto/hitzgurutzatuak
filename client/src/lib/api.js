async function request(path, options = {}) {
  try {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    return await response.json();
  } catch {
    return { error: true, message: 'Konexio errorea' };
  }
}

export const gameApi = {
  checkCell: (row, col, value) => request('/api/game/check-cell', { method: 'POST', body: JSON.stringify({ row, col, value }) }),
  checkWord: (word, cells) => request('/api/game/check-word', { method: 'POST', body: JSON.stringify({ wordDir: word.dir, wordX: word.x, wordY: word.y, cells }) }),
  solveCell: (row, col) => request('/api/game/solve-cell', { method: 'POST', body: JSON.stringify({ row, col }) }),
  solveWord: word => request('/api/game/solve-word', { method: 'POST', body: JSON.stringify({ wordDir: word.dir, wordX: word.x, wordY: word.y }) }),
  solveGrid: () => request('/api/game/solve-grid', { method: 'POST' }),
  checkGrid: cells => request('/api/game/check-grid', { method: 'POST', body: JSON.stringify({ cells }) }),
  load: puzzleId => request(`/api/game/history/${puzzleId}`),
  save: (puzzleId, cells) => request(`/api/game/history/${puzzleId}`, { method: 'POST', body: JSON.stringify({ cells }) }),
  status: () => request('/api/game/status'),
  pause: () => request('/api/game/timer/pause', { method: 'POST' }),
  resume: () => request('/api/game/timer/resume', { method: 'POST' }),
  reset: puzzleId => request(`/api/game/reset/${puzzleId}`, { method: 'DELETE' })
};
