// Solvability check for levels 26-50 only.
import { PIPES_LEVELS } from './levels.js';

const DELTA = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const OPPOSITE = { N: 'S', E: 'W', S: 'N', W: 'E' };

function openingsForTile(tile) {
  if (!tile) return [];
  if (tile.k === 'src' || tile.k === 'sink') return [tile.dir];
  if (tile.k === 'wall') return [];
  if (tile.k === 'pipe') {
    if (tile.s === 'I') return (tile.r % 2 === 0) ? ['W','E'] : ['N','S'];
    if (tile.s === 'L') return [['N','E'],['E','S'],['S','W'],['W','N']][tile.r];
  }
  return [];
}

function computeFlow(level, tiles) {
  const { rows, cols } = level;
  const srcIdx = tiles.findIndex(t => t && t.k === 'src');
  const filled = new Set([srcIdx]);
  const queue = [srcIdx];
  let winning = false;
  while (queue.length) {
    const idx = queue.shift();
    const tile = tiles[idx];
    if (tile.k === 'sink') continue;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    for (const dir of openingsForTile(tile)) {
      const [dr, dc] = DELTA[dir];
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const nIdx = nr * cols + nc;
      if (filled.has(nIdx)) continue;
      const nTile = tiles[nIdx];
      if (!nTile || nTile.k === 'wall') continue;
      const nOpenings = openingsForTile(nTile);
      if (!nOpenings.includes(OPPOSITE[dir])) continue;
      filled.add(nIdx);
      if (nTile.k === 'sink') winning = true;
      else queue.push(nIdx);
    }
  }
  return winning;
}

for (let li = 25; li < PIPES_LEVELS.length; li++) {
  const level = PIPES_LEVELS[li];
  const pipeIdxs = level.tiles
    .map((t, i) => (t && t.k === 'pipe' && !t.fixed) ? i : -1)
    .filter(i => i >= 0);
  const total = 4 ** pipeIdxs.length;
  let solutions = 0;
  let startSolved = false;
  for (let combo = 0; combo < total; combo++) {
    const tiles = level.tiles.map(t => t ? { ...t } : null);
    for (let p = 0; p < pipeIdxs.length; p++) {
      tiles[pipeIdxs[p]].r = (combo >> (p * 2)) & 3;
    }
    if (computeFlow(level, tiles)) {
      solutions++;
      const initialMatch = pipeIdxs.every(idx => tiles[idx].r === level.tiles[idx].r);
      if (initialMatch) startSolved = true;
    }
  }
  console.log(`Level ${li+1} ${level.name}: ${pipeIdxs.length} pipes, ${solutions}/${total} valid combos, starts-solved=${startSolved}`);
}
