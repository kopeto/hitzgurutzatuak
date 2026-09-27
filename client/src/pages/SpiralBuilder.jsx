import React, { useMemo, useState } from 'react';

const initialState = {
  title: '', author: '', answer: '', cellCount: 64, cellSize: 60, showNumbers: true,
  inwardDefs: [], outwardDefs: []
};

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeDefinitions(definitions) {
  return (Array.isArray(definitions) ? definitions : []).map(definition => ({
    start: definition.start ?? 1,
    end: definition.end ?? 1,
    text: String(definition.text || '')
  }));
}

function parseDefinitions(lines, count) {
  const parsed = String(lines || '').split('\n').map(line => {
    const match = line.trim().match(/^(-?\d+)\s*-\s*(-?\d+)\s*(.*)$/);
    return match ? { start: Number(match[1]), end: Number(match[2]), text: match[3] } : null;
  }).filter(Boolean);
  return normalizeDefinitions(parsed);
}

function definitionLines(definitions, direction) {
  const ordered = direction === 'outward' ? [...definitions].reverse() : definitions;
  return ordered.map(definition => {
    const start = direction === 'outward' ? definition.end : definition.start;
    const end = direction === 'outward' ? definition.start : definition.end;
    return `${start}-${end}${definition.text ? ` ${definition.text}` : ''}`;
  });
}

function wordForRange(answer, start, end) {
  const letters = Array.from(answer);
  const step = start <= end ? 1 : -1;
  const result = [];
  for (let index = start; step > 0 ? index <= end : index >= end; index += step) result.push(letters[index - 1] || '·');
  return result.join('');
}

function sanitizeFilename(value) {
  return String(value || 'espirala').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'espirala';
}

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, offset = 0) {
  const radius = outerRadius - slope * (theta - thetaStart) - offset;
  return { x: cx + Math.cos(theta) * radius, y: cy + Math.sin(theta) * radius };
}

function pathFrom(points) {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function buildSpiral(count, size) {
  const cx = 380; const cy = 380; const outerRadius = 286; const stripWidth = clamp(size * 0.82, 20, 56);
  const turns = clamp(clamp(count / 15, 3, 7.2), 2.2, Math.max(2.2, (outerRadius - 64) / stripWidth));
  const thetaSpan = turns * Math.PI * 2; const cellAngle = thetaSpan / count;
  const thetaStart = -Math.PI * 3 / 4 - cellAngle / 2; const slope = (turns * stripWidth) / thetaSpan;
  const sampleCount = Math.max(1800, count * 80); const samples = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const theta = thetaStart + thetaSpan * (index / sampleCount); const point = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta);
    const previous = samples.at(-1);
    samples.push({ ...point, theta, distance: previous ? previous.distance + Math.hypot(point.x - previous.x, point.y - previous.y) : 0 });
  }
  const sampleAt = (distance, from = 0) => {
    let index = clamp(from, 0, samples.length - 2); const target = clamp(distance, 0, samples.at(-1).distance);
    while (index < samples.length - 2 && samples[index + 1].distance < target) index += 1;
    const start = samples[index]; const end = samples[index + 1];
    return { theta: start.theta + (end.theta - start.theta) * clamp((target - start.distance) / Math.max(0.0001, end.distance - start.distance), 0, 1), index };
  };
  const arc = (start, end, offset) => {
    const segments = Math.max(1, Math.ceil(Math.abs(end - start) / 0.07));
    return Array.from({ length: segments + 1 }, (_, index) => (
      spiralPoint(cx, cy, outerRadius, slope, thetaStart, start + (end - start) * (index / segments), offset)
    ));
  };
  const cellLength = samples.at(-1).distance / count; let searchIndex = 0;
  const cells = Array.from({ length: count }, (_, offset) => {
    const start = sampleAt(offset * cellLength, searchIndex); const end = sampleAt((offset + 1) * cellLength, start.index); searchIndex = start.index;
    const outer = arc(start.theta, end.theta, 0); const inner = arc(end.theta, start.theta, stripWidth);
    const innerStart = spiralPoint(cx, cy, outerRadius, slope, thetaStart, start.theta, stripWidth);
    const innerEnd = spiralPoint(cx, cy, outerRadius, slope, thetaStart, end.theta, stripWidth);
    const theta = (start.theta + end.theta) / 2;
    const letter = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, stripWidth * 0.56);
    const label = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, stripWidth * 0.2);
    return { index: offset + 1, path: `${pathFrom([...outer, innerEnd, ...inner.slice(1), innerStart])} Z`, x: Number(letter.x.toFixed(2)), y: Number(letter.y.toFixed(2)), labelX: Number(label.x.toFixed(2)), labelY: Number(label.y.toFixed(2)) };
  });
  return { cells, guidePath: pathFrom(samples.filter((_, index) => index % 3 === 0)) };
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

