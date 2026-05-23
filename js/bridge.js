// Bridge Builder mechanic.
//
// Side-view 2D grid. Player drags planks, pillars, and stone blocks from a
// tray onto cells in the gap between two cliffs. Pressing GO sends a
// little vehicle (cart, walker, fire truck, tank, etc.) across.
//
// Validation is purely rule-based (no physics simulation):
//  - The "path row" of each level is the row of cells the vehicle drives across.
//  - For the bridge to be valid, every cell on the path row that is between
//    the left cliff and the right cliff must contain a plank-class piece
//    (plank, longPlank). Stones may also satisfy the path (used for very
//    shallow gaps with stepping stones).
//  - Any pillar piece must be supported: it must sit either on the ground
//    (bottom row), on a cliff cell directly below it, or on another pillar /
//    stone immediately below it.
//  - Obstacle cells block placement.
//
// On GO:
//  - If valid: the vehicle slides across, "FIXED!" overlay appears.
//  - If invalid: the vehicle drives forward until the first gap on the path
//    row, then falls into the gap. Reset is automatic — player keeps pieces
//    already placed.

import { sfx } from './sound.js';

// ---- Inject stylesheet lazily (we promised not to touch index.html) ----
let _cssInjected = false;
function injectCss() {
  if (_cssInjected || typeof document === 'undefined') return;
  _cssInjected = true;
  // Try to add a link to styles-bridge.css; harmless if it 404s.
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles-bridge.css';
  document.head.appendChild(link);
}

// ---- Piece definitions ----
// Each piece has:
//  - w, h: footprint in cells
//  - kind: 'plank' | 'pillar' | 'stone'
//  - label: short id
//  - svg: 100x100-per-cell SVG markup, sized later to (w*cell, h*cell)
//  - cellW, cellH: viewBox width / height in 100-units (kept = 100 * w/h)
const PIECE_DEFS = {
  plank: {
    label: 'plank',
    w: 2, h: 1,
    kind: 'plank',
    pathBlock: true,
    svg: (cell) => `
      <svg viewBox="0 0 200 100" width="${cell * 2}" height="${cell}"
           style="display:block;pointer-events:none;">
        <rect x="4" y="22" width="192" height="56" rx="6"
              fill="#c19a64" stroke="#5a3a1a" stroke-width="4"/>
        <line x1="40" y1="28" x2="40" y2="70" stroke="#7a5a30" stroke-width="3"/>
        <line x1="100" y1="28" x2="100" y2="70" stroke="#7a5a30" stroke-width="3"/>
        <line x1="160" y1="28" x2="160" y2="70" stroke="#7a5a30" stroke-width="3"/>
        <line x1="12" y1="40" x2="188" y2="40" stroke="#a07840" stroke-width="2"/>
        <line x1="12" y1="60" x2="188" y2="60" stroke="#a07840" stroke-width="2"/>
      </svg>
    `,
  },
  longPlank: {
    label: 'long plank',
    w: 3, h: 1,
    kind: 'plank',
    pathBlock: true,
    svg: (cell) => `
      <svg viewBox="0 0 300 100" width="${cell * 3}" height="${cell}"
           style="display:block;pointer-events:none;">
        <rect x="4" y="22" width="292" height="56" rx="6"
              fill="#b88a54" stroke="#4a2a14" stroke-width="4"/>
        <line x1="50" y1="28" x2="50" y2="70" stroke="#6a4a24" stroke-width="3"/>
        <line x1="120" y1="28" x2="120" y2="70" stroke="#6a4a24" stroke-width="3"/>
        <line x1="200" y1="28" x2="200" y2="70" stroke="#6a4a24" stroke-width="3"/>
        <line x1="260" y1="28" x2="260" y2="70" stroke="#6a4a24" stroke-width="3"/>
        <line x1="12" y1="40" x2="288" y2="40" stroke="#946834" stroke-width="2"/>
        <line x1="12" y1="60" x2="288" y2="60" stroke="#946834" stroke-width="2"/>
      </svg>
    `,
  },
  pillar1: {
    label: 'pillar-1',
    w: 1, h: 1,
    kind: 'pillar',
    pathBlock: false,
    svg: (cell) => `
      <svg viewBox="0 0 100 100" width="${cell}" height="${cell}"
           style="display:block;pointer-events:none;">
        <rect x="22" y="4" width="56" height="92" rx="4"
              fill="#aabac8" stroke="#3a4756" stroke-width="4"/>
        <line x1="34" y1="10" x2="34" y2="90" stroke="#7a8898" stroke-width="2"/>
        <line x1="66" y1="10" x2="66" y2="90" stroke="#7a8898" stroke-width="2"/>
        <rect x="14" y="4" width="72" height="10" rx="2"
              fill="#bcc8d6" stroke="#3a4756" stroke-width="3"/>
        <rect x="14" y="86" width="72" height="10" rx="2"
              fill="#bcc8d6" stroke="#3a4756" stroke-width="3"/>
      </svg>
    `,
  },
  pillar2: {
    label: 'pillar-2',
    w: 1, h: 2,
    kind: 'pillar',
    pathBlock: false,
    svg: (cell) => `
      <svg viewBox="0 0 100 200" width="${cell}" height="${cell * 2}"
           style="display:block;pointer-events:none;">
        <rect x="22" y="4" width="56" height="192" rx="4"
              fill="#aabac8" stroke="#3a4756" stroke-width="4"/>
        <line x1="34" y1="10" x2="34" y2="190" stroke="#7a8898" stroke-width="2"/>
        <line x1="66" y1="10" x2="66" y2="190" stroke="#7a8898" stroke-width="2"/>
        <rect x="14" y="4" width="72" height="10" rx="2"
              fill="#bcc8d6" stroke="#3a4756" stroke-width="3"/>
        <rect x="14" y="186" width="72" height="10" rx="2"
              fill="#bcc8d6" stroke="#3a4756" stroke-width="3"/>
        <line x1="22" y1="100" x2="78" y2="100" stroke="#7a8898" stroke-width="2"/>
      </svg>
    `,
  },
  pillar3: {
    label: 'pillar-3',
    w: 1, h: 3,
    kind: 'pillar',
    pathBlock: false,
    svg: (cell) => `
      <svg viewBox="0 0 100 300" width="${cell}" height="${cell * 3}"
           style="display:block;pointer-events:none;">
        <rect x="22" y="4" width="56" height="292" rx="4"
              fill="#aabac8" stroke="#3a4756" stroke-width="4"/>
        <line x1="34" y1="10" x2="34" y2="290" stroke="#7a8898" stroke-width="2"/>
        <line x1="66" y1="10" x2="66" y2="290" stroke="#7a8898" stroke-width="2"/>
        <rect x="14" y="4" width="72" height="10" rx="2"
              fill="#bcc8d6" stroke="#3a4756" stroke-width="3"/>
        <rect x="14" y="286" width="72" height="10" rx="2"
              fill="#bcc8d6" stroke="#3a4756" stroke-width="3"/>
        <line x1="22" y1="100" x2="78" y2="100" stroke="#7a8898" stroke-width="2"/>
        <line x1="22" y1="200" x2="78" y2="200" stroke="#7a8898" stroke-width="2"/>
      </svg>
    `,
  },
  stone: {
    label: 'stone',
    w: 1, h: 1,
    kind: 'stone',
    pathBlock: true, // stones also count as "walkable surface"
    svg: (cell) => `
      <svg viewBox="0 0 100 100" width="${cell}" height="${cell}"
           style="display:block;pointer-events:none;">
        <path d="M 10 80 L 6 40 L 26 14 L 70 10 L 92 36 L 88 80 Z"
              fill="#9aa6b4" stroke="#2a3340" stroke-width="4"/>
        <path d="M 18 70 L 30 50 L 50 60" stroke="#6a7686" stroke-width="3" fill="none"/>
        <circle cx="68" cy="36" r="3" fill="#6a7686"/>
        <circle cx="50" cy="28" r="2.5" fill="#6a7686"/>
      </svg>
    `,
  },
};

