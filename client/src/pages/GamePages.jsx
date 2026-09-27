import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gameApi } from '../lib/api';
import { formatDuration } from '../lib/i18n';

const keyFor = (row, col) => `${row}-${col}`;

function emptyGrid(voidGrid) {
  return voidGrid.map(row => row.map(cell => cell === '.' ? '.' : ''));
}

function isCellInWord(word, row, col) {
  return word.dir === 'right'
    ? row === word.x && col >= word.y && col < word.y + word.length
    : col === word.y && row >= word.x && row < word.x + word.length;
}

function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const remaining = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function CrosswordGame({ puzzle, user, t }) {
  const [grid, setGrid] = useState(() => emptyGrid(puzzle.void_grid));
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState({}); const [notice, setNotice] = useState(null);
  const [history, setHistory] = useState([]); const [redo, setRedo] = useState([]); const [completed, setCompleted] = useState(Boolean(puzzle.completed));
  const [elapsed, setElapsed] = useState(puzzle.elapsedSeconds || 0); const [timerStart, setTimerStart] = useState(null);
  const saveTimeout = useRef(null);
  const activeWord = useMemo(() => selected && (puzzle.words.find(word => word.dir === selected.dir && isCellInWord(word, selected.row, selected.col)) || puzzle.words.find(word => isCellInWord(word, selected.row, selected.col))), [puzzle.words, selected]);
  const activeClue = activeWord?.clue || '';

  useEffect(() => {
    const selectedClue = document.querySelector('.clue-item.selected_clue, .clues_across > .selected_clue, .clues_down > .selected_clue');
    const panel = selectedClue?.closest('.clues_across, .clues_down');
    if (!selectedClue || !panel) return;
    const panelRect = panel.getBoundingClientRect();
    const clueRect = selectedClue.getBoundingClientRect();
    panel.scrollTo({ top: panel.scrollTop + clueRect.top - panelRect.top - (panel.clientHeight - clueRect.height) / 2, behavior: 'smooth' });
  }, [activeWord]);

  const notify = useCallback((message, type = 'info', permanent = false) => {
    setNotice({ message, type });
    if (!permanent) window.setTimeout(() => setNotice(current => current?.message === message ? null : current), 3000);
  }, []);
  const save = useCallback(nextGrid => {
    if (!user || completed) return;
    const cells = nextGrid.flatMap((row, rowIndex) => row.map((value, col) => value && value !== '.' ? { row: rowIndex, col, value } : null).filter(Boolean));
    gameApi.save(puzzle.id, cells);
  }, [completed, puzzle.id, user]);
  const scheduleSave = useCallback(nextGrid => {
    window.clearTimeout(saveTimeout.current); saveTimeout.current = window.setTimeout(() => save(nextGrid), 700);
  }, [save]);

  useEffect(() => {
    if (puzzle.completed) {
      const results = Object.fromEntries((puzzle.cellResults || []).map(result => [keyFor(result.row, result.col), result]));
      setFeedback(results);
      gameApi.load(puzzle.id).then(result => applySaved(result.cells));
      return;
    }
    gameApi.load(puzzle.id).then(result => applySaved(result.cells));
    if (!user) return;
    gameApi.status().then(result => {
      if (!result.error && result.game) { setElapsed(result.game.elapsedSeconds || 0); setTimerStart(Date.now()); }
    });
  }, []);

  const applySaved = cells => {
    if (!Array.isArray(cells)) return;
    setGrid(current => current.map((row, rowIndex) => row.map((value, col) => cells.find(cell => cell.row === rowIndex && cell.col === col)?.value || value)));
  };
  useEffect(() => {
    if (!timerStart || completed) return;
    const interval = window.setInterval(() => setElapsed(base => base + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerStart, completed]);
  useEffect(() => {
    const handleVisibility = () => {
      if (!user || completed) return;
      if (document.visibilityState === 'hidden') { gameApi.pause(); setTimerStart(null); save(grid); }
      else gameApi.resume().then(result => { if (!result.error) { setElapsed(result.elapsedSeconds || 0); setTimerStart(Date.now()); } });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { document.removeEventListener('visibilitychange', handleVisibility); window.clearTimeout(saveTimeout.current); };
  }, [completed, grid, save, user]);

  const setValue = (row, col, value, record = true) => {
    if (completed || puzzle.void_grid[row][col] === '.') return;
    setGrid(current => {
      const previous = current[row][col]; if (previous === value) return current;
      const next = current.map(item => item.slice()); next[row][col] = value;
      if (record) { setHistory(actions => [...actions, { row, col, previous, value }]); setRedo([]); }
      setFeedback(currentFeedback => { const nextFeedback = { ...currentFeedback }; delete nextFeedback[keyFor(row, col)]; return nextFeedback; });
      scheduleSave(next); return next;
    });
  };
  const chooseCell = (row, col, direction) => {
    const currentIsSame = selected?.row === row && selected?.col === col;
    const alternate = selected?.dir === 'right' ? 'down' : 'right';
    const hasAcross = puzzle.words.some(word => word.dir === 'right' && isCellInWord(word, row, col));
    const nextDirection = currentIsSame && puzzle.words.some(word => word.dir === alternate && isCellInWord(word, row, col))
      ? alternate
      : (hasAcross ? 'right' : 'down');
    setSelected({ row, col, dir: nextDirection });
  };
  const move = (row, col, direction, backwards = false) => {
    const word = puzzle.words.find(item => item.dir === direction && isCellInWord(item, row, col));
    if (!word) return; const delta = direction === 'right' ? [0, 1] : [1, 0];
    const nextRow = row + delta[0] * (backwards ? -1 : 1); const nextCol = col + delta[1] * (backwards ? -1 : 1);
    if (isCellInWord(word, nextRow, nextCol)) setSelected({ row: nextRow, col: nextCol, dir: direction });
  };
  const nextPlayableCell = (row, col, rowDelta, colDelta) => {
    let nextRow = row + rowDelta; let nextCol = col + colDelta;
    while (nextRow >= 0 && nextRow < puzzle.height && nextCol >= 0 && nextCol < puzzle.width) {
      if (puzzle.void_grid[nextRow][nextCol] !== '.') return { row: nextRow, col: nextCol };
      nextRow += rowDelta; nextCol += colDelta;
    }
    return null;
  };
  const onKeyDown = event => {
    if (completed || !selected) return;
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const isHorizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      const [rowDelta, colDelta] = event.key === 'ArrowUp' ? [-1, 0] : event.key === 'ArrowDown' ? [1, 0] : event.key === 'ArrowLeft' ? [0, -1] : [0, 1];
      const direction = isHorizontal ? 'right' : 'down';
      const canChangeDirection = puzzle.words.some(word => word.dir === direction && isCellInWord(word, selected.row, selected.col));
      if (selected.dir !== direction && canChangeDirection) {
        setSelected(current => ({ ...current, dir: direction }));
        return;
      }
      const nextCell = nextPlayableCell(selected.row, selected.col, rowDelta, colDelta);
      if (nextCell) {
        const hasDirection = puzzle.words.some(word => word.dir === direction && isCellInWord(word, nextCell.row, nextCell.col));
        setSelected({ ...nextCell, dir: hasDirection ? direction : (direction === 'right' ? 'down' : 'right') });
      } else {
        const direction = isHorizontal ? 'right' : 'down';
        if (puzzle.words.some(word => word.dir === direction && isCellInWord(word, selected.row, selected.col))) setSelected(current => ({ ...current, dir: direction }));
      }
      return;
    }
    if (event.key === 'Backspace') { event.preventDefault(); if (grid[selected.row][selected.col]) setValue(selected.row, selected.col, ''); else move(selected.row, selected.col, selected.dir, true); return; }
    if (/^[\p{L}\p{N}]$/u.test(event.key)) { event.preventDefault(); setValue(selected.row, selected.col, event.key.toLocaleUpperCase('eu')); move(selected.row, selected.col, selected.dir); }
  };
  useEffect(() => {
    const handleKeyDown = event => onKeyDown(event);
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });
  const cellsForWord = word => Array.from({ length: word.length }, (_, index) => ({ row: word.x + (word.dir === 'down' ? index : 0), col: word.y + (word.dir === 'right' ? index : 0), value: grid[word.x + (word.dir === 'down' ? index : 0)][word.y + (word.dir === 'right' ? index : 0)] }));
  const applyResults = results => setFeedback(current => ({ ...current, ...Object.fromEntries(results.map(result => [keyFor(result.row, result.col), result])) }));
  const checkCell = async () => { if (!selected) return notify(t('game.selectWord'), 'warning'); const value = grid[selected.row]?.[selected.col]; if (!value) return notify(t('game.emptyCell'), 'warning'); const result = await gameApi.checkCell(selected.row, selected.col, value); if (result.error) return notify(result.message, 'error'); applyResults([{ row: selected.row, col: selected.col, correct: result.correct, correctLetter: result.correctLetter }]); notify(t(result.correct ? 'game.correct' : 'game.incorrect'), result.correct ? 'success' : 'error'); };
  const checkWord = async () => { if (!activeWord) return notify(t('game.selectWord'), 'warning'); const result = await gameApi.checkWord(activeWord, cellsForWord(activeWord)); if (result.error) return notify(result.message, 'error'); applyResults(result.cellResults); notify(t(result.correct ? 'game.wordCorrect' : 'game.wordIncorrect'), result.correct ? 'success' : 'error'); };
  const solveCell = async () => { if (!selected) return notify(t('game.selectWord'), 'warning'); const result = await gameApi.solveCell(selected.row, selected.col); if (result.error) return notify(result.message, 'error'); setValue(selected.row, selected.col, result.value); applyResults([{ row: selected.row, col: selected.col, correct: true }]); notify(t('game.hintShown')); };
  const solveWord = async () => { if (!activeWord) return notify(t('game.selectWord'), 'warning'); const result = await gameApi.solveWord(activeWord); if (result.error) return notify(result.message, 'error'); setGrid(current => { const next = current.map(row => row.slice()); result.solvedLetters.forEach(cell => { next[cell.row][cell.col] = cell.value; }); scheduleSave(next); return next; }); applyResults(result.solvedLetters.map(cell => ({ ...cell, correct: true }))); notify(t('game.wordShown')); };
  const clearGrid = () => { const actions = grid.flatMap((row, rowIndex) => row.map((value, col) => value && value !== '.' ? { row: rowIndex, col, previous: value, value: '' } : null).filter(Boolean)); if (!actions.length) return; setHistory(current => [...current, { batch: actions }]); setRedo([]); const next = emptyGrid(puzzle.void_grid); setGrid(next); setFeedback({}); scheduleSave(next); };
  const undo = () => { const action = history.at(-1); if (!action) return; setHistory(current => current.slice(0, -1)); setRedo(current => [...current, action]); setGrid(current => { const next = current.map(row => row.slice()); (action.batch || [action]).forEach(item => { next[item.row][item.col] = item.previous; }); scheduleSave(next); return next; }); };
  const redoAction = () => { const action = redo.at(-1); if (!action) return; setRedo(current => current.slice(0, -1)); setHistory(current => [...current, action]); setGrid(current => { const next = current.map(row => row.slice()); (action.batch || [action]).forEach(item => { next[item.row][item.col] = item.value; }); scheduleSave(next); return next; }); };
  const checkGrid = async () => { const cells = grid.flatMap((row, rowIndex) => row.map((value, col) => value !== '.' ? { row: rowIndex, col, value } : null).filter(Boolean)); const result = await gameApi.checkGrid(cells); if (result.error) return notify(result.message, 'error'); applyResults(result.cellResults); setCompleted(true); setTimerStart(null); setElapsed(result.stats?.durationSec ?? elapsed); const time = formatTimer(result.stats?.durationSec ?? elapsed); notify(result.complete ? t('game.completedStats', { time, errors: t(result.stats?.errors === 1 ? 'game.oneError' : 'game.errorCount', { count: result.stats?.errors }) }) : t('game.submittedStats', { time, errors: t(result.stats?.errors === 1 ? 'game.oneError' : 'game.errorCount', { count: result.stats?.errors }) }), result.complete ? 'success' : 'info', true); };
  const solveGrid = async () => { if (!window.confirm(t('game.solveConfirm'))) return; const result = await gameApi.solveGrid(); if (result.error) return notify(result.message, 'error'); setGrid(current => { const next = current.map(row => row.slice()); result.solvedLetters.forEach(cell => { next[cell.row][cell.col] = cell.value; }); return next; }); notify(t('game.gridSolved')); };
  const restart = async () => { const result = await gameApi.reset(puzzle.id); if (!result.error) window.location.reload(); };
  const across = puzzle.words.filter(word => word.dir === 'right').sort((a, b) => a.number - b.number); const down = puzzle.words.filter(word => word.dir === 'down').sort((a, b) => a.number - b.number);
  return <><div className="game-topbar"><a href="/jokoak"><button className="btn btn-sm btn-outline-secondary">{t('common.back')}</button></a><h2 className="game-title">{puzzle.name}</h2>{user && <span className="game-timer">{formatTimer(elapsed)}</span>}</div><div className="game-wrapper"><div className="puzzle"><div className="grid-block"><div className="grid-axis-wrapper" style={{ '--grid-cols': puzzle.width, '--grid-rows': puzzle.height }}><div className="axis-top">{Array.from({ length: puzzle.width }, (_, index) => <span className="axis-label" key={index}>{index + 1}</span>)}</div><div className="axis-main"><div className="axis-left">{Array.from({ length: puzzle.height }, (_, index) => <span className="axis-label" key={index}>{index + 1}</span>)}</div><table className={`grid unselectable${completed ? ' grid-frozen' : ''}`} role="grid" aria-label={t('game.gridLabel', { name: puzzle.name })}><tbody>{puzzle.void_grid.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, col) => { if (cell === '.') return <td className="black" key={col} />; const number = puzzle.words.find(word => word.x === rowIndex && word.y === col)?.number; const feedbackItem = feedback[keyFor(rowIndex, col)]; const selectedCell = selected?.row === rowIndex && selected?.col === col; const focused = activeWord && isCellInWord(activeWord, rowIndex, col); return <td key={col} className={`${selectedCell ? 'selected_cell ' : ''}${focused ? `focus_${selected.dir} ` : ''}${feedbackItem?.correct ? 'right ' : feedbackItem ? 'wrong ' : ''}${feedbackItem?.empty ? 'empty-warn' : ''}`} onClick={() => chooseCell(rowIndex, col, selected?.dir)} role="gridcell" aria-label={`${rowIndex + 1}. errenkada, ${col + 1}. zutabea`}>{number != null && <span className="i_words">{number}</span>}<span className="char">{grid[rowIndex][col]}</span>{feedbackItem && !feedbackItem.correct && feedbackItem.correctLetter && <span className="cell-hint">{feedbackItem.correctLetter}</span>}</td>; })}</tr>)}</tbody></table></div></div><div className="active-clue-bar" role="status">{activeClue}</div><div className="history-bar"><button className="btn btn-sm btn-outline-secondary" disabled={!history.length || completed} onClick={undo}>{t('game.undo')}</button><button className="btn btn-sm btn-outline-secondary" disabled={!redo.length || completed} onClick={redoAction}>{t('game.redo')}</button></div></div><section className="clues unselectable" aria-label={t('game.cluesLabel')}><ClueList title={t('game.across')} words={across} selected={activeWord} onSelect={word => setSelected({ row: word.x, col: word.y, dir: word.dir })} /><ClueList title={t('game.down')} words={down} selected={activeWord} onSelect={word => setSelected({ row: word.x, col: word.y, dir: word.dir })} /></section></div>{notice && <div className={`game-notification-bar show ntf-${notice.type}`} role="status">{notice.message}</div>}<nav className={`buttons${completed ? ' buttons-frozen' : ''}`}><div className="btn-section"><span className="btn-section-label">{t('game.check')}</span><button className="btn btn-outline-secondary" onClick={checkCell}>{t('game.letter')}</button><button className="btn btn-outline-secondary" onClick={checkWord}>{t('game.word')}</button></div><div className="btn-section"><span className="btn-section-label">{t('game.fill')}</span><button className="btn btn-outline-secondary" onClick={solveCell}>{t('game.letter')}</button><button className="btn btn-outline-secondary" onClick={solveWord}>{t('game.word')}</button><button className="btn btn-outline-secondary" onClick={solveGrid}>{t('game.grid')}</button></div><button className="btn btn-outline-danger" onClick={clearGrid}>{t('game.clearGrid')}</button><button className="btn btn-primary btn-check-grid" onClick={checkGrid}>{t('game.checkGrid')}</button>{user && completed && <button className="btn btn-outline-secondary btn-restart" onClick={restart}>{t('game.playAgain')}</button>}</nav></div></>;
}