function hydrateState(saved) {
  const state = { ...initialState, ...saved };
  return {
    ...state,
    inwardDefs: normalizeDefinitions(saved.inwardDefs || parseDefinitions(saved.inward, state.cellCount)),
    outwardDefs: normalizeDefinitions(saved.outwardDefs || parseDefinitions(saved.outward, state.cellCount))
  };
}

export function SpiralBuilder({ t }) {
  const [state, setState] = useState(() => {
    try { return hydrateState(JSON.parse(localStorage.getItem('hitzgurutzatuak-spiral-draft') || '{}')); } catch { return initialState; }
  });
  const spiral = useMemo(() => buildSpiral(state.cellCount, state.cellSize), [state.cellCount, state.cellSize]);
  const letters = Array.from(state.answer); const valid = letters.length === state.cellCount;
  const lines = direction => definitionLines(state[`${direction}Defs`], direction);
  const update = (name, value) => setState(current => ({ ...current, [name]: value }));
  const updateCount = value => setState(current => {
    const cellCount = clamp(Number(value) || 1, 1, 400);
    return { ...current, cellCount, answer: current.answer.slice(0, cellCount) };
  });
  const updateDefinition = (direction, index, field, value) => setState(current => {
    const key = `${direction}Defs`; const definitions = current[key].map(definition => ({ ...definition }));
    const definition = definitions[index];
    if (!definition) return current;
    const mappedField = direction === 'outward' ? (field === 'start' ? 'end' : field === 'end' ? 'start' : field) : field;
    definition[mappedField] = field === 'text' ? value : (value === '' ? '' : Number(value));
    return { ...current, [key]: definitions };
  });
  const addDefinition = direction => setState(current => {
    const key = `${direction}Defs`;
    return { ...current, [key]: [...current[key], { start: 1, end: current.cellCount, text: '' }] };
  });
  const removeDefinition = (direction, index) => setState(current => ({ ...current, [`${direction}Defs`]: current[`${direction}Defs`].filter((_, itemIndex) => itemIndex !== index) }));
  const payload = () => ({ kind: 'hitzgurutzatuak/spiral/v1', format: 'spl', title: state.title || 'Espirala', author: state.author || 'Ezezaguna', viewBox: '0 0 760 760', answer: state.answer, clues: [...lines('inward'), ...lines('outward')], cells: spiral.cells });
  const saveDraft = () => localStorage.setItem('hitzgurutzatuak-spiral-draft', JSON.stringify(state));
  const loadDraft = () => { try { setState(hydrateState(JSON.parse(localStorage.getItem('hitzgurutzatuak-spiral-draft') || '{}'))); } catch { window.alert('Ezin izan da zirriborroa kargatu.'); } };
  const importFile = file => { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(String(reader.result)); setState(hydrateState({ ...initialState, title: data.title, author: data.author, answer: String(data.answer || '').toLocaleUpperCase('eu'), cellCount: data.cells?.length || 64, inward: (data.clues || []).join('\n') })); } catch { window.alert('Ezin izan da SPL fitxategia irakurri.'); } }; reader.readAsText(file); };
  const download = () => { if (!valid) return window.alert(t('spiralBuilder.validateLength')); downloadFile(`${sanitizeFilename(state.title)}.spl`, `${JSON.stringify(payload(), null, 2)}\n`, 'application/json;charset=utf-8'); };
  const downloadHtml = () => { if (!valid) return window.alert(t('spiralBuilder.validateLength')); const data = payload(); const paths = data.cells.map(cell => `<path d="${cell.path}" fill="#fff" stroke="#222"/><text x="${cell.x}" y="${cell.y}" text-anchor="middle" dominant-baseline="central">${escapeHtml(data.answer[cell.index - 1])}</text>`).join(''); downloadFile(`${sanitizeFilename(data.title)}.html`, `<!doctype html><html lang="eu"><meta charset="utf-8"><title>${escapeHtml(data.title)}</title><body><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.author)}</p><svg viewBox="${data.viewBox}" width="760">${paths}</svg><ol>${data.clues.map(clue => `<li>${escapeHtml(clue)}</li>`).join('')}</ol></body></html>`, 'text/html;charset=utf-8'); };
  return <section className="spiral-builder-shell"><aside className="spiral-builder-aside"><p className="spiral-builder-intro">{t('spiralBuilder.intro')}</p><div className={`spiral-builder-status${valid ? '' : ' text-danger'}`} role="status">{valid ? t('spiralBuilder.downloadReady') : `${t('spiralBuilder.validateLength')} (${letters.length}/${state.cellCount})`}</div><form id="spiral-builder-form" autoComplete="off"><div className="builder-row"><Field label={t('spiralBuilder.titleField')}><input className="form-control" value={state.title} onChange={event => update('title', event.target.value)} /></Field><Field label={t('spiralBuilder.authorField')}><input className="form-control" value={state.author} onChange={event => update('author', event.target.value)} /></Field></div><div className="builder-row"><Field label={t('spiralBuilder.cellCount')}><input className="form-control" type="number" min="1" max="400" value={state.cellCount} onChange={event => updateCount(event.target.value)} /></Field><Field label={t('spiralBuilder.cellSize')}><input className="form-control" type="number" min="12" max="120" value={state.cellSize} onChange={event => update('cellSize', clamp(Number(event.target.value) || 12, 12, 120))} /></Field></div><DefinitionEditor direction="inward" definitions={state.inwardDefs} answer={state.answer} t={t} onAdd={addDefinition} onUpdate={updateDefinition} onRemove={removeDefinition} /><DefinitionEditor direction="outward" definitions={state.outwardDefs} answer={state.answer} t={t} onAdd={addDefinition} onUpdate={updateDefinition} onRemove={removeDefinition} /><Field label={t('spiralBuilder.answer')}><textarea id="builderAnswer" className="form-control" rows="2" value={state.answer} onChange={event => update('answer', event.target.value.toLocaleUpperCase('eu').replace(/\s+/g, '').slice(0, state.cellCount))} /></Field><div className="spiral-builder-switch"><input id="show-numbers" type="checkbox" checked={state.showNumbers} onChange={event => update('showNumbers', event.target.checked)} /><label htmlFor="show-numbers">{t('spiralBuilder.showNumbers')}</label></div><div className="spiral-builder-actions"><button type="button" className="btn btn-primary" onClick={download}>{t('spiralBuilder.download')}</button><button type="button" className="btn btn-outline-secondary" onClick={downloadHtml}>{t('spiralBuilder.downloadHtml')}</button><button type="button" className="btn btn-outline-secondary" onClick={saveDraft}>{t('spiralBuilder.saveDraft')}</button><button type="button" className="btn btn-outline-secondary" onClick={loadDraft}>{t('spiralBuilder.loadDraft')}</button><label className="btn btn-outline-secondary mb-0">{t('spiralBuilder.import')}<input className="sr-only" type="file" accept=".spl,application/json" onChange={event => importFile(event.target.files?.[0])} /></label><button type="button" className="btn btn-outline-danger" onClick={() => setState(initialState)}>{t('spiralBuilder.reset')}</button></div></form></aside><main className="spiral-builder-main"><article className="spiral-page"><header className="spiral-page-header"><div className="spiral-page-header__title">{state.title || 'Espirala'}</div><div className="spiral-page-header__author">{state.author || t('spiralBuilder.authorField')}</div></header><div className="spiral-page-body"><div className="spiral-page-art"><svg className="spiral-builder-preview" viewBox="0 0 760 760" role="img" aria-label={t('spiralBuilder.previewTitle')}><path className="spiral-preview-accent" d={spiral.guidePath} />{spiral.cells.map(cell => <path key={cell.index} d={cell.path} className={`spiral-preview-cell${cell.index % 2 === 0 ? ' is-odd' : ''}`} />)}{state.showNumbers && spiral.cells.map(cell => <text key={`number-${cell.index}`} className="spiral-preview-number" x={cell.labelX} y={cell.labelY} textAnchor="middle" dominantBaseline="middle">{cell.index}</text>)}{spiral.cells.map(cell => <text key={`letter-${cell.index}`} className="spiral-preview-letter" x={cell.x} y={cell.y} textAnchor="middle" dominantBaseline="central">{letters[cell.index - 1] || '·'}</text>)}</svg></div></div><div className="spiral-page-clues"><ClueList title={t('spiralBuilder.inward')} lines={lines('inward')} /><ClueList title={t('spiralBuilder.outward')} lines={lines('outward')} /></div></article></main></section>;
}

