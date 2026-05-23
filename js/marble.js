// Marble Run mechanic: drag ramp/chute pieces onto a grid, then GO to release
// the marble. Deterministic state-machine simulation routes the marble cell to
// cell based on each piece's entry->exit mapping.

import { sfx } from './sound.js';

// ----- Piece definitions -----
// Each piece maps an entry direction (N/E/S/W) to its exit direction.
// Entry direction = the side of the cell the marble ENTERS through.
// Exit direction  = the side it LEAVES through.
const PIECE_DEFS = {
  // Vertical chute: marble enters from top, exits at bottom.
  chute: {
    label: 'chute',
    map: { N: 'S' },
    // SVG drawn into 100x100 viewBox.
    svg: `
      <path d="M 30 0 L 30 100" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 70 0 L 70 100" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 36 0 L 36 100" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 64 0 L 64 100" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
    `,
    // Path through the cell (entry side -> centre -> exit side), used for animating the marble.
    track: { N: [[50, 0], [50, 100]] },
  },
  // Horizontal straight: W <-> E
  straight: {
    label: 'straight',
    map: { W: 'E', E: 'W' },
    svg: `
      <path d="M 0 30 L 100 30" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 0 70 L 100 70" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 0 36 L 100 36" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 0 64 L 100 64" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
    `,
    track: { W: [[0, 50], [100, 50]], E: [[100, 50], [0, 50]] },
  },
  // Ramp going from top to LEFT exit (and from RIGHT to bottom).
  rampL: {
    label: 'ramp-left',
    map: { N: 'W', E: 'S' },
    svg: `
      <path d="M 30 0 Q 30 30 0 30" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 70 0 Q 70 70 0 70" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 36 0 Q 36 36 0 36" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 64 0 Q 64 64 0 64" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 100 30 Q 70 30 70 0" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 100 36 Q 64 36 64 0" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
    `,
    track: {
      N: [[50, 0], [50, 50], [0, 50]],
      E: [[100, 50], [50, 50], [50, 100]],
    },
  },
  // Ramp going from top to RIGHT exit (and from LEFT to bottom).
  rampR: {
    label: 'ramp-right',
    map: { N: 'E', W: 'S' },
    svg: `
      <path d="M 70 0 Q 70 30 100 30" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 30 0 Q 30 70 100 70" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 64 0 Q 64 36 100 36" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 36 0 Q 36 64 100 64" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 0 30 Q 30 30 30 0" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 0 36 Q 36 36 36 0" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
    `,
    track: {
      N: [[50, 0], [50, 50], [100, 50]],
      W: [[0, 50], [50, 50], [50, 100]],
    },
  },
  // Funnel: catches from N and sends down. (Same behaviour as chute; visual is a funnel.)
  funnel: {
    label: 'funnel',
    map: { N: 'S' },
    svg: `
      <path d="M 5 5 L 35 50 L 35 100" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 95 5 L 65 50 L 65 100" stroke="#3a4756" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 12 5 L 42 50 L 42 100" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
      <path d="M 88 5 L 58 50 L 58 100" stroke="#bbc4d0" stroke-width="6" stroke-linecap="square" fill="none"/>
    `,
    track: { N: [[50, 0], [50, 100]] },
  },
};

const PIECE_TYPES = Object.keys(PIECE_DEFS);

// Direction helpers
const DELTA = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const OPPOSITE = { N: 'S', E: 'W', S: 'N', W: 'E' };

// ----- Level data -----
// Tiles array: row-major. Entries:
//   null           -> empty placeable cell
//   'wall'         -> impassable
//   { fixed: 'rampL' } -> pre-placed piece (not removable)
// drop: { col }    -> marble enters row 0, this column, heading S
// goal: { row, col } -> marble must enter this cell to win
// tray: object map of pieceType -> count available

// Helper to build a tile array of size r*c.
function emptyTiles(r, c) { return new Array(r * c).fill(null); }