function ClueList({ title, words, selected, onSelect }) {
  const className = title === 'EZKER ESKUIN' ? 'clues_across' : 'clues_down';
  const isAcross = className === 'clues_across';
  const isIpuz = words[0]?.format === 'ipuz';

  if (isIpuz) {
    const groups = words.reduce((result, word) => {
      const coordinate = isAcross ? word.x : word.y;
      result[coordinate] = [...(result[coordinate] || []), word];
      return result;
    }, {});

    return <>
      <h2 className="clues-heading">{title}</h2>
      <div className={className}>{Object.entries(groups).sort(([left], [right]) => Number(left) - Number(right)).map(([coordinate, group]) => (
        <div className="clue-group" key={coordinate}>{group.sort((left, right) => (isAcross ? left.y - right.y : left.x - right.x)).map((word, index) => (
          <div className="ipuz-clue-row" key={`${word.x}-${word.y}-${word.dir}`}>
            {index === 0 && <span className="clue-num">{Number(coordinate) + 1}.</span>}
            <button type="button" className={`clue-item clue-line${selected?.x === word.x && selected?.y === word.y && selected?.dir === word.dir ? ' selected_clue' : ''}`} onClick={() => onSelect(word)}>{word.clue || '—'}</button>
          </div>
        ))}</div>
      ))}</div>
    </>;
  }

  return <>
    <h2 className="clues-heading">{title}</h2>
    <div className={className}>{words.map(word => (
      <button type="button" className={`clue-item${selected?.x === word.x && selected?.y === word.y && selected?.dir === word.dir ? ' selected_clue' : ''}`} key={`${word.x}-${word.y}-${word.dir}`} onClick={() => onSelect(word)}>
        <span className="clue-num">{word.number}.</span> {word.clue || '—'}
      </button>
    ))}</div>
  </>;
}

