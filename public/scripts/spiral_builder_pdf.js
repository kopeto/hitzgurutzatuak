(function () {
  function initSpiralBuilder() {
    const form = document.getElementById('spiral-builder-form');
    const preview = document.getElementById('spiral-builder-preview');
    const warning = document.getElementById('warning');
    const statusEl = document.querySelector('[data-builder-status]');
    const metaEl = document.querySelector('[data-builder-meta]');
    const previewTitleEl = document.querySelector('[data-preview-title]');
    const previewAuthorEl = document.querySelector('[data-preview-author]');
    const inwardListEl = document.querySelector('[data-inward-list]');
    const outwardListEl = document.querySelector('[data-outward-list]');
    const clueLists = {
      inward: document.querySelector('[data-clue-list="inward"]'),
      outward: document.querySelector('[data-clue-list="outward"]')
    };
    const addClueButtons = Array.from(document.querySelectorAll('[data-add-clue]'));
    const downloadButtons = Array.from(document.querySelectorAll('[data-download-button]'));
    const downloadHtmlButtons = Array.from(document.querySelectorAll('[data-download-html]'));
    const saveDraftButtons = Array.from(document.querySelectorAll('[data-save-draft]'));
    const loadDraftButtons = Array.from(document.querySelectorAll('[data-load-draft]'));
    const loadExampleButtons = Array.from(document.querySelectorAll('[data-load-example]'));
    const resetButtons = Array.from(document.querySelectorAll('[data-reset-builder]'));
    const importInput = document.querySelector('[data-import-file]');

    if (!form || !preview) return;

    const fields = {
      title: document.getElementById('builderTitle'),
      author: document.getElementById('builderAuthor'),
      answer: document.getElementById('builderAnswer'),
      cellCount: document.getElementById('builderCellCount'),
      cellSize: document.getElementById('builderCellSize'),
      showNumbers: document.getElementById('builderShowNumbers')
    };

    const storageKey = 'spiral-builder-state-v3';
    const defaultState = {
      title: '',
      author: '',
      inwardDefs: [],
      outwardDefs: [],
      inwardClues: '',
      outwardClues: '',
      answer: '',
      cellCount: 64,
      cellSize: 60,
      showNumbers: true
    };

    const exampleState = {
      title: 'THE SPIRAL',
      author: 'BY STUART CLELAND',
      inwardClues: '1-4 Alien-seekers\' acronym\n5-7 Countdown starter\n8-12 Xbox enthusiast\n13-18 "I ___ tell a lie"\n19-26 Small glass disk in a stained glass window\n27-33 August meteor shower\n34-40 Oakland\'s county\n41-46 Taxonomic subdivisions\n47-53 From an ethical point of view\n54-59 Two-time Oscar winner Wiest\n60-66 Leading power\n67-70 Four-time Cy Young Award winner Maddux\n71-75 U.S. military base on Cuban soil, familiarly\n76-80 Fictional creature in a Lewis Carroll poem\n81-84 Brusque\n85-87 Johnny ___ and Billy Yank\n88-95 Large-eared ruminant of the American West: 2 wds.\n96-100 Dwarf planet between Mars and Jupiter',
      outwardClues: '100-97 Dry as a bone\n96-91 Historic Colorado mining town\n90-80 Vehicle loaded up at a sawmill: 2 wds.\n79-74 1996 Mel Gibson/Rene Russo thriller\n73-68 Pooh\'s bouncy pal\n67-63 Kitschy garden statue\n62-56 Hellish abode\n55-51 Pastoral poem\n50-46 Bakery emanation\n45-38 Traitor\n37-30 Interpreter of ___ (2000 Pulitzer winner)\n29-22 Drove away, as insects\n21-16 Kramden\'s sidekick\n15-11 Mother of pearl\n10-1 Minerals that can become lodestones',
      answer: 'EUSKALON'.repeat(12) + 'EUSK',
      cellCount: 100,
      cellSize: 60,
      showNumbers: true
    };

    function getState() {
      const cellCount = Number.parseInt(fields.cellCount.value, 10) || 1;
      const inwardDefs = readDefinitionRows('inward');
      const outwardDefs = readDefinitionRows('outward');
      const inwardLines = linesFromDefinitions('inward', inwardDefs, cellCount);
      const outwardLines = linesFromDefinitions('outward', outwardDefs, cellCount);

      return {
        title: fields.title.value.trim(),
        author: fields.author.value.trim(),
        inwardDefs: normalizeDefinitions('inward', inwardDefs, cellCount).map(item => ({ start: item.start, end: item.end, text: item.text })),
        outwardDefs: normalizeDefinitions('outward', outwardDefs, cellCount).map(item => ({ start: item.start, end: item.end, text: item.text })),
        inwardClues: inwardLines.join('\n'),
        outwardClues: outwardLines.join('\n'),
        answer: fields.answer.value.toLocaleUpperCase('eu').replace(/\s+/g, ''),
        cellCount,
        cellSize: Number.parseFloat(fields.cellSize.value) || 60,
        showNumbers: Boolean(fields.showNumbers.checked)
      };
    }

    function setState(state) {
      const cellCount = state.cellCount ?? defaultState.cellCount;
      fields.title.value = state.title ?? defaultState.title;
      fields.author.value = state.author ?? defaultState.author;
      fields.answer.value = state.answer ?? defaultState.answer;
      fields.cellCount.value = cellCount;
      fields.cellSize.value = state.cellSize ?? defaultState.cellSize;
      fields.showNumbers.checked = state.showNumbers ?? defaultState.showNumbers;

      const inwardDefs = Array.isArray(state.inwardDefs)
        ? state.inwardDefs
        : parseLegacyDefinitions('inward', state.inwardClues ?? defaultState.inwardClues, cellCount);
      const outwardDefs = Array.isArray(state.outwardDefs)
        ? state.outwardDefs
        : parseLegacyDefinitions('outward', state.outwardClues ?? defaultState.outwardClues, cellCount);

      setDefinitionRows('inward', inwardDefs);
      setDefinitionRows('outward', outwardDefs);
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

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function parseLines(text) {
      return String(text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    }

    function parseLegacyLine(line) {
      const match = String(line || '').trim().match(/^(\d+)\s*-\s*(\d+)\s*(.*)$/);
      if (!match) return null;
      return {
        start: Number.parseInt(match[1], 10),
        end: Number.parseInt(match[2], 10),
        text: String(match[3] || '').trim()
      };
    }

    function getDirectionSpec(direction, cellCount) {
      if (direction === 'outward') {
        return { start: cellCount, step: -1, boundary: 1 };
      }
      return { start: 1, step: 1, boundary: cellCount };
    }

    function normalizeDefinitions(direction, rawDefs, cellCount, options = {}) {
      const defs = Array.isArray(rawDefs) ? rawDefs : [];
      const totalCells = Math.max(1, Number.parseInt(cellCount, 10) || 1);
      const editedIndex = Number.isInteger(options.editedIndex) ? options.editedIndex : -1;
      const editedField = options.editedField === 'start' || options.editedField === 'end' ? options.editedField : '';

      if (!defs.length) {
        return [];
      }

      const normalized = defs.map(raw => {
        const start = Math.max(1, Math.min(totalCells, Number.parseInt(raw && raw.start, 10) || 1));
        const end = Math.max(1, Math.min(totalCells, Number.parseInt(raw && raw.end, 10) || start));
        return {
          start: Math.min(start, end),
          end: Math.max(start, end),
          text: String(raw && raw.text ? raw.text : '').trim()
        };
      }).sort((a, b) => a.start - b.start);

      // Forward pass: handle overlaps by reducing previous end
      for (let i = 1; i < normalized.length; i += 1) {
        const previous = normalized[i - 1];
        const current = normalized[i];

        if (current.start < previous.end + 1) {
          const editedPreviousEnd = editedField === 'end' && editedIndex === (i - 1);

          if (editedPreviousEnd) {
            const desiredNextStart = previous.end + 1;
            current.start = Math.max(1, Math.min(totalCells, previous.end + 1));
            if (current.start > current.end) {
              current.end = current.start;
            }

            // If boundary clamping prevents pushing next definition enough,
            // fallback to trimming previous end to avoid duplicate coverage.
            if (current.start < desiredNextStart) {
              previous.end = Math.max(previous.start, current.start - 1);
            }
          } else {
            previous.end = Math.max(previous.start, current.start - 1);
          }
        }
      }

      // Backward pass: handle overlaps by increasing next start
      for (let i = normalized.length - 2; i >= 0; i -= 1) {
        const current = normalized[i];
        const next = normalized[i + 1];

        if (current.end > next.start - 1) {
          next.start = Math.min(totalCells, current.end + 1);
          if (next.start > next.end) {
            next.end = next.start;
          }
        }
      }

      // Fill gaps: pull the previous end to meet the next start
      for (let i = 1; i < normalized.length; i += 1) {
        const previous = normalized[i - 1];
        const current = normalized[i];

        if (previous.end < current.start - 1) {
          const editedPreviousEnd = editedField === 'end' && editedIndex === (i - 1);

          if (editedPreviousEnd) {
            current.start = Math.max(1, Math.min(totalCells, previous.end + 1));
            if (current.start > current.end) {
              current.end = current.start;
            }
          } else {
            previous.end = current.start - 1;
          }
        }
      }

      const first = normalized[0];
      if (first) {
        first.start = 1;
        if (first.end < first.start) {
          first.end = first.start;
        }
      }

      const last = normalized[normalized.length - 1];
      if (last) {
        last.end = totalCells;
        if (last.start > last.end) {
          last.start = last.end;
        }
      }

      return normalized
        .filter(item => item.start >= 1 && item.start <= totalCells && item.end >= 1 && item.end <= totalCells);
    }

    function linesFromDefinitions(direction, defs, cellCount) {
      const normalized = normalizeDefinitions(direction, defs, cellCount);
      const ordered = direction === 'outward' ? normalized.slice().reverse() : normalized;

      return ordered
        .map(item => {
          const rangeStart = direction === 'outward' ? item.end : item.start;
          const rangeEnd = direction === 'outward' ? item.start : item.end;
          return `${rangeStart}-${rangeEnd}${item.text ? ` ${item.text}` : ''}`;
        });
    }

    function buildWordFromRange(answer, start, end) {
      const letters = Array.from(String(answer || ''));
      const startNum = Number.parseInt(start, 10);
      const endNum = Number.parseInt(end, 10);
      if (!Number.isFinite(startNum) || !Number.isFinite(endNum)) return '';
      const step = startNum <= endNum ? 1 : -1;
      const chars = [];
      for (let i = startNum; step > 0 ? i <= endNum : i >= endNum; i += step) {
        chars.push(letters[i - 1] || '·');
      }
      return chars.join('');
    }

    function updateDefinitionWordPreviews() {
      const answer = fields.answer.value.toLocaleUpperCase('eu').replace(/\s+/g, '');
      Object.values(clueLists).forEach(list => {
        if (!list) return;
        list.querySelectorAll('.clue-row').forEach(row => {
          const start = row.querySelector('[data-clue-start]')?.value;
          const end = row.querySelector('[data-clue-end]')?.value;
          const word = buildWordFromRange(answer, start, end);
          const label = row.querySelector('[data-clue-word]');
          if (label) {
            label.textContent = `${window.t('spiralBuilder.wordPreview')}: ${word || '—'}`;
          }
        });
      });
    }

    function readDefinitionRows(direction) {
      const list = clueLists[direction];
      if (!list) return [];
      const mapped = Array.from(list.querySelectorAll('.clue-row')).map(row => {
        const displayStart = row.querySelector('[data-clue-start]')?.value;
        const displayEnd = row.querySelector('[data-clue-end]')?.value;

        if (direction === 'outward') {
          return {
            start: displayEnd,
            end: displayStart,
            text: row.querySelector('[data-clue-text]')?.value || ''
          };
        }

        return {
          start: displayStart,
          end: displayEnd,
          text: row.querySelector('[data-clue-text]')?.value || ''
        };
      });

      return direction === 'outward' ? mapped.reverse() : mapped;
    }

    function sanitizeEditedDefinition(defs, cellCount, editedIndex, editedField) {
      const totalCells = Math.max(1, Number.parseInt(cellCount, 10) || 1);
      const numericDefs = (Array.isArray(defs) ? defs : []).map(raw => {
        const rawStart = Number.parseInt(raw && raw.start, 10);
        const rawEnd = Number.parseInt(raw && raw.end, 10);
        const safeStart = Number.isFinite(rawStart) ? clamp(rawStart, 1, totalCells) : 1;
        const safeEnd = Number.isFinite(rawEnd) ? clamp(rawEnd, 1, totalCells) : safeStart;

        return {
          start: Math.min(safeStart, safeEnd),
          end: Math.max(safeStart, safeEnd),
          text: String(raw && raw.text ? raw.text : '')
        };
      });

      if (!Number.isInteger(editedIndex) || editedIndex < 0 || editedIndex >= numericDefs.length) {
        return numericDefs;
      }

      const current = numericDefs[editedIndex];
      const previous = editedIndex > 0 ? numericDefs[editedIndex - 1] : null;
      const next = editedIndex < numericDefs.length - 1 ? numericDefs[editedIndex + 1] : null;

      if (editedField === 'start') {
        const minStart = previous ? previous.end + 1 : 1;
        const maxStart = current.end;
        const safeMaxStart = editedIndex === 0 ? 1 : Math.max(minStart, maxStart);
        current.start = clamp(current.start, minStart, safeMaxStart);
      } else if (editedField === 'end') {
        const minEnd = current.start;
        const maxEnd = next ? next.start - 1 : totalCells;
        const safeMaxEnd = editedIndex === numericDefs.length - 1 ? totalCells : Math.max(minEnd, maxEnd);
        current.end = clamp(current.end, minEnd, safeMaxEnd);
      }

      return numericDefs;
    }

    function setDefinitionRows(direction, defs, normalizeOptions = {}) {
      const list = clueLists[direction];
      if (!list) return;
      const cellCount = Math.max(1, Number.parseInt(fields.cellCount.value, 10) || defaultState.cellCount);
      const normalized = normalizeDefinitions(direction, defs, cellCount, normalizeOptions);
      const rendered = direction === 'outward' ? normalized.slice().reverse() : normalized;
      list.innerHTML = '';

      rendered.forEach((item, index) => {
        const canonicalIndex = direction === 'outward' ? (normalized.length - 1 - index) : index;
        const displayStart = direction === 'outward' ? item.end : item.start;
        const displayEnd = direction === 'outward' ? item.start : item.end;

        const row = document.createElement('div');
        row.className = 'clue-row';
        row.dataset.index = String(canonicalIndex);

        const head = document.createElement('div');
        head.className = 'clue-row-head';

        const startInput = document.createElement('input');
        startInput.type = 'number';
        startInput.className = 'form-control clue-start';
        startInput.value = String(displayStart);
        startInput.min = '1';
        startInput.max = String(cellCount);
        startInput.dataset.clueStart = '1';
        startInput.title = window.t('spiralBuilder.startCell');
        startInput.setAttribute('aria-label', window.t('spiralBuilder.startCell'));

        const endInput = document.createElement('input');
        endInput.type = 'number';
        endInput.className = 'form-control clue-end';
        endInput.value = String(displayEnd);
        endInput.min = '1';
        endInput.max = String(cellCount);
        endInput.dataset.clueEnd = '1';
        endInput.title = window.t('spiralBuilder.endCell');
        endInput.setAttribute('aria-label', window.t('spiralBuilder.endCell'));

        const textInput = document.createElement('textarea');
        textInput.className = 'form-control clue-text';
        textInput.placeholder = window.t('spiralBuilder.definition');
        textInput.value = item.text;
        textInput.dataset.clueText = '1';
        textInput.setAttribute('aria-label', window.t('spiralBuilder.definition'));

        const wordPreview = document.createElement('div');
        wordPreview.className = 'clue-word-preview';
        wordPreview.dataset.clueWord = '1';
        wordPreview.textContent = `${window.t('spiralBuilder.wordPreview')}: —`;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-outline-danger btn-sm clue-remove';
        removeBtn.textContent = window.t('spiralBuilder.removeDefinition');
        removeBtn.dataset.removeClue = direction;
        removeBtn.dataset.index = String(canonicalIndex);

        head.appendChild(startInput);
        head.appendChild(endInput);
        head.appendChild(removeBtn);
        row.appendChild(head);
        row.appendChild(textInput);
        row.appendChild(wordPreview);
        list.appendChild(row);
      });

      updateDefinitionWordPreviews();
    }

    function parseLegacyDefinitions(direction, text, cellCount) {
      const lines = parseLines(text);
      const spec = getDirectionSpec(direction, cellCount);
      let fallbackStart = spec.start;
      const mapped = lines.map(line => {
        const parsed = parseLegacyLine(line);
        if (parsed) {
          fallbackStart = parsed.end + spec.step;
          return {
            start: parsed.start,
            end: parsed.end,
            text: parsed.text || ''
          };
        }
        const item = {
          start: fallbackStart,
          end: fallbackStart,
          text: line
        };
        fallbackStart += spec.step;
        return item;
      });
      return normalizeDefinitions(direction, mapped, cellCount).map(item => ({
        start: item.start,
        end: item.end,
        text: item.text
      }));
    }

    function addDefinition(direction) {
      const count = Math.max(1, Number.parseInt(fields.cellCount.value, 10) || defaultState.cellCount);
      const spec = getDirectionSpec(direction, count);
      let defs = normalizeDefinitions(direction, readDefinitionRows(direction), count);

      if (defs.length === 0) {
        defs = [{
          start: spec.start,
          end: spec.boundary,
          text: ''
        }];
      } else {
        const last = defs[defs.length - 1];
        const lastLength = Math.abs(last.end - last.start) + 1;

        if (lastLength > 1) {
          const take = Math.max(1, Math.floor(lastLength / 2));
          const originalEnd = last.end;
          last.end = last.end - take;
          defs.push({
            start: last.end + 1,
            end: originalEnd,
            text: ''
          });
        } else {
          if (defs.length >= count) {
            return;
          }

          if (direction === 'outward') {
            defs[0].end = Math.min(defs[0].start, defs[0].end + 1);
            for (let i = 1; i < defs.length; i++) {
              defs[i].start = Math.min(count, defs[i].start + 1);
              defs[i].end = Math.min(defs[i].start, defs[i].end + 1);
            }
            defs.push({ start: 1, end: 1, text: '' });
          } else {
            defs[0].end = Math.max(defs[0].start, defs[0].end - 1);
            for (let i = 1; i < defs.length; i++) {
              defs[i].start = Math.max(1, defs[i].start - 1);
              defs[i].end = Math.max(defs[i].start, defs[i].end - 1);
            }
            defs.push({ start: count, end: count, text: '' });
          }
        }
      }

      setDefinitionRows(direction, defs);
      const list = clueLists[direction];
      const rows = list ? list.querySelectorAll('.clue-row') : [];
      if (rows.length) {
        const lastInput = rows[rows.length - 1].querySelector('[data-clue-text]');
        if (lastInput) lastInput.focus();
      }
      updatePreview();
    }

    function removeDefinition(direction, index) {
      const defs = readDefinitionRows(direction);
      if (index < 0 || index >= defs.length) return;
      defs.splice(index, 1);
      setDefinitionRows(direction, defs);
      updatePreview();
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function polar(cx, cy, radius, angle) {
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      };
    }

    function normalizeVector(x, y) {
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    }

    function interpolateSample(samples, targetDistance, fromIndex) {
      const totalDistance = samples[samples.length - 1].distance;
      const clampedDistance = clamp(targetDistance, 0, totalDistance);
      let index = clamp(fromIndex || 0, 0, samples.length - 2);

      while (index < samples.length - 2 && samples[index + 1].distance < clampedDistance) {
        index += 1;
      }

      const a = samples[index];
      const b = samples[index + 1];
      const span = Math.max(1e-6, b.distance - a.distance);
      const t = clamp((clampedDistance - a.distance) / span, 0, 1);

      const result = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        index
      };

      if (typeof a.theta === 'number' && typeof b.theta === 'number') {
        result.theta = a.theta + (b.theta - a.theta) * t;
      }

      if (typeof a.nx === 'number' && typeof a.ny === 'number' && typeof b.nx === 'number' && typeof b.ny === 'number') {
        const normal = normalizeVector(
          a.nx + (b.nx - a.nx) * t,
          a.ny + (b.ny - a.ny) * t
        );
        result.nx = normal.x;
        result.ny = normal.y;
      }

      return result;
    }

    function toPath(points) {
      if (!points.length) return '';
      return points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join(' ');
    }

    function spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, radialOffset) {
      const radius = outerRadius - slope * (theta - thetaStart) - radialOffset;
      return {
        x: cx + Math.cos(theta) * radius,
        y: cy + Math.sin(theta) * radius,
        radius
      };
    }

    function buildSpiralArcPoints(cx, cy, outerRadius, slope, thetaStart, thetaA, thetaB, radialOffset, maxStep) {
      const points = [];
      const delta = thetaB - thetaA;
      const direction = delta >= 0 ? 1 : -1;
      const total = Math.abs(delta);
      const safeStep = Math.max(0.035, Math.min(0.16, Math.abs(maxStep || 0.08)));
      const segments = Math.max(1, Math.ceil(total / safeStep));

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const theta = thetaA + direction * total * t;
        points.push(spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, radialOffset));
      }

      return points;
    }

    function buildPayload() {
      const state = getState();
      const cellCount = Math.max(1, state.cellCount);
      const width = 760;
      const height = 760;
      const cx = width / 2;
      const cy = height / 2;
      const outerRadius = 286;
      const stripWidth = clamp(state.cellSize * 0.82, 20, 56);
      const ringGap = 0;
      const turnPitch = stripWidth + ringGap;
      const minInnerRadius = 64;
      const maxTurnsByRadius = (outerRadius - minInnerRadius) / turnPitch;
      const preferredTurns = clamp(cellCount / 15, 3, 7.2);
      const turns = clamp(preferredTurns, 2.2, Math.max(2.2, maxTurnsByRadius));
      const thetaSpan = turns * Math.PI * 2;
      const cellAngle = thetaSpan / cellCount;
      const thetaStart = -Math.PI * 3 / 4 - cellAngle / 2;
      const thetaEnd = thetaStart + thetaSpan;
      const innerRadius = outerRadius - turns * turnPitch;
      const radialSpan = outerRadius - innerRadius;
      const slope = radialSpan / thetaSpan;
      const sampleCount = Math.max(1800, cellCount * 80);
      const outerSamples = [];

      for (let i = 0; i <= sampleCount; i++) {
        const t = i / sampleCount;
        const theta = thetaStart + thetaSpan * t;
        const point = spiralPoint(cx, cy, outerRadius, slope, thetaStart, theta, 0);

        let distance = 0;
        if (i > 0) {
          const prev = outerSamples[i - 1];
          distance = prev.distance + Math.hypot(point.x - prev.x, point.y - prev.y);
        }

        outerSamples.push({
          x: point.x,
          y: point.y,
          theta,
          distance
        });
      }

      const totalLength = outerSamples[outerSamples.length - 1].distance;
      const cellLength = totalLength / cellCount;
      const axialGap = 0;
      const cells = [];
      let searchIndex = 0;

      for (let i = 0; i < cellCount; i++) {
        const baseStart = i * cellLength;
        const baseEnd = (i + 1) * cellLength;
        const startDistance = baseStart + axialGap * 0.5;
        const endDistance = Math.max(startDistance + 0.1, baseEnd - axialGap * 0.5);

        const start = interpolateSample(outerSamples, startDistance, searchIndex);
        const end = interpolateSample(outerSamples, endDistance, start.index);
        const midTheta = (start.theta + end.theta) / 2;
        const innerStart = spiralPoint(cx, cy, outerRadius, slope, thetaStart, start.theta, stripWidth);
        const innerEnd = spiralPoint(cx, cy, outerRadius, slope, thetaStart, end.theta, stripWidth);
        const outerArc = buildSpiralArcPoints(cx, cy, outerRadius, slope, thetaStart, start.theta, end.theta, 0, 0.07);
        const innerArc = buildSpiralArcPoints(cx, cy, outerRadius, slope, thetaStart, end.theta, start.theta, stripWidth, 0.07);
        const letter = spiralPoint(cx, cy, outerRadius, slope, thetaStart, midTheta, stripWidth * 0.56);
        const label = spiralPoint(cx, cy, outerRadius, slope, thetaStart, midTheta, stripWidth * 0.2);
        searchIndex = start.index;

        const pathParts = [];
        const outerFirst = outerArc[0];
        pathParts.push(`M ${outerFirst.x.toFixed(2)} ${outerFirst.y.toFixed(2)}`);
        for (let p = 1; p < outerArc.length; p++) {
          pathParts.push(`L ${outerArc[p].x.toFixed(2)} ${outerArc[p].y.toFixed(2)}`);
        }
        pathParts.push(`L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)}`);
        for (let p = 1; p < innerArc.length; p++) {
          pathParts.push(`L ${innerArc[p].x.toFixed(2)} ${innerArc[p].y.toFixed(2)}`);
        }
        pathParts.push(`L ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)}`);
        pathParts.push('Z');

        cells.push({
          index: i + 1,
          path: pathParts.join(' '),
          x: Number(letter.x.toFixed(2)),
          y: Number(letter.y.toFixed(2)),
          labelX: Number(label.x.toFixed(2)),
          labelY: Number(label.y.toFixed(2))
        });
      }

      const guidePoints = [];
      for (let i = 0; i < outerSamples.length; i += 3) {
        guidePoints.push(outerSamples[i]);
      }
      if (guidePoints[guidePoints.length - 1] !== outerSamples[outerSamples.length - 1]) {
        guidePoints.push(outerSamples[outerSamples.length - 1]);
      }

      return {
        kind: 'hitzgurutzatuak/spiral/v1',
        format: 'spl',
        title: state.title || 'Espirala',
        author: state.author || 'Ezezaguna',
        viewBox: `0 0 ${width} ${height}`,
        answer: state.answer,
        clues: [...parseLines(state.inwardClues), ...parseLines(state.outwardClues)],
        guidePath: toPath(guidePoints),
        cells,
        state
      };
    }

    function renderList(element, lines, fallback) {
      if (!element) return;
      const items = lines.length ? lines : fallback;
      element.innerHTML = items.map(line => `<li>${line}</li>`).join('');
    }

    function updatePreview() {
      const payload = buildPayload();
      const state = payload.state;
      const letters = Array.from(state.answer || '');
      const answerLength = letters.length;
      const count = Math.max(1, state.cellCount);

      if (previewTitleEl) previewTitleEl.textContent = state.title || 'Espirala';
      if (previewAuthorEl) previewAuthorEl.textContent = state.author || 'Ezezaguna';
      renderList(inwardListEl, parseLines(state.inwardClues), []);
      renderList(outwardListEl, parseLines(state.outwardClues), []);

      preview.setAttribute('viewBox', payload.viewBox);
      preview.innerHTML = '';

      const svgNs = 'http://www.w3.org/2000/svg';
      const bg = document.createElementNS(svgNs, 'rect');
      bg.setAttribute('x', '0');
      bg.setAttribute('y', '0');
      bg.setAttribute('width', '760');
      bg.setAttribute('height', '760');
      bg.setAttribute('fill', '#ffffff');
      preview.appendChild(bg);

      if (payload.guidePath) {
        const accent = document.createElementNS(svgNs, 'path');
        accent.setAttribute('d', payload.guidePath);
        accent.setAttribute('class', 'spiral-preview-accent');
        preview.appendChild(accent);
      }

      const cells = payload.cells || [];

      const cellsGroup = document.createElementNS(svgNs, 'g');
      preview.appendChild(cellsGroup);

      const lettersGroup = document.createElementNS(svgNs, 'g');
      preview.appendChild(lettersGroup);

      const numbersGroup = document.createElementNS(svgNs, 'g');
      preview.appendChild(numbersGroup);

      cells.forEach(cell => {
        const path = document.createElementNS(svgNs, 'path');
        path.setAttribute('d', cell.path);
        path.setAttribute('class', `spiral-preview-cell${cell.index % 2 === 0 ? ' is-odd' : ''}`);
        path.setAttribute('stroke-width', '1.1');
        cellsGroup.appendChild(path);

        if (state.showNumbers) {
          const number = document.createElementNS(svgNs, 'text');
          number.setAttribute('x', String(cell.labelX));
          number.setAttribute('y', String(cell.labelY));
          number.setAttribute('text-anchor', 'middle');
          number.setAttribute('dominant-baseline', 'middle');
          number.setAttribute('class', 'spiral-preview-number');
          number.textContent = String(cell.index);
          numbersGroup.appendChild(number);
        }

        const letter = document.createElementNS(svgNs, 'text');
        letter.setAttribute('x', String(cell.x));
        letter.setAttribute('y', String(cell.y));
        letter.setAttribute('text-anchor', 'middle');
        letter.setAttribute('dominant-baseline', 'central');
        letter.setAttribute('class', 'spiral-preview-letter');
        letter.textContent = letters[cell.index - 1] || '·';
        lettersGroup.appendChild(letter);
      });

      if (metaEl) {
        metaEl.textContent = `${count} casillas · ${Math.round(state.cellSize)}px · 760×760`;
      }

      const valid = answerLength === count;
      const message = valid
        ? window.t('spiralBuilder.downloadReady')
        : `${window.t('spiralBuilder.validateLength')} (${answerLength}/${count})`;

      if (warning) warning.textContent = valid ? '' : message;
      if (statusEl) statusEl.textContent = message;
      updateDefinitionWordPreviews();
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

    function buildStandaloneHtml(payload) {
      const state = payload.state;
      const inwardItems = parseLines(state.inwardClues).map(line => `<li>${escapeHtml(line)}</li>`).join('');
      const outwardItems = parseLines(state.outwardClues).map(line => `<li>${escapeHtml(line)}</li>`).join('');
      const cells = payload.cells || [];
      const letters = Array.from(payload.answer || '');

      const svgPaths = cells.map(cell => {
        const fillClass = cell.index % 2 === 0 ? 'spiral-cell is-odd' : 'spiral-cell';
        const numberText = state.showNumbers
          ? `<text x="${cell.labelX}" y="${cell.labelY}" text-anchor="middle" dominant-baseline="middle" class="spiral-number">${cell.index}</text>`
          : '';
        const letter = letters[cell.index - 1] || '·';
        return [
          `<path d="${cell.path}" class="${fillClass}" stroke-width="1.1"></path>`,
          numberText,
          `<text x="${cell.x}" y="${cell.y}" text-anchor="middle" dominant-baseline="central" class="spiral-letter">${escapeHtml(letter)}</text>`
        ].join('');
      }).join('');

      const guidePath = payload.guidePath
        ? `<path d="${payload.guidePath}" class="spiral-accent"></path>`
        : '';

      return `<!doctype html>
<html lang="eu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(payload.title)} - Spiral</title>
  <style>
    body { margin: 0; background: #ecebe7; color: #171717; font-family: Arial, Helvetica, sans-serif; }
    .page { width: min(980px, calc(100vw - 2rem)); margin: 1rem auto; background: #fff; box-shadow: 0 5px 22px #0002; }
    .header { display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: center; padding: 16px 18px 12px; background: #245bb6; color: #fff; }
    .title { font-size: 2.15rem; font-weight: 900; letter-spacing: -0.04em; line-height: 1; text-transform: uppercase; }
    .author { font-size: 1rem; font-weight: 900; letter-spacing: 0.02em; text-transform: uppercase; text-align: right; }
    .art { display: grid; place-items: center; padding: 10px 16px 8px; }
    .preview { display: block; width: min(100%, 760px); height: auto; }
    .spiral-accent { fill: none; stroke: #b7cff3; stroke-width: 14; stroke-linecap: round; stroke-linejoin: round; }
    .spiral-cell { fill: #fff; stroke: #2c2c2c; stroke-width: 1.1; stroke-linejoin: miter; stroke-linecap: butt; }
    .spiral-cell.is-odd { fill: #f8f8f5; }
    .spiral-number { font-size: 7pt; font-weight: 600; fill: #666; }
    .spiral-letter { font-size: 18pt; font-weight: 700; fill: #151515; }
    .clues { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; padding: 2px 16px 18px; }
    .clues h2 { margin: 0 0 8px; color: #245bb6; font-size: 1rem; font-weight: 900; letter-spacing: 0.02em; text-align: center; text-transform: uppercase; }
    .clues ol { margin: 0; padding-left: 0; list-style: none; color: #222; font-size: 0.93rem; line-height: 1.35; }
    .clues li { margin: 0.08rem 0; }
    @media (max-width: 700px) { .header { grid-template-columns: 1fr; } .author { text-align: left; } .clues { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <article class="page">
    <header class="header">
      <div class="title">${escapeHtml(payload.title)}</div>
      <div class="author">${escapeHtml(payload.author)}</div>
    </header>
    <div class="art">
      <svg class="preview" viewBox="${escapeHtml(payload.viewBox)}" role="img" aria-label="Aurrebista">
        <rect x="0" y="0" width="760" height="760" fill="#ffffff"></rect>
        ${guidePath}
        ${svgPaths}
      </svg>
    </div>
    <section class="clues">
      <div>
        <h2>${escapeHtml(window.t('spiralBuilder.inward'))}</h2>
        <ol>${inwardItems}</ol>
      </div>
      <div>
        <h2>${escapeHtml(window.t('spiralBuilder.outward'))}</h2>
        <ol>${outwardItems}</ol>
      </div>
    </section>
  </article>
</body>
</html>`;
    }

    function downloadHtmlFile() {
      const payload = updatePreview();
      const html = buildStandaloneHtml(payload);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const filename = `${sanitizeFilename(payload.title || 'espirala')}.html`;
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
            title: parsed.title || defaultState.title,
            author: parsed.author || defaultState.author,
            inwardClues: Array.isArray(parsed.clues) ? parsed.clues.slice(0, Math.ceil(parsed.clues.length / 2)).join('\n') : defaultState.inwardClues,
            outwardClues: Array.isArray(parsed.clues) ? parsed.clues.slice(Math.ceil(parsed.clues.length / 2)).join('\n') : defaultState.outwardClues,
            answer: parsed.answer || defaultState.answer,
            cellCount: Array.isArray(parsed.cells) ? parsed.cells.length : defaultState.cellCount,
            cellSize: defaultState.cellSize,
            showNumbers: defaultState.showNumbers
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

    if (fields.answer) {
      fields.answer.addEventListener('input', () => {
        const cellCount = Math.max(1, Number.parseInt(fields.cellCount.value, 10) || defaultState.cellCount);
        const normalized = fields.answer.value.toLocaleUpperCase('eu').replace(/\s+/g, '');
        const excess = normalized.length - cellCount;
        fields.answer.maxLength = String(cellCount * 4);

        if (excess > 0) {
          const truncated = normalized.slice(0, cellCount);
          fields.answer.value = truncated;
        }
      });
    }

    if (fields.cellCount) {
      fields.cellCount.addEventListener('change', () => {
        const cellCount = Math.max(1, Number.parseInt(fields.cellCount.value, 10) || defaultState.cellCount);
        const normalized = fields.answer.value.toLocaleUpperCase('eu').replace(/\s+/g, '');
        if (normalized.length > cellCount) {
          fields.answer.value = normalized.slice(0, cellCount);
        }
        if (fields.answer) fields.answer.maxLength = String(cellCount * 4);
      });
    }

    addClueButtons.forEach(button => {
      button.addEventListener('click', () => {
        const direction = button.getAttribute('data-add-clue');
        if (direction === 'inward' || direction === 'outward') {
          addDefinition(direction);
        }
      });
    });

    Object.entries(clueLists).forEach(([direction, list]) => {
      if (!list) return;

      list.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const removeBtn = target.closest('[data-remove-clue]');
        if (!removeBtn) return;
        const index = Number.parseInt(removeBtn.getAttribute('data-index') || '-1', 10);
        removeDefinition(direction, index);
      });

      list.addEventListener('change', event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('[data-clue-start], [data-clue-end]')) {
          const row = target.closest('.clue-row');
          const editedIndex = Number.parseInt(row?.dataset.index || '-1', 10);
          let editedField = target.matches('[data-clue-start]') ? 'start' : 'end';
          if (direction === 'outward') {
            editedField = editedField === 'start' ? 'end' : 'start';
          }
          const defs = readDefinitionRows(direction);
          const count = Math.max(1, Number.parseInt(fields.cellCount.value, 10) || defaultState.cellCount);
          const sanitizedDefs = sanitizeEditedDefinition(defs, count, editedIndex, editedField);
          setDefinitionRows(direction, sanitizedDefs, { editedIndex, editedField });
          updatePreview();
        }
      });

      list.addEventListener('input', event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('[data-clue-start], [data-clue-end], [data-clue-text]')) {
          updateDefinitionWordPreviews();
        }
      });
    });

    if (fields.cellCount) {
      fields.cellCount.addEventListener('change', () => {
        setDefinitionRows('inward', readDefinitionRows('inward'));
        setDefinitionRows('outward', readDefinitionRows('outward'));
        updatePreview();
      });
    }

    downloadButtons.forEach(button => button.addEventListener('click', downloadBuilderFile));
    downloadHtmlButtons.forEach(button => button.addEventListener('click', downloadHtmlFile));
    saveDraftButtons.forEach(button => button.addEventListener('click', storeDraft));
    loadDraftButtons.forEach(button => button.addEventListener('click', loadDraft));
    loadExampleButtons.forEach(button => button.addEventListener('click', () => {
      setState(exampleState);
      updatePreview();
    }));
    resetButtons.forEach(button => button.addEventListener('click', () => {
      setState(defaultState);
      updatePreview();
    }));

    if (importInput) {
      importInput.addEventListener('change', () => {
        importSplFile(importInput.files && importInput.files[0]);
        importInput.value = '';
      });
    }

    setState(defaultState);
    updatePreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpiralBuilder, { once: true });
  } else {
    initSpiralBuilder();
  }
}());
