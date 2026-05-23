// Pitfall mechanic — auto-runner side-scrolling jungle platformer.
//
// Controls (iPad touch first):
//  - Character runs forward at constant speed automatically.
//  - Tap ANYWHERE on the stage to JUMP (only when grounded or to release a vine).
//  - For vines: just collide with one mid-air to grab; tap to release.
//
// Architecture:
//  - World coordinates: a "logical" pixel space where ground level == 0 and
//    +y is UP, +x is RIGHT. The world is `level.width` units wide. We render
//    by mapping world-x to screen-x with a camera that follows the player.
//  - Game loop: requestAnimationFrame -> step(dt) -> render(). Physics uses
//    real seconds (dt clamped to 0.05 to avoid tunneling on slow frames).
//  - DOM-based rendering: one element per hazard, transforms updated each frame.
//    Keeps things simple and SVG-friendly without canvas.

import { sfx } from './sound.js';

// ---- Inject stylesheet once ----
(function ensureStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.querySelector && document.querySelector('link[data-pitfall-css]')) return;
  const link = document.createElement('link');
  if (!link) return;
  link.rel = 'stylesheet';
  link.href = 'styles-pitfall.css';
  if (typeof link.setAttribute === 'function') {
    link.setAttribute('data-pitfall-css', '1');
  }
  if (document.head && document.head.appendChild) {
    document.head.appendChild(link);
  }
})();

// =========================================================================
// LEVEL DATA — 25 hand-tuned levels with smooth difficulty progression
// =========================================================================
//
// Each level: { name, width, bg, hazards, goal }
//   hazards: array of { type, x, ...typeSpecifics }
//   goal:    { type: 'flag', x }
//
// Coordinates are in world pixels. The stage is 960 wide; player starts at
// world-x 80 and the goal is typically at width - 80. Ground = y 0.