// ---- Vehicle SVGs (60-100px wide, sit on top of the path row) ----
// Each returns an SVG that's roughly cellSize tall.
const VEHICLES = {
  cart: (h) => `
    <svg viewBox="0 0 120 80" width="${Math.floor(h * 1.5)}" height="${h}"
         style="display:block;">
      <rect x="14" y="22" width="92" height="32" rx="4"
            fill="#c46a3a" stroke="#1a2230" stroke-width="3"/>
      <rect x="22" y="14" width="76" height="14" rx="2"
            fill="#8a4a25" stroke="#1a2230" stroke-width="3"/>
      <circle cx="32" cy="62" r="12" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="32" cy="62" r="4" fill="#bbc4d0"/>
      <circle cx="88" cy="62" r="12" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="88" cy="62" r="4" fill="#bbc4d0"/>
    </svg>
  `,
  walker: (h) => `
    <svg viewBox="0 0 60 90" width="${Math.floor(h * 0.7)}" height="${h}"
         style="display:block;">
      <circle cx="30" cy="14" r="10" fill="#ffd1a0" stroke="#1a2230" stroke-width="3"/>
      <circle cx="26" cy="13" r="1.5" fill="#1a2230"/>
      <circle cx="34" cy="13" r="1.5" fill="#1a2230"/>
      <path d="M 26 18 Q 30 22 34 18" stroke="#1a2230" stroke-width="2" fill="none"/>
      <rect x="20" y="24" width="20" height="30" rx="4"
            fill="#3aa3ff" stroke="#1a2230" stroke-width="3"/>
      <rect x="22" y="54" width="6" height="22"
            fill="#2a2230" stroke="#1a2230" stroke-width="2"/>
      <rect x="32" y="54" width="6" height="22"
            fill="#2a2230" stroke="#1a2230" stroke-width="2"/>
    </svg>
  `,
  horse: (h) => `
    <svg viewBox="0 0 140 90" width="${Math.floor(h * 1.6)}" height="${h}"
         style="display:block;">
      <!-- wagon -->
      <rect x="60" y="32" width="70" height="28" rx="3"
            fill="#8a5a30" stroke="#1a2230" stroke-width="3"/>
      <rect x="68" y="22" width="54" height="14" rx="2"
            fill="#c19a64" stroke="#1a2230" stroke-width="3"/>
      <circle cx="76" cy="66" r="10" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="118" cy="66" r="10" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <!-- horse body -->
      <rect x="14" y="36" width="42" height="22" rx="6"
            fill="#6a4a24" stroke="#1a2230" stroke-width="3"/>
      <rect x="42" y="22" width="16" height="22" rx="3"
            fill="#6a4a24" stroke="#1a2230" stroke-width="3"/>
      <rect x="18" y="56" width="6" height="20" fill="#1a2230"/>
      <rect x="44" y="56" width="6" height="20" fill="#1a2230"/>
      <path d="M 56 22 L 60 14 L 58 26 Z" fill="#1a2230"/>
    </svg>
  `,
  tank: (h) => `
    <svg viewBox="0 0 130 80" width="${Math.floor(h * 1.6)}" height="${h}"
         style="display:block;">
      <rect x="6" y="44" width="118" height="22" rx="4"
            fill="#3a5a3a" stroke="#1a2230" stroke-width="3"/>
      <circle cx="22" cy="66" r="8" fill="#1a2230"/>
      <circle cx="50" cy="66" r="8" fill="#1a2230"/>
      <circle cx="80" cy="66" r="8" fill="#1a2230"/>
      <circle cx="108" cy="66" r="8" fill="#1a2230"/>
      <rect x="22" y="22" width="60" height="22" rx="4"
            fill="#4a7a4a" stroke="#1a2230" stroke-width="3"/>
      <rect x="76" y="28" width="50" height="8" rx="2"
            fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
    </svg>
  `,
  fireTruck: (h) => `
    <svg viewBox="0 0 140 80" width="${Math.floor(h * 1.7)}" height="${h}"
         style="display:block;">
      <rect x="6" y="20" width="80" height="36" rx="3"
            fill="#d33" stroke="#1a2230" stroke-width="3"/>
      <rect x="86" y="30" width="50" height="26" rx="3"
            fill="#d33" stroke="#1a2230" stroke-width="3"/>
      <rect x="92" y="34" width="38" height="14" rx="2"
            fill="#8ad6ff" stroke="#1a2230" stroke-width="2"/>
      <rect x="14" y="28" width="64" height="6" fill="#ffd966"/>
      <rect x="16" y="14" width="14" height="10" rx="2"
            fill="#3aa3ff" stroke="#1a2230" stroke-width="2"/>
      <circle cx="34" cy="64" r="10" fill="#1a2230"/>
      <circle cx="34" cy="64" r="4" fill="#bbc4d0"/>
      <circle cx="108" cy="64" r="10" fill="#1a2230"/>
      <circle cx="108" cy="64" r="4" fill="#bbc4d0"/>
    </svg>
  `,
  bike: (h) => `
    <svg viewBox="0 0 110 90" width="${Math.floor(h * 1.4)}" height="${h}"
         style="display:block;">
      <circle cx="22" cy="64" r="14" fill="none" stroke="#1a2230" stroke-width="4"/>
      <circle cx="86" cy="64" r="14" fill="none" stroke="#1a2230" stroke-width="4"/>
      <circle cx="22" cy="64" r="3" fill="#1a2230"/>
      <circle cx="86" cy="64" r="3" fill="#1a2230"/>
      <path d="M 22 64 L 54 36 L 86 64 M 54 36 L 64 22" stroke="#3aa3ff" stroke-width="4" fill="none"/>
      <path d="M 60 18 L 72 18" stroke="#1a2230" stroke-width="4"/>
      <circle cx="54" cy="22" r="6" fill="#ffd1a0" stroke="#1a2230" stroke-width="2"/>
      <rect x="48" y="28" width="14" height="14" rx="3" fill="#ffd966" stroke="#1a2230" stroke-width="2"/>
    </svg>
  `,
  bus: (h) => `
    <svg viewBox="0 0 150 80" width="${Math.floor(h * 1.8)}" height="${h}"
         style="display:block;">
      <rect x="6" y="14" width="138" height="48" rx="6"
            fill="#ffd966" stroke="#1a2230" stroke-width="3"/>
      <rect x="14" y="22" width="20" height="18" rx="2" fill="#8ad6ff" stroke="#1a2230" stroke-width="2"/>
      <rect x="44" y="22" width="20" height="18" rx="2" fill="#8ad6ff" stroke="#1a2230" stroke-width="2"/>
      <rect x="74" y="22" width="20" height="18" rx="2" fill="#8ad6ff" stroke="#1a2230" stroke-width="2"/>
      <rect x="104" y="22" width="20" height="18" rx="2" fill="#8ad6ff" stroke="#1a2230" stroke-width="2"/>
      <circle cx="30" cy="68" r="10" fill="#1a2230"/>
      <circle cx="118" cy="68" r="10" fill="#1a2230"/>
    </svg>
  `,
  dino: (h) => `
    <svg viewBox="0 0 130 100" width="${Math.floor(h * 1.5)}" height="${h}"
         style="display:block;">
      <ellipse cx="60" cy="60" rx="40" ry="22" fill="#4a8e3a" stroke="#1a2230" stroke-width="3"/>
      <rect x="92" y="20" width="30" height="34" rx="6" fill="#4a8e3a" stroke="#1a2230" stroke-width="3"/>
      <circle cx="112" cy="32" r="3" fill="#1a2230"/>
      <path d="M 96 38 L 88 36 L 96 32 Z" fill="#1a2230"/>
      <path d="M 8 60 Q 0 50 12 46" stroke="#1a2230" stroke-width="3" fill="none"/>
      <rect x="34" y="76" width="8" height="20" fill="#1a2230"/>
      <rect x="74" y="76" width="8" height="20" fill="#1a2230"/>
      <path d="M 60 40 L 64 32 L 68 40 M 70 36 L 74 28 L 78 36" stroke="#2a5e2a" stroke-width="3" fill="none"/>
    </svg>
  `,
  rocket: (h) => `
    <svg viewBox="0 0 140 70" width="${Math.floor(h * 2)}" height="${h}"
         style="display:block;">
      <path d="M 4 35 L 30 18 L 104 18 L 130 35 L 104 52 L 30 52 Z"
            fill="#e0e6ee" stroke="#1a2230" stroke-width="3"/>
      <circle cx="100" cy="35" r="8" fill="#3aa3ff" stroke="#1a2230" stroke-width="2"/>
      <rect x="20" y="28" width="14" height="14" rx="3" fill="#d33" stroke="#1a2230" stroke-width="2"/>
      <path d="M 4 35 L -10 25 L 4 30 Z M 4 35 L -10 45 L 4 40 Z" fill="#ff8855" stroke="#1a2230" stroke-width="2"/>
    </svg>
  `,
};

