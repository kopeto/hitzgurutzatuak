function initSpiralBuilder() {
  const form = document.getElementById('spiral-builder-form');
  const preview = document.getElementById('spiral-builder-preview');
  const warning = document.getElementById('warning');
  const statusEl = document.querySelector('[data-builder-status]');
  const metaEl = document.querySelector('[data-builder-meta]');
  const downloadButtons = Array.from(document.querySelectorAll('[data-download-button]'));
  const saveDraftButtons = Array.from(document.querySelectorAll('[data-save-draft]'));
  const loadDraftButtons = Array.from(document.querySelectorAll('[data-load-draft]'));
  const loadExampleButtons = Array.from(document.querySelectorAll('[data-load-example]'));
  const resetButtons = Array.from(document.querySelectorAll('[data-reset-builder]'));
  const importInput = document.querySelector('[data-import-file]');

  if (!form || !preview) return;

  const fields = {
    title: document.getElementById('builderTitle'),
    author: document.getElementById('builderAuthor'),
    clue: document.getElementById('builderClue'),
    answer: document.getElementById('builderAnswer'),
    cellCount: document.getElementById('builderCellCount'),
    cellSize: document.getElementById('builderCellSize'),
    gap: document.getElementById('builderGap'),
    padding: document.getElementById('builderPadding'),
    strokeWidth: document.getElementById('builderStrokeWidth'),
    showNumbers: document.getElementById('builderShowNumbers')
  };

  const storageKey = 'spiral-builder-state-v1';
  const exampleState = {
    title: 'Espiral grida 64',
    author: 'Sistema',
    clue: 'Euskal hizkiarekin lotutako hitz kate laburra',
    answer: 'EUSKALONEUSKALONEUSKALONEUSKALONEUSKALONEUSKALONEUSKALONEUSKALON',
    cellCount: 64,
    cellSize: 42,
    gap: 2,
    padding: 40,
    strokeWidth: 1.15,
    showNumbers: true
  };

  function getState() {
    return {
      title: fields.title.value.trim(),
      author: fields.author.value.trim(),
      clue: fields.clue.value.trim(),
      answer: fields.answer.value.toLocaleUpperCase('eu').replace(/\s+/g, ''),
      cellCount: Number.parseInt(fields.cellCount.value, 10) || 1,
      cellSize: Number.parseFloat(fields.cellSize.value) || 42,
      gap: Number.parseFloat(fields.gap.value) || 0,
      padding: Number.parseFloat(fields.padding.value) || 0,
      strokeWidth: Number.parseFloat(fields.strokeWidth.value) || 1,
      showNumbers: Boolean(fields.showNumbers.checked)
    };
  }

  function setState(state) {
    fields.title.value = state.title ?? exampleState.title;
    fields.author.value = state.author ?? exampleState.author;
    fields.clue.value = state.clue ?? exampleState.clue;
    fields.answer.value = state.answer ?? exampleState.answer;
    fields.cellCount.value = state.cellCount ?? exampleState.cellCount;
    fields.cellSize.value = state.cellSize ?? exampleState.cellSize;
    fields.gap.value = state.gap ?? exampleState.gap;
    fields.padding.value = state.padding ?? exampleState.padding;
    fields.strokeWidth.value = state.strokeWidth ?? exampleState.strokeWidth;
    fields.showNumbers.checked = state.showNumbers ?? exampleState.showNumbers;
  }

  function sanitizeFilename(name) {
    return String(name || 'espirala')
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}._ -]/gu, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function spiralPositions(count) {
    const positions = [];
    let x = 0;
    let y = 0;
    let direction = 0;
    let legLength = 1;
    const vectors = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1]
    ];

    positions.push({ x, y });
    while (positions.length < count) {
      for (let turn = 0; turn < 2 && positions.length < count; turn++) {
        const [dx, dy] = vectors[direction % 4];
        for (let step = 0; step < legLength && positions.length < count; step++) {
          x += dx;
          y += dy;
          positions.push({ x, y });
        }
        direction += 1;
      }
      legLength += 1;
    }

    return positions;
  }

  function buildPayload() {
    const state = getState();
    const letters = Array.from(state.answer || '');
    const count = Math.max(1, state.cellCount);
    const step = state.cellSize + state.gap;
    const positions = spiralPositions(count);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });

    const cells = positions.map((pos, index) => {
      const x = state.padding + (pos.x - minX) * step;
      const y = state.padding + (pos.y - minY) * step;
      const labelX = x + 11;
      const labelY = y + 11;
      const centerX = x + state.cellSize / 2;
      const centerY = y + state.cellSize / 2 + 1;
      const path = `M ${x.toFixed(2)} ${y.toFixed(2)} L ${(x + state.cellSize).toFixed(2)} ${y.toFixed(2)} L ${(x + state.cellSize).toFixed(2)} ${(y + state.cellSize).toFixed(2)} L ${x.toFixed(2)} ${(y + state.cellSize).toFixed(2)} Z`;
      return {
        index: index + 1,
        path,
        x: Number(centerX.toFixed(2)),
        y: Number(centerY.toFixed(2)),
        labelX: Number(labelX.toFixed(2)),
        labelY: Number(labelY.toFixed(2))
      };
    });

    const width = state.padding * 2 + (maxX - minX + 1) * step - state.gap + state.cellSize;
    const height = state.padding * 2 + (maxY - minY + 1) * step - state.gap + state.cellSize;

    return {
      kind: 'hitzgurutzatuak/spiral/v1',
      format: 'spl',
      title: state.title || 'Espirala',
      author: state.author || 'Ezezaguna',
      viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`,
      answer: state.answer,
      clues: [state.clue || 'Espiral erantzun bakarra'],
      cells,
      state
    };
  }

  function updatePreview() {
    const payload = buildPayload();
    const state = payload.state;
    const letters = Array.from(state.answer || '');
    const answerLength = Array.from(state.answer || '').length;
    const count = Math.max(1, state.cellCount);

    preview.setAttribute('viewBox', payload.viewBox);
    preview.innerHTML = '';

    const svgNs = 'http://www.w3.org/2000/svg';
    const bg = document.createElementNS(svgNs, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', payload.viewBox.split(' ')[2]);
    bg.setAttribute('height', payload.viewBox.split(' ')[3]);
    bg.setAttribute('fill', '#ffffff');
    preview.appendChild(bg);

    const cellsGroup = document.createElementNS(svgNs, 'g');
    cellsGroup.setAttribute('id', 'grida');
    preview.appendChild(cellsGroup);

    const numbersGroup = document.createElementNS(svgNs, 'g');
    numbersGroup.setAttribute('id', 'ZENBAKI_TXIKIAK');
    preview.appendChild(numbersGroup);

    const lettersGroup = document.createElementNS(svgNs, 'g');
    lettersGroup.setAttribute('id', 'ERANTZUNA_EDITAGARRIA');
    preview.appendChild(lettersGroup);

    payload.cells.forEach(cell => {
      const path = document.createElementNS(svgNs, 'path');
      path.setAttribute('d', cell.path);
      path.setAttribute('fill', cell.index % 2 === 0 ? '#f6f6f3' : '#fefefd');
      path.setAttribute('stroke', '#151515');
      path.setAttribute('stroke-width', String(state.strokeWidth));
      path.setAttribute('stroke-linejoin', 'round');
      path.setAttribute('id', `gelaxka_${String(cell.index).padStart(3, '0')}`);
      cellsGroup.appendChild(path);

      if (state.showNumbers) {
        const number = document.createElementNS(svgNs, 'text');
        number.setAttribute('id', `ordena_${String(cell.index).padStart(3, '0')}`);
        number.setAttribute('x', String(cell.labelX));
        number.setAttribute('y', String(cell.labelY));
        number.setAttribute('text-anchor', 'middle');
        number.setAttribute('dominant-baseline', 'middle');
        number.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
        number.setAttribute('font-size', '7pt');
        number.setAttribute('font-weight', '600');
        number.setAttribute('fill', '#777777');
        number.textContent = String(cell.index);
        numbersGroup.appendChild(number);
      }

      const letter = document.createElementNS(svgNs, 'text');
      letter.setAttribute('id', `LETRA_${String(cell.index).padStart(3, '0')}`);
      letter.setAttribute('x', String(cell.x));
      letter.setAttribute('y', String(cell.y));
      letter.setAttribute('text-anchor', 'middle');
      letter.setAttribute('dominant-baseline', 'central');
      letter.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
      letter.setAttribute('font-size', '18pt');
      letter.setAttribute('font-weight', '700');
      letter.setAttribute('fill', '#151515');
      letter.textContent = letters[cell.index - 1] || '·';
      lettersGroup.appendChild(letter);
    });

    const outline = document.createElementNS(svgNs, 'path');
    outline.setAttribute('d', payload.cells.map(cell => cell.path).join(' '));
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', '#e04444');
    outline.setAttribute('stroke-width', '1.4');
    outline.setAttribute('stroke-dasharray', '5 4');
    preview.appendChild(outline);

    if (metaEl) {
      metaEl.textContent = `${count} casillas · ${Math.round(state.cellSize)}px · ${payload.viewBox}`;
    }

    const valid = answerLength === count;
    const message = valid
      ? window.t('spiralBuilder.downloadReady')
      : `${window.t('spiralBuilder.validateLength')} (${answerLength}/${count})`;

    if (warning) warning.textContent = valid ? '' : message;
    if (statusEl) statusEl.textContent = message;

    return payload;
  }

  function storeDraft() {
    window.localStorage.setItem(storageKey, JSON.stringify(getState()));
    if (statusEl) statusEl.textContent = window.t('spiralBuilder.savedDraft');
  }

  function loadDraft() {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      setState(parsed);
      updatePreview();
      if (statusEl) statusEl.textContent = window.t('spiralBuilder.loadedDraft');
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function downloadPayload(payload) {
    const blob = new Blob([`${JSON.stringify({
      kind: payload.kind,
      format: payload.format,
      title: payload.title,
      author: payload.author,
      viewBox: payload.viewBox,
      answer: payload.answer,
      clues: payload.clues,
      cells: payload.cells
    }, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
    const filename = `${sanitizeFilename(payload.title || 'espirala')}.spl`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  function downloadBuilderFile() {
    const payload = updatePreview();
    const answerLength = Array.from(payload.answer || '').length;
    if (answerLength !== Number.parseInt(fields.cellCount.value, 10)) {
      window.alert(window.t('spiralBuilder.validateLength'));
      return;
    }
    downloadPayload(payload);
  }

  function importSplFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        setState({
          title: parsed.title || exampleState.title,
          author: parsed.author || exampleState.author,
          clue: Array.isArray(parsed.clues) && parsed.clues[0] ? parsed.clues[0] : exampleState.clue,
          answer: parsed.answer || exampleState.answer,
          cellCount: Array.isArray(parsed.cells) ? parsed.cells.length : exampleState.cellCount,
          cellSize: parsed.cells && parsed.cells[0] ? Math.max(12, Math.round(Math.abs(parsed.cells[0].x - parsed.cells[0].labelX) * 2)) : exampleState.cellSize,
          gap: exampleState.gap,
          padding: 40,
          strokeWidth: 1.15,
          showNumbers: true
        });
        updatePreview();
        if (statusEl) statusEl.textContent = window.t('spiralBuilder.loadedDraft');
      } catch (error) {
        console.error(error);
        window.alert('Ezin izan da SPL fitxategia irakurri.');
      }
    };
    reader.readAsText(file);
  }

  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  downloadButtons.forEach(button => button.addEventListener('click', downloadBuilderFile));
  saveDraftButtons.forEach(button => button.addEventListener('click', storeDraft));
  loadDraftButtons.forEach(button => button.addEventListener('click', loadDraft));
  loadExampleButtons.forEach(button => button.addEventListener('click', () => {
    setState(exampleState);
    updatePreview();
  }));
  resetButtons.forEach(button => button.addEventListener('click', () => {
    setState(exampleState);
    updatePreview();
  }));

  if (importInput) {
    importInput.addEventListener('change', () => {
      importSplFile(importInput.files && importInput.files[0]);
      importInput.value = '';
    });
  }

  // Seed with the example from the reference HTML style, but keep fields editable.
  if (!window.localStorage.getItem(storageKey)) {
    setState(exampleState);
  } else {
    loadDraft();
  }
  updatePreview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSpiralBuilder, { once: true });
} else {
  initSpiralBuilder();
}
