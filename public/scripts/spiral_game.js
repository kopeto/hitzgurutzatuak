(function () {
  const wrapper = document.querySelector('.game-wrapper');
  if (!wrapper) return;

  const puzzleId = wrapper.dataset.puzzleId;
  const completed = wrapper.dataset.completed === 'true';
  const dataEl = document.getElementById('spiral-data');
  const spiral = dataEl ? JSON.parse(dataEl.textContent || '{}') : {};
  const cells = Array.isArray(spiral.cells) ? spiral.cells.slice().sort((a, b) => a.index - b.index) : [];

  const total = cells.length;
  const values = new Array(total).fill('');
  let selected = 1;

  const countEl = document.getElementById('spiral-count');
  const msgEl = document.getElementById('spiral-message');
  const checkBtn = document.getElementById('spiral-check');
  const clearBtn = document.getElementById('spiral-clear');
  const restartBtn = document.getElementById('spiral-restart');

  function notify(message, type) {
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.className = 'game-notification-bar show ntf-' + (type || 'info');
  }

  function updateCounter() {
    if (!countEl) return;
    countEl.textContent = values.filter(Boolean).length;
  }

  function select(index) {
    selected = Math.max(1, Math.min(total, index));
    document.querySelectorAll('.spiral-cell').forEach(el => {
      el.classList.toggle('is-selected', Number(el.dataset.index) === selected);
    });
  }

  function setLetter(index, letter) {
    const i = index - 1;
    values[i] = letter;
    const target = document.getElementById('s_char_' + index);
    if (target) target.textContent = letter || '';
    updateCounter();
  }

  function collectFilledCells() {
    const payload = [];
    values.forEach((value, idx) => {
      if (value) payload.push({ row: 0, col: idx, value });
    });
    return payload;
  }

  async function loadState() {
    try {
      const res = await fetch('/api/game/history/' + puzzleId);
      const data = await res.json();
      if (!data || !Array.isArray(data.cells)) return;
      data.cells.forEach(cell => {
        if (cell.row === 0 && Number.isInteger(cell.col) && cell.col >= 0 && cell.col < total) {
          setLetter(cell.col + 1, String(cell.value || '').toUpperCase());
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await fetch('/api/game/history/' + puzzleId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cells: collectFilledCells() })
        });
      } catch (err) {
        console.error(err);
      }
    }, 600);
  }

  function applyResults(cellResults) {
    document.querySelectorAll('.spiral-cell').forEach(el => {
      el.classList.remove('is-correct', 'is-wrong');
    });
    cellResults.forEach(r => {
      const idx = Number(r.col) + 1;
      const cellEl = document.getElementById('s_cell_' + idx);
      if (!cellEl) return;
      cellEl.classList.add(r.correct ? 'is-correct' : 'is-wrong');
    });
  }

  document.querySelectorAll('.spiral-cell').forEach(el => {
    el.addEventListener('click', () => {
      select(Number(el.dataset.index));
    });
  });

  document.addEventListener('keydown', ev => {
    if (completed) return;
    if (!total) return;

    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      select(selected - 1);
      return;
    }

    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      select(selected + 1);
      return;
    }

    if (ev.key === 'Backspace') {
      ev.preventDefault();
      if (values[selected - 1]) {
        setLetter(selected, '');
      } else {
        select(selected - 1);
        setLetter(selected, '');
      }
      scheduleSave();
      return;
    }

    const key = ev.key.length === 1 ? ev.key.toUpperCase() : '';
    if (/^[\p{L}\p{N}]$/u.test(key)) {
      ev.preventDefault();
      setLetter(selected, key);
      if (selected < total) select(selected + 1);
      scheduleSave();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      for (let i = 1; i <= total; i++) setLetter(i, '');
      document.querySelectorAll('.spiral-cell').forEach(el => {
        el.classList.remove('is-correct', 'is-wrong');
      });
      select(1);
      scheduleSave();
    });
  }

  if (checkBtn) {
    checkBtn.addEventListener('click', async () => {
      const cellsPayload = values.map((value, idx) => ({ row: 0, col: idx, value }));
      const res = await fetch('/api/game/check-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cells: cellsPayload })
      });
      const result = await res.json();
      if (result.error) {
        notify(result.message || 'Errorea', 'error');
        return;
      }
      if (Array.isArray(result.cellResults)) applyResults(result.cellResults);
      if (result.complete) {
        notify('Zorionak! Espirala osatu duzu.', 'success');
      } else {
        notify('Egiaztapena bidalia.', 'info');
      }
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', async () => {
      const res = await fetch('/api/game/reset/' + puzzleId, { method: 'DELETE' });
      const data = await res.json();
      if (!data.error) window.location.reload();
    });
  }

  select(1);
  updateCounter();
  loadState();
})();