function normalizeSpiralDefinition(definition, direction, fallbackEnd) {
  const first = Number(definition.start); const last = Number(definition.end);
  if (!Number.isInteger(first) || !Number.isInteger(last)) return null;
  const start = Math.max(1, Math.min(first, last)); const end = Math.min(fallbackEnd, Math.max(first, last));
  if (start > end) return null;
  const displayStart = direction === 'outward' ? end : start;
  const displayEnd = direction === 'outward' ? start : end;
  return { start, end, anchor: displayStart, label: `${displayStart}-${displayEnd}`, text: String(definition.text || '').trim() };
}

function getSpiralDefinitions(spiral, cellCount) {
  const stored = spiral?.definitions;
  if (stored?.inward || stored?.outward) return {
    inward: (stored.inward || []).map(item => normalizeSpiralDefinition(item, 'inward', cellCount)).filter(Boolean),
    outward: (stored.outward || []).map(item => normalizeSpiralDefinition(item, 'outward', cellCount)).filter(Boolean)
  };
  const result = { inward: [], outward: [] };
  (spiral?.clues || []).forEach(line => {
    const match = String(line).trim().match(/^(\d+)\s*-\s*(\d+)\s*(.*)$/);
    if (!match) return;
    const direction = Number(match[1]) > Number(match[2]) ? 'outward' : 'inward';
    const definition = normalizeSpiralDefinition({ start: match[1], end: match[2], text: match[3] }, direction, cellCount);
    if (definition) result[direction].push(definition);
  });
  if (!result.inward.length && !result.outward.length && spiral?.clues?.length) result.inward.push({ start: 1, end: cellCount, anchor: 1, label: `1-${cellCount}`, text: spiral.clues[0] });
  return result;
}