// Pick a vehicle by level index — varies across the 25 levels.
function vehicleForLevel(idx) {
  const cycle = [
    'walker', 'cart', 'horse', 'bike', 'bus',
    'cart', 'walker', 'tank', 'horse', 'fireTruck',
    'bike', 'cart', 'tank', 'bus', 'fireTruck',
    'horse', 'walker', 'dino', 'cart', 'tank',
    'fireTruck', 'bus', 'dino', 'rocket', 'rocket',
  ];
  return cycle[idx % cycle.length];
}

// ---- Level templates ----
// Each level defines:
//   cols, rows, cell
//   pathRow: the y row (0 = top) where the bridge surface must be
//   cliffs: { leftEdgeCol, rightEdgeCol } — first gap-col is leftEdgeCol+1,
//     last gap-col is rightEdgeCol-1.
//   terrain: array of rows*cols cells, each null | 'cliff' | 'obstacle' | 'cliff-top'.
//   pathRowLeft / pathRowRight (optional): override per-cliff path rows for uneven cliffs.
//     If pathRowLeft and pathRowRight differ, the path is the SHALLOWEST row (smallest index).
//     The vehicle "walks" along the higher pathRow.
//   chasm: { kind: 'water'|'lava'|'canyon', topRow, bottomRow } — visual only.
//   tray: { plank: 2, pillar1: 1, ... } — counts.
//   vehicle: key into VEHICLES (auto-assigned if missing).

