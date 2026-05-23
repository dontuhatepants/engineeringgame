// Solvability check for Bridge levels.
// For each level, computes the gap width on the path row and verifies that some
// combination of available pieces (plank=2, longPlank=3, stone=1) can tile it
// exactly without exceeding tray counts.

import { BRIDGE_LEVELS } from './bridge.js';

const PIECE_W = { plank: 2, longPlank: 3, stone: 1 };

function tilesGap(gap, tray) {
  // Try every combination via DFS, respecting tray counts.
  const counts = { ...tray };
  function dfs(remaining) {
    if (remaining === 0) return true;
    if (remaining < 0) return false;
    for (const [type, w] of Object.entries(PIECE_W)) {
      if ((counts[type] || 0) > 0 && w <= remaining) {
        counts[type]--;
        if (dfs(remaining - w)) return true;
        counts[type]++;
      }
    }
    return false;
  }
  return dfs(gap);
}

let allOK = true;
for (let i = 0; i < BRIDGE_LEVELS.length; i++) {
  const lvl = BRIDGE_LEVELS[i];
  const gap = lvl.rightEdgeCol - lvl.leftEdgeCol - 1;
  const tray = lvl.tray || {};
  // Path-row obstacles (if any) reduce required coverage cells.
  const pathRow = Math.min(lvl.pathRowLeft, lvl.pathRowRight);
  let pathObstacles = 0;
  for (let c = lvl.leftEdgeCol + 1; c <= lvl.rightEdgeCol - 1; c++) {
    if (lvl.terrain[pathRow * lvl.cols + c] === 'obstacle') pathObstacles++;
  }
  const needCover = gap - pathObstacles;
  const ok = tilesGap(needCover, tray);
  if (!ok) allOK = false;
  console.log(`L${(i+1).toString().padStart(2)} ${lvl.name.padEnd(20)} gap=${gap} pathObst=${pathObstacles} need=${needCover} tray=${JSON.stringify(tray)} ${ok ? 'OK' : 'FAIL'}`);
}
console.log(allOK ? '\nAll 25 levels tileable.' : '\nSOME LEVELS UNSOLVABLE.');
process.exit(allOK ? 0 : 1);