export const PITFALL_LEVELS = [
  // ---- L1-L5: EASY INTRO — pure tap-to-jump ----
  {
    name: 'Jungle Start', width: 1200, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 500, w: 60 },
    ],
    goal: { type: 'flag', x: 1140 },
  },
  {
    name: 'Two Pits', width: 1400, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 380, w: 60 },
      { type: 'pit', x: 800, w: 70 },
    ],
    goal: { type: 'flag', x: 1340 },
  },
  {
    name: 'Long Gap', width: 1400, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 500, w: 100 },
    ],
    goal: { type: 'flag', x: 1340 },
  },
  {
    name: 'Hop Skip', width: 1500, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 320, w: 60 },
      { type: 'pit', x: 540, w: 70 },
      { type: 'pit', x: 800, w: 60 },
    ],
    goal: { type: 'flag', x: 1440 },
  },
  {
    name: 'Pit Parade', width: 1600, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 300, w: 70 },
      { type: 'pit', x: 560, w: 70 },
      { type: 'pit', x: 820, w: 80 },
      { type: 'pit', x: 1100, w: 70 },
    ],
    goal: { type: 'flag', x: 1540 },
  },

  // ---- L6-L10: Add logs & scorpions ----
  {
    name: 'Rolling Log', width: 1500, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 400, w: 60 },
      { type: 'log', x: 900, speed: 70 },
    ],
    goal: { type: 'flag', x: 1440 },
  },
  {
    name: 'Scorpion Path', width: 1500, bg: 'jungle',
    hazards: [
      { type: 'scorpion', x: 400 },
      { type: 'pit', x: 700, w: 70 },
      { type: 'scorpion', x: 1050 },
    ],
    goal: { type: 'flag', x: 1440 },
  },
  {
    name: 'Logs and Pits', width: 1700, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 350, w: 70 },
      { type: 'log', x: 800, speed: 90 },
      { type: 'pit', x: 1100, w: 70 },
      // Slowed from 80 → 50 so collision lands inside the pit-jump arc
      // (player airborne for pit, log passes under).
      { type: 'log', x: 1400, speed: 50 },
    ],
    goal: { type: 'flag', x: 1640 },
  },
  {
    name: 'Scorpion Pit', width: 1700, bg: 'jungle',
    hazards: [
      { type: 'scorpion', x: 350 },
      { type: 'pit', x: 600, w: 80 },
      { type: 'scorpion', x: 900 },
      { type: 'pit', x: 1200, w: 70 },
    ],
    goal: { type: 'flag', x: 1640 },
  },
  {
    name: 'Triple Threat', width: 1800, bg: 'jungle',
    hazards: [
      { type: 'log', x: 350, speed: 80 },
      { type: 'scorpion', x: 650 },
      { type: 'pit', x: 900, w: 80 },
      { type: 'scorpion', x: 1200 },
      // Slowed from 90 → 50 so the log arrives during the scorpion-jump
      // (player airborne) rather than in the dead-zone between pit and scorpion.
      { type: 'log', x: 1500, speed: 50 },
    ],
    goal: { type: 'flag', x: 1740 },
  },

  // ---- L11-L15: Snakes & quicksand ----
  {
    name: 'Snake Bite', width: 1500, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 350, w: 60 },
      { type: 'snake', x: 700 },
      { type: 'snake', x: 1050 },
    ],
    goal: { type: 'flag', x: 1440 },
  },
  {
    name: 'Quicksand', width: 1600, bg: 'jungle',
    hazards: [
      { type: 'quicksand', x: 400, w: 80 },
      { type: 'pit', x: 700, w: 70 },
      { type: 'quicksand', x: 1000, w: 90 },
    ],
    goal: { type: 'flag', x: 1540 },
  },
  {
    name: 'Snake Den', width: 1700, bg: 'jungle',
    hazards: [
      { type: 'snake', x: 350 },
      { type: 'pit', x: 600, w: 70 },
      { type: 'snake', x: 900 },
      { type: 'scorpion', x: 1200 },
      { type: 'snake', x: 1450 },
    ],
    goal: { type: 'flag', x: 1640 },
  },
  {
    name: 'Sand Trap', width: 1700, bg: 'jungle',
    hazards: [
      { type: 'log', x: 350, speed: 80 },
      // Narrowed quicksand 100 → 70: width 100 left only 15 px of valid
      // jump-start window; width 70 gives a forgiving 45 px window.
      { type: 'quicksand', x: 600, w: 70 },
      { type: 'snake', x: 950 },
      { type: 'quicksand', x: 1200, w: 70 },
      { type: 'scorpion', x: 1450 },
    ],
    goal: { type: 'flag', x: 1640 },
  },
  {
    name: 'Jungle Maze', width: 1900, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 300, w: 70 },
      { type: 'snake', x: 550 },
      // Narrowed quicksand 90 → 70 for a forgiving jump-start window.
      { type: 'quicksand', x: 800, w: 70 },
      // Log speed 90 → 30 so it doesn't trigger a competing earlier jump
      // before the quicksand one. With speed 30 the log is comfortably past
      // the player by the time the quicksand-jump lands.
      { type: 'log', x: 1100, speed: 30 },
      { type: 'scorpion', x: 1400 },
      { type: 'snake', x: 1650 },
    ],
    goal: { type: 'flag', x: 1840 },
  },

  // ---- L16-L20: Vines! ----
  {
    name: 'First Swing', width: 1500, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 500, w: 220, vinePit: true },
      { type: 'vine', x: 610, y: 220 },
    ],
    goal: { type: 'flag', x: 1440 },
  },
  {
    name: 'Vine and Pit', width: 1700, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 350, w: 70 },
      { type: 'pit', x: 700, w: 220, vinePit: true },
      { type: 'vine', x: 810, y: 220 },
      { type: 'pit', x: 1200, w: 70 },
    ],
    goal: { type: 'flag', x: 1640 },
  },
  {
    name: 'Two Swings', width: 1900, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 400, w: 220, vinePit: true },
      { type: 'vine', x: 510, y: 210 },
      { type: 'pit', x: 900, w: 80 },
      { type: 'pit', x: 1200, w: 220, vinePit: true },
      { type: 'vine', x: 1310, y: 220 },
    ],
    goal: { type: 'flag', x: 1840 },
  },
  {
    name: 'Swing Snake', width: 1900, bg: 'jungle',
    hazards: [
      { type: 'snake', x: 300 },
      { type: 'pit', x: 550, w: 220, vinePit: true },
      { type: 'vine', x: 660, y: 220 },
      { type: 'snake', x: 1000 },
      { type: 'scorpion', x: 1300 },
      { type: 'log', x: 1500, speed: 90 },
    ],
    goal: { type: 'flag', x: 1840 },
  },
  {
    name: 'Vine Highway', width: 2100, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 350, w: 220, vinePit: true },
      { type: 'vine', x: 460, y: 210 },
      { type: 'snake', x: 850 },
      { type: 'pit', x: 1050, w: 220, vinePit: true },
      { type: 'vine', x: 1160, y: 215 },
      { type: 'quicksand', x: 1550, w: 100 },
      { type: 'scorpion', x: 1800 },
    ],
    goal: { type: 'flag', x: 2040 },
  },

  // ---- L21-L25: Crocodile pools & combos — ultimate challenges ----
  {
    name: 'Croc Crossing', width: 1700, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 350, w: 70 },
      { type: 'crocpool', x: 700, w: 320, count: 3 },
      { type: 'snake', x: 1250 },
    ],
    goal: { type: 'flag', x: 1640 },
  },
  {
    name: 'Snap Snap', width: 1900, bg: 'jungle',
    hazards: [
      { type: 'scorpion', x: 300 },
      { type: 'crocpool', x: 600, w: 320, count: 3, phase: 0.5 },
      { type: 'pit', x: 1100, w: 80 },
      { type: 'crocpool', x: 1350, w: 320, count: 3 },
    ],
    goal: { type: 'flag', x: 1840 },
  },
  {
    name: 'Vine and Crocs', width: 2100, bg: 'jungle',
    hazards: [
      { type: 'pit', x: 350, w: 220, vinePit: true },
      { type: 'vine', x: 460, y: 215 },
      { type: 'crocpool', x: 850, w: 320, count: 3 },
      { type: 'snake', x: 1350 },
      { type: 'crocpool', x: 1600, w: 320, count: 3, phase: 0.3 },
    ],
    goal: { type: 'flag', x: 2040 },
  },
  {
    name: 'Jungle Gauntlet', width: 2300, bg: 'jungle',
    hazards: [
      { type: 'log', x: 300, speed: 90 },
      { type: 'snake', x: 600 },
      { type: 'pit', x: 850, w: 220, vinePit: true },
      { type: 'vine', x: 960, y: 215 },
      { type: 'scorpion', x: 1300 },
      { type: 'crocpool', x: 1550, w: 320, count: 3 },
      { type: 'quicksand', x: 2000, w: 100 },
    ],
    goal: { type: 'flag', x: 2240 },
  },
  {
    name: 'Pitfall Legend', width: 2600, bg: 'jungle',
    hazards: [
      { type: 'scorpion', x: 300 },
      { type: 'pit', x: 500, w: 80 },
      { type: 'snake', x: 750 },
      { type: 'pit', x: 950, w: 220, vinePit: true },
      { type: 'vine', x: 1060, y: 215 },
      { type: 'log', x: 1450, speed: 100 },
      { type: 'crocpool', x: 1700, w: 320, count: 3, phase: 0.4 },
      { type: 'quicksand', x: 2200, w: 100 },
      { type: 'scorpion', x: 2400 },
    ],
    goal: { type: 'flag', x: 2540 },
  },
];

// =========================================================================
// CONSTANTS
// =========================================================================

