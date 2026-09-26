#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function parseNumber(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeAnswer(raw, cellCount) {
  const text = String(raw || '').trim().toUpperCase();
  if (!text) {
    throw new Error('Erantzuna beharrezkoa da (--answer).');
  }
  if (Array.from(text).length !== cellCount) {
    throw new Error(`Erantzunaren luzera (${Array.from(text).length}) eta gelaxken kopurua (${cellCount}) berdinak izan behar dira.`);
  }
  return text;
}

function extractViewBox(html) {
  const m = html.match(/<svg[^>]*viewBox\s*=\s*"([^"]+)"/i);
  return m ? m[1] : '0 0 700 700';
}

function extractCells(html) {
  const tagRegex = /<path\b[\s\S]*?>/gi;
  const idRegex = /id\s*=\s*['"]gelaxka_(\d{3})['"]/i;
  const dRegex = /\bd\s*=\s*['"]([\s\S]*?)['"]/i;
  const cells = [];
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0];
    const idMatch = tag.match(idRegex);
    if (!idMatch) continue;
    const dMatch = tag.match(dRegex);
    if (!dMatch) continue;
    cells.push({
      index: Number.parseInt(idMatch[1], 10),
      path: dMatch[1]
    });
  }
  cells.sort((a, b) => a.index - b.index);
  return cells;
}

function extractLetterAnchors(html) {
  const tagRegex = /<text\b[\s\S]*?>/gi;
  const idRegex = /id\s*=\s*['"]LETRA_(\d{3})['"]/i;
  const xRegex = /\bx\s*=\s*['"]([\s\S]*?)['"]/i;
  const yRegex = /\by\s*=\s*['"]([\s\S]*?)['"]/i;
  const map = new Map();
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0];
    const idMatch = tag.match(idRegex);
    if (!idMatch) continue;
    const xMatch = tag.match(xRegex);
    const yMatch = tag.match(yRegex);
    if (!xMatch || !yMatch) continue;
    const idx = Number.parseInt(idMatch[1], 10);
    map.set(idx, {
      x: parseNumber(xMatch[1]),
      y: parseNumber(yMatch[1])
    });
  }
  return map;
}

function extractOrderAnchors(html) {
  const tagRegex = /<text\b[\s\S]*?>/gi;
  const idRegex = /id\s*=\s*['"]ordena_(\d{3})['"]/i;
  const xRegex = /\bx\s*=\s*['"]([\s\S]*?)['"]/i;
  const yRegex = /\by\s*=\s*['"]([\s\S]*?)['"]/i;
  const map = new Map();
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[0];
    const idMatch = tag.match(idRegex);
    if (!idMatch) continue;
    const xMatch = tag.match(xRegex);
    const yMatch = tag.match(yRegex);
    if (!xMatch || !yMatch) continue;
    const idx = Number.parseInt(idMatch[1], 10);
    map.set(idx, {
      x: parseNumber(xMatch[1]),
      y: parseNumber(yMatch[1])
    });
  }
  return map;
}

function main() {
  const args = readArgs(process.argv);
  const inputPath = args.input;
  const outputPath = args.output || path.resolve(process.cwd(), 'downloads', 'espirala.spl');

  if (!inputPath) {
    throw new Error('Sarrerako fitxategia falta da. Erabili --input /bidea/fitxategia.html');
  }

  const html = fs.readFileSync(inputPath, 'utf8');
  const viewBox = extractViewBox(html);
  const cells = extractCells(html);
  if (cells.length === 0) {
    throw new Error('Ez da gelaxkarik aurkitu (gelaxka_###).');
  }

  const letterAnchors = extractLetterAnchors(html);
  const orderAnchors = extractOrderAnchors(html);

  const normalizedCells = cells.map(c => {
    const letter = letterAnchors.get(c.index);
    if (!letter || letter.x === null || letter.y === null) {
      throw new Error(`LETRA_${String(c.index).padStart(3, '0')} elementua falta da edo baliogabea da.`);
    }
    const order = orderAnchors.get(c.index) || { x: null, y: null };

    return {
      index: c.index,
      path: c.path,
      x: letter.x,
      y: letter.y,
      labelX: order.x,
      labelY: order.y
    };
  });

  const answer = normalizeAnswer(args.answer, normalizedCells.length);
  const clues = args.clue
    ? [String(args.clue).trim()]
    : ['Espiral erantzun bakarra'];

  const payload = {
    kind: 'hitzgurutzatuak/spiral/v1',
    format: 'spl',
    title: String(args.title || 'Espirala').trim(),
    author: String(args.author || 'Ezezaguna').trim(),
    viewBox,
    answer,
    clues,
    cells: normalizedCells
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`SPL sortuta: ${outputPath}`);
  console.log(`Gelaxkak: ${normalizedCells.length}`);
}

try {
  main();
} catch (err) {
  console.error('Errorea SPL sortzean:', err.message);
  process.exit(1);
}