export const MARBLE_LEVELS = [
  // ===== L1-L5: 3x4, basic intro =====
  // L1: straight 3-cell drop. Need 3 chutes.
  {
    name: 'First Drop',
    rows: 4, cols: 3,
    drop: { col: 1 }, goal: { row: 3, col: 1 },
    tiles: emptyTiles(4, 3),
    tray: { chute: 3 },
  },
  // L2: drop col 0, goal (3,0). 3 chutes.
  {
    name: 'Down We Go',
    rows: 4, cols: 3,
    drop: { col: 0 }, goal: { row: 3, col: 0 },
    tiles: emptyTiles(4, 3),
    tray: { chute: 3 },
  },
  // L3: drop col 0 (N), goal (3,2). Solution: (0,0)=rampR(N->E), (0,1)=straight(W->E), (0,2)=rampR(W->S), then chutes down col 2.
  {
    name: 'Slide Right',
    rows: 4, cols: 3,
    drop: { col: 0 }, goal: { row: 3, col: 2 },
    tiles: emptyTiles(4, 3),
    tray: { rampR: 2, straight: 1, chute: 2 },
  },
  // L4: drop col 2, goal (3,0). Mirror of L3. (0,2)=rampL(N->W), (0,1)=straight, (0,0)=rampL(E->S), chutes down col 0.
  {
    name: 'Slide Left',
    rows: 4, cols: 3,
    drop: { col: 2 }, goal: { row: 3, col: 0 },
    tiles: emptyTiles(4, 3),
    tray: { rampL: 2, straight: 1, chute: 2 },
  },
  // L5: straight drop with extra chutes available (intro the "more than needed" idea slightly — actually still tight).
  {
    name: 'Long Drop',
    rows: 4, cols: 3,
    drop: { col: 1 }, goal: { row: 3, col: 1 },
    tiles: emptyTiles(4, 3),
    tray: { chute: 3 },
  },

  // ===== L6-L10: 5x4, intro the ramp turns =====
  // L6: drop col 0 to goal (4,3). Path: rampR at (0,0); straight x2 (0,1)(0,2); rampR at (0,3) goes W->S; chutes down col 3 rows 1,2,3.
  {
    name: 'Zig Zag',
    rows: 5, cols: 4,
    drop: { col: 0 }, goal: { row: 4, col: 3 },
    tiles: emptyTiles(5, 4),
    tray: { rampR: 2, straight: 2, chute: 3 },
  },
  // L7: mirror — drop col 3 to goal (4,0). rampL at (0,3); straight x2; rampL at (0,0); chutes down.
  {
    name: 'Zag Zig',
    rows: 5, cols: 4,
    drop: { col: 3 }, goal: { row: 4, col: 0 },
    tiles: emptyTiles(5, 4),
    tray: { rampL: 2, straight: 2, chute: 3 },
  },
  // L8: drop col 1 to goal (4,2). Simple: (0,1)=chute or rampR... easier: (0,1) chute, (1,1) chute, (2,1) rampR(N->E), (2,2) rampR(W->S), chutes (3,2).
  {
    name: 'Twin Turns',
    rows: 5, cols: 4,
    drop: { col: 1 }, goal: { row: 4, col: 2 },
    tiles: emptyTiles(5, 4),
    tray: { rampR: 2, chute: 3 },
  },
  // L9: drop col 0 to goal (4,3). Use rampR + straights + chutes.
  {
    name: 'Wide Slide',
    rows: 5, cols: 4,
    drop: { col: 0 }, goal: { row: 4, col: 3 },
    tiles: emptyTiles(5, 4),
    tray: { rampR: 2, straight: 2, chute: 3 },
  },
  // L10: drop col 0 to goal (4,2). With a decoy funnel.
  {
    name: 'Step Down',
    rows: 5, cols: 4,
    drop: { col: 0 }, goal: { row: 4, col: 2 },
    tiles: emptyTiles(5, 4),
    tray: { rampR: 2, straight: 1, chute: 3, funnel: 1 /* decoy */ },
  },

  // ===== L11-L15: 6x5 with walls =====
  // L11: Around the block. drop col 0 -> goal (5,4). Walls block direct middle path.
  // Solution path: go right across row 0, then down col 4. rampR at (0,0); straight x3; rampR at (0,4)(W->S); chutes down col 4.
  {
    name: 'Around The Block',
    rows: 6, cols: 5,
    drop: { col: 0 }, goal: { row: 5, col: 4 },
    tiles: (() => {
      const t = emptyTiles(6, 5);
      t[2 * 5 + 2] = 'wall';
      t[3 * 5 + 2] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 3, chute: 4 },
  },
  // L12: drop col 2 -> goal (5,2). Wall directly below. Detour around.
  // Solution: chute at (0,2), rampR (1,2)(N->E), rampR(2,3)(W->S)... wait need to come back to col 2.
  // Easier: (0,2)=rampR(N->E); (0,3)=rampR(W->S); chutes down col 3; rampL(5,3)? Goal is at (5,2). Need to enter goal from N or E or W.
  // Plan: (0,2)=rampR(N->E), (0,3)=rampR(W->S), (1,3)=chute, (2,3)=chute, (3,3)=chute, (4,3)=rampL(N->W) ... but rampL N->W, then enters (4,2) from E. rampL maps E->S, so (4,2)=rampL(E->S), then (5,2)=goal entry from N.
  // Pieces needed: rampR=2, rampL=2, chute=3.
  {
    name: 'Detour',
    rows: 6, cols: 5,
    drop: { col: 2 }, goal: { row: 5, col: 2 },
    tiles: (() => {
      const t = emptyTiles(6, 5);
      t[2 * 5 + 2] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, rampL: 2, chute: 3, straight: 1 /* decoy */ },
  },
  // L13: walls at (1,1) and (3,3). Drop col 1 -> goal (5,3).
  // (0,1)=rampR(N->E), (0,2)=rampR(W->S), chute(1,2), chute(2,2), rampR(3,2)(N->E)... wait then enter (3,3) which is wall.
  // Let's try: (0,1)=rampR(N->E), (0,2)=straight(W->E), (0,3)=rampR(W->S), chutes down col 3 to (2,3); but (3,3) is wall. So at (2,3) need rampL(N->W), then (2,2)=rampL(E->S), chutes(3,2)(4,2), rampR(5,2)? Goal is (5,3). Actually we want to reach (5,3) but (3,3) is wall, so we must go below it. Try: chutes down col 3 to (2,3), then rampL goes W, chutes down col 2 to (4,2), rampR(N->E), then... (4,3) is empty but (5,3) is goal. So rampR at (4,2)(W?). Actually (4,2) marble entry N, rampR maps N->E. (4,3) marble enters from W, need W->S; rampR(W->S). Then (5,3) goal from N.
  // Pieces: rampR at (0,1),(0,3),(4,2),(4,3)=4; rampL at (2,3),(2,2)=2; chutes at (1,3),(3,2)=2; straight at (0,2)=1.
  // Hmm that's a lot. Simpler plan:
  // (0,1) chute, (1,1)=wall — blocked. So we must turn at (0,1).
  // (0,1)=rampR(N->E), then chutes/straight to (0,4), then down. Walls don't block col 4 — only (1,1) and (3,3) are walls.
  // (0,1)=rampR(N->E), (0,2)=straight(W->E), (0,3)=straight(W->E), (0,4)=rampR(W->S), chutes (1,4)(2,4)(3,4), then (4,4)=rampL(N->W), (4,3)=rampL(E->S), (5,3)=goal.
  // Pieces: rampR=2, straight=2, chute=3, rampL=2.
  {
    name: 'Wall Walker',
    rows: 6, cols: 5,
    drop: { col: 1 }, goal: { row: 5, col: 3 },
    tiles: (() => {
      const t = emptyTiles(6, 5);
      t[1 * 5 + 1] = 'wall';
      t[3 * 5 + 3] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, rampL: 2, straight: 2, chute: 3 },
  },
  // L14: walls at (2,2) and (4,2). Drop col 0 -> goal (5,4).
  // Path: rampR at (0,0); straight x3; rampR at (0,4)(W->S); chutes down col 4 to (5,4).
  {
    name: 'Two Walls',
    rows: 6, cols: 5,
    drop: { col: 0 }, goal: { row: 5, col: 4 },
    tiles: (() => {
      const t = emptyTiles(6, 5);
      t[2 * 5 + 2] = 'wall';
      t[4 * 5 + 2] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 3, chute: 4 },
  },
  // L15: walls at (1,4) and (3,3). Drop col 2 -> goal (5,0). Go left.
  // (0,2)=rampL(N->W), (0,1)=straight(E->W), (0,0)=rampL(E->S), chutes down col 0 to (5,0).
  {
    name: 'Tight Squeeze',
    rows: 6, cols: 5,
    drop: { col: 2 }, goal: { row: 5, col: 0 },
    tiles: (() => {
      const t = emptyTiles(6, 5);
      t[1 * 5 + 4] = 'wall';
      t[3 * 5 + 3] = 'wall';
      return t;
    })(),
    tray: { rampL: 2, straight: 1, chute: 4, rampR: 1 /* decoy */ },
  },

  // ===== L16-L20: 7x5 with decoys + pre-placed pieces =====
  // L16: Pre-placed rampR at (0,0). Drop col 0 -> goal (6,4).
  // After fixed rampR(N->E), need straights across row 0 to (0,4), then rampR(W->S), chutes down to (6,4).
  {
    name: 'Helper Ramp',
    rows: 7, cols: 5,
    drop: { col: 0 }, goal: { row: 6, col: 4 },
    tiles: (() => {
      const t = emptyTiles(7, 5);
      t[0 * 5 + 0] = { fixed: 'rampR' };
      return t;
    })(),
    tray: { straight: 3, rampR: 1, chute: 5, rampL: 1 /* decoy */ },
  },
  // L17: walls at (3,1) and (3,3) — drop col 2 -> goal (6,2). Straight down through the gap.
  {
    name: 'Choose Wisely',
    rows: 7, cols: 5,
    drop: { col: 2 }, goal: { row: 6, col: 2 },
    tiles: (() => {
      const t = emptyTiles(7, 5);
      t[3 * 5 + 1] = 'wall';
      t[3 * 5 + 3] = 'wall';
      return t;
    })(),
    tray: { chute: 6, straight: 2 /* decoy */, rampR: 1 /* decoy */ },
  },
  // L18: Pre-placed rampR at (2,1), wall at (2,3). Drop col 1 -> goal (6,3).
  // (0,1)=chute, (1,1)=chute, (2,1)=rampR fixed (N->E), (2,2)=rampR(W->S), chutes col 2 to (5,2), rampR(5,2)(N->E)? Wait need to reach (6,3).
  // (0,1)chute, (1,1)chute, (2,1)rampR fixed -> exit E. (2,2)=rampR(W->S) -> down col 2.
  // (3,2)chute, (4,2)chute, (5,2)=rampR(N->E)-> (5,3)=rampR(W->S) -> (6,3)=goal.
  // Pieces: chute=4, rampR=3.
  {
    name: 'Long Way Down',
    rows: 7, cols: 5,
    drop: { col: 1 }, goal: { row: 6, col: 3 },
    tiles: (() => {
      const t = emptyTiles(7, 5);
      t[2 * 5 + 1] = { fixed: 'rampR' };
      t[2 * 5 + 3] = 'wall';
      return t;
    })(),
    tray: { rampR: 3, chute: 4, straight: 1 /* decoy */, rampL: 1 /* decoy */ },
  },
  // L19: walls at (1,4) and (5,4). Drop col 0 -> goal (6,0). Just chutes down col 0.
  {
    name: 'Switchback',
    rows: 7, cols: 5,
    drop: { col: 0 }, goal: { row: 6, col: 0 },
    tiles: (() => {
      const t = emptyTiles(7, 5);
      t[1 * 5 + 4] = 'wall';
      t[5 * 5 + 4] = 'wall';
      return t;
    })(),
    tray: { chute: 6, rampR: 1 /* decoy */, rampL: 1 /* decoy */, straight: 1 /* decoy */ },
  },
  // L20: Pre-placed chute at (2,1), funnel at (4,4). Drop col 1 -> goal (6,4).
  // (0,1)chute, (1,1)chute, (2,1)chute fixed, (3,1)=rampR(N->E), straights to (3,3), rampR(3,3)(?) wait need to reach (4,4) which has a funnel fixed.
  // funnel: N->S only. So enter (4,4) from N.
  // (3,1)=rampR(N->E), (3,2)=straight, (3,3)=straight, (3,4)=rampR(W->S), (4,4)=funnel fixed(N->S), (5,4)=chute, (6,4)=goal.
  // Pieces: rampR=2, straight=2, chute=1. Already have (2,1) chute fixed.
  {
    name: 'Pre-Built',
    rows: 7, cols: 5,
    drop: { col: 1 }, goal: { row: 6, col: 4 },
    tiles: (() => {
      const t = emptyTiles(7, 5);
      t[2 * 5 + 1] = { fixed: 'chute' };
      t[4 * 5 + 4] = { fixed: 'funnel' };
      return t;
    })(),
    tray: { rampR: 2, straight: 3, chute: 3, rampL: 1 /* decoy */ },
  },

  // ===== L21-L25: 8x6 complex paths =====
  // L21: walls at (3,2) and (5,3). Drop col 0 -> goal (7,5).
  // Path: rampR(0,0), straights x4, rampR(0,5)(W->S), chutes down col 5 to (7,5).
  {
    name: 'Big Run',
    rows: 8, cols: 6,
    drop: { col: 0 }, goal: { row: 7, col: 5 },
    tiles: (() => {
      const t = emptyTiles(8, 6);
      t[3 * 6 + 2] = 'wall';
      t[5 * 6 + 3] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 4, chute: 6, rampL: 1 /* decoy */ },
  },
  // L22: walls at (2,5) and (5,5). Drop col 0 -> goal (7,0). Straight chutes down col 0.
  {
    name: 'Snake',
    rows: 8, cols: 6,
    drop: { col: 0 }, goal: { row: 7, col: 0 },
    tiles: (() => {
      const t = emptyTiles(8, 6);
      t[2 * 6 + 5] = 'wall';
      t[5 * 6 + 5] = 'wall';
      return t;
    })(),
    tray: { chute: 7, rampR: 1 /* decoy */, rampL: 1 /* decoy */, straight: 2 /* decoy */ },
  },
  // L23: walls at (2,3), (4,2), (4,4). Drop col 3 -> goal (7,3).
  // (0,3)chute, (1,3)chute, then wall at (2,3). Need to detour.
  // (0,3)=rampR(N->E), (0,4)=rampR(W->S), chutes down col 4 to (3,4); (4,4)=wall. Need to go around.
  // (3,4)=rampL(N->W), (3,3)=straight(E->W), (3,2)=rampL(E->S), chutes down col 2 to (3,2) ... wait (4,2)=wall.
  // Different plan: just route past walls.
  // (0,3)=rampL(N->W), (0,2)=straight, (0,1)=rampL(E->S), chutes down col 1 to (6,1), then rampR(6,1)(N->E)... actually let's just route straight down col 1, col 0, etc. Goal is (7,3).
  // Simpler: (0,3)=rampL(N->W), chutes/straights detour around walls and back to col 3 at row 7.
  // (0,3)=rampL(N->W), (0,2)=straight(E->W), (0,1)=rampL(E->S), chutes col 1 down to (6,1), rampR(6,1)(N->E), straight(6,2), rampR(6,3)(W->S), (7,3)=goal.
  // Pieces: rampL=2, straight=2, chute=6, rampR=2.
  {
    name: 'Maze Drop',
    rows: 8, cols: 6,
    drop: { col: 3 }, goal: { row: 7, col: 3 },
    tiles: (() => {
      const t = emptyTiles(8, 6);
      t[2 * 6 + 3] = 'wall';
      t[4 * 6 + 2] = 'wall';
      t[4 * 6 + 4] = 'wall';
      return t;
    })(),
    tray: { rampL: 2, rampR: 2, straight: 3, chute: 7, funnel: 1 /* decoy */ },
  },
  // L24: walls at (2,2), (5,3). Fixed chute at (0,1). Drop col 1 -> goal (7,4).
  // (0,1)chute fixed, (1,1)chute, then need to head right.
  // (2,1)=rampR(N->E), straights x2 (2,2 is wall — skip), so actually (2,1)=rampR -> (2,2) wall = bad.
  // Try: (1,1)=rampR(N->E), (1,2)=straight, (1,3)=straight, (1,4)=rampR(W->S), chutes down col 4 to (7,4).
  // Pieces: rampR=2, straight=2, chute=6. Fixed chute at (0,1) used.
  {
    name: 'Grand Tour',
    rows: 8, cols: 6,
    drop: { col: 1 }, goal: { row: 7, col: 4 },
    tiles: (() => {
      const t = emptyTiles(8, 6);
      t[2 * 6 + 2] = 'wall';
      t[5 * 6 + 3] = 'wall';
      t[0 * 6 + 1] = { fixed: 'chute' };
      return t;
    })(),
    tray: { rampR: 2, rampL: 1 /* decoy */, straight: 3, chute: 7, funnel: 1 /* decoy */ },
  },
  // L25: walls at (2,2),(2,4),(5,1),(5,3). Fixed chute at (3,5). Drop col 0 -> goal (7,5).
  // Path: (0,0)=rampR(N->E), straights to (0,5), rampR(0,5)(W->S), chutes (1,5)(2,5), (3,5)chute fixed, chutes (4,5)(5,5)(6,5), goal (7,5).
  // Pieces: rampR=2, straight=4, chute=5. Fixed chute used.
  {
    name: 'Master Marble',
    rows: 8, cols: 6,
    drop: { col: 0 }, goal: { row: 7, col: 5 },
    tiles: (() => {
      const t = emptyTiles(8, 6);
      t[2 * 6 + 2] = 'wall';
      t[2 * 6 + 4] = 'wall';
      t[5 * 6 + 1] = 'wall';
      t[5 * 6 + 3] = 'wall';
      t[3 * 6 + 5] = { fixed: 'chute' };
      return t;
    })(),
    tray: { rampR: 3, rampL: 2 /* decoy */, straight: 5, chute: 6, funnel: 1 /* decoy */ },
  },

  // ===== L26-L30: 8x7, mild obstacles, 7-9 pieces =====
  // L26: 7 chutes straight down col 3. Walls are visual flavor only.
  {
    name: 'Straight Shooter',
    rows: 8, cols: 7,
    drop: { col: 3 }, goal: { row: 7, col: 3 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[3 * 7 + 1] = 'wall';
      t[5 * 7 + 5] = 'wall';
      return t;
    })(),
    tray: { chute: 7, rampR: 1 /* decoy */, rampL: 1 /* decoy */ },
  },
  // L27: rampR(0,0), 3 straights, rampR(0,4) W->S, 3 chutes to goal (4,4).
  {
    name: 'Long Shelf',
    rows: 8, cols: 7,
    drop: { col: 0 }, goal: { row: 4, col: 4 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[6 * 7 + 2] = 'wall';
      t[6 * 7 + 5] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 3, chute: 3, rampL: 1 /* decoy */ },
  },
  // L28: mirror of L27. rampL(0,6), 3 straights, rampL(0,2) E->S, 3 chutes to (4,2).
  {
    name: 'Long Shelf Left',
    rows: 8, cols: 7,
    drop: { col: 6 }, goal: { row: 4, col: 2 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[6 * 7 + 1] = 'wall';
      t[6 * 7 + 4] = 'wall';
      return t;
    })(),
    tray: { rampL: 2, straight: 3, chute: 3, rampR: 1 /* decoy */ },
  },
  // L29: drop col 2 -> goal (6,4). (0,2)chute, (1,2)rampR N->E, straight(1,3), rampR(1,4)W->S, chutes col 4 rows 2-5, goal(6,4). Wall (3,3) decorative.
  {
    name: 'Step Across',
    rows: 8, cols: 7,
    drop: { col: 2 }, goal: { row: 6, col: 4 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[3 * 7 + 3] = 'wall';
      t[5 * 7 + 1] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 1, chute: 5, funnel: 1 /* decoy */ },
  },
  // L30: drop col 0 -> goal (3,6). rampR(0,0), 5 straights, rampR(0,6)W->S, chutes (1,6),(2,6), goal(3,6).
  {
    name: 'Top Shelf Run',
    rows: 8, cols: 7,
    drop: { col: 0 }, goal: { row: 3, col: 6 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[5 * 7 + 2] = 'wall';
      t[5 * 7 + 4] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 5, chute: 2, rampL: 1 /* decoy */ },
  },

  // ===== L31-L35: 8x7, 8-11 pieces, more walls =====
  // L31: drop col 1 -> goal (7,5). Walls (3,3),(4,3) block direct. Path: (0,1)chute,(1,1)chute,(2,1)rampR, straight x3 to (2,5), rampR(2,5)W->S, chutes(3,5..6,5), goal(7,5).
  {
    name: 'Wall Wrap',
    rows: 8, cols: 7,
    drop: { col: 1 }, goal: { row: 7, col: 5 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[3 * 7 + 3] = 'wall';
      t[4 * 7 + 3] = 'wall';
      t[5 * 7 + 0] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 3, chute: 6, rampL: 1 /* decoy */ },
  },
  // L32: drop col 0 -> goal (5,5). rampR(0,0), 4 straights (0,1..0,4), rampR(0,5)W->S, chutes (1,5..4,5), goal(5,5). Walls (2,2),(3,3).
  {
    name: 'Side Route',
    rows: 8, cols: 7,
    drop: { col: 0 }, goal: { row: 5, col: 5 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[2 * 7 + 2] = 'wall';
      t[3 * 7 + 3] = 'wall';
      t[7 * 7 + 6] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 4, chute: 4, funnel: 1 /* decoy */ },
  },
  // L33: drop col 6 -> goal (4,0). rampL(0,6), 5 straights (0,5..1), rampL(0,0)E->S, chutes (1,0..3,0), goal(4,0).
  {
    name: 'Mirror March',
    rows: 8, cols: 7,
    drop: { col: 6 }, goal: { row: 4, col: 0 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[2 * 7 + 3] = 'wall';
      t[3 * 7 + 3] = 'wall';
      t[6 * 7 + 4] = 'wall';
      return t;
    })(),
    tray: { rampL: 2, straight: 5, chute: 3, rampR: 1 /* decoy */ },
  },
  // L34: drop col 3 -> goal (7,3). Walls (2,3),(5,3) block straight chute. Detour right.
  // (0,3)rampR N->E, (0,4)rampR W->S, chutes (1,4..5,4), rampL(6,4)N->W, rampL(6,3)E->S, goal(7,3).
  {
    name: 'Around The Stack',
    rows: 8, cols: 7,
    drop: { col: 3 }, goal: { row: 7, col: 3 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[2 * 7 + 3] = 'wall';
      t[5 * 7 + 3] = 'wall';
      t[4 * 7 + 1] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, rampL: 2, chute: 5, straight: 1 /* decoy */, funnel: 1 /* decoy */ },
  },
  // L35: drop col 0 -> goal (5,6). rampR(0,0), 5 straights (0,1..0,5), rampR(0,6)W->S, chutes (1,6..4,6), goal(5,6).
  {
    name: 'High Bridge',
    rows: 8, cols: 7,
    drop: { col: 0 }, goal: { row: 5, col: 6 },
    tiles: (() => {
      const t = emptyTiles(8, 7);
      t[2 * 7 + 2] = 'wall';
      t[4 * 7 + 4] = 'wall';
      t[7 * 7 + 3] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 5, chute: 4, rampL: 1 /* decoy */ },
  },

  // ===== L36-L40: 9x7, 9-13 pieces, fixed pre-placed pieces =====
  // L36: 9x7. Fixed rampR(0,0). Drop col 0 -> goal (8,6).
  // Fixed rampR at (0,0) catches drop, exits E. Player adds: straight x5 (0,1..0,5), rampR(0,6) W->S, chutes (1,6..7,6), goal (8,6).
  {
    name: 'Welcome Ramp',
    rows: 9, cols: 7,
    drop: { col: 0 }, goal: { row: 8, col: 6 },
    tiles: (() => {
      const t = emptyTiles(9, 7);
      t[0 * 7 + 0] = { fixed: 'rampR' };
      t[4 * 7 + 3] = 'wall';
      t[5 * 7 + 3] = 'wall';
      return t;
    })(),
    tray: { rampR: 1, straight: 5, chute: 7, rampL: 1 /* decoy */, funnel: 1 /* decoy */ },
  },
  // L37: 9x7. Fixed chute at (3,3). Drop col 3 -> goal (8,5).
  // (0,3)chute,(1,3)chute,(2,3)chute,(3,3)fixed chute,(4,3)rampR N->E, straight(4,4), rampR(4,5)W->S, chutes(5,5..7,5), goal(8,5).
  {
    name: 'Built In',
    rows: 9, cols: 7,
    drop: { col: 3 }, goal: { row: 8, col: 5 },
    tiles: (() => {
      const t = emptyTiles(9, 7);
      t[3 * 7 + 3] = { fixed: 'chute' };
      t[2 * 7 + 1] = 'wall';
      t[5 * 7 + 6] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 1, chute: 6, rampL: 1 /* decoy */ },
  },
  // L38: 9x7. Fixed rampL at (3,5). Drop col 5 -> goal (8,0).
  // (0,5)chute,(1,5)chute,(2,5)chute,(3,5)fixed rampL N->W, straight(3,4..3,1) x4, rampL(3,0)E->S, chutes(4,0..7,0), goal(8,0).
  {
    name: 'Long March',
    rows: 9, cols: 7,
    drop: { col: 5 }, goal: { row: 8, col: 0 },
    tiles: (() => {
      const t = emptyTiles(9, 7);
      t[3 * 7 + 5] = { fixed: 'rampL' };
      t[2 * 7 + 4] = 'wall';
      t[6 * 7 + 3] = 'wall';
      return t;
    })(),
    tray: { rampL: 1, straight: 4, chute: 7, rampR: 1 /* decoy */, funnel: 1 /* decoy */ },
  },
  // L39: 9x7. Fixed funnel at (4,3). Drop col 3 -> goal (8,6).
  // (0,3)chute,(1,3)chute,(2,3)chute,(3,3)chute,(4,3)fixed funnel N->S,(5,3)rampR N->E, straight(5,4),(5,5), rampR(5,6)W->S, chutes(6,6),(7,6), goal(8,6).
  {
    name: 'Funnel Forward',
    rows: 9, cols: 7,
    drop: { col: 3 }, goal: { row: 8, col: 6 },
    tiles: (() => {
      const t = emptyTiles(9, 7);
      t[4 * 7 + 3] = { fixed: 'funnel' };
      t[2 * 7 + 5] = 'wall';
      t[7 * 7 + 2] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 2, chute: 6, rampL: 1 /* decoy */ },
  },
  // L40: 9x7. Two fixed: rampR(0,0) and rampR(0,6). Drop col 0 -> goal (8,6).
  // Fixed rampR(0,0) N->E, straights (0,1..0,5) x5, fixed rampR(0,6) W->S, chutes (1,6..7,6) x7, goal(8,6).
  {
    name: 'Bookends',
    rows: 9, cols: 7,
    drop: { col: 0 }, goal: { row: 8, col: 6 },
    tiles: (() => {
      const t = emptyTiles(9, 7);
      t[0 * 7 + 0] = { fixed: 'rampR' };
      t[0 * 7 + 6] = { fixed: 'rampR' };
      t[4 * 7 + 3] = 'wall';
      t[5 * 7 + 3] = 'wall';
      t[6 * 7 + 3] = 'wall';
      return t;
    })(),
    tray: { straight: 5, chute: 7, rampL: 2 /* decoy */, funnel: 1 /* decoy */ },
  },

  // ===== L41-L45: 9x8, 12-14 pieces, complex routing =====
  // L41: 9x8. Drop col 1 -> goal (8,7). rampR(0,1), 5 straights (0,2..0,6), rampR(0,7)W->S, chutes (1,7..7,7) x7, goal(8,7).
  {
    name: 'Wide World',
    rows: 9, cols: 8,
    drop: { col: 1 }, goal: { row: 8, col: 7 },
    tiles: (() => {
      const t = emptyTiles(9, 8);
      t[3 * 8 + 3] = 'wall';
      t[4 * 8 + 3] = 'wall';
      t[5 * 8 + 5] = 'wall';
      t[6 * 8 + 5] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 5, chute: 7, rampL: 2 /* decoy */, funnel: 1 /* decoy */ },
  },
  // L42: 9x8. Drop col 0 -> goal (8,5). rampR(0,0), 4 straights (0,1..0,4), rampR(0,5)W->S, chutes (1,5..7,5) x7, goal(8,5).
  {
    name: 'Curved Cascade',
    rows: 9, cols: 8,
    drop: { col: 0 }, goal: { row: 8, col: 5 },
    tiles: (() => {
      const t = emptyTiles(9, 8);
      t[2 * 8 + 2] = 'wall';
      t[4 * 8 + 3] = 'wall';
      t[6 * 8 + 4] = 'wall';
      t[7 * 8 + 1] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 4, chute: 7, rampL: 1 /* decoy */, funnel: 2 /* decoy */ },
  },
  // L43: 9x8. DOUBLING BACK. Drop col 0 -> goal (4,2).
  // (0,0)rampR, straight x5 (0,1..0,5), rampR(0,6)W->S, chute(1,6),(2,6), rampL(3,6)N->W, straight x3 (3,5),(3,4),(3,3), rampL(3,2)E->S, goal(4,2).
  // Note: also (3,3) would step over a wall location -- ensure walls do not sit on path. Walls at (2,3),(2,4) — not on path.
  {
    name: 'U-Turn',
    rows: 9, cols: 8,
    drop: { col: 0 }, goal: { row: 4, col: 2 },
    tiles: (() => {
      const t = emptyTiles(9, 8);
      t[2 * 8 + 3] = 'wall';
      t[2 * 8 + 4] = 'wall';
      t[7 * 8 + 4] = 'wall';
      t[8 * 8 + 1] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, rampL: 2, straight: 8, chute: 2, funnel: 2 /* decoy */ },
  },
  // L44: 9x8. Fixed straight at (0,3). Drop col 0 -> goal (8,7).
  // rampR(0,0), straight(0,1), straight(0,2), fixed straight(0,3), straight(0,4), straight(0,5), straight(0,6), rampR(0,7)W->S, chutes(1,7..7,7) x7, goal(8,7).
  {
    name: 'Pass Through',
    rows: 9, cols: 8,
    drop: { col: 0 }, goal: { row: 8, col: 7 },
    tiles: (() => {
      const t = emptyTiles(9, 8);
      t[0 * 8 + 3] = { fixed: 'straight' };
      t[3 * 8 + 3] = 'wall';
      t[5 * 8 + 5] = 'wall';
      t[6 * 8 + 2] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 5, chute: 7, rampL: 1 /* decoy */, funnel: 1 /* decoy */ },
  },
  // L45: 9x8. Fixed chute at (5,4). Drop col 0 -> goal (8,4).
  // rampR(0,0), straight x3 (0,1..0,3), rampR(0,4)W->S, chutes (1,4),(2,4),(3,4),(4,4), fixed chute(5,4), chutes(6,4),(7,4), goal(8,4).
  {
    name: 'Locked-In Chute',
    rows: 9, cols: 8,
    drop: { col: 0 }, goal: { row: 8, col: 4 },
    tiles: (() => {
      const t = emptyTiles(9, 8);
      t[5 * 8 + 4] = { fixed: 'chute' };
      t[3 * 8 + 1] = 'wall';
      t[3 * 8 + 2] = 'wall';
      t[3 * 8 + 3] = 'wall';
      t[7 * 8 + 2] = 'wall';
      t[7 * 8 + 6] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 3, chute: 6, rampL: 2 /* decoy */, funnel: 1 /* decoy */ },
  },

  // ===== L46-L50: 10x8, ultimate set, 15+ pieces, decoys =====
  // L46: 10x8. Drop col 0 -> goal (9,7). rampR(0,0), 6 straights (0,1..0,6), rampR(0,7)W->S, 8 chutes (1,7..8,7), goal(9,7).
  {
    name: 'Grand Cascade',
    rows: 10, cols: 8,
    drop: { col: 0 }, goal: { row: 9, col: 7 },
    tiles: (() => {
      const t = emptyTiles(10, 8);
      t[4 * 8 + 3] = 'wall';
      t[5 * 8 + 4] = 'wall';
      t[7 * 8 + 2] = 'wall';
      t[8 * 8 + 4] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, straight: 6, chute: 8, rampL: 3 /* decoy */, funnel: 2 /* decoy */ },
  },
  // L47: 10x8. BIG SNAKE/zig-zag. Drop col 0 -> goal (8,0).
  // (0,0)rampR, straight x5 (0,1..0,5), rampR(0,6)W->S, chute(1,6),(2,6), rampL(3,6)N->W, straight x5 (3,5..3,1), rampL(3,0)E->S, chutes(4,0..7,0), goal(8,0).
  {
    name: 'Serpent',
    rows: 10, cols: 8,
    drop: { col: 0 }, goal: { row: 8, col: 0 },
    tiles: (() => {
      const t = emptyTiles(10, 8);
      t[5 * 8 + 3] = 'wall';
      t[6 * 8 + 5] = 'wall';
      t[1 * 8 + 7] = 'wall';
      t[9 * 8 + 4] = 'wall';
      t[9 * 8 + 7] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, rampL: 2, straight: 10, chute: 6, funnel: 2 /* decoy */ },
  },
  // L48: 10x8. Fixed rampR(0,3), fixed rampL(5,3). Drop col 3 -> goal (9,3).
  // (0,3)fixed rampR N->E, straight(0,4),(0,5),(0,6), rampR(0,7)W->S, chute(1,7),(2,7),(3,7),(4,7), rampL(5,7)N->W, straight(5,6),(5,5),(5,4), fixed rampL(5,3)E->S, chute(6,3),(7,3),(8,3), goal(9,3).
  {
    name: 'Switchback Special',
    rows: 10, cols: 8,
    drop: { col: 3 }, goal: { row: 9, col: 3 },
    tiles: (() => {
      const t = emptyTiles(10, 8);
      t[0 * 8 + 3] = { fixed: 'rampR' };
      t[5 * 8 + 3] = { fixed: 'rampL' };
      t[2 * 8 + 1] = 'wall';
      t[2 * 8 + 5] = 'wall';
      t[7 * 8 + 1] = 'wall';
      t[7 * 8 + 5] = 'wall';
      return t;
    })(),
    tray: { rampR: 1, rampL: 1, straight: 6, chute: 7, funnel: 2 /* decoy */ },
  },
  // L49: 10x8. SPIRAL. Drop col 0 -> goal (5,4).
  // (0,0)rampR, straight x6 (0,1..0,6), rampR(0,7)W->S, chute(1,7),(2,7), rampL(3,7)N->W, straight x5 (3,6..3,2), rampL(3,1)E->S, chute(4,1), rampR(5,1)N->E, straight(5,2),(5,3), goal(5,4) from W.
  {
    name: 'Inward Spiral',
    rows: 10, cols: 8,
    drop: { col: 0 }, goal: { row: 5, col: 4 },
    tiles: (() => {
      const t = emptyTiles(10, 8);
      t[7 * 8 + 2] = 'wall';
      t[7 * 8 + 6] = 'wall';
      t[8 * 8 + 4] = 'wall';
      t[9 * 8 + 0] = 'wall';
      t[9 * 8 + 7] = 'wall';
      return t;
    })(),
    tray: { rampR: 2, rampL: 2, straight: 13, chute: 3, funnel: 3 /* decoy */ },
  },
  // L50: 10x8. ULTIMATE. Fixed straight(2,3), fixed chute(4,1). Drop col 0 -> goal (9,7).
  // (0,0)rampR, straight x4 (0,1..0,4), rampR(0,5)W->S, chute(1,5), rampL(2,5)N->W, straight(2,4), fixed straight(2,3) E->W, straight(2,2), rampL(2,1)E->S, chute(3,1), fixed chute(4,1), rampR(5,1)N->E, straight x4 (5,2..5,5), rampR(5,6)W->S, chute(6,6),(7,6),(8,6), rampR(9,6)N->E, goal(9,7) from W.
  {
    name: 'Master Engineer',
    rows: 10, cols: 8,
    drop: { col: 0 }, goal: { row: 9, col: 7 },
    tiles: (() => {
      const t = emptyTiles(10, 8);
      t[2 * 8 + 3] = { fixed: 'straight' };
      t[4 * 8 + 1] = { fixed: 'chute' };
      t[3 * 8 + 6] = 'wall';
      t[8 * 8 + 3] = 'wall';
      t[0 * 8 + 7] = 'wall';
      t[6 * 8 + 0] = 'wall';
      t[7 * 8 + 7] = 'wall';
      return t;
    })(),
    tray: { rampR: 5, rampL: 2, straight: 10, chute: 5, funnel: 3 /* decoy */ },
  },
];

// ----- SVG helpers -----
function pieceSvgHtml(type) {
  const def = PIECE_DEFS[type];
  if (!def) return '';
  return `
    <svg class="marble-piece-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${def.svg}
    </svg>
  `;
}

function dropPointHtml() {
  return `
    <svg class="marble-drop-icon" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <rect x="10" y="0" width="80" height="40" rx="4" fill="#4a90e2" stroke="#1f5d99" stroke-width="4"/>
      <path d="M 30 40 L 30 70 L 50 90 L 70 70 L 70 40 Z" fill="#2d6cb8" stroke="#1f5d99" stroke-width="4"/>
      <circle cx="50" cy="20" r="8" fill="#fff" opacity="0.7"/>
    </svg>
  `;
}

function goalHtml() {
  // A bucket/basket icon.
  return `
    <svg class="marble-goal-icon" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <path d="M 18 30 L 28 90 L 72 90 L 82 30 Z" fill="#ffd966" stroke="#7a5a1f" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="50" cy="30" rx="32" ry="8" fill="#ffe9a3" stroke="#7a5a1f" stroke-width="4"/>
      <path d="M 30 40 L 70 40" stroke="#7a5a1f" stroke-width="2" opacity="0.5"/>
      <path d="M 32 55 L 68 55" stroke="#7a5a1f" stroke-width="2" opacity="0.5"/>
      <path d="M 34 70 L 66 70" stroke="#7a5a1f" stroke-width="2" opacity="0.5"/>
    </svg>
  `;
}

// ----- Path simulation -----
// Returns an array of steps. Each step: { idx, entryDir, exitDir, track: [[x,y], ...] (cell-local 0..100) }.
// Result has a `status`: 'win', 'gap', 'oob' (out of bounds).
function simulate(level, placedPieces) {
  const { rows, cols } = level;
  const startRow = 0;
  const startCol = level.drop.col;
  const goalIdx = level.goal.row * cols + level.goal.col;

  // Build combined tile map: fixed/walls from level tiles + placed pieces.
  function pieceAt(idx) {
    const t = level.tiles[idx];
    if (t === 'wall') return { wall: true };
    if (t && t.fixed) return { type: t.fixed };
    if (placedPieces[idx]) return { type: placedPieces[idx] };
    if (idx === goalIdx) return { goal: true };
    return null;
  }

  const steps = [];
  // Start: drop point above grid; entering row 0 from N heading S.
  let row = startRow, col = startCol;
  let entryDir = 'N'; // marble enters cell from the north
  let safety = rows * cols * 2;
  while (safety-- > 0) {
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return { steps, status: 'oob' };
    }
    const idx = row * cols + col;
    const cell = pieceAt(idx);
    if (!cell) return { steps, status: 'gap', stepIdx: idx, entryDir };
    if (cell.wall) return { steps, status: 'gap', stepIdx: idx, entryDir };
    if (cell.goal) {
      // Marble enters the goal cell — win. Add a final step that drops into the bucket centre.
      steps.push({ idx, entryDir, exitDir: null, track: [[entryFromXY(entryDir)], [50, 50]] });
      return { steps, status: 'win' };
    }
    const def = PIECE_DEFS[cell.type];
    if (!def) return { steps, status: 'gap', stepIdx: idx, entryDir };
    const exitDir = def.map[entryDir];
    if (!exitDir) return { steps, status: 'gap', stepIdx: idx, entryDir };
    const track = def.track[entryDir] || [entryFromXY(entryDir), [50, 50], exitToXY(exitDir)];
    steps.push({ idx, entryDir, exitDir, track });
    // Move to next cell
    const [dr, dc] = DELTA[exitDir];
    row += dr; col += dc;
    entryDir = OPPOSITE[exitDir];
  }
  return { steps, status: 'gap' };
}

// Fallback track endpoints in cell-local 0..100.
function entryFromXY(dir) {
  if (dir === 'N') return [50, 0];
  if (dir === 'S') return [50, 100];
  if (dir === 'E') return [100, 50];
  return [0, 50];
}
function exitToXY(dir) { return entryFromXY(dir); }

// ----- Rendering -----
export function renderMarbleLevel(container, levelIndex, opts) {
  const level = MARBLE_LEVELS[levelIndex];
  if (!level) {
    container.innerHTML = '<p style="padding:20px;">Level not found.</p>';
    return;
  }

  // Track placed pieces (row-major). Map of idx -> piece type string.
  const placedPieces = {};

  // Track remaining tray counts. Clone the level tray.
  const trayCounts = { ...(level.tray || {}) };

  // ----- Layout -----
  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="marble-stage">
      <div class="marble-board" id="marble-board"></div>
      <div class="marble-controls">
        <button class="marble-btn marble-go" data-act="go" id="go-btn">
          <svg viewBox="0 0 32 32" width="28" height="28"><polygon points="8,4 28,16 8,28" fill="#fff"/></svg>
          GO
        </button>
        <button class="marble-btn marble-reset" data-act="reset" id="reset-btn">
          <svg viewBox="0 0 32 32" width="24" height="24"><path d="M 16 6 A 10 10 0 1 1 6 16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><polygon points="16,2 16,10 22,6" fill="#fff"/></svg>
        </button>
      </div>
      <div class="marble-tray" id="marble-tray"></div>
    </div>
  `;

  const board = container.querySelector('#marble-board');
  const tray = container.querySelector('#marble-tray');
  const goBtn = container.querySelector('#go-btn');
  const resetBtn = container.querySelector('#reset-btn');

  // Build the grid.
  const { rows, cols } = level;
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${rows + 1}, auto)`; // +1 for the drop bar

  // Top bar showing drop point above column.
  const topBar = document.createElement('div');
  topBar.className = 'marble-drop-bar';
  topBar.style.gridColumn = `1 / ${cols + 1}`;
  topBar.style.gridRow = '1';
  topBar.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  for (let c = 0; c < cols; c++) {
    const slot = document.createElement('div');
    slot.className = 'marble-drop-slot';
    if (c === level.drop.col) {
      slot.classList.add('active');
      slot.innerHTML = dropPointHtml();
    }
    topBar.appendChild(slot);
  }
  board.appendChild(topBar);

  // Build cells.
  const cellEls = [];
  const goalIdx = level.goal.row * cols + level.goal.col;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const el = document.createElement('div');
      el.className = 'marble-cell';
      el.dataset.idx = idx;
      el.style.gridColumn = (c + 1) + ' / ' + (c + 2);
      el.style.gridRow = (r + 2) + ' / ' + (r + 3);
      const tile = level.tiles[idx];
      if (idx === goalIdx) {
        el.classList.add('goal');
        el.innerHTML = goalHtml();
      } else if (tile === 'wall') {
        el.classList.add('wall');
      } else if (tile && tile.fixed) {
        el.classList.add('placed', 'fixed');
        el.dataset.piece = tile.fixed;
        el.innerHTML = pieceSvgHtml(tile.fixed);
      } else {
        el.classList.add('empty');
      }
      board.appendChild(el);
      cellEls.push(el);
    }
  }

  // ----- Tray -----
  // Build tray entries based on counts.
  const trayItems = {}; // type -> { el, countEl }
  function buildTray() {
    tray.innerHTML = '';
    for (const type of PIECE_TYPES) {
      if (!(type in trayCounts)) continue;
      const item = document.createElement('div');
      item.className = 'marble-tray-item';
      item.dataset.type = type;
      item.innerHTML = `
        <div class="marble-tray-piece">${pieceSvgHtml(type)}</div>
        <div class="marble-tray-count" data-count>x${trayCounts[type]}</div>
      `;
      tray.appendChild(item);
      trayItems[type] = { el: item, countEl: item.querySelector('[data-count]') };
      setupTrayDrag(item, type);
      updateTrayItem(type);
    }
  }
  function updateTrayItem(type) {
    const it = trayItems[type];
    if (!it) return;
    it.countEl.textContent = 'x' + trayCounts[type];
    it.el.classList.toggle('depleted', trayCounts[type] <= 0);
  }

  // ----- Drag from tray to grid -----
  let running = false;

  function setupTrayDrag(itemEl, type) {
    let dragging = false;
    let pointerId = null;
    let ghost = null;

    itemEl.addEventListener('pointerdown', (e) => {
      if (running) return;
      if (trayCounts[type] <= 0) { sfx.reject(); return; }
      e.preventDefault();
      dragging = true;
      pointerId = e.pointerId;
      itemEl.setPointerCapture(e.pointerId);
      // Create a ghost piece that follows the pointer.
      ghost = document.createElement('div');
      ghost.className = 'marble-ghost';
      ghost.innerHTML = pieceSvgHtml(type);
      document.body.appendChild(ghost);
      moveGhost(e.clientX, e.clientY);
      sfx.pickup();
    });

    itemEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      moveGhost(e.clientX, e.clientY);
      highlightHover(e.clientX, e.clientY);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { itemEl.releasePointerCapture(pointerId); } catch (_) {}
      clearHover();
      // Find target cell at pointer position.
      const cellEl = cellAtPoint(e.clientX, e.clientY);
      if (cellEl && cellEl.classList.contains('empty') && !cellEl.classList.contains('fixed')) {
        const idx = parseInt(cellEl.dataset.idx, 10);
        placePiece(idx, type);
      } else if (cellEl && cellEl.classList.contains('placed') && !cellEl.classList.contains('fixed')) {
        // Replace existing piece: return old to tray, place new.
        const idx = parseInt(cellEl.dataset.idx, 10);
        removePiece(idx, { silent: true });
        placePiece(idx, type);
      } else {
        sfx.reject();
      }
      if (ghost) { ghost.remove(); ghost = null; }
    }
    itemEl.addEventListener('pointerup', endDrag);
    itemEl.addEventListener('pointercancel', endDrag);

    function moveGhost(x, y) {
      if (!ghost) return;
      ghost.style.left = (x - 36) + 'px';
      ghost.style.top = (y - 36) + 'px';
    }
  }

  function cellAtPoint(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (el.classList && el.classList.contains('marble-cell')) return el;
    }
    return null;
  }

  function highlightHover(x, y) {
    clearHover();
    const cellEl = cellAtPoint(x, y);
    if (cellEl) {
      if (cellEl.classList.contains('empty') || (cellEl.classList.contains('placed') && !cellEl.classList.contains('fixed'))) {
        cellEl.classList.add('hover');
      } else {
        cellEl.classList.add('hover-bad');
      }
    }
  }

  function clearHover() {
    container.querySelectorAll('.marble-cell.hover, .marble-cell.hover-bad').forEach(el => {
      el.classList.remove('hover'); el.classList.remove('hover-bad');
    });
  }

  function placePiece(idx, type) {
    if (trayCounts[type] <= 0) { sfx.reject(); return; }
    placedPieces[idx] = type;
    trayCounts[type]--;
    updateTrayItem(type);
    const cellEl = cellEls[idx];
    cellEl.classList.remove('empty');
    cellEl.classList.add('placed');
    cellEl.dataset.piece = type;
    cellEl.innerHTML = pieceSvgHtml(type);
    sfx.snap();
  }

  function removePiece(idx, { silent } = {}) {
    const type = placedPieces[idx];
    if (!type) return;
    delete placedPieces[idx];
    trayCounts[type] = (trayCounts[type] || 0) + 1;
    updateTrayItem(type);
    const cellEl = cellEls[idx];
    cellEl.classList.remove('placed');
    cellEl.classList.add('empty');
    cellEl.removeAttribute('data-piece');
    cellEl.innerHTML = '';
    if (!silent) sfx.click();
  }

  // Tap a placed (non-fixed) piece to remove it.
  board.addEventListener('click', (e) => {
    if (running) return;
    const cellEl = e.target.closest('.marble-cell.placed');
    if (!cellEl) return;
    if (cellEl.classList.contains('fixed')) return;
    const idx = parseInt(cellEl.dataset.idx, 10);
    removePiece(idx);
  });

  // ----- GO / RESET -----
  let won = false;
  let marbleEl = null;

  goBtn.addEventListener('click', () => {
    if (running || won) return;
    runSimulation();
  });
  resetBtn.addEventListener('click', () => {
    if (running) return;
    resetAll();
  });
  container.querySelector('[data-act="back"]').addEventListener('click', opts.onBack);

  function resetAll() {
    // Return any placed (non-fixed) pieces to the tray.
    Object.keys(placedPieces).forEach(idx => removePiece(parseInt(idx, 10), { silent: true }));
    sfx.click();
    cleanupMarble();
  }

  function cleanupMarble() {
    if (marbleEl) { marbleEl.remove(); marbleEl = null; }
  }

  function runSimulation() {
    cleanupMarble();
    const result = simulate(level, placedPieces);
    running = true;
    goBtn.classList.add('disabled');
    resetBtn.classList.add('disabled');
    // Create the marble element positioned at the drop point.
    const boardRect = board.getBoundingClientRect();
    const dropSlot = topBar.children[level.drop.col];
    const dropRect = dropSlot.getBoundingClientRect();
    marbleEl = document.createElement('div');
    marbleEl.className = 'marble-ball';
    board.appendChild(marbleEl);
    // Position relative to board.
    const startX = (dropRect.left + dropRect.width / 2) - boardRect.left;
    const startY = (dropRect.top + dropRect.height) - boardRect.top - 4;
    marbleEl.style.left = startX + 'px';
    marbleEl.style.top = startY + 'px';

    sfx.drop();
    animateMarble(result);
  }

  function animateMarble(result) {
    const steps = result.steps;
    const boardRect = board.getBoundingClientRect();
    // Build a list of absolute (px) waypoints relative to the board.
    const waypoints = [];
    for (const step of steps) {
      const cellEl = cellEls[step.idx];
      const cr = cellEl.getBoundingClientRect();
      const cw = cr.width, ch = cr.height;
      const cx = cr.left - boardRect.left;
      const cy = cr.top - boardRect.top;
      for (const [tx, ty] of step.track) {
        waypoints.push([cx + (tx / 100) * cw, cy + (ty / 100) * ch]);
      }
    }
    // If failure with no steps and reason is gap right at first cell, just drop into row 0.
    if (waypoints.length === 0) {
      // Marble just falls a bit and stops.
      const r = marbleEl.getBoundingClientRect();
      const fallY = parseFloat(marbleEl.style.top) + 40;
      animateTo(marbleEl, parseFloat(marbleEl.style.left), fallY, 300, () => finishRun(result));
      return;
    }
    // Animate through each waypoint.
    let i = 0;
    const stepDuration = 220; // ms per waypoint segment

    function next() {
      if (i >= waypoints.length) { finishRun(result); return; }
      const [x, y] = waypoints[i];
      // Offset so marble centre sits on waypoint.
      animateTo(marbleEl, x - 12, y - 12, stepDuration, next);
      // Tick a small drop/flow sound occasionally.
      if (i % 3 === 0) sfx.flow();
      i++;
    }
    next();
  }

  function animateTo(el, x, y, duration, done) {
    el.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
    requestAnimationFrame(() => {
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
    setTimeout(() => {
      el.style.transition = '';
      done && done();
    }, duration + 10);
  }

  function finishRun(result) {
    if (result.status === 'win') {
      won = true;
      // Marble already at goal centre. Briefly settle then celebrate.
      setTimeout(onWin, 200);
    } else {
      // Fail: brief shake + buzz, allow retry.
      sfx.buzz();
      if (marbleEl) {
        marbleEl.classList.add('marble-fail');
        setTimeout(() => {
          cleanupMarble();
          running = false;
          goBtn.classList.remove('disabled');
          resetBtn.classList.remove('disabled');
        }, 600);
      } else {
        running = false;
        goBtn.classList.remove('disabled');
        resetBtn.classList.remove('disabled');
      }
    }
  }

  function onWin() {
    sfx.win();
    // Star burst from the goal cell.
    const goalEl = cellEls[goalIdx];
    const gr = goalEl.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div');
      s.className = 'star-burst';
      s.textContent = '⭐';
      const angle = (Math.PI * 2 * i) / 14;
      const dist = 100 + Math.random() * 80;
      s.style.setProperty('--end', `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`);
      s.style.left = (gr.left + gr.width / 2) + 'px';
      s.style.top = (gr.top + gr.height / 2) + 'px';
      s.style.position = 'fixed';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
    opts.onComplete(levelIndex);
    setTimeout(showWinOverlay, 1100);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < MARBLE_LEVELS.length;
    overlay.innerHTML = `
      <div class="win-title">FIXED!</div>
      <div class="win-buttons">
        <button class="big-btn secondary" data-act="levels">Pick Job</button>
        ${hasNext ? '<button class="big-btn" data-act="next">Next ›</button>' : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act === 'next') opts.onNext(levelIndex + 1);
      else if (act === 'levels') opts.onBack();
    });
    container.appendChild(overlay);
  }

  // Initial render of the tray.
  buildTray();
}