export function SpiralGame({ puzzle, user, t }) {
  const cells = useMemo(() => [...(puzzle.spiral?.cells || [])].sort((a, b) => a.index - b.index), [puzzle]);
  const definitions = useMemo(() => getSpiralDefinitions(puzzle.spiral, cells.length), [puzzle.spiral, cells.length]);
  const [values, setValues] = useState(() => Array(cells.length).fill('')); const [selected, setSelected] = useState(1); const [direction, setDirection] = useState('inward'); const [activeDefinitionIndex, setActiveDefinitionIndex] = useState(0); const [results, setResults] = useState({}); const [notice, setNotice] = useState(null); const saveTimeout = useRef(null);
  const matchingDefinitions = definitions[direction].filter(item => selected >= item.start && selected <= item.end);
  const activeDefinition = matchingDefinitions[activeDefinitionIndex] || matchingDefinitions[0];
  const save = next => { if (user) gameApi.save(puzzle.id, next.flatMap((value, col) => value ? [{ row: 0, col, value }] : [])); };
  useEffect(() => { gameApi.load(puzzle.id).then(result => { if (!result.cells) return; setValues(current => current.map((value, col) => result.cells.find(cell => cell.row === 0 && cell.col === col)?.value || value)); }); return () => window.clearTimeout(saveTimeout.current); }, []);
  const update = (index, value) => { if (puzzle.completed) return; setValues(current => { const next = [...current]; next[index - 1] = value; window.clearTimeout(saveTimeout.current); saveTimeout.current = window.setTimeout(() => save(next), 600); return next; }); setResults({}); };
  const selectCell = (index, cycle = false, preferredDefinition = null) => {
    const candidates = definitions[direction].filter(item => index >= item.start && index <= item.end);
    const currentIndex = candidates.indexOf(activeDefinition);
    const preferredIndex = candidates.indexOf(preferredDefinition);
    const nextIndex = cycle && index === selected && candidates.length > 1 && currentIndex >= 0
      ? (currentIndex + 1) % candidates.length
      : preferredIndex >= 0 ? preferredIndex : 0;
    setSelected(index);
    setActiveDefinitionIndex(nextIndex);
  };
  const onKeyDown = useCallback(event => { if (!cells.length || puzzle.completed) return; const step = direction === 'inward' ? 1 : -1; const move = offset => Math.min(cells.length, Math.max(1, selected + offset)); if (event.key === 'ArrowLeft') { event.preventDefault(); return selectCell(move(-step)); } if (event.key === 'ArrowRight') { event.preventDefault(); return selectCell(move(step)); } if (event.key === 'Backspace') { event.preventDefault(); if (values[selected - 1]) update(selected, ''); else { const previous = move(-step); selectCell(previous); update(previous, ''); } return; } if (/^[\p{L}\p{N}]$/u.test(event.key)) { event.preventDefault(); const next = move(step); update(selected, event.key.toLocaleUpperCase('eu')); selectCell(next, false, activeDefinition); } }, [cells.length, direction, puzzle.completed, selected, values, activeDefinition]);
  useEffect(() => { document.addEventListener('keydown', onKeyDown); return () => document.removeEventListener('keydown', onKeyDown); }, [onKeyDown]);
  const selectDefinition = (nextDirection, definition) => { const candidates = definitions[nextDirection].filter(item => definition.anchor >= item.start && definition.anchor <= item.end); setDirection(nextDirection); setSelected(definition.anchor); setActiveDefinitionIndex(Math.max(0, candidates.indexOf(definition))); };
  const selectDirection = nextDirection => { const candidates = definitions[nextDirection].filter(item => selected >= item.start && selected <= item.end); setDirection(nextDirection); setActiveDefinitionIndex(candidates.length ? 0 : 0); };
  const check = async () => { const result = await gameApi.checkGrid(values.map((value, col) => ({ row: 0, col, value }))); if (result.error) return setNotice({ type: 'error', message: result.message }); setResults(Object.fromEntries(result.cellResults.map(item => [item.col + 1, item]))); setNotice({ type: result.complete ? 'success' : 'info', message: result.complete ? 'Zorionak! Espirala osatu duzu.' : 'Egiaztapena bidalia.' }); };
  const clear = () => { const next = Array(cells.length).fill(''); setValues(next); setResults({}); save(next); setSelected(1); setActiveDefinitionIndex(0); };
  return <><div className="game-topbar"><a href="/jokoak"><button className="btn btn-sm btn-outline-secondary">{t('common.back')}</button></a><h2 className="game-title">{puzzle.name}</h2></div><div className="game-wrapper"><div className="spiral-layout"><div className="spiral-board-card"><div className="spiral-direction-switch"><button type="button" className={direction === 'inward' ? 'is-active' : ''} onClick={() => selectDirection('inward')}>{t('spiralBuilder.inward')}</button><button type="button" className={direction === 'outward' ? 'is-active' : ''} onClick={() => selectDirection('outward')}>{t('spiralBuilder.outward')}</button></div><svg id="spiral-board" viewBox={puzzle.spiral?.viewBox || '0 0 700 700'} role="img" aria-label={`${puzzle.name} espiral jokoa`}>{cells.map(cell => <path className={`spiral-cell${selected === cell.index ? ' is-selected' : ''}${activeDefinition && cell.index >= activeDefinition.start && cell.index <= activeDefinition.end ? ' is-active' : ''}${results[cell.index]?.correct ? ' is-correct' : results[cell.index] ? ' is-wrong' : ''}`} id={`s_cell_${cell.index}`} key={`path-${cell.index}`} d={cell.path} onClick={() => selectCell(cell.index, true)} />)}{cells.map(cell => cell.labelX != null && <text className="spiral-order" key={`order-${cell.index}`} x={cell.labelX} y={cell.labelY} textAnchor="middle" dominantBaseline="middle">{cell.index}</text>)}{cells.map(cell => <text className="spiral-letter" key={`letter-${cell.index}`} x={cell.x} y={cell.y} textAnchor="middle" dominantBaseline="central">{values[cell.index - 1]}</text>)}</svg>{notice && <div className={`game-notification-bar show ntf-${notice.type}`}>{notice.message}</div>}</div><aside className="spiral-panel"><h3 className="spiral-panel-title">{t('game.cluesLabel')}</h3><div className="spiral-definitions"><SpiralDefinitionGroup direction="inward" definitions={definitions.inward} activeDefinition={direction === 'inward' ? activeDefinition : null} title={t('spiralBuilder.inward')} onSelect={selectDefinition} /><SpiralDefinitionGroup direction="outward" definitions={definitions.outward} activeDefinition={direction === 'outward' ? activeDefinition : null} title={t('spiralBuilder.outward')} onSelect={selectDefinition} /></div><div className="spiral-status"><p><strong>Idatzita:</strong> {values.filter(Boolean).length} / {cells.length}</p></div><div className="spiral-actions"><button className="btn btn-primary" onClick={check}>{t('game.checkGrid')}</button><button className="btn btn-outline-danger" onClick={clear}>{t('game.clearGrid')}</button>{user && <button className="btn btn-outline-secondary" onClick={async () => { const result = await gameApi.reset(puzzle.id); if (!result.error) window.location.reload(); }}>{t('game.playAgain')}</button>}</div></aside></div></div></>;
}

function SpiralDefinitionGroup({ direction, definitions, activeDefinition, title, onSelect }) {
  return <section className="spiral-definition-group"><h4>{title}</h4><div className="spiral-clues-list">{definitions.length ? definitions.map(definition => <button type="button" className={`spiral-clue-item${activeDefinition === definition ? ' is-selected' : ''}`} key={`${direction}-${definition.label}-${definition.text}`} onClick={() => onSelect(direction, definition)}><span>{definition.label}.</span> {definition.text || '—'}</button>) : <p className="text-muted">Ez dago pistarik.</p>}</div></section>;
}