const PLAYER_W = 38;
const PLAYER_H = 56;
const RUN_SPEED = 220;          // world px / sec
const JUMP_VEL  = 540;          // initial upward vel
const GRAVITY   = 1400;         // px / sec^2 (downward when y is up)
const QUICKSAND_PULL = 90;      // downward speed inside quicksand
const VINE_LEN  = 110;          // pendulum length — bob hangs at jump-apex height
const VINE_GRAV = 7.0;          // angular gravity for the pendulum
const VINE_DAMP = 0.998;        // gentle damping per frame
const CROC_PERIOD = 1.6;        // seconds for full open/close cycle

// World->screen mapping. The stage CSS aspect is 16:9; we treat world heights
// in a fixed "logical" space and scale to the stage. Logical world height = 540.
const LOGICAL_W = 960;          // visible width in world units
const LOGICAL_H = 540;          // visible height in world units
const GROUND_Y  = 110;          // ground top (world y, +y up)

// =========================================================================
// SVG snippets for sprites
// =========================================================================

function playerSvg() {
  // Indiana-Jones-y silhouette: brown hat, tan body, brown legs.
  // Centered in viewBox so we can flip if we ever need to. Run cycle is just
  // a small bobble done in CSS-free transforms in render().
  return `
    <svg viewBox="0 0 48 64" width="48" height="64" style="display:block;">
      <!-- hat brim -->
      <ellipse cx="24" cy="14" rx="16" ry="3" fill="#5a3a18" stroke="#2a1808" stroke-width="1.5"/>
      <!-- hat top -->
      <rect x="16" y="6" width="16" height="9" rx="2" fill="#6a4a1f" stroke="#2a1808" stroke-width="1.5"/>
      <rect x="16" y="12" width="16" height="2" fill="#3a2410"/>
      <!-- face -->
      <rect x="18" y="15" width="12" height="10" rx="3" fill="#f0c89a" stroke="#5a3a1a" stroke-width="1.2"/>
      <!-- eyes -->
      <circle cx="22" cy="20" r="1.2" fill="#1a0e08"/>
      <circle cx="27" cy="20" r="1.2" fill="#1a0e08"/>
      <!-- shirt -->
      <rect x="14" y="24" width="20" height="18" rx="3" fill="#8a5a2a" stroke="#3a2410" stroke-width="1.5"/>
      <!-- belt -->
      <rect x="14" y="40" width="20" height="3" fill="#3a2410"/>
      <!-- shorts -->
      <rect x="14" y="42" width="9" height="12" fill="#c9a574" stroke="#5a3a1a" stroke-width="1.2"/>
      <rect x="25" y="42" width="9" height="12" fill="#c9a574" stroke="#5a3a1a" stroke-width="1.2"/>
      <!-- boots -->
      <rect x="13" y="54" width="11" height="8" rx="1.5" fill="#3a2410" stroke="#1a0e08" stroke-width="1.2"/>
      <rect x="24" y="54" width="11" height="8" rx="1.5" fill="#3a2410" stroke="#1a0e08" stroke-width="1.2"/>
      <!-- whip on belt -->
      <circle cx="33" cy="34" r="3" fill="none" stroke="#3a2410" stroke-width="1.5"/>
    </svg>
  `;
}

function logSvg() {
  return `
    <svg viewBox="0 0 60 50" width="60" height="50" style="display:block;">
      <ellipse cx="30" cy="25" rx="28" ry="22" fill="#8a5a2a" stroke="#3a2410" stroke-width="2.5"/>
      <ellipse cx="30" cy="25" rx="20" ry="16" fill="#a07840" stroke="#5a3a1a" stroke-width="1.8"/>
      <ellipse cx="30" cy="25" rx="12" ry="9"  fill="#8a5a2a"/>
      <ellipse cx="30" cy="25" rx="6"  ry="4.5" fill="#5a3a1a"/>
      <path d="M 8 18 Q 30 14 52 18" stroke="#3a2410" stroke-width="1.5" fill="none"/>
      <path d="M 8 32 Q 30 36 52 32" stroke="#3a2410" stroke-width="1.5" fill="none"/>
    </svg>
  `;
}

function scorpionSvg() {
  return `
    <svg viewBox="0 0 60 40" width="60" height="40" style="display:block;">
      <!-- claws -->
      <path d="M 4 22 L 12 22 L 14 18 L 10 14 Z" fill="#d04020" stroke="#5a1808" stroke-width="1.5"/>
      <path d="M 4 28 L 12 28 L 14 32 L 10 36 Z" fill="#d04020" stroke="#5a1808" stroke-width="1.5"/>
      <!-- body segments -->
      <ellipse cx="22" cy="25" rx="6" ry="5" fill="#e04822" stroke="#5a1808" stroke-width="1.5"/>
      <ellipse cx="32" cy="25" rx="7" ry="6" fill="#e04822" stroke="#5a1808" stroke-width="1.5"/>
      <ellipse cx="42" cy="25" rx="5" ry="4" fill="#d04020" stroke="#5a1808" stroke-width="1.5"/>
      <!-- tail curl -->
      <path d="M 46 24 Q 56 20 54 10 Q 52 4 46 6" fill="none" stroke="#d04020" stroke-width="6" stroke-linecap="round"/>
      <path d="M 46 24 Q 56 20 54 10 Q 52 4 46 6" fill="none" stroke="#5a1808" stroke-width="2" stroke-linecap="round"/>
      <!-- stinger -->
      <path d="M 44 4 L 49 1 L 47 8 Z" fill="#3a0808" stroke="#000" stroke-width="1"/>
      <!-- legs -->
      <line x1="22" y1="29" x2="20" y2="36" stroke="#5a1808" stroke-width="1.8"/>
      <line x1="26" y1="29" x2="26" y2="36" stroke="#5a1808" stroke-width="1.8"/>
      <line x1="32" y1="30" x2="32" y2="38" stroke="#5a1808" stroke-width="1.8"/>
      <line x1="38" y1="29" x2="40" y2="36" stroke="#5a1808" stroke-width="1.8"/>
    </svg>
  `;
}