// Helper: build terrain with two flat cliffs.
function buildTerrain(opts) {
  const {
    cols, rows,
    leftCliffCols, rightCliffCols,
    cliffTopRow,         // first non-cliff row (cells at rows <= cliffTopRow are sky)
    leftCliffTopRow,     // override left side
    rightCliffTopRow,    // override right side
    groundRow,           // for shallow gaps where the bottom is solid
    obstacles = [],      // array of {r, c}
  } = opts;
  const terrain = new Array(rows * cols).fill(null);
  const leftTop = leftCliffTopRow ?? cliffTopRow;
  const rightTop = rightCliffTopRow ?? cliffTopRow;
  for (let c = 0; c < leftCliffCols; c++) {
    for (let r = leftTop; r < rows; r++) {
      const idx = r * cols + c;
      terrain[idx] = (r === leftTop) ? 'cliff-top' : 'cliff';
    }
  }
  for (let c = cols - rightCliffCols; c < cols; c++) {
    for (let r = rightTop; r < rows; r++) {
      const idx = r * cols + c;
      terrain[idx] = (r === rightTop) ? 'cliff-top' : 'cliff';
    }
  }
  if (groundRow !== undefined) {
    for (let c = leftCliffCols; c < cols - rightCliffCols; c++) {
      for (let r = groundRow; r < rows; r++) {
        const idx = r * cols + c;
        if (terrain[idx] == null) terrain[idx] = (r === groundRow) ? 'cliff-top' : 'cliff';
      }
    }
  }
  for (const ob of obstacles) {
    terrain[ob.r * cols + ob.c] = 'obstacle';
  }
  return {
    terrain,
    leftEdgeCol: leftCliffCols - 1,
    rightEdgeCol: cols - rightCliffCols,
    leftTop,
    rightTop,
  };
}

function makeLevel(spec) {
  const built = buildTerrain(spec.build);
  return {
    name: spec.name,
    cols: spec.build.cols,
    rows: spec.build.rows,
    cell: spec.cell || 50,
    terrain: built.terrain,
    leftEdgeCol: built.leftEdgeCol,
    rightEdgeCol: built.rightEdgeCol,
    pathRowLeft: spec.pathRowLeft ?? built.leftTop,
    pathRowRight: spec.pathRowRight ?? built.rightTop,
    chasm: spec.chasm,
    tray: spec.tray,
    vehicle: spec.vehicle,
  };
}

// =============================================================
// 25 Levels
// =============================================================

