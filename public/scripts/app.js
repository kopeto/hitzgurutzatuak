const stateNode = document.getElementById('app-state');
const state = stateNode ? JSON.parse(stateNode.textContent || '{}') : {};
const t = window.t || ((key) => key);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function normalizeLetter(value) {
  const letter = String(value ?? '').normalize('NFC');
  if (!/^\p{L}$/u.test(letter)) return '';
  const uppercase = letter.toLocaleUpperCase('eu');
  return /^\p{L}$/u.test(uppercase) ? uppercase : '';
}

function notify(element, message, type = 'info', permanent = false) {
  if (!element) return;
  element.textContent = message;
  element.className = `game-notification-bar show ntf-${type}`;
  if (!permanent) window.setTimeout(() => element.classList.remove('show'), 3000);
}

async function request(path, options = {}) {
  try {
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(path, { ...options, headers });
    const result = await response.json();
    return response.ok ? result : {
      ...result,
      error: true,
      message: result.message || (typeof result.error === 'string' ? result.error : undefined)
    };
  } catch {
    return { error: true, message: 'Konexio errorea' };
  }
}

function initCatalog() {
  const search = document.querySelector('[data-puzzle-search]');
  const status = document.querySelector('[data-puzzle-status]');
  const type = document.querySelector('[data-puzzle-type]');
  const count = document.querySelector('[data-catalog-count]');
  const selectAll = document.querySelector('[data-select-all]');
  const selectionCount = document.querySelector('[data-selection-count]');
  const deleteSelected = document.querySelector('[data-delete-selected]');
  const list = document.querySelector('.puzzle-list');
  const sortButtons = [...document.querySelectorAll('[data-sort-column]')];
  const cards = () => [...document.querySelectorAll('[data-puzzle-card]')];
  const selectedCards = () => cards().filter((card) => card.querySelector('[data-select-puzzle]')?.checked);
  let sortColumn = '';
  let sortDirection = 1;
  const sortRows = (column) => {
    if (sortColumn === column) sortDirection *= -1;
    else {
      sortColumn = column;
      sortDirection = 1;
    }
    const dataKey = { type: 'sortType', size: 'sortSize', name: 'sortName', status: 'sortStatus', date: 'sortDate' }[column];
    const statusOrder = { notstarted: 0, started: 1, completed: 2 };
    const compare = (first, second) => {
      const firstValue = first.dataset[dataKey] || '';
      const secondValue = second.dataset[dataKey] || '';
      let result;
      if (column === 'size' || column === 'date') result = Number(firstValue) - Number(secondValue);
      else if (column === 'status') result = statusOrder[firstValue] - statusOrder[secondValue];
      else result = firstValue.localeCompare(secondValue, 'eu', { numeric: true, sensitivity: 'base' });
      if (!result && column !== 'name') result = first.dataset.sortName.localeCompare(second.dataset.sortName, 'eu', { sensitivity: 'base' });
      return result * sortDirection;
    };
    if (list) list.append(...cards().sort(compare));
    sortButtons.forEach((button) => {
      const active = button.dataset.sortColumn === column;
      const header = button.closest('[role="columnheader"]');
      const indicator = button.querySelector('[data-sort-indicator]');
      button.setAttribute('aria-pressed', String(active));
      if (header) header.setAttribute('aria-sort', active ? (sortDirection === 1 ? 'ascending' : 'descending') : 'none');
      if (indicator) indicator.textContent = active ? (sortDirection === 1 ? '▲' : '▼') : '↕';
    });
  };
  const updateSelection = () => {
    const allCards = cards();
    const visibleCards = allCards.filter((card) => !card.hidden && card.querySelector('[data-select-puzzle]'));
    const selected = selectedCards();
    const visibleSelected = visibleCards.filter((card) => card.querySelector('[data-select-puzzle]').checked).length;
    allCards.forEach((card) => card.classList.toggle('is-selected', Boolean(card.querySelector('[data-select-puzzle]')?.checked)));
    if (selectionCount) selectionCount.textContent = selected.length ? t('client.selectedCount', { count: selected.length }) : '';
    if (deleteSelected) deleteSelected.disabled = selected.length === 0;
    if (selectAll) {
      selectAll.checked = visibleCards.length > 0 && visibleSelected === visibleCards.length;
      selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visibleCards.length;
    }
  };
  const update = () => {
    const query = (search?.value || '').trim().toLocaleLowerCase('eu');
    let visible = 0;
    cards().forEach((card) => {
      const match = card.dataset.search.toLocaleLowerCase('eu').includes(query)
        && (!status || status.value === 'all' || card.dataset.status === status.value)
        && (!type || type.value === 'all' || card.dataset.type === type.value);
      card.hidden = !match;
      if (match) visible += 1;
    });
    if (count) count.textContent = t('client.puzzleCount', { count: visible });
    updateSelection();
  };
  [search, status, type].forEach((element) => element?.addEventListener('input', update));
  [status, type].forEach((element) => element?.addEventListener('change', update));
  update();
  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-select-all]')) {
      cards().filter((card) => !card.hidden).forEach((card) => {
        const checkbox = card.querySelector('[data-select-puzzle]');
        if (checkbox) checkbox.checked = event.target.checked;
      });
      updateSelection();
    } else if (event.target.matches('[data-select-puzzle]')) updateSelection();
  });
  document.addEventListener('click', async (event) => {
    const sortButton = event.target.closest('[data-sort-column]');
    if (sortButton) {
      sortRows(sortButton.dataset.sortColumn);
      return;
    }

    const singleButton = event.target.closest('[data-delete-puzzle]');
    if (singleButton) {
      const id = singleButton.dataset.deletePuzzle;
      const name = singleButton.dataset.name || 'puzle hau';
      if (!window.confirm(t('client.deleteConfirm', { name }))) return;
      singleButton.disabled = true;
      try {
        const response = await fetch(`/jokoak/game/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('delete failed');
        singleButton.closest('[data-puzzle-card]')?.remove();
      } catch {
        singleButton.disabled = false;
        window.alert(t('client.deleteFailed'));
      }
      update();
      return;
    }

    const bulkButton = event.target.closest('[data-delete-selected]');
    if (!bulkButton) return;
    const selected = selectedCards();
    if (!selected.length || !window.confirm(t('client.deleteSelectedConfirm', { count: selected.length }))) return;
    bulkButton.disabled = true;
    try {
      const response = await fetch('/jokoak/game', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected.map((card) => card.querySelector('[data-select-puzzle]').value) })
      });
      if (!response.ok) throw new Error('bulk delete failed');
      selected.forEach((card) => card.remove());
    } catch {
      window.alert(t('client.deleteFailed'));
    }
    update();
  });
}

function initUpload() {
  const root = document.querySelector('[data-upload]');
  if (!root) return;
  const form = root.querySelector('[data-upload-form]');
  const input = root.querySelector('[data-upload-files]');
  const dropzone = root.querySelector('[data-dropzone]');
  const selectedList = root.querySelector('[data-selected-files]');
  const selection = root.querySelector('[data-upload-selection]');
  const submit = root.querySelector('[data-upload-submit]');
  const error = root.querySelector('[data-upload-error]');
  const progress = root.querySelector('[data-upload-progress]');
  const maxFiles = Number(root.dataset.maxFiles || 25);
  let selected = [];
  let batch = null;
  let busy = false;

  const statusLabel = (status) => t(`upload.status.${status}`);
  const setError = (message) => {
    error.textContent = message || '';
    error.hidden = !message;
  };
  const updateFiles = () => {
    selectedList.replaceChildren();
    selected.forEach((file, index) => {
      const item = document.createElement('li');
      item.className = 'upload-file-row';
      item.innerHTML = `<span class="upload-file-type">${escapeHtml(file.name.split('.').pop().slice(0, 5).toUpperCase())}</span><span class="upload-file-name">${escapeHtml(file.name)}<small>${(file.size / 1048576).toFixed(2)} MB</small></span><button class="upload-remove-button" type="button" data-remove-file="${index}" aria-label="${escapeHtml(t('upload.remove'))}">×</button>`;
      selectedList.append(item);
    });
    selectedList.hidden = !selected.length;
    selection.hidden = !selected.length;
    selection.querySelector('[data-selected-count]').textContent = t('upload.selectedFiles', { count: selected.length });
    submit.disabled = busy || !selected.length;
    submit.textContent = t(busy ? 'upload.sending' : 'upload.submit', { count: selected.length });
    input.disabled = busy;
    dropzone.classList.toggle('upload-dropzone--disabled', busy);
    root.querySelector('[data-browse]').disabled = busy;
    root.querySelector('[data-clear-files]').disabled = busy;
  };
  const addFiles = (files) => {
    const incoming = [...files];
    if (selected.length + incoming.length > maxFiles) {
      setError(t('upload.tooManyFiles', { count: maxFiles }));
      return;
    }
    selected.push(...incoming);
    batch = null;
    progress.hidden = true;
    setError('');
    updateFiles();
  };
  input.addEventListener('change', () => {
    addFiles(input.files || []);
    input.value = '';
  });
  root.querySelector('[data-browse]').addEventListener('click', () => input.click());
  selectedList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-file]');
    if (!button) return;
    selected.splice(Number(button.dataset.removeFile), 1);
    updateFiles();
  });
  root.querySelector('[data-clear-files]').addEventListener('click', () => { selected = []; updateFiles(); });
  ['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    if (!busy) {
      dropzone.classList.add('upload-dropzone--active');
      root.querySelector('[data-drop-title]').textContent = t('upload.dropActive');
    }
  }));
  ['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    if (name === 'drop' && !busy) addFiles(event.dataTransfer.files || []);
    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove('upload-dropzone--active');
      root.querySelector('[data-drop-title]').textContent = t('upload.dropTitle');
    }
  }));
  const renderBatch = (value) => {
    batch = value;
    progress.hidden = false;
    root.querySelector('[data-batch-status]').textContent = statusLabel(value.status);
    root.querySelector('[data-batch-count]').textContent = t('upload.progressCount', value);
    const bar = root.querySelector('progress');
    bar.value = value.total ? Math.round((value.processed / value.total) * 100) : 0;
    const summary = root.querySelector('[data-batch-summary]');
    const done = ['completed', 'completed_with_errors'].includes(value.status);
    summary.hidden = !done;
    summary.textContent = value.failed ? t('upload.finishedWithErrors') : t('upload.finished');
    summary.className = `upload-summary${value.failed ? ' upload-summary--warning' : ''}`;
    const list = root.querySelector('[data-batch-files]');
    list.replaceChildren(...value.files.map((file) => {
      const item = document.createElement('li');
      item.className = 'upload-file-row';
      item.innerHTML = `<span class="upload-file-type">${escapeHtml(file.filename.split('.').pop().slice(0, 5).toUpperCase())}</span><span class="upload-file-name">${escapeHtml(file.filename)}${file.puzzleName ? `<small>${escapeHtml(file.puzzleName)}</small>` : ''}${file.message ? `<small class="upload-file-error">${escapeHtml(file.message)}</small>` : ''}</span><span class="upload-status upload-status--${escapeHtml(file.status)}">${escapeHtml(statusLabel(file.status))}</span>`;
      return item;
    }));
  };
  const poll = async () => {
    while (batch && ['queued', 'processing'].includes(batch.status)) {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      const next = await request(`/jokoak/upload/batches/${encodeURIComponent(batch.id)}`);
      if (next.error) {
        setError(next.message || t('upload.statusError'));
        break;
      }
      renderBatch(next);
    }
    busy = false;
    updateFiles();
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selected.length || busy) return;
    busy = true;
    updateFiles();
    setError('');
    const body = new FormData();
    selected.forEach((file) => body.append('filename', file));
    const result = await request('/jokoak/upload/batches', { method: 'POST', body });
    if (result.error) {
      busy = false;
      setError(result.message || t('upload.submitError'));
      updateFiles();
      return;
    }
    selected = [];
    input.value = '';
    renderBatch(result);
    updateFiles();
    await poll();
  });
}

function emptyGrid(voidGrid) {
  return voidGrid.map((row) => row.map((cell) => cell === '.' ? '.' : ''));
}
function inWord(word, row, col) {
  return word.dir === 'right'
    ? row === word.x && col >= word.y && col < word.y + word.length
    : col === word.y && row >= word.x && row < word.x + word.length;
}
function formatTimer(seconds = 0) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function initCrossword() {
  const root = document.querySelector('[data-crossword-game]');
  if (!root) return;
  const puzzle = state.data.puzzle;
  const gridRoot = root.querySelector('[data-crossword-grid]');
  const cells = [...gridRoot.querySelectorAll('[data-cell]')];
  const clueLists = [...root.querySelectorAll('[data-clues]')];
  const notice = root.querySelector('[data-game-notice]');
  const timer = root.querySelector('[data-game-timer]');
  const user = state.user;
  let grid = emptyGrid(puzzle.void_grid);
  let layout = root.dataset.defaultLayout || 'xedera';
  const americanMode = root.querySelector('[data-american-mode]');
  let selected = null;
  let scrolledWord = null;
  let feedback = Object.fromEntries((puzzle.cellResults || []).map((item) => [`${item.row}-${item.col}`, item]));
  let history = [];
  let redo = [];
  let completed = Boolean(puzzle.completed);
  let elapsed = puzzle.elapsedSeconds || 0;
  let timerHandle;
  let timerRunning = false;
  let saveHandle;
  const across = puzzle.words.filter((word) => word.dir === 'right').sort((a, b) => a.number - b.number);
  const down = puzzle.words.filter((word) => word.dir === 'down').sort((a, b) => a.number - b.number);
  const wordAt = (row, col, dir) => puzzle.words.find((word) => (!dir || word.dir === dir) && inWord(word, row, col));
  const selectedWord = () => selected && wordAt(selected.row, selected.col, selected.dir);
  const save = () => {
    if (!user || completed) return;
    const values = grid.flatMap((row, r) => row.map((value, c) => value && value !== '.' ? { row: r, col: c, value } : null).filter(Boolean));
    request(`/api/game/history/${encodeURIComponent(puzzle.id)}`, { method: 'POST', body: JSON.stringify({ cells: values }) });
  };
  const scheduleSave = () => {
    window.clearTimeout(saveHandle);
    saveHandle = window.setTimeout(save, 700);
  };
  const renderCell = (row, col) => {
    const cell = cells.find((item) => Number(item.dataset.row) === row && Number(item.dataset.col) === col);
    if (!cell) return;
    const value = grid[row][col];
    const item = feedback[`${row}-${col}`];
    cell.classList.toggle('selected_cell', selected?.row === row && selected?.col === col);
    cell.classList.toggle('focus_right', Boolean(selectedWord() && selected.dir === 'right' && inWord(selectedWord(), row, col)));
    cell.classList.toggle('focus_down', Boolean(selectedWord() && selected.dir === 'down' && inWord(selectedWord(), row, col)));
    cell.classList.toggle('right', Boolean(item?.correct));
    cell.classList.toggle('wrong', Boolean(item && !item.correct));
    cell.classList.toggle('empty-warn', Boolean(item?.empty));
    const char = cell.querySelector('.char');
    if (char) char.textContent = value === '.' ? '' : value;
    let hint = cell.querySelector('.cell-hint');
    if (item && !item.correct && item.correctLetter) {
      if (!hint) {
        hint = document.createElement('span');
        hint.className = 'cell-hint';
        cell.append(hint);
      }
      hint.textContent = item.correctLetter;
    } else hint?.remove();
  };
  const renderGrid = () => {
    cells.forEach((cell) => renderCell(Number(cell.dataset.row), Number(cell.dataset.col)));
    const word = selectedWord();
    root.querySelector('[data-active-clue]').textContent = word?.clue || '';
    root.querySelector('[data-undo]').disabled = !history.length || completed;
    root.querySelector('[data-redo]').disabled = !redo.length || completed;
    root.querySelectorAll('[data-clue-dir]').forEach((button) => {
      const active = word && word.dir === button.dataset.clueDir && word.x === Number(button.dataset.clueX) && word.y === Number(button.dataset.clueY);
      button.classList.toggle('selected_clue', Boolean(active));
    });
    const activeClueButton = root.querySelector('.clue-item.selected_clue');
    const cluePanel = activeClueButton?.closest('.clues_across, .clues_down');
    if (word !== scrolledWord && activeClueButton && cluePanel) {
      const panelRect = cluePanel.getBoundingClientRect();
      const clueRect = activeClueButton.getBoundingClientRect();
      cluePanel.scrollTo({ top: cluePanel.scrollTop + clueRect.top - panelRect.top - (cluePanel.clientHeight - clueRect.height) / 2, behavior: 'smooth' });
    }
    scrolledWord = word;
  };
  const renderClueLayout = () => {
    const block = root.querySelector('[data-grid-block]');
    block.classList.toggle('clue-layout-xedera', layout === 'xedera');
    block.classList.toggle('clue-layout-american', layout === 'american');
    if (americanMode) americanMode.checked = layout === 'american';
    clueLists.forEach((list) => {
      const words = list.dataset.clues === 'right' ? across : down;
      list.replaceChildren();
      if (layout === 'xedera') {
        const groups = new Map();
        words.forEach((word) => {
          const coordinate = word.dir === 'right' ? word.x : word.y;
          if (!groups.has(coordinate)) groups.set(coordinate, []);
          groups.get(coordinate).push(word);
        });
        [...groups.entries()].sort((a, b) => a[0] - b[0]).forEach(([coordinate, group]) => {
          group.sort((a, b) => a.dir === 'right' ? a.y - b.y : a.x - b.x).forEach((word, index) => {
            const row = document.createElement('div');
            row.className = 'ipuz-clue-row';
            if (index === 0) {
              const number = document.createElement('span');
              number.className = 'clue-num';
              number.textContent = `${coordinate + 1}.`;
              row.append(number);
            }
            row.append(makeClueButton(word, false));
            list.append(row);
          });
        });
      } else words.forEach((word) => list.append(makeClueButton(word, true)));
    });
  };
  const makeClueButton = (word, numbered) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `clue-item${numbered ? '' : ' clue-line'}`;
    button.dataset.clueDir = word.dir;
    button.dataset.clueX = word.x;
    button.dataset.clueY = word.y;
    if (numbered) {
      const number = document.createElement('span');
      number.className = 'clue-num';
      number.textContent = `${word.number}.`;
      button.append(number, document.createTextNode(' '));
    }
    button.append(document.createTextNode(word.clue?.trim() || '—'));
    button.addEventListener('click', () => setSelected({ row: word.x, col: word.y, dir: word.dir }));
    return button;
  };
  const setSelected = (next) => { selected = next; renderGrid(); };
  const setValue = (row, col, value, record = true) => {
    if (completed || puzzle.void_grid[row]?.[col] === '.') return;
    const previous = grid[row][col];
    if (previous === value) return;
    grid[row][col] = value;
    if (record) { history.push({ row, col, previous, value }); redo = []; }
    delete feedback[`${row}-${col}`];
    renderGrid();
    scheduleSave();
  };
  const move = (row, col, dir, backwards = false) => {
    const word = wordAt(row, col, dir);
    if (!word) return;
    const nextRow = row + (dir === 'down' ? (backwards ? -1 : 1) : 0);
    const nextCol = col + (dir === 'right' ? (backwards ? -1 : 1) : 0);
    if (inWord(word, nextRow, nextCol)) setSelected({ row: nextRow, col: nextCol, dir });
  };
  const chooseCell = (row, col) => {
    const alternate = selected?.dir === 'right' ? 'down' : 'right';
    const nextDir = selected?.row === row && selected?.col === col && wordAt(row, col, alternate)
      ? alternate : wordAt(row, col, 'right') ? 'right' : 'down';
    setSelected({ row, col, dir: nextDir });
  };
  const applyResults = (items) => {
    items.forEach((item) => { feedback[`${item.row}-${item.col}`] = item; });
    renderGrid();
  };
  const cellsForWord = (word) => Array.from({ length: word.length }, (_, i) => {
    const row = word.x + (word.dir === 'down' ? i : 0);
    const col = word.y + (word.dir === 'right' ? i : 0);
    return { row, col, value: grid[row][col] };
  });
  const activeButton = (action, disabled = false) => {
    const button = root.querySelector(`[data-action="${action}"]`);
    if (button) button.disabled = disabled || completed;
  };
  const setCompleted = () => {
    completed = true;
    timerRunning = false;
    window.clearInterval(timerHandle);
    root.querySelector('[data-game-buttons]')?.classList.add('game-actions--finished');
    const restartButton = root.querySelector('[data-action="restart"]');
    if (restartButton) restartButton.hidden = false;
    root.querySelectorAll('[data-action]').forEach((button) => { if (button.dataset.action !== 'restart') button.disabled = true; });
    root.querySelector('.grid')?.classList.add('grid-frozen');
  };
  const activeWordRequired = () => {
    const word = selectedWord();
    if (!word) notify(notice, t('game.selectWord'), 'warning');
    return word;
  };

  gridRoot.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-cell]');
    if (cell && !cell.classList.contains('black')) chooseCell(Number(cell.dataset.row), Number(cell.dataset.col));
  });
  americanMode?.addEventListener('change', () => {
    layout = americanMode.checked ? 'american' : 'xedera';
    renderClueLayout();
    renderGrid();
  });
  root.querySelector('[data-undo]').addEventListener('click', () => {
    const action = history.pop(); if (!action) return;
    (action.batch || [action]).forEach((item) => { grid[item.row][item.col] = item.previous; });
    redo.push(action); renderGrid(); scheduleSave();
  });
  root.querySelector('[data-redo]').addEventListener('click', () => {
    const action = redo.pop(); if (!action) return;
    (action.batch || [action]).forEach((item) => { grid[item.row][item.col] = item.value; });
    history.push(action); renderGrid(); scheduleSave();
  });
  root.querySelector('[data-action="clear-grid"]').addEventListener('click', () => {
    const action = [];
    grid.forEach((row, r) => row.forEach((value, c) => { if (value && value !== '.') action.push({ row: r, col: c, previous: value, value: '' }); }));
    if (!action.length) return;
    history.push({ batch: action }); redo = []; grid = emptyGrid(puzzle.void_grid); feedback = {}; renderGrid(); scheduleSave();
  });
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.dataset.action === 'clear-grid' || button.disabled) return;
    const action = button.dataset.action;
    const word = selectedWord();
    if (action === 'restart') {
      const result = await request(`/api/game/reset/${encodeURIComponent(puzzle.id)}`, { method: 'DELETE' });
      if (result.error) return notify(notice, result.message || t('game.restartFailed'), 'error');
      window.location.reload();
      return;
    }
    if (action === 'check-cell') {
      if (!selected) return notify(notice, t('game.selectWord'), 'warning');
      if (!grid[selected.row][selected.col]) return notify(notice, t('game.emptyCell'), 'warning');
      const result = await request('/api/game/check-cell', { method: 'POST', body: JSON.stringify({ row: selected.row, col: selected.col, value: grid[selected.row][selected.col] }) });
      if (result.error) return notify(notice, result.message, 'error');
      applyResults([{ row: selected.row, col: selected.col, correct: result.correct, correctLetter: result.correctLetter }]);
      return notify(notice, t(result.correct ? 'game.correct' : 'game.incorrect'), result.correct ? 'success' : 'error');
    }
    if (action === 'check-word') {
      if (!activeWordRequired()) return;
      const result = await request('/api/game/check-word', { method: 'POST', body: JSON.stringify({ wordDir: word.dir, wordX: word.x, wordY: word.y, cells: cellsForWord(word) }) });
      if (result.error) return notify(notice, result.message, 'error');
      applyResults(result.cellResults); return notify(notice, t(result.correct ? 'game.wordCorrect' : 'game.wordIncorrect'), result.correct ? 'success' : 'error');
    }
    if (action === 'solve-cell') {
      if (!selected) return notify(notice, t('game.selectWord'), 'warning');
      const result = await request('/api/game/solve-cell', { method: 'POST', body: JSON.stringify({ row: selected.row, col: selected.col }) });
      if (result.error) return notify(notice, result.message, 'error');
      setValue(selected.row, selected.col, result.value); applyResults([{ row: selected.row, col: selected.col, correct: true }]); return notify(notice, t('game.hintShown'));
    }
    if (action === 'solve-word') {
      if (!activeWordRequired()) return;
      const result = await request('/api/game/solve-word', { method: 'POST', body: JSON.stringify({ wordDir: word.dir, wordX: word.x, wordY: word.y }) });
      if (result.error) return notify(notice, result.message, 'error');
      result.solvedLetters.forEach((item) => { grid[item.row][item.col] = item.value; });
      result.solvedLetters.forEach((item) => { feedback[`${item.row}-${item.col}`] = { ...item, correct: true }; });
      history = []; redo = []; renderGrid(); scheduleSave(); return notify(notice, t('game.wordShown'));
    }
    if (action === 'solve-grid') {
      if (!window.confirm(t('game.solveConfirm'))) return;
      const result = await request('/api/game/solve-grid', { method: 'POST' });
      if (result.error) return notify(notice, result.message, 'error');
      result.solvedLetters.forEach((item) => { grid[item.row][item.col] = item.value; });
      history = []; redo = []; renderGrid(); setCompleted(); return notify(notice, t('game.gridSolved'));
    }
    if (action === 'check-grid') {
      const values = grid.flatMap((row, r) => row.map((value, c) => value !== '.' ? { row: r, col: c, value } : null).filter(Boolean));
      const result = await request('/api/game/check-grid', { method: 'POST', body: JSON.stringify({ cells: values }) });
      if (result.error) return notify(notice, result.message, 'error');
      applyResults(result.cellResults); setCompleted();
      const duration = result.stats?.durationSec ?? elapsed;
      elapsed = duration;
      timerRunning = false;
      window.clearInterval(timerHandle);
      const errorText = t(result.stats?.errors === 1 ? 'game.oneError' : 'game.errorCount', { count: result.stats?.errors });
      notify(notice, t(result.complete ? 'game.completedStats' : 'game.submittedStats', { time: formatTimer(duration), errors: errorText }), result.complete ? 'success' : 'info', true);
    }
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-clue-dir]');
    if (button) setSelected({ row: Number(button.dataset.clueX), col: Number(button.dataset.clueY), dir: button.dataset.clueDir });
  });
  document.addEventListener('keydown', (event) => {
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (completed || !selected || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[event.key];
      const dir = delta[0] ? 'down' : 'right';
      if (selected.dir !== dir && wordAt(selected.row, selected.col, dir)) return setSelected({ ...selected, dir });
      let row = selected.row + delta[0], col = selected.col + delta[1];
      while (row >= 0 && row < puzzle.height && col >= 0 && col < puzzle.width && puzzle.void_grid[row][col] === '.') { row += delta[0]; col += delta[1]; }
      if (row >= 0 && row < puzzle.height && col >= 0 && col < puzzle.width) setSelected({ row, col, dir: wordAt(row, col, dir) ? dir : (dir === 'right' ? 'down' : 'right') });
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (grid[selected.row][selected.col]) setValue(selected.row, selected.col, ''); else move(selected.row, selected.col, selected.dir, true);
      return;
    }
    const letter = normalizeLetter(event.key);
    if (letter) {
      event.preventDefault();
      setValue(selected.row, selected.col, letter);
      move(selected.row, selected.col, selected.dir);
    }
  });
  document.addEventListener('visibilitychange', async () => {
    if (!user || completed) return;
    if (document.visibilityState === 'hidden') {
      await request('/api/game/timer/pause', { method: 'POST' });
      timerRunning = false;
      window.clearInterval(timerHandle);
      save();
    } else {
      const result = await request('/api/game/timer/resume', { method: 'POST' });
      if (!result.error) {
        elapsed = result.elapsedSeconds || elapsed;
        timerRunning = true;
        timerHandle = window.setInterval(() => { elapsed += 1; if (timer) timer.textContent = formatTimer(elapsed); }, 1000);
      }
    }
  });
  root.querySelectorAll('[data-action]').forEach((button) => { if (completed && button.dataset.action !== 'restart') button.disabled = true; });
  if (completed) setCompleted();
  renderClueLayout();
  renderGrid();
  request(`/api/game/history/${encodeURIComponent(puzzle.id)}`).then((result) => {
    if (result.cells) result.cells.forEach(({ row, col, value }) => {
      const letter = normalizeLetter(value);
      if (letter && grid[row]?.[col] != null && grid[row][col] !== '.') grid[row][col] = letter;
    });
    renderGrid();
  });
  if (user && !completed) {
    request('/api/game/status').then((result) => {
      if (result.error || timerRunning) return;
      elapsed = result.game?.elapsedSeconds || elapsed;
      timerRunning = true;
      timerHandle = window.setInterval(() => { elapsed += 1; if (timer) timer.textContent = formatTimer(elapsed); }, 1000);
    });
  }
  if (timer) timer.textContent = formatTimer(elapsed);
  window.addEventListener('pagehide', () => { window.clearInterval(timerHandle); window.clearTimeout(saveHandle); });
}

function parseSpiralDefinitions(spiral, count) {
  const normalize = (entry, dir) => {
    const first = Number(entry.start), last = Number(entry.end);
    if (!Number.isInteger(first) || !Number.isInteger(last)) return null;
    const start = Math.max(1, Math.min(first, last));
    const end = Math.min(count, Math.max(first, last));
    if (start > end) return null;
    return { start, end, anchor: dir === 'outward' ? end : start, text: String(entry.text || '').trim() };
  };
  if (spiral.definitions && (spiral.definitions.inward || spiral.definitions.outward)) {
    return Object.fromEntries(['inward', 'outward'].map((dir) => [dir, (spiral.definitions[dir] || []).map((item) => normalize(item, dir)).filter(Boolean)]));
  }
  const result = { inward: [], outward: [] };
  (spiral.clues || []).forEach((line) => {
    const match = String(line).trim().match(/^(\d+)\s*-\s*(\d+)\s*(.*)$/);
    if (!match) return;
    const dir = Number(match[1]) > Number(match[2]) ? 'outward' : 'inward';
    const item = normalize({ start: match[1], end: match[2], text: match[3] }, dir);
    if (item) result[dir].push(item);
  });
  return result;
}

function initSpiralGame() {
  const root = document.querySelector('[data-spiral-game]');
  if (!root) return;
  const puzzle = state.data.puzzle;
  const cells = [...((puzzle.spiral && puzzle.spiral.cells) || [])].sort((a, b) => a.index - b.index);
  const definitions = parseSpiralDefinitions(puzzle.spiral || {}, cells.length);
  const notice = root.querySelector('[data-game-notice]');
  let values = Array(cells.length).fill('');
  let selected = 1;
  let direction = 'inward';
  let activeIndex = 0;
  let results = {};
  let saveHandle;
  const matching = () => definitions[direction].filter((item) => selected >= item.start && selected <= item.end);
  const active = () => matching()[activeIndex] || matching()[0];
  const render = () => {
    root.querySelectorAll('[data-spiral-cell]').forEach((path) => {
      const index = Number(path.dataset.spiralCell);
      path.classList.toggle('is-selected', selected === index);
      path.classList.toggle('is-active', Boolean(active() && index >= active().start && index <= active().end));
      path.classList.toggle('is-correct', Boolean(results[index]?.correct));
      path.classList.toggle('is-wrong', Boolean(results[index] && !results[index].correct));
    });
    root.querySelectorAll('[data-spiral-letter]').forEach((label) => { label.textContent = values[Number(label.dataset.spiralLetter) - 1] || ''; });
    root.querySelector('[data-spiral-progress]').textContent = values.filter(Boolean).length;
    root.querySelectorAll('[data-direction]').forEach((button) => button.classList.toggle('is-active', button.dataset.direction === direction));
    root.querySelectorAll('[data-definition-list]').forEach((list) => list.querySelectorAll('[data-definition-index]').forEach((button) => {
      button.classList.toggle('is-selected', list.dataset.definitionList === direction && active() === definitions[list.dataset.definitionList][Number(button.dataset.definitionIndex)]);
    }));
    const selectedDefinition = root.querySelector('.spiral-clue-item.is-selected');
    const definitionPanel = selectedDefinition?.closest('.spiral-clues-list');
    if (selectedDefinition && definitionPanel) {
      const itemRect = selectedDefinition.getBoundingClientRect();
      const panelRect = definitionPanel.getBoundingClientRect();
      if (itemRect.top < panelRect.top || itemRect.bottom > panelRect.bottom)
        definitionPanel.scrollTo({ top: definitionPanel.scrollTop + itemRect.top - panelRect.top - (definitionPanel.clientHeight - itemRect.height) / 2, behavior: 'smooth' });
    }
  };
  root.querySelectorAll('[data-definition-list]').forEach((list) => {
    const dir = list.dataset.definitionList;
    const container = list.querySelector('.spiral-clues-list');
    container.replaceChildren(...definitions[dir].map((definition, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'spiral-clue-item';
      button.dataset.direction = dir; button.dataset.definitionIndex = index;
      button.textContent = `${dir === 'outward' ? definition.end : definition.start}-${dir === 'outward' ? definition.start : definition.end}${definition.text ? ` ${definition.text}` : ''}`;
      button.addEventListener('click', () => { direction = dir; selected = definition.anchor; activeIndex = index; render(); });
      return button;
    }));
  });
  const save = () => {
    if (!state.user) return;
    const cellsPayload = values.flatMap((value, index) => value ? [{ row: 0, col: index, value }] : []);
    request(`/api/game/history/${encodeURIComponent(puzzle.id)}`, { method: 'POST', body: JSON.stringify({ cells: cellsPayload }) });
  };
  const update = (index, value) => {
    if (puzzle.completed) return;
    values[index - 1] = value;
    delete results[index];
    window.clearTimeout(saveHandle);
    saveHandle = window.setTimeout(save, 600);
    render();
  };
  const selectCell = (index, cycle = false, preferred = null) => {
    const candidates = definitions[direction].filter((item) => index >= item.start && index <= item.end);
    const current = candidates.indexOf(active());
    const preferredIndex = candidates.indexOf(preferred);
    activeIndex = cycle && index === selected && candidates.length > 1 && current >= 0 ? (current + 1) % candidates.length : preferredIndex >= 0 ? preferredIndex : 0;
    selected = index;
    render();
  };
  root.querySelectorAll('[data-spiral-cell]').forEach((path) => path.addEventListener('click', () => selectCell(Number(path.dataset.spiralCell), true)));
  root.querySelectorAll('[data-direction]').forEach((button) => button.addEventListener('click', () => { direction = button.dataset.direction; activeIndex = 0; render(); }));
  document.addEventListener('keydown', (event) => {
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (puzzle.completed || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
    const step = direction === 'inward' ? 1 : -1;
    const next = (offset) => Math.min(cells.length, Math.max(1, selected + offset));
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const index = next((event.key === 'ArrowRight' ? 1 : -1) * step);
      selectCell(index);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      if (values[selected - 1]) update(selected, '');
      else { const index = next(-step); selectCell(index); update(index, ''); }
    } else if (normalizeLetter(event.key)) {
      event.preventDefault();
      const definition = active();
      update(selected, normalizeLetter(event.key));
      selectCell(next(step), false, definition);
    }
  });
  root.querySelector('[data-action="clear-grid"]').addEventListener('click', () => {
    values = Array(cells.length).fill(''); results = {}; selected = 1; activeIndex = 0; render(); save();
  });
  root.querySelector('[data-action="check-grid"]').addEventListener('click', async () => {
    const answer = await request('/api/game/check-grid', { method: 'POST', body: JSON.stringify({ cells: values.map((value, col) => ({ row: 0, col, value })) }) });
    if (answer.error) return notify(notice, answer.message, 'error');
    results = Object.fromEntries(answer.cellResults.map((item) => [item.col + 1, item]));
    render();
    notify(notice, answer.complete ? 'Zorionak! Espirala osatu duzu.' : 'Egiaztapena bidalia.', answer.complete ? 'success' : 'info');
  });
  root.querySelector('[data-action="restart"]')?.addEventListener('click', async () => {
    const answer = await request(`/api/game/reset/${encodeURIComponent(puzzle.id)}`, { method: 'DELETE' });
    if (!answer.error) window.location.reload();
  });
  request(`/api/game/history/${encodeURIComponent(puzzle.id)}`).then((answer) => {
    (answer.cells || []).forEach(({ row, col, value }) => {
      const letter = normalizeLetter(value);
      if (row === 0 && values[col] != null && letter) values[col] = letter;
    });
    render();
  });
  render();
}

const builderInitial = { title: '', author: '', answer: '', cellCount: 64, cellSize: 60, showNumbers: true, inwardDefs: [], outwardDefs: [] };
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function normalizeBuilderState(saved = {}) {
  const stateValue = { ...builderInitial, ...saved };
  const parse = (lines) => String(lines || '').split('\n').map((line) => {
    const match = line.trim().match(/^(-?\d+)\s*-\s*(-?\d+)\s*(.*)$/);
    return match ? { start: Number(match[1]), end: Number(match[2]), text: match[3] } : null;
  }).filter(Boolean);
  const normalize = (entries) => (Array.isArray(entries) ? entries : []).map((item) => ({ start: item.start ?? 1, end: item.end ?? 1, text: String(item.text || '') }));
  stateValue.inwardDefs = normalize(saved.inwardDefs || parse(saved.inward));
  stateValue.outwardDefs = normalize(saved.outwardDefs || parse(saved.outward));
  stateValue.cellCount = clamp(Number(stateValue.cellCount) || 1, 1, 400);
  stateValue.cellSize = clamp(Number(stateValue.cellSize) || 12, 12, 120);
  return stateValue;
}
function builderLines(definitions, direction) {
  const ordered = direction === 'outward' ? [...definitions].reverse() : definitions;
  return ordered.map((item) => {
    const start = direction === 'outward' ? item.end : item.start;
    const end = direction === 'outward' ? item.start : item.end;
    return `${start}-${end}${item.text ? ` ${item.text}` : ''}`;
  });
}
function builderWord(answer, start, end) {
  const letters = Array.from(answer), step = start <= end ? 1 : -1, result = [];
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) result.push(letters[i - 1] || '');
  return result.join('');
}
function spiralPoint(cx, cy, radius, slope, thetaStart, theta, offset = 0) {
  const r = radius - slope * (theta - thetaStart) - offset;
  return { x: cx + Math.cos(theta) * r, y: cy + Math.sin(theta) * r };
}
function pathFrom(points) {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}
function buildSpiral(count, size) {
  const cx = 380, cy = 380, outerRadius = 286;
  const stripWidth = clamp(size * 0.82, 20, 56);
  const turns = clamp(clamp(count / 15, 3, 7.2), 2.2, Math.max(2.2, (outerRadius - 64) / stripWidth));
  const thetaSpan = turns * Math.PI * 2, cellAngle = thetaSpan / count;
  const thetaStart = (-Math.PI * 3) / 4 - cellAngle / 2, slope = (turns * stripWidth) / thetaSpan;
  const samples = [], sampleCount = Math.max(1800, count * 80);
  for (let index = 0; index <= sampleCount; index += 1) {
    const theta = thetaStart + thetaSpan * (index / sampleCount), point = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta);
    const previous = samples.at(-1);
    samples.push({ ...point, theta, distance: previous ? previous.distance + Math.hypot(point.x - previous.x, point.y - previous.y) : 0 });
  }
  const sampleAt = (distance, from = 0) => {
    let index = clamp(from, 0, samples.length - 2), target = clamp(distance, 0, samples.at(-1).distance);
    while (index < samples.length - 2 && samples[index + 1].distance < target) index += 1;
    const start = samples[index], end = samples[index + 1];
    return { theta: start.theta + (end.theta - start.theta) * clamp((target - start.distance) / Math.max(0.0001, end.distance - start.distance), 0, 1), index };
  };
  const arc = (start, end, offset) => {
    const segments = Math.max(1, Math.ceil(Math.abs(end - start) / 0.07));
    return Array.from({ length: segments + 1 }, (_, index) => spiralPoint(cx, cy, outerRadius, slope, thetaStart, start + (end - start) * index / segments, offset));
  };
  const cellLength = samples.at(-1).distance / count;
  let searchIndex = 0;
  const cells = Array.from({ length: count }, (_, offset) => {
    const start = sampleAt(offset * cellLength, searchIndex), end = sampleAt((offset + 1) * cellLength, start.index);
    searchIndex = start.index;
    const outer = arc(start.theta, end.theta, 0), inner = arc(end.theta, start.theta, stripWidth);
    const innerStart = spiralPoint(cx, cy, outerRadius, slope, thetaStart, start.theta, stripWidth);
    const innerEnd = spiralPoint(cx, cy, outerRadius, slope, thetaStart, end.theta, stripWidth);
    const theta = (start.theta + end.theta) / 2;
    const letter = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, stripWidth * 0.56);
    const label = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, stripWidth * 0.2);
    return { index: offset + 1, path: `${pathFrom([...outer, innerEnd, ...inner.slice(1), innerStart])} Z`, x: Number(letter.x.toFixed(2)), y: Number(letter.y.toFixed(2)), labelX: Number(label.x.toFixed(2)), labelY: Number(label.y.toFixed(2)) };
  });
  return { cells, guidePath: pathFrom(samples.filter((_, index) => index % 3 === 0)) };
}
function initSpiralBuilder() {
  const root = document.querySelector('[data-spiral-builder]');
  if (!root) return;
  let builderState;
  try { builderState = normalizeBuilderState(JSON.parse(localStorage.getItem('hitzgurutzatuak-spiral-draft') || '{}')); }
  catch { builderState = { ...builderInitial }; }
  const $ = (selector) => root.querySelector(selector);
  const fields = {
    title: $('[data-field="title"]'), author: $('[data-field="author"]'),
    cellCount: $('[data-field="cellCount"]'), cellSize: $('[data-field="cellSize"]'),
    answer: $('[data-field="answer"]'), showNumbers: $('[data-field="showNumbers"]')
  };
  const filename = (value) => String(value || 'espirala').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'espirala';
  const lines = (direction) => builderLines(builderState[`${direction}Defs`], direction);
  const valid = () => Array.from(builderState.answer).length === builderState.cellCount;
  const updateStatus = () => {
    const status = $('[data-builder-status]'), length = Array.from(builderState.answer).length;
    status.classList.toggle('text-danger', !valid());
    status.textContent = valid() ? t('spiralBuilder.downloadReady') : `${t('spiralBuilder.validateLength')} (${length}/${builderState.cellCount})`;
  };
  const renderEditors = () => ['inward', 'outward'].forEach((direction) => {
    const container = $(`[data-definition-rows="${direction}"]`);
    const defs = direction === 'outward' ? [...builderState.outwardDefs].reverse() : builderState.inwardDefs;
    container.replaceChildren(...defs.map((definition, displayIndex) => {
      const index = direction === 'outward' ? defs.length - displayIndex - 1 : displayIndex;
      const start = direction === 'outward' ? definition.end : definition.start;
      const end = direction === 'outward' ? definition.start : definition.end;
      const row = document.createElement('div'); row.className = 'clue-row';
      row.innerHTML = `<div class="clue-row-head"><input class="form-control clue-start" type="number" data-def-field="start" data-direction="${direction}" data-index="${index}" value="${escapeHtml(start)}" aria-label="${escapeHtml(t('spiralBuilder.startCell'))}"><input class="form-control clue-end" type="number" data-def-field="end" data-direction="${direction}" data-index="${index}" value="${escapeHtml(end)}" aria-label="${escapeHtml(t('spiralBuilder.endCell'))}"><button class="btn btn-outline-danger btn-sm clue-remove" type="button" data-remove-definition="${direction}" data-index="${index}">${escapeHtml(t('spiralBuilder.removeDefinition'))}</button></div><textarea class="form-control clue-text" data-def-field="text" data-direction="${direction}" data-index="${index}" placeholder="${escapeHtml(t('spiralBuilder.definition'))}">${escapeHtml(definition.text)}</textarea><div class="clue-word-preview">${escapeHtml(t('spiralBuilder.wordPreview'))}: ${escapeHtml(builderWord(builderState.answer, start, end))}</div>`;
      return row;
    }));
  });
  const renderPreview = () => {
    const spiral = buildSpiral(builderState.cellCount, builderState.cellSize), letters = Array.from(builderState.answer);
    const inward = lines('inward'), outward = lines('outward');
    const clues = (items, title) => `<div class="spiral-clue-column"><h2>${escapeHtml(title)}</h2><ol>${items.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol></div>`;
    $('[data-builder-preview]').innerHTML = `<article class="spiral-page"><header class="spiral-page-header"><div class="spiral-page-header__title">${escapeHtml(builderState.title || 'Espirala')}</div><div class="spiral-page-header__author">${escapeHtml(builderState.author || t('spiralBuilder.authorField'))}</div></header><div class="spiral-page-body"><div class="spiral-page-art"><svg class="spiral-builder-preview" viewBox="0 0 760 760" role="img" aria-label="${escapeHtml(t('spiralBuilder.previewTitle'))}"><path class="spiral-preview-accent" d="${spiral.guidePath}"/>${spiral.cells.map((cell) => `<path d="${cell.path}" class="spiral-preview-cell${cell.index % 2 === 0 ? ' is-odd' : ''}"/>`).join('')}${builderState.showNumbers ? spiral.cells.map((cell) => `<text class="spiral-preview-number" x="${cell.labelX}" y="${cell.labelY}" text-anchor="middle" dominant-baseline="middle">${cell.index}</text>`).join('') : ''}${spiral.cells.map((cell) => `<text class="spiral-preview-letter" x="${cell.x}" y="${cell.y}" text-anchor="middle" dominant-baseline="central">${escapeHtml(letters[cell.index - 1] || '')}</text>`).join('')}</svg></div></div><div class="spiral-page-clues">${clues(inward, t('spiralBuilder.inward'))}${clues(outward, t('spiralBuilder.outward'))}</div></article>`;
    updateStatus();
  };
  const syncFields = () => {
    Object.entries(fields).forEach(([name, field]) => {
      if (name === 'showNumbers') field.checked = builderState.showNumbers;
      else field.value = builderState[name];
    });
  };
  const saveDraft = () => localStorage.setItem('hitzgurutzatuak-spiral-draft', JSON.stringify(builderState));
  const payload = () => ({ kind: 'hitzgurutzatuak/spiral/v1', format: 'spl', title: builderState.title || 'Espirala', author: builderState.author || 'Ezezaguna', viewBox: '0 0 760 760', answer: builderState.answer, clues: [...lines('inward'), ...lines('outward')], cells: buildSpiral(builderState.cellCount, builderState.cellSize).cells });
  const downloadFile = (name, content, type) => {
    const url = URL.createObjectURL(new Blob([content], { type })), link = document.createElement('a');
    link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
  };
  root.addEventListener('input', (event) => {
    const field = event.target.dataset.field;
    if (field) {
      if (field === 'cellCount') {
        builderState.cellCount = clamp(Number(event.target.value) || 1, 1, 400);
        builderState.answer = Array.from(builderState.answer).slice(0, builderState.cellCount).join('');
        fields.cellCount.value = builderState.cellCount; fields.answer.value = builderState.answer;
      } else if (field === 'cellSize') builderState.cellSize = clamp(Number(event.target.value) || 12, 12, 120);
      else if (field === 'answer') builderState.answer = Array.from(event.target.value.toLocaleUpperCase('eu').replace(/\s+/g, '')).slice(0, builderState.cellCount).join('');
      else if (field === 'showNumbers') builderState.showNumbers = event.target.checked;
      else builderState[field] = event.target.value;
      renderPreview();
      if (field === 'answer' || field === 'cellCount') {
        fields.answer.value = builderState.answer;
        root.querySelectorAll('.clue-row').forEach((row) => {
          const start = Number(row.querySelector('.clue-start').value), end = Number(row.querySelector('.clue-end').value);
          row.querySelector('.clue-word-preview').textContent = `${t('spiralBuilder.wordPreview')}: ${builderWord(builderState.answer, start, end)}`;
        });
      }
      return;
    }
    if (event.target.matches('[data-def-field]')) {
      const { direction, index, defField } = event.target.dataset;
      const definitions = builderState[`${direction}Defs`], definition = definitions[Number(index)];
      if (!definition) return;
      const mapped = direction === 'outward' && defField === 'start' ? 'end' : direction === 'outward' && defField === 'end' ? 'start' : defField;
      definition[mapped] = defField === 'text' ? event.target.value : event.target.value === '' ? '' : Number(event.target.value);
      renderPreview();
      const row = event.target.closest('.clue-row');
      const start = direction === 'outward' ? definition.end : definition.start, end = direction === 'outward' ? definition.start : definition.end;
      row.querySelector('.clue-word-preview').textContent = `${t('spiralBuilder.wordPreview')}: ${builderWord(builderState.answer, start, end)}`;
    }
  });
  root.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add-definition]');
    const remove = event.target.closest('[data-remove-definition]');
    const action = event.target.closest('[data-builder-action]');
    if (add) {
      const direction = add.dataset.addDefinition;
      builderState[`${direction}Defs`].push({ start: 1, end: builderState.cellCount, text: '' });
      renderEditors(); renderPreview();
    } else if (remove) {
      builderState[`${remove.dataset.removeDefinition}Defs`].splice(Number(remove.dataset.index), 1);
      renderEditors(); renderPreview();
    } else if (action?.dataset.builderAction === 'save') saveDraft();
    else if (action?.dataset.builderAction === 'load') {
      try { builderState = normalizeBuilderState(JSON.parse(localStorage.getItem('hitzgurutzatuak-spiral-draft') || '{}')); syncFields(); renderEditors(); renderPreview(); }
      catch { window.alert('Ezin izan da zirriborroa kargatu.'); }
    } else if (action?.dataset.builderAction === 'reset') {
      builderState = { ...builderInitial, inwardDefs: [], outwardDefs: [] }; syncFields(); renderEditors(); renderPreview();
    } else if (action?.dataset.builderAction === 'download' || action?.dataset.builderAction === 'download-html') {
      if (!valid()) return window.alert(t('spiralBuilder.validateLength'));
      const data = payload();
      if (action.dataset.builderAction === 'download') downloadFile(`${filename(data.title)}.spl`, `${JSON.stringify(data, null, 2)}\n`, 'application/json;charset=utf-8');
      else {
        const paths = data.cells.map((cell) => `<path d="${cell.path}" fill="#fff" stroke="#222"/><text x="${cell.x}" y="${cell.y}" text-anchor="middle" dominant-baseline="central">${escapeHtml(data.answer[cell.index - 1])}</text>`).join('');
        downloadFile(`${filename(data.title)}.html`, `<!doctype html><html lang="eu"><meta charset="utf-8"><title>${escapeHtml(data.title)}</title><body><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.author)}</p><svg viewBox="${data.viewBox}" width="760">${paths}</svg><ol>${data.clues.map((clue) => `<li>${escapeHtml(clue)}</li>`).join('')}</ol></body></html>`, 'text/html;charset=utf-8');
      }
    }
  });
  $('[data-builder-import]').addEventListener('change', (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        builderState = normalizeBuilderState({ ...builderInitial, title: imported.title, author: imported.author, answer: String(imported.answer || '').toLocaleUpperCase('eu'), cellCount: imported.cells?.length || 64, inward: (imported.clues || []).join('\n') });
        syncFields(); renderEditors(); renderPreview();
      } catch { window.alert('Ezin izan da SPL fitxategia irakurri.'); }
      event.target.value = '';
    };
    reader.readAsText(file);
  });
  syncFields(); renderEditors(); renderPreview();
}

initCatalog();
initUpload();
initCrossword();
initSpiralGame();
initSpiralBuilder();