function snakeSvg() {
  return `
    <svg viewBox="0 0 60 50" width="60" height="50" style="display:block;">
      <!-- coiled body -->
      <ellipse cx="30" cy="38" rx="26" ry="10" fill="#3a8030" stroke="#1f4f18" stroke-width="2"/>
      <ellipse cx="30" cy="32" rx="20" ry="8"  fill="#4a9a3a" stroke="#1f4f18" stroke-width="2"/>
      <ellipse cx="30" cy="26" rx="14" ry="6"  fill="#3a8030" stroke="#1f4f18" stroke-width="2"/>
      <!-- stripes -->
      <ellipse cx="20" cy="38" rx="3" ry="6" fill="#1f4f18"/>
      <ellipse cx="34" cy="38" rx="3" ry="6" fill="#1f4f18"/>
      <ellipse cx="24" cy="32" rx="2.5" ry="5" fill="#1f4f18"/>
      <ellipse cx="36" cy="32" rx="2.5" ry="5" fill="#1f4f18"/>
      <!-- head -->
      <ellipse cx="30" cy="18" rx="9" ry="6" fill="#4a9a3a" stroke="#1f4f18" stroke-width="2"/>
      <!-- eyes -->
      <circle cx="27" cy="17" r="1.2" fill="#000"/>
      <circle cx="33" cy="17" r="1.2" fill="#000"/>
      <!-- tongue -->
      <path d="M 30 22 L 30 28 L 28 30 M 30 28 L 32 30" stroke="#d04020" stroke-width="1.5" fill="none"/>
    </svg>
  `;
}

function quicksandSvg(w) {
  return `
    <svg viewBox="0 0 ${w} 24" width="${w}" height="24" style="display:block;">
      <rect x="0" y="0" width="${w}" height="24" fill="#d4b860" stroke="#8a6a20" stroke-width="2"/>
      <ellipse cx="${w * 0.25}" cy="10" rx="6" ry="3" fill="#b89840"/>
      <ellipse cx="${w * 0.55}" cy="14" rx="8" ry="3" fill="#b89840"/>
      <ellipse cx="${w * 0.80}" cy="9"  rx="5" ry="2.5" fill="#b89840"/>
      <circle cx="${w * 0.35}" cy="6"  r="2" fill="#f0d880"/>
      <circle cx="${w * 0.65}" cy="6"  r="1.5" fill="#f0d880"/>
    </svg>
  `;
}

function crocSvg(open) {
  // 80 wide x 50 tall crocodile head, mouth opens upward.
  // When `open`, jaws are split; closed, jaws are together.
  const jawY = open ? 18 : 24;
  const teethOpacity = open ? 1 : 0;
  return `
    <svg viewBox="0 0 80 50" width="80" height="50" style="display:block;">
      <!-- lower jaw -->
      <path d="M 4 38 L 76 38 L 72 46 L 8 46 Z" fill="#3a7028" stroke="#1f4f18" stroke-width="2"/>
      <!-- upper jaw -->
      <path d="M 4 ${jawY} L 76 ${jawY} L 72 30 L 8 30 Z" fill="#4a8a30" stroke="#1f4f18" stroke-width="2"/>
      <!-- teeth -->
      <g opacity="${teethOpacity}">
        <polygon points="14,30 18,38 22,30" fill="#fff" stroke="#3a2410" stroke-width="0.8"/>
        <polygon points="26,30 30,38 34,30" fill="#fff" stroke="#3a2410" stroke-width="0.8"/>
        <polygon points="38,30 42,38 46,30" fill="#fff" stroke="#3a2410" stroke-width="0.8"/>
        <polygon points="50,30 54,38 58,30" fill="#fff" stroke="#3a2410" stroke-width="0.8"/>
        <polygon points="62,30 66,38 70,30" fill="#fff" stroke="#3a2410" stroke-width="0.8"/>
      </g>
      <!-- eyes (on top of upper jaw) -->
      <circle cx="22" cy="${jawY - 4}" r="3" fill="#fff" stroke="#1f4f18" stroke-width="1"/>
      <circle cx="22" cy="${jawY - 4}" r="1.5" fill="#000"/>
      <circle cx="58" cy="${jawY - 4}" r="3" fill="#fff" stroke="#1f4f18" stroke-width="1"/>
      <circle cx="58" cy="${jawY - 4}" r="1.5" fill="#000"/>
      <!-- nose bumps -->
      <circle cx="14" cy="${jawY}" r="2" fill="#3a7028"/>
      <circle cx="66" cy="${jawY}" r="2" fill="#3a7028"/>
    </svg>
  `;
}

function goalSvg() {
  // Flag pole + treasure chest at the base.
  return `
    <svg viewBox="0 0 80 120" width="80" height="120" style="display:block;">
      <!-- pole -->
      <rect x="38" y="10" width="4" height="88" fill="#8a8a8a" stroke="#3a3a3a" stroke-width="1.2"/>
      <!-- flag -->
      <path d="M 42 12 L 72 18 L 42 30 Z" fill="#e03020" stroke="#5a1808" stroke-width="1.5"/>
      <!-- chest body -->
      <rect x="14" y="92" width="52" height="22" rx="2" fill="#a07840" stroke="#3a2410" stroke-width="2"/>
      <!-- chest lid -->
      <path d="M 14 92 Q 40 78 66 92" fill="#c19a64" stroke="#3a2410" stroke-width="2"/>
      <!-- bands -->
      <rect x="14" y="98" width="52" height="3" fill="#5a3a1a"/>
      <rect x="38" y="92" width="4" height="22" fill="#5a3a1a"/>
      <!-- lock -->
      <rect x="36" y="100" width="8" height="8" rx="1" fill="#ffd966" stroke="#7a5a1f" stroke-width="1"/>
      <!-- gold sparkle peek -->
      <circle cx="28" cy="104" r="1.5" fill="#ffd966"/>
      <circle cx="52" cy="106" r="1.5" fill="#ffd966"/>
    </svg>
  `;
}