export const BRIDGE_LEVELS = [
  // ---- L1-L5: tiny gaps, planks only, same cliff height ----
  makeLevel({
    name: 'First Step',
    build: { cols: 8, rows: 5, leftCliffCols: 3, rightCliffCols: 3, cliffTopRow: 3 },
    chasm: { kind: 'water', topRow: 4, bottomRow: 4 },
    tray: { plank: 1 },
    vehicle: 'walker',
  }),
  makeLevel({
    name: 'Tiny Gap',
    build: { cols: 8, rows: 5, leftCliffCols: 3, rightCliffCols: 3, cliffTopRow: 3 },
    chasm: { kind: 'water', topRow: 4, bottomRow: 4 },
    tray: { plank: 1, longPlank: 1 }, // extra decoy long
    vehicle: 'cart',
  }),
  makeLevel({
    name: 'Two Planks',
    build: { cols: 8, rows: 5, leftCliffCols: 2, rightCliffCols: 2, cliffTopRow: 3 },
    chasm: { kind: 'water', topRow: 4, bottomRow: 4 },
    tray: { plank: 3 }, // 4-cell gap, 2 planks needed (1 decoy)
    vehicle: 'horse',
  }),
  makeLevel({
    name: 'Long Reach',
    build: { cols: 10, rows: 5, leftCliffCols: 2, rightCliffCols: 2, cliffTopRow: 3 },
    chasm: { kind: 'water', topRow: 4, bottomRow: 4 },
    tray: { longPlank: 2 },  // 6-cell gap, two long planks exact
    vehicle: 'bike',
  }),
  makeLevel({
    name: 'Wider Way',
    build: { cols: 10, rows: 5, leftCliffCols: 2, rightCliffCols: 2, cliffTopRow: 3 },
    chasm: { kind: 'water', topRow: 4, bottomRow: 4 },
    tray: { plank: 3, longPlank: 1 },  // 6 cells; 2+2+2 or 3+3
    vehicle: 'bus',
  }),

  // ---- L6-L10: introduce pillars — path row above ground ----
  makeLevel({
    name: 'Stepping Stones',
    build: {
      cols: 10, rows: 6, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 5,
    },
    chasm: { kind: 'water', topRow: 5, bottomRow: 5 },
    tray: { plank: 3, pillar1: 2 },
    vehicle: 'cart',
  }),
  makeLevel({
    name: 'Hold It Up',
    build: {
      cols: 10, rows: 6, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 5,
    },
    chasm: { kind: 'water', topRow: 5, bottomRow: 5 },
    tray: { plank: 3, pillar1: 2 },
    vehicle: 'walker',
  }),
  makeLevel({
    name: 'Twin Supports',
    build: {
      cols: 12, rows: 6, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 5,
    },
    chasm: { kind: 'lava', topRow: 5, bottomRow: 5 },
    tray: { plank: 4, pillar1: 3 }, // 8-cell gap, 4 planks exact
    vehicle: 'tank',
  }),
  makeLevel({
    name: 'Lava Reach',
    build: {
      cols: 13, rows: 6, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 5,
    },
    chasm: { kind: 'lava', topRow: 5, bottomRow: 5 },
    tray: { longPlank: 3, pillar1: 2 }, // 9-cell gap, 3 long planks exact
    vehicle: 'horse',
  }),
  makeLevel({
    name: 'Tall Pillars',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 6,
    },
    chasm: { kind: 'water', topRow: 4, bottomRow: 6 },
    tray: { plank: 4, pillar2: 3 }, // 8-cell gap, 4 planks exact
    vehicle: 'fireTruck',
  }),

  // ---- L11-L15: wider gaps, multi-pillar, uneven cliffs ----
  makeLevel({
    name: 'Wide Canyon',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3,
    },
    chasm: { kind: 'canyon', topRow: 4, bottomRow: 6 },
    tray: { plank: 4, longPlank: 1, pillar3: 2 },
    vehicle: 'bike',
  }),
  makeLevel({
    name: 'Big River',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 6,
    },
    chasm: { kind: 'water', topRow: 4, bottomRow: 6 },
    tray: { plank: 5, pillar2: 3 },
    vehicle: 'cart',
  }),
  makeLevel({
    name: 'Stepping High',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 3,
      cliffTopRow: 3, leftCliffTopRow: 4, rightCliffTopRow: 4,
      groundRow: 6,
    },
    chasm: { kind: 'water', topRow: 5, bottomRow: 6 },
    tray: { plank: 4, longPlank: 1, pillar1: 2 },
    pathRowLeft: 4, pathRowRight: 4,
    vehicle: 'tank',
  }),
  makeLevel({
    name: 'Tall Crossing',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 2, groundRow: 6,
    },
    chasm: { kind: 'canyon', topRow: 3, bottomRow: 6 },
    tray: { plank: 4, longPlank: 1, pillar3: 3 },
    vehicle: 'bus',
  }),
  makeLevel({
    name: 'Highland Bridge',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 2, groundRow: 6,
    },
    chasm: { kind: 'water', topRow: 3, bottomRow: 6 },
    tray: { plank: 4, longPlank: 1, pillar2: 2, pillar3: 1 },
    vehicle: 'fireTruck',
  }),

  // ---- L16-L20: obstacles in the gap; more decoys ----
  makeLevel({
    name: 'Boulder',
    build: {
      cols: 12, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 6,
      obstacles: [{ r: 6, c: 5 }],
    },
    chasm: { kind: 'canyon', topRow: 4, bottomRow: 6 },
    tray: { plank: 5, pillar2: 3, pillar1: 2, longPlank: 1 },
    vehicle: 'horse',
  }),
  makeLevel({
    name: 'Two Rocks',
    build: {
      cols: 13, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 6,
      obstacles: [{ r: 5, c: 5 }, { r: 5, c: 8 }],
    },
    chasm: { kind: 'water', topRow: 4, bottomRow: 6 },
    tray: { plank: 6, pillar2: 2, pillar1: 2, stone: 2 },
    vehicle: 'tank',
  }),
  makeLevel({
    name: 'Stack Up',
    build: {
      cols: 13, rows: 8, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 7,
      obstacles: [{ r: 6, c: 6 }, { r: 6, c: 9 }],
    },
    chasm: { kind: 'lava', topRow: 4, bottomRow: 7 },
    tray: { plank: 5, longPlank: 1, pillar3: 2, pillar2: 1, stone: 2 },
    vehicle: 'fireTruck',
  }),
  makeLevel({
    name: 'Decoy Bridge',
    build: {
      cols: 13, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 6,
      obstacles: [{ r: 6, c: 6 }],
    },
    chasm: { kind: 'water', topRow: 4, bottomRow: 6 },
    tray: { plank: 6, longPlank: 2, pillar1: 3, pillar2: 2, stone: 2 },
    vehicle: 'cart',
  }),
  makeLevel({
    name: 'Long Haul',
    build: {
      cols: 14, rows: 7, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 6,
      obstacles: [{ r: 5, c: 5 }, { r: 5, c: 9 }],
    },
    chasm: { kind: 'canyon', topRow: 4, bottomRow: 6 },
    tray: { plank: 6, longPlank: 2, pillar2: 3, pillar1: 2, stone: 2 },
    vehicle: 'bus',
  }),

  // ---- L21-L25: deep canyons + stacked pillars + decoys ----
  makeLevel({
    name: 'Deep Canyon',
    build: {
      cols: 14, rows: 8, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 7,
      obstacles: [{ r: 6, c: 6 }, { r: 6, c: 9 }],
    },
    chasm: { kind: 'canyon', topRow: 4, bottomRow: 7 },
    tray: { plank: 6, longPlank: 1, pillar3: 3, pillar2: 2, stone: 2 },
    vehicle: 'tank',
  }),
  makeLevel({
    name: 'Volcano Crossing',
    build: {
      cols: 14, rows: 8, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 7,
      obstacles: [{ r: 6, c: 6 }, { r: 6, c: 8 }, { r: 6, c: 10 }],
    },
    chasm: { kind: 'lava', topRow: 4, bottomRow: 7 },
    tray: { plank: 7, longPlank: 2, pillar3: 2, pillar2: 3, pillar1: 2, stone: 3 },
    vehicle: 'fireTruck',
  }),
  makeLevel({
    name: 'Sky Bridge',
    build: {
      cols: 14, rows: 8, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 2, groundRow: 7,
      obstacles: [{ r: 6, c: 7 }, { r: 5, c: 9 }],
    },
    chasm: { kind: 'canyon', topRow: 3, bottomRow: 7 },
    tray: { plank: 6, longPlank: 2, pillar3: 4, pillar2: 2, stone: 3 },
    vehicle: 'dino',
  }),
  makeLevel({
    name: 'Mega Crossing',
    build: {
      cols: 15, rows: 8, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 3, groundRow: 7,
      obstacles: [{ r: 6, c: 5 }, { r: 6, c: 8 }, { r: 6, c: 11 }],
    },
    chasm: { kind: 'water', topRow: 4, bottomRow: 7 },
    tray: { plank: 7, longPlank: 2, pillar3: 3, pillar2: 3, pillar1: 2, stone: 3 },
    vehicle: 'bus',
  }),
  makeLevel({
    name: 'Master Bridge',
    build: {
      cols: 15, rows: 8, leftCliffCols: 2, rightCliffCols: 2,
      cliffTopRow: 2, groundRow: 7,
      obstacles: [{ r: 6, c: 6 }, { r: 6, c: 9 }, { r: 5, c: 11 }],
    },
    chasm: { kind: 'lava', topRow: 3, bottomRow: 7 },
    tray: { plank: 8, longPlank: 2, pillar3: 4, pillar2: 3, pillar1: 2, stone: 3 },
    vehicle: 'rocket',
  }),
];