function Field({ label, children }) { return <div className="builder-field"><label>{label}</label>{children}</div>; }

function DefinitionEditor({ direction, definitions, answer, t, onAdd, onUpdate, onRemove }) {
  const ordered = direction === 'outward' ? [...definitions].reverse() : definitions;
  return <div className="builder-field"><div className="clue-editor-heading"><label>{t(`spiralBuilder.${direction}`)}</label><button className="clue-add-btn btn btn-outline-secondary btn-sm" type="button" onClick={() => onAdd(direction)} aria-label={t('spiralBuilder.addDefinition')}>+</button></div><div className="clue-editor"><div className="clue-editor-list">{ordered.map((definition, displayIndex) => { const index = direction === 'outward' ? definitions.length - displayIndex - 1 : displayIndex; const start = direction === 'outward' ? definition.end : definition.start; const end = direction === 'outward' ? definition.start : definition.end; return <div className="clue-row" key={`${direction}-${index}`}><div className="clue-row-head"><input className="form-control clue-start" type="number" value={start} onChange={event => onUpdate(direction, index, 'start', event.target.value)} aria-label={t('spiralBuilder.startCell')} /><input className="form-control clue-end" type="number" value={end} onChange={event => onUpdate(direction, index, 'end', event.target.value)} aria-label={t('spiralBuilder.endCell')} /><button className="btn btn-outline-danger btn-sm clue-remove" type="button" onClick={() => onRemove(direction, index)}>{t('spiralBuilder.removeDefinition')}</button></div><textarea className="form-control clue-text" value={definition.text} placeholder={t('spiralBuilder.definition')} onChange={event => onUpdate(direction, index, 'text', event.target.value)} /><div className="clue-word-preview">{t('spiralBuilder.wordPreview')}: {wordForRange(answer, start, end)}</div></div>; })}</div></div></div>;
}

function ClueList({ title, lines }) { return <div className="spiral-clue-column"><h2>{title}</h2><ol>{lines.map((line, index) => <li key={index}>{line}</li>)}</ol></div>; }