// =========================================================================
// Render function
// =========================================================================

export function renderPitfallLevel(container, levelIndex, opts) {
  const level = PITFALL_LEVELS[levelIndex];
  if (!level) {
    container.innerHTML = '<p style="padding:20px;">Level not found.</p>';
    return;
  }

  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="pitfall-game">
      <div class="pitfall-stage" id="pf-stage">
        <div class="pf-banner">Level ${levelIndex + 1}: ${level.name}</div>
        <div class="pf-canopy"></div>
        <div class="pf-world" id="pf-world"></div>
        <div class="pf-ground"></div>
        ${levelIndex === 0 ? '<div class="pf-touch-hint">👆</div>' : ''}
      </div>
    </div>
  `;

  const stage = container.querySelector('#pf-stage');
  const world = container.querySelector('#pf-world');

  // ---- Build trunks scenery (purely decorative, in-world) ----
  const trunks = [];
  for (let tx = 100; tx < level.width; tx += 220 + Math.floor((tx * 13) % 80)) {
    trunks.push({ x: tx, h: 90 + ((tx * 7) % 60) });
  }

  // ---- Build hazard DOM elements ----
  // Each hazard gets an entry with: data (copy of level def), el (DOM node).
  // For crocpool, we have nested children (multiple crocs).
  const hazards = level.hazards.map(h => ({ ...h }));

  const elsByIdx = [];

  // Trunks first (so they sit behind hazards)
  trunks.forEach(t => {
    const el = document.createElement('div');
    el.className = 'pf-trunk';
    el.style.height = t.h + 'px';
    el.dataset.worldX = t.x;
    el.dataset.worldYTop = (LOGICAL_H * 0.18); // anchored under canopy
    world.appendChild(el);
    elsByIdx.push({ kind: 'trunk', el, wx: t.x, wytop: LOGICAL_H * 0.18 });
  });

  // Pits (rendered as rectangles drawn over the ground)
  hazards.forEach((h, i) => {
    if (h.type === 'pit') {
      const el = document.createElement('div');
      el.className = 'pf-pit';
      el.style.height = (LOGICAL_H * 0.20) + 'px';
      el.style.width = h.w + 'px';
      el.dataset.idx = i;
      world.appendChild(el);
      h._el = el;
    } else if (h.type === 'log') {
      const el = document.createElement('div');
      el.className = 'pf-hazard';
      el.innerHTML = logSvg();
      el.dataset.idx = i;
      world.appendChild(el);
      h._el = el;
      h._rotation = 0;
      // logs start at their declared x and move LEFT (toward player)
      h._x = h.x;
    } else if (h.type === 'scorpion') {
      const el = document.createElement('div');
      el.className = 'pf-hazard';
      el.innerHTML = scorpionSvg();
      el.dataset.idx = i;
      world.appendChild(el);
      h._el = el;
    } else if (h.type === 'snake') {
      const el = document.createElement('div');
      el.className = 'pf-hazard';
      el.innerHTML = snakeSvg();
      el.dataset.idx = i;
      world.appendChild(el);
      h._el = el;
    } else if (h.type === 'quicksand') {
      const el = document.createElement('div');
      el.className = 'pf-hazard';
      el.innerHTML = quicksandSvg(h.w);
      el.dataset.idx = i;
      world.appendChild(el);
      h._el = el;
    } else if (h.type === 'vine') {
      const el = document.createElement('div');
      el.className = 'pf-vine';
      el.style.height = VINE_LEN + 'px';
      el.dataset.idx = i;
      // Add the pulsing grab-target marker at the bob end
      const grab = document.createElement('div');
      grab.className = 'pf-vine-grab';
      el.appendChild(grab);
      world.appendChild(el);
      h._el = el;
      // angle in radians, swings between roughly -0.7 and +0.7
      h._angle = 0.6;
      h._omega = 0;
    } else if (h.type === 'crocpool') {
      // The pool itself (a blue water rectangle behind crocs)
      const pool = document.createElement('div');
      pool.style.position = 'absolute';
      pool.style.background = 'linear-gradient(180deg, #4090c8 0%, #2060a0 100%)';
      pool.style.borderTop = '3px solid #1a4070';
      pool.style.width = h.w + 'px';
      pool.style.height = (LOGICAL_H * 0.20) + 'px';
      pool.style.borderRadius = '0 0 6px 6px';
      pool.dataset.idx = i;
      world.appendChild(pool);
      h._pool = pool;
      // 3 crocs spaced across the pool
      const crocs = [];
      const n = h.count || 3;
      const spacing = h.w / n;
      const phase = h.phase || 0;
      for (let k = 0; k < n; k++) {
        const crocEl = document.createElement('div');
        crocEl.className = 'pf-hazard';
        crocEl.innerHTML = crocSvg(false);
        crocEl.style.zIndex = 3;
        world.appendChild(crocEl);
        crocs.push({
          el: crocEl,
          cx: h.x + spacing * k + spacing / 2,
          // phase offset per croc so they don't all open at once
          phaseOffset: phase + k * 0.33,
          open: false,
        });
      }
      h._crocs = crocs;
    }
  });

  // Goal
  const goalEl = document.createElement('div');
  goalEl.className = 'pf-goal';
  goalEl.innerHTML = goalSvg();
  world.appendChild(goalEl);

  // Player
  const playerEl = document.createElement('div');
  playerEl.className = 'pf-player';
  playerEl.innerHTML = playerSvg();
  world.appendChild(playerEl);

  // =========================================================================
  // STATE
  // =========================================================================
  let state;
  function resetState() {
    state = {
      px: 80,          // player world x
      py: 0,           // player world y (+y up, 0 = ground)
      vx: RUN_SPEED,   // horizontal velocity
      vy: 0,           // vertical velocity
      grounded: true,
      dead: false,
      won: false,
      camX: 0,
      time: 0,
      runBob: 0,
      // Vine attachment
      vineIdx: null,   // index into hazards if grabbing a vine, else null
      // Per-vine cooldown timestamps — vines whose entry is > state.t can't
      // be grabbed yet. Used to prevent immediate re-grab right after release.
      vineCooldown: {},
      // For quicksand drag
      inQuicksand: false,
      // Set when the player has stepped off a cliff edge into a pit / open
      // water — once set, the player keeps falling (no ground snap-back)
      // until they hit the death depth.
      fallingDeath: null,
    };
    // Reset log positions
    hazards.forEach(h => {
      if (h.type === 'log') h._x = h.x;
      if (h.type === 'vine') { h._angle = 0.6; h._omega = 0; }
    });
  }
  resetState();

  // =========================================================================
  // Coordinate mapping: world -> screen
  // =========================================================================
  // The stage has logical size LOGICAL_W x LOGICAL_H (960 x 540). We use CSS
  // to actually display whatever size, but we use the stage's bounding rect
  // each frame to scale. To avoid recomputing for every element we set
  // transform with CSS pixels — we treat the stage as natively LOGICAL.
  //
  // Convert world-y (0=ground, +up) to screen-y (0=top, +down) in logical units:
  //   screen_y = (LOGICAL_H * 0.80) - wy   (ground baseline at 80% from top)
  const GROUND_SCREEN_Y = LOGICAL_H * 0.80;

  function worldToScreenX(wx) { return wx - state.camX; }
  function worldToScreenY(wy) { return GROUND_SCREEN_Y - wy; }

  // We render by setting transforms in logical px. The stage CSS sets the
  // real visible size; we just write logical px into transforms and let the
  // stage absorb it because we anchor everything inside .pf-world which
  // itself fills the stage. To keep things in-bounds we set explicit width
  // and height on the world to LOGICAL_W x LOGICAL_H and scale via CSS by
  // computing stage rect at layout time. We'll re-scale on resize.
  function applyStageScale() {
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0) return;
    const scale = rect.width / LOGICAL_W;
    world.style.width = LOGICAL_W + 'px';
    world.style.height = LOGICAL_H + 'px';
    world.style.transformOrigin = 'top left';
    world.style.transform = `scale(${scale})`;
  }
  applyStageScale();
  const onResize = () => applyStageScale();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize);
  }

  // =========================================================================
  // Collision helpers (all in world coords, +y up)
  // =========================================================================

  function playerAabb() {
    return {
      x: state.px - PLAYER_W / 2,
      y: state.py,                 // bottom of player
      w: PLAYER_W,
      h: PLAYER_H,
    };
  }

  function aabbOverlap(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  // Hazard hitbox in world coords (returns {x,y,w,h} or null)
  function hazardBox(h) {
    if (h.type === 'log') {
      return { x: h._x - 24, y: 0, w: 48, h: 40 };
    }
    if (h.type === 'scorpion') {
      return { x: h.x - 26, y: 0, w: 52, h: 32 };
    }
    if (h.type === 'snake') {
      return { x: h.x - 26, y: 0, w: 52, h: 42 };
    }
    if (h.type === 'quicksand') {
      return { x: h.x, y: 0, w: h.w, h: 20 };
    }
    // Pits / vines / crocs handled specially
    return null;
  }

  function isOverPit(px) {
    for (const h of hazards) {
      if (h.type === 'pit' && px >= h.x && px <= h.x + h.w) return h;
    }
    return null;
  }

  function isOverCrocPool(px) {
    for (const h of hazards) {
      if (h.type === 'crocpool' && px >= h.x && px <= h.x + h.w) return h;
    }
    return null;
  }

  // For crocpool: when grounded over the pool, the player should be on a
  // closed croc's head. Heads are at y ~ 40 world units. We treat being over
  // a closed mouth as "ground" at y=40; otherwise the player falls (dies).
  function crocHeadAt(pool, px) {
    for (const c of pool._crocs) {
      if (Math.abs(px - c.cx) < 32 && !c.open) return c;
    }
    return null;
  }

  // =========================================================================
  // Death + win
  // =========================================================================
  function die(reason) {
    if (state.dead || state.won) return;
    state.dead = true;
    sfx.buzz();
    // Death flash
    const flash = document.createElement('div');
    flash.className = 'pf-death-flash';
    stage.appendChild(flash);
    setTimeout(() => flash.remove(), 700);
    // Restart after a short beat
    setTimeout(() => {
      if (cancelled) return;
      resetState();
    }, 650);
  }

  function win() {
    if (state.won || state.dead) return;
    state.won = true;
    sfx.win();
    // Stars
    const rect = stage.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div');
      s.className = 'star-burst';
      s.textContent = '⭐';
      const angle = (Math.PI * 2 * i) / 14;
      const dist = 120 + Math.random() * 80;
      s.style.setProperty('--end', `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`);
      s.style.left = (rect.width / 2) + 'px';
      s.style.top = (rect.height / 2) + 'px';
      stage.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
    if (opts && opts.onComplete) opts.onComplete(levelIndex);
    setTimeout(showWinOverlay, 1200);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < PITFALL_LEVELS.length;
    overlay.innerHTML = `
      <div class="win-title">FIXED!</div>
      <div class="win-buttons">
        <button class="big-btn secondary" data-act="levels">Pick Job</button>
        ${hasNext ? '<button class="big-btn" data-act="next">Next ›</button>' : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act === 'next' && opts.onNext) opts.onNext(levelIndex + 1);
      else if (act === 'levels' && opts.onBack) opts.onBack();
    });
    container.appendChild(overlay);
  }

  // =========================================================================
  // Input — single tap anywhere on the stage = jump (or vine release)
  // =========================================================================
  function onTap(e) {
    if (state.dead || state.won) return;
    e.preventDefault();
    if (state.vineIdx !== null) {
      // Release the vine — convert swing momentum to player velocity and
      // launch them in a jump arc that always clears the pit ahead.
      const h = hazards[state.vineIdx];
      const releasedIdx = state.vineIdx;
      const bobX = h.x + Math.sin(h._angle) * VINE_LEN;
      const bobY = (h.y || 220) - Math.cos(h._angle) * VINE_LEN;
      // Tangent velocity: angular omega * VINE_LEN, perpendicular to the rope
      const tangentX =  Math.cos(h._angle) * h._omega * VINE_LEN;
      const tangentY =  Math.sin(h._angle) * h._omega * VINE_LEN;
      state.px = bobX;
      // Hanging position: head at bob, body below.
      state.py = bobY - PLAYER_H;
      // Strong forward boost + full jump impulse so the player always clears
      // pits regardless of which point in the swing they tap to release.
      state.vx = Math.max(280, RUN_SPEED + tangentX * 0.6);
      state.vy = Math.max(JUMP_VEL, -tangentY * 0.5 + 320);
      state.vineIdx = null;
      state.grounded = false;
      // Don't let the same vine immediately re-grab the player.
      state.vineCooldown[releasedIdx] = state.t + 0.6;
      sfx.snap();
      return;
    }
    if (state.grounded) {
      state.vy = JUMP_VEL;
      state.grounded = false;
      sfx.snap();
    }
  }
  stage.addEventListener('pointerdown', onTap);

  // =========================================================================
  // Game loop
  // =========================================================================

  let raf = 0;
  let lastT = 0;
  let cancelled = false;

  function step(dt) {
    if (state.dead || state.won) return;
    state.time += dt;

    // ---- Vine attachment mode ----
    if (state.vineIdx !== null) {
      const h = hazards[state.vineIdx];
      // Pendulum: angular acceleration = -(g/L) * sin(angle)
      const alpha = -(VINE_GRAV) * Math.sin(h._angle);
      h._omega += alpha * dt;
      h._omega *= Math.pow(VINE_DAMP, dt * 60);
      h._angle += h._omega * dt;
      // Player hangs FROM the bob — head at bob, body hanging below.
      // state.py is the player's bottom (feet), so subtract PLAYER_H to put
      // the top of the player at the bob.
      const bobX = h.x + Math.sin(h._angle) * VINE_LEN;
      const bobY = (h.y || 220) - Math.cos(h._angle) * VINE_LEN;
      state.px = bobX;
      state.py = bobY - PLAYER_H;
      // Camera follows player loosely
      const targetCam = Math.max(0, Math.min(level.width - LOGICAL_W, state.px - LOGICAL_W * 0.35));
      state.camX += (targetCam - state.camX) * Math.min(1, dt * 6);
      return;
    }

    // ---- Normal physics ----
    // Auto-run: vx steady; allow some preserved boost from vine release to decay
    if (state.vx > RUN_SPEED) {
      state.vx -= 120 * dt;
      if (state.vx < RUN_SPEED) state.vx = RUN_SPEED;
    } else {
      state.vx = RUN_SPEED;
    }

    state.px += state.vx * dt;

    // Apply gravity
    state.vy -= GRAVITY * dt;
    state.py += state.vy * dt;

    // Quicksand drag: if grounded over quicksand, pull down (visually) and
    // require an immediate jump to escape — but since we're auto-runner +
    // jump-only, ANY contact with quicksand kills you. (Brief is "jump over
    // or game falls in slowly".) We do a brief slow-pull animation by halving
    // vx for one frame and then dying.
    let onQuicksand = null;
    for (const h of hazards) {
      if (h.type !== 'quicksand') continue;
      if (state.py <= 4 && state.px >= h.x && state.px <= h.x + h.w) {
        onQuicksand = h;
      }
    }
    if (onQuicksand) {
      // Sinking: lower the ground level for this frame, slow horizontal vel,
      // then kill if fully submerged.
      state.vx *= 0.5;
      state.py -= QUICKSAND_PULL * dt;
      if (state.py < -PLAYER_H * 0.6) {
        die('quicksand');
        return;
      }
    }

    // ---- Ground / pit / crocpool handling ----
    let groundY = 0; // default ground at y=0
    const pit = isOverPit(state.px);
    const crocPool = isOverCrocPool(state.px);

    // ---- Trigger "falling into the pit" on the frame the player steps off
    // the edge. Stop their forward velocity so they drop straight down for a
    // clear visual, and keep them in that falling state until the death
    // depth is reached (no ground snap-back on subsequent frames).
    if (!state.fallingDeath) {
      if (pit && state.py <= 0) {
        state.fallingDeath = 'pit';
        state.vx = 0;
        state.vy = -20; // gentle initial drop so the fall is visible
      } else if (crocPool) {
        const headCroc = crocHeadAt(crocPool, state.px);
        if (!headCroc && state.py <= 0) {
          state.fallingDeath = 'water';
          state.vx = 0;
          state.vy = -20;
        }
      }
    }

    if (state.fallingDeath) {
      // Skip ground handling entirely — keep falling.
      groundY = -10000;
      // Die once the player has dropped ~half a pit depth below ground.
      if (state.py < -50) {
        die(state.fallingDeath);
        return;
      }
    } else if (pit) {
      // Above the pit (mid-jump) — no ground until past it
      groundY = -10000;
    } else if (crocPool) {
      const headCroc = crocHeadAt(crocPool, state.px);
      groundY = headCroc ? 40 : -10000;
    }

    if (!state.fallingDeath && state.py <= groundY) {
      state.py = groundY;
      state.vy = 0;
      state.grounded = true;
    } else if (!state.fallingDeath) {
      state.grounded = false;
    }

    // Safety net: falling well out of the world also dies.
    if (state.py < -200) {
      die('fall');
      return;
    }

    // ---- Vine attachment check ----
    // While airborne, if we overlap a vine bob position, grab it.
    if (!state.grounded) {
      for (let i = 0; i < hazards.length; i++) {
        const h = hazards[i];
        if (h.type !== 'vine') continue;
        // Skip vines in cooldown (just-released)
        if ((state.vineCooldown[i] || 0) > state.t) continue;
        const bobX = h.x + Math.sin(h._angle) * VINE_LEN;
        const bobY = (h.y || 220) - Math.cos(h._angle) * VINE_LEN;
        const dx = bobX - state.px;
        const dy = bobY - (state.py + PLAYER_H * 0.5);
        if (dx * dx + dy * dy < 80 * 80) {
          // Grab! Compute initial omega from player velocity tangent.
          state.vineIdx = i;
          // tangent direction at current angle
          const tx = Math.cos(h._angle);
          const ty = Math.sin(h._angle);
          // Project player velocity (vx, -vy because +y up in world but vy is up)
          const projected = (state.vx * tx + (-state.vy) * ty);
          h._omega = projected / VINE_LEN;
          sfx.pickup();
          return;
        }
      }
    }

    // ---- Hazard collisions ----
    const pBox = playerAabb();
    for (const h of hazards) {
      const box = hazardBox(h);
      if (box && aabbOverlap(pBox, box)) {
        if (h.type === 'quicksand') {
          // already handled above (slow sink)
          continue;
        }
        die(h.type);
        return;
      }
      // Log movement (independent of collision)
      if (h.type === 'log') {
        h._x -= h.speed * dt;
        h._rotation += h.speed * dt * 2;
        // Loop the log if it scrolls off behind player by a lot
        if (h._x < state.camX - 200) {
          h._x = state.camX + LOGICAL_W + 100;
        }
      }
    }

    // ---- Crocpool: animate mouths ----
    for (const h of hazards) {
      if (h.type !== 'crocpool') continue;
      for (const c of h._crocs) {
        const t = (state.time + c.phaseOffset * CROC_PERIOD) / CROC_PERIOD;
        const phase = t - Math.floor(t); // 0..1
        // Open during the second half of the cycle
        c.open = phase > 0.5 && phase < 0.95;
      }
    }

    // ---- Camera follow ----
    const targetCam = Math.max(0, Math.min(level.width - LOGICAL_W, state.px - LOGICAL_W * 0.35));
    state.camX += (targetCam - state.camX) * Math.min(1, dt * 6);

    // ---- Goal check ----
    if (state.px >= level.goal.x - 20) {
      win();
      return;
    }

    // ---- Run bob ----
    if (state.grounded) {
      state.runBob = Math.sin(state.time * 12) * 3;
    } else {
      state.runBob = 0;
    }
  }

  function render() {
    // Trunks
    elsByIdx.forEach(t => {
      if (t.kind !== 'trunk') return;
      const sx = worldToScreenX(t.wx);
      t.el.style.transform = `translate(${sx}px, ${t.wytop}px)`;
    });

    // Hazards
    hazards.forEach(h => {
      if (h.type === 'pit') {
        const sx = worldToScreenX(h.x);
        const sy = GROUND_SCREEN_Y; // top of ground
        h._el.style.transform = `translate(${sx}px, ${sy}px)`;
      } else if (h.type === 'log') {
        const sx = worldToScreenX(h._x) - 30;
        const sy = worldToScreenY(40);
        h._el.style.transform = `translate(${sx}px, ${sy}px) rotate(${h._rotation}deg)`;
      } else if (h.type === 'scorpion') {
        const sx = worldToScreenX(h.x) - 30;
        const sy = worldToScreenY(32);
        h._el.style.transform = `translate(${sx}px, ${sy}px)`;
      } else if (h.type === 'snake') {
        const sx = worldToScreenX(h.x) - 30;
        const sy = worldToScreenY(42);
        h._el.style.transform = `translate(${sx}px, ${sy}px)`;
      } else if (h.type === 'quicksand') {
        const sx = worldToScreenX(h.x);
        const sy = GROUND_SCREEN_Y - 4;
        h._el.style.transform = `translate(${sx}px, ${sy}px)`;
      } else if (h.type === 'vine') {
        const sx = worldToScreenX(h.x);
        const topY = worldToScreenY(h.y || 220) - 0;
        // Rotate around top of vine
        h._el.style.left = '0';
        h._el.style.top = '0';
        h._el.style.transform = `translate(${sx - 3}px, ${topY}px) rotate(${h._angle}rad)`;
      } else if (h.type === 'crocpool') {
        const sx = worldToScreenX(h.x);
        const sy = GROUND_SCREEN_Y;
        h._pool.style.transform = `translate(${sx}px, ${sy}px)`;
        for (const c of h._crocs) {
          const csx = worldToScreenX(c.cx) - 40;
          const csy = worldToScreenY(50);
          c.el.style.transform = `translate(${csx}px, ${csy}px)`;
          c.el.innerHTML = crocSvg(c.open);
        }
      }
    });

    // Goal
    const gsx = worldToScreenX(level.goal.x) - 40;
    const gsy = worldToScreenY(120);
    goalEl.style.transform = `translate(${gsx}px, ${gsy}px)`;

    // Player
    const psx = worldToScreenX(state.px) - PLAYER_W / 2;
    const psy = worldToScreenY(state.py + PLAYER_H) + state.runBob;
    playerEl.style.transform = `translate(${psx}px, ${psy}px)`;
  }

  function frame(t) {
    if (cancelled) return;
    if (!lastT) lastT = t;
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.05) dt = 0.05; // clamp big steps (tab-switch etc)
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // Back button — also cleans up the loop
  container.querySelector('[data-act="back"]').addEventListener('click', () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
    if (opts && opts.onBack) opts.onBack();
  });

  // Initial render so the first frame is correct
  render();
}