// =============================================================
// Rendering
// =============================================================

export function renderBridgeLevel(container, levelIndex, opts) {
  injectCss();
  const level = BRIDGE_LEVELS[levelIndex];
  if (!level) {
    container.innerHTML = '<p style="padding:20px;">Level not found.</p>';
    return;
  }

  const cols = level.cols, rows = level.rows;
  // Responsive cell sizing (kept >=36 for touch)
  const maxCellW = Math.floor((Math.min(window.innerWidth, 760) - 32) / cols);
  const cell = Math.max(36, Math.min(level.cell || 50, maxCellW));

  // The "path row" is the row where the vehicle drives. Use the shallower
  // (smaller row index = higher up) of the two cliff edges.
  const pathRow = Math.min(level.pathRowLeft, level.pathRowRight);
  const gapStartCol = level.leftEdgeCol + 1;
  const gapEndCol = level.rightEdgeCol - 1;
  const gapWidth = gapEndCol - gapStartCol + 1;
  const vehicleKey = level.vehicle || vehicleForLevel(levelIndex);

  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="bridge-stage">
      <div class="bridge-grid-wrap" id="bridge-wrap">
        <div class="bridge-bg" id="bridge-bg"></div>
        <div class="bridge-grid" id="bridge-grid"
             style="
               --bridge-cell: ${cell}px;
               grid-template-columns: repeat(${cols}, ${cell}px);
               grid-template-rows: repeat(${rows}, ${cell}px);
             "></div>
        <div class="bridge-vehicle-layer" id="bridge-vehicle-layer"></div>
      </div>
      <div class="bridge-tray" id="bridge-tray"></div>
      <div class="bridge-actions">
        <button class="bridge-btn reset" data-act="reset">Reset</button>
        <button class="bridge-btn go" data-act="go">GO</button>
      </div>
    </div>
  `;

  const wrap = container.querySelector('#bridge-wrap');
  const grid = container.querySelector('#bridge-grid');
  const tray = container.querySelector('#bridge-tray');
  const bgLayer = container.querySelector('#bridge-bg');
  const vehicleLayer = container.querySelector('#bridge-vehicle-layer');

  // ---- Build background (water / lava / canyon) ----
  if (level.chasm) {
    const ch = level.chasm;
    const top = ch.topRow * cell;
    const bottom = (ch.bottomRow + 1) * cell;
    const div = document.createElement('div');
    div.className = ch.kind === 'water' ? 'water' : ch.kind === 'lava' ? 'lava' : 'canyon';
    div.style.top = top + 'px';
    div.style.height = (bottom - top) + 'px';
    div.style.left = ((level.leftEdgeCol + 1) * cell) + 'px';
    div.style.right = ((cols - level.rightEdgeCol) * cell) + 'px';
    bgLayer.appendChild(div);
  }

  // ---- Build grid cells ----
  const cellEls = new Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const el = document.createElement('div');
      el.className = 'bridge-cell';
      el.dataset.r = r;
      el.dataset.c = c;
      const t = level.terrain[idx];
      if (t === 'cliff') el.classList.add('cliff');
      else if (t === 'cliff-top') el.classList.add('cliff-top');
      else if (t === 'obstacle') el.classList.add('obstacle');
      grid.appendChild(el);
      cellEls[idx] = el;
    }
  }

  // ---- Placed pieces state ----
  // placed: array of { type, r, c, el } — r,c is top-left cell of piece.
  let placed = [];
  // tray counts (mutable copy)
  const trayCounts = { ...level.tray };
  let running = false;
  let won = false;

  // Returns true if cell (r,c) is occupied by terrain or a placed piece.
  function cellOccupied(r, c, ignorePiece) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
    const t = level.terrain[r * cols + c];
    if (t) return true; // cliff/obstacle/cliff-top
    for (const p of placed) {
      if (p === ignorePiece) continue;
      const def = PIECE_DEFS[p.type];
      if (c >= p.c && c < p.c + def.w && r >= p.r && r < p.r + def.h) return true;
    }
    return false;
  }

  // Can a piece of `type` be placed at top-left (r,c)?
  function canPlace(type, r, c, ignorePiece) {
    const def = PIECE_DEFS[type];
    if (!def) return false;
    if (r < 0 || c < 0) return false;
    if (r + def.h > rows || c + def.w > cols) return false;
    for (let dr = 0; dr < def.h; dr++) {
      for (let dc = 0; dc < def.w; dc++) {
        if (cellOccupied(r + dr, c + dc, ignorePiece)) return false;
      }
    }
    return true;
  }

  // ---- Build / refresh tray ----
  function renderTray() {
    tray.innerHTML = '';
    // Stable order based on declared keys.
    for (const type of Object.keys(level.tray)) {
      const def = PIECE_DEFS[type];
      if (!def) continue;
      const count = trayCounts[type] || 0;
      const slot = document.createElement('div');
      slot.className = 'bridge-tray-slot';
      if (count === 0) slot.classList.add('empty');
      const piece = document.createElement('div');
      piece.className = 'bridge-piece tray-piece';
      piece.dataset.type = type;
      piece.style.position = 'relative';
      piece.innerHTML = def.svg(cell);
      // dim if empty
      if (count === 0) {
        piece.style.opacity = 0.25;
        piece.style.pointerEvents = 'none';
      }
      slot.appendChild(piece);
      const badge = document.createElement('div');
      badge.className = 'tray-count';
      badge.textContent = '×' + count;
      slot.appendChild(badge);
      tray.appendChild(slot);
      if (count > 0) setupTrayDrag(piece, type);
    }
  }

  // ---- Tray drag handlers ----
  function setupTrayDrag(part, type) {
    let dragging = false;
    let pointerId = null;
    let clone = null;
    let offsetX = 0, offsetY = 0;
    const def = PIECE_DEFS[type];

    part.addEventListener('pointerdown', (e) => {
      if (running || won) return;
      e.preventDefault();
      dragging = true;
      pointerId = e.pointerId;
      part.setPointerCapture(e.pointerId);
      // Create a floating clone for dragging.
      clone = document.createElement('div');
      clone.className = 'bridge-piece dragging';
      clone.innerHTML = def.svg(cell);
      clone.style.position = 'fixed';
      clone.style.left = (e.clientX - (def.w * cell) / 2) + 'px';
      clone.style.top = (e.clientY - (def.h * cell) / 2) + 'px';
      clone.style.width = (def.w * cell) + 'px';
      clone.style.height = (def.h * cell) + 'px';
      document.body.appendChild(clone);
      offsetX = (def.w * cell) / 2;
      offsetY = (def.h * cell) / 2;
      sfx.pickup();
    });

    part.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      clone.style.left = (e.clientX - offsetX) + 'px';
      clone.style.top = (e.clientY - offsetY) + 'px';
      updateHoverIndicator(e.clientX, e.clientY, type);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      part.releasePointerCapture(pointerId);
      clearHoverIndicator();
      // Determine drop cell.
      const targetCell = cellFromClientPoint(e.clientX, e.clientY, type);
      let placedOk = false;
      if (targetCell && canPlace(type, targetCell.r, targetCell.c)) {
        // Place piece.
        placePiece(type, targetCell.r, targetCell.c);
        trayCounts[type] = Math.max(0, (trayCounts[type] || 0) - 1);
        sfx.snap();
        placedOk = true;
      } else {
        sfx.reject();
      }
      clone.remove();
      clone = null;
      if (placedOk) renderTray();
    }
    part.addEventListener('pointerup', endDrag);
    part.addEventListener('pointercancel', endDrag);
  }

  // Convert client coords to the top-left grid cell where a piece of the
  // given type would be placed (centered on cursor).
  function cellFromClientPoint(clientX, clientY, type) {
    const def = PIECE_DEFS[type];
    const rect = grid.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    // Top-left cell so that piece is roughly centered on cursor.
    const c = Math.floor((localX - (def.w * cell) / 2) / cell + 0.5);
    const r = Math.floor((localY - (def.h * cell) / 2) / cell + 0.5);
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    return { r, c };
  }

  // Visual hover indicator on grid cells while dragging from tray.
  function updateHoverIndicator(clientX, clientY, type) {
    clearHoverIndicator();
    const target = cellFromClientPoint(clientX, clientY, type);
    if (!target) return;
    const def = PIECE_DEFS[type];
    const ok = canPlace(type, target.r, target.c);
    for (let dr = 0; dr < def.h; dr++) {
      for (let dc = 0; dc < def.w; dc++) {
        const r = target.r + dr, c = target.c + dc;
        if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
        const el = cellEls[r * cols + c];
        if (el) el.classList.add(ok ? 'drop-hover' : 'drop-blocked');
      }
    }
  }
  function clearHoverIndicator() {
    for (const el of cellEls) {
      if (el) el.classList.remove('drop-hover', 'drop-blocked');
    }
  }

  // ---- Place a piece on the grid ----
  function placePiece(type, r, c) {
    const def = PIECE_DEFS[type];
    const pieceEl = document.createElement('div');
    pieceEl.className = 'bridge-piece placed';
    pieceEl.dataset.type = type;
    pieceEl.style.left = (c * cell) + 'px';
    pieceEl.style.top = (r * cell) + 'px';
    pieceEl.style.width = (def.w * cell) + 'px';
    pieceEl.style.height = (def.h * cell) + 'px';
    pieceEl.innerHTML = def.svg(cell);
    grid.appendChild(pieceEl);
    const p = { type, r, c, el: pieceEl };
    placed.push(p);

    // Tap to remove (returns to tray).
    pieceEl.addEventListener('click', () => {
      if (running || won) return;
      removePiece(p);
    });
  }

  function removePiece(p) {
    p.el.remove();
    placed = placed.filter(x => x !== p);
    trayCounts[p.type] = (trayCounts[p.type] || 0) + 1;
    sfx.drop();
    renderTray();
  }

  function resetAll() {
    if (won) return;
    sfx.click();
    for (const p of placed) p.el.remove();
    placed = [];
    // Restore tray counts to original.
    for (const k of Object.keys(level.tray)) trayCounts[k] = level.tray[k];
    renderTray();
  }

  // ---- Validation ----
  // Returns { valid, firstFailCol } — firstFailCol is the col on the path
  // row where the bridge first fails (used for fall animation).
  function validateBridge() {
    // 1. Every pillar must be supported.
    for (const p of placed) {
      if (PIECE_DEFS[p.type].kind !== 'pillar') continue;
      const bottomRow = p.r + PIECE_DEFS[p.type].h - 1;
      const supportRow = bottomRow + 1;
      if (supportRow >= rows) continue; // sitting on grid bottom = ground
      // Need cliff terrain OR another pillar/stone in the cell directly below.
      const belowIdx = supportRow * cols + p.c;
      const belowTerrain = level.terrain[belowIdx];
      if (belowTerrain === 'cliff' || belowTerrain === 'cliff-top') continue;
      const supportingPiece = placed.find(o => {
        if (o === p) return false;
        const def = PIECE_DEFS[o.type];
        if (def.kind !== 'pillar' && def.kind !== 'stone') return false;
        return p.c >= o.c && p.c < o.c + def.w &&
               supportRow >= o.r && supportRow < o.r + def.h;
      });
      if (!supportingPiece) return { valid: false, firstFailCol: p.c };
    }

    // 2. Every cell on the path row inside the gap must be filled by a
    //    pathBlock piece (plank / longPlank / stone).
    for (let c = gapStartCol; c <= gapEndCol; c++) {
      // Obstacle on path row = bridge must go OVER it. For MVP, treat as
      // a required cell that needs to be filled by a piece occupying that
      // cell at the path row.
      const piece = placed.find(p => {
        const def = PIECE_DEFS[p.type];
        if (!def.pathBlock) return false;
        return c >= p.c && c < p.c + def.w &&
               pathRow >= p.r && pathRow < p.r + def.h;
      });
      if (!piece) return { valid: false, firstFailCol: c };
      // Also: piece must be placed on a row no LOWER than pathRow (i.e. its
      // top row must equal pathRow; planks are 1 cell tall so r == pathRow).
      if (piece.r !== pathRow) return { valid: false, firstFailCol: c };
    }

    return { valid: true, firstFailCol: -1 };
  }

  // ---- GO / Run vehicle animation ----
  function runGo() {
    if (running || won) return;
    sfx.click();
    running = true;
    const { valid, firstFailCol } = validateBridge();

    // Build vehicle DOM
    const vehicleEl = document.createElement('div');
    vehicleEl.className = 'bridge-vehicle';
    const vehicleHeight = Math.max(36, Math.floor(cell * 0.95));
    vehicleEl.innerHTML = VEHICLES[vehicleKey](vehicleHeight);
    // Anchor the vehicle so its bottom sits on top of the path row.
    // path row's top y = pathRow * cell. So vehicle bottom = pathRow * cell.
    const gridRect = grid.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const gridOffsetX = gridRect.left - wrapRect.left;
    const gridOffsetY = gridRect.top - wrapRect.top;
    const pathTopPx = gridOffsetY + pathRow * cell;
    // Place using top = pathTopPx - vehicleHeight (so its bottom is at pathTopPx)
    vehicleEl.style.top = (pathTopPx - vehicleHeight) + 'px';
    vehicleEl.style.left = gridOffsetX + 'px';
    vehicleLayer.appendChild(vehicleEl);

    // Compute travel distance.
    const gridWidthPx = cols * cell;
    const finalX = gridWidthPx; // vehicle ends past right edge

    // We'll move via transform translateX.
    // Start position: just on the left cliff edge.
    const startX = (level.leftEdgeCol + 1) * cell - 6;
    vehicleEl.style.transform = `translateX(${startX}px)`;
    // Force layout, then animate.
    requestAnimationFrame(() => {
      if (valid) {
        // Drive across the whole bridge, ending at the right cliff.
        const endX = (level.rightEdgeCol) * cell + 4;
        vehicleEl.classList.add('driving');
        vehicleEl.style.transform = `translateX(${endX}px)`;
        sfx.flow();
        setTimeout(() => {
          // WIN!
          running = false;
          if (!won) {
            won = true;
            onWin();
          }
        }, 1700);
      } else {
        // Drive to the failure column, then fall.
        const failX = (firstFailCol) * cell - 6;
        vehicleEl.classList.add('driving');
        // Use a shorter drive that just goes to fail point.
        const driveDistance = Math.max(failX - startX, cell);
        // Set transition duration scaled to distance so speed is consistent.
        const speedMs = Math.max(400, Math.floor((driveDistance / cell) * 320));
        vehicleEl.style.transition = `transform ${speedMs}ms linear`;
        vehicleEl.style.transform = `translateX(${failX}px)`;
        setTimeout(() => {
          // Fall!
          vehicleEl.style.transition = `transform 0.6s linear, top 0.7s cubic-bezier(0.3, 0, 0.7, 1)`;
          vehicleEl.style.transform = `translateX(${failX + cell * 0.6}px) rotate(38deg)`;
          vehicleEl.style.top = (rows * cell - 4) + 'px';
          sfx.buzz();
          // splash text
          const splash = document.createElement('div');
          splash.className = 'bridge-splash';
          splash.textContent = level.chasm?.kind === 'lava' ? 'OUCH!' :
                                level.chasm?.kind === 'water' ? 'SPLASH!' : 'OOPS!';
          splash.style.left = (gridOffsetX + failX + cell) + 'px';
          splash.style.top = (gridOffsetY + (rows - 1) * cell) + 'px';
          wrap.appendChild(splash);
          setTimeout(() => splash.remove(), 1200);
          // Clean up + allow retry.
          setTimeout(() => {
            vehicleEl.remove();
            running = false;
          }, 1300);
        }, speedMs + 50);
      }
    });
  }

  // ---- Win ----
  function onWin() {
    sfx.win();
    const wrapRect = wrap.getBoundingClientRect();
    const cx = wrapRect.width / 2;
    const cy = wrapRect.height / 2;
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('div');
      s.className = 'star-burst';
      s.textContent = '⭐';
      const angle = (Math.PI * 2 * i) / 16;
      const dist = 140 + Math.random() * 80;
      s.style.setProperty('--end',
        `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`);
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.position = 'absolute';
      wrap.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
    opts.onComplete(levelIndex);
    setTimeout(() => showWinOverlay(), 1300);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < BRIDGE_LEVELS.length;
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

  // ---- Wire up buttons ----
  container.querySelector('[data-act="back"]').addEventListener('click', opts.onBack);
  container.querySelector('[data-act="go"]').addEventListener('click', runGo);
  container.querySelector('[data-act="reset"]').addEventListener('click', resetAll);

  // Initial render
  renderTray();
}
