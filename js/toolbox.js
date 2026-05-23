// Toolbox mechanic: drag the right tool from the toolbox tray onto a broken thing
// to fix it. Wrong tools bounce back and the broken thing wiggles. Some jobs need
// multiple tools applied in sequence.
//
// Visual language matches robot.js / pipes.js — light parts with dark outlines,
// bright accent colors on a dark navy background.

import { sfx } from './sound.js';

// ----- Tool definitions ------------------------------------------------------
// Each tool is an SVG drawn inside its own w x h viewBox. They appear in the
// toolbox tray as draggable items.
const TOOL_DEFS = {
  wrench: {
    w: 100, h: 100,
    svg: `
      <g transform="rotate(-35 50 50)">
        <rect x="44" y="28" width="12" height="50" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <path d="M30 12 Q30 32 50 32 Q70 32 70 12 L62 12 L62 22 Q50 26 38 22 L38 12 Z"
              fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <circle cx="50" cy="82" r="9" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      </g>
    `,
  },
  screwdriver: {
    w: 100, h: 100,
    svg: `
      <g transform="rotate(-30 50 50)">
        <rect x="40" y="14" width="20" height="38" rx="4" fill="#d33" stroke="#3a4756" stroke-width="3"/>
        <rect x="42" y="22" width="16" height="3" fill="#7a1a1a"/>
        <rect x="42" y="32" width="16" height="3" fill="#7a1a1a"/>
        <rect x="42" y="42" width="16" height="3" fill="#7a1a1a"/>
        <rect x="46" y="52" width="8" height="32" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="44" y="82" width="12" height="6" fill="#3a4756"/>
      </g>
    `,
  },
  hammer: {
    w: 100, h: 100,
    svg: `
      <g transform="rotate(-25 50 50)">
        <rect x="46" y="32" width="10" height="56" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="48" y="40" width="6" height="44" fill="#7a5328"/>
        <rect x="28" y="14" width="48" height="24" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="20" width="14" height="12" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      </g>
    `,
  },
  saw: {
    w: 110, h: 100,
    svg: `
      <g transform="rotate(-10 55 50)">
        <rect x="10" y="38" width="80" height="14" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <path d="M10 52 L18 60 L26 52 L34 60 L42 52 L50 60 L58 52 L66 60 L74 52 L82 60 L90 52 Z"
              fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <path d="M86 30 Q102 30 102 50 Q102 70 86 70 L86 60 Q92 60 92 50 Q92 40 86 40 Z"
              fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      </g>
    `,
  },
  pump: {
    w: 90, h: 110,
    svg: `
      <rect x="36" y="6" width="18" height="20" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="20" y="24" width="50" height="8" rx="2" fill="#3a4756"/>
      <rect x="32" y="32" width="26" height="56" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="36" y="40" width="18" height="3" fill="#3a4756"/>
      <rect x="36" y="50" width="18" height="3" fill="#3a4756"/>
      <rect x="36" y="60" width="18" height="3" fill="#3a4756"/>
      <rect x="18" y="88" width="54" height="14" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <path d="M70 60 Q86 60 86 80 L80 80 Q80 66 70 66 Z" fill="#3a4756"/>
    `,
  },
  paintbrush: {
    w: 100, h: 110,
    svg: `
      <g transform="rotate(-30 50 55)">
        <rect x="42" y="14" width="16" height="52" rx="3" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="38" y="60" width="24" height="14" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        <path d="M36 72 L64 72 L60 98 L40 98 Z" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
        <path d="M44 88 L46 102 M50 90 L50 104 M56 88 L54 102" stroke="#7a5a1f" stroke-width="2"/>
      </g>
    `,
  },
  drill: {
    w: 110, h: 100,
    svg: `
      <rect x="20" y="22" width="56" height="36" rx="6" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <rect x="32" y="58" width="24" height="28" rx="3" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <rect x="26" y="84" width="36" height="10" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="36" y="38" width="14" height="6" fill="#3a4756"/>
      <rect x="76" y="30" width="12" height="20" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <path d="M88 36 L102 38 L102 44 L88 46 Z" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <circle cx="90" cy="41" r="2" fill="#3a4756"/>
    `,
  },
  pliers: {
    w: 100, h: 110,
    svg: `
      <g transform="rotate(-15 50 55)">
        <path d="M36 6 L40 50 L34 96 L44 96 L48 60 L52 60 L56 96 L66 96 L60 50 L64 6 L56 6 L52 44 L48 44 L44 6 Z"
              fill="#d33" stroke="#3a4756" stroke-width="3"/>
        <circle cx="50" cy="50" r="6" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        <rect x="38" y="60" width="6" height="34" fill="#7a1a1a"/>
        <rect x="56" y="60" width="6" height="34" fill="#7a1a1a"/>
      </g>
    `,
  },
  glue: {
    w: 90, h: 110,
    svg: `
      <rect x="30" y="14" width="30" height="14" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <path d="M28 28 L62 28 L66 96 Q45 104 24 96 Z"
            fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <rect x="32" y="40" width="26" height="6" fill="#d33"/>
      <text x="45" y="68" text-anchor="middle" font-family="Arial" font-size="14" font-weight="900" fill="#3a4756">GLUE</text>
      <path d="M45 6 Q40 14 45 16 Q50 14 45 6 Z" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
    `,
  },
  scissors: {
    w: 100, h: 100,
    svg: `
      <g transform="rotate(-15 50 50)">
        <path d="M20 84 L60 40" stroke="#bbc4d0" stroke-width="6" stroke-linecap="round"/>
        <path d="M80 84 L40 40" stroke="#bbc4d0" stroke-width="6" stroke-linecap="round"/>
        <circle cx="22" cy="84" r="12" fill="none" stroke="#d33" stroke-width="6"/>
        <circle cx="78" cy="84" r="12" fill="none" stroke="#d33" stroke-width="6"/>
        <circle cx="50" cy="50" r="4" fill="#3a4756"/>
      </g>
    `,
  },
  tape: {
    w: 100, h: 100,
    svg: `
      <circle cx="50" cy="50" r="40" fill="#ffd966" stroke="#3a4756" stroke-width="4"/>
      <circle cx="50" cy="50" r="20" fill="#1a2230" stroke="#3a4756" stroke-width="3"/>
      <circle cx="50" cy="50" r="12" fill="#2a3a50"/>
      <path d="M50 10 Q65 30 50 50" stroke="#a07040" stroke-width="2" fill="none" opacity="0.5"/>
      <path d="M86 56 L100 60 L100 70 L84 66 Z" fill="#fff8d0" stroke="#3a4756" stroke-width="2"/>
    `,
  },
  bulb: {
    w: 90, h: 110,
    svg: `
      <path d="M30 50 Q30 14 45 14 Q60 14 60 50 Q60 64 52 70 L52 80 L38 80 L38 70 Q30 64 30 50 Z"
            fill="#fff58a" stroke="#3a4756" stroke-width="3"/>
      <path d="M40 30 Q44 40 40 50 M50 30 Q46 40 50 50" stroke="#ff8855" stroke-width="2" fill="none"/>
      <rect x="36" y="80" width="18" height="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <rect x="38" y="86" width="14" height="6" fill="#888"/>
      <rect x="38" y="92" width="14" height="4" fill="#bbc4d0"/>
      <rect x="40" y="96" width="10" height="4" fill="#888"/>
    `,
  },
};

const TOOL_NAMES = Object.keys(TOOL_DEFS);

// ----- Broken-thing scene SVGs ----------------------------------------------
// Each broken thing is identified by a `kind` matching the tool that fixes it
// (single-step). Multi-step jobs use the kind of the first remaining tool but
// the visual transitions through stages as steps complete.
//
// Each renderer returns { broken, fixed } SVG fragments drawn inside a 120x120
// viewBox. The fragments are swapped when the corresponding tool is applied.
const JOB_DEFS = {
  bolt: {
    label: 'bolt',
    tool: 'wrench',
    broken: `
      <rect x="10" y="60" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="10" y1="74" x2="110" y2="74" stroke="#7a5328" stroke-width="2"/>
      <line x1="10" y1="86" x2="110" y2="86" stroke="#7a5328" stroke-width="2"/>
      <polygon points="60,28 78,38 78,58 60,68 42,58 42,38"
               fill="#bbc4d0" stroke="#3a4756" stroke-width="3" transform="rotate(20 60 48)"/>
      <circle cx="60" cy="48" r="5" fill="#3a4756"/>
    `,
    fixed: `
      <rect x="10" y="60" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="10" y1="74" x2="110" y2="74" stroke="#7a5328" stroke-width="2"/>
      <line x1="10" y1="86" x2="110" y2="86" stroke="#7a5328" stroke-width="2"/>
      <polygon points="60,28 78,38 78,58 60,68 42,58 42,38"
               fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
      <circle cx="60" cy="48" r="5" fill="#1a2230"/>
    `,
  },
  screw: {
    label: 'screw',
    tool: 'screwdriver',
    broken: `
      <rect x="10" y="60" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="10" y1="74" x2="110" y2="74" stroke="#7a5328" stroke-width="2"/>
      <circle cx="60" cy="58" r="14" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="58" y="20" width="4" height="44" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <line x1="50" y1="58" x2="70" y2="58" stroke="#3a4756" stroke-width="3"/>
    `,
    fixed: `
      <rect x="10" y="60" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="10" y1="74" x2="110" y2="74" stroke="#7a5328" stroke-width="2"/>
      <circle cx="60" cy="66" r="10" fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
      <line x1="54" y1="66" x2="66" y2="66" stroke="#1a2230" stroke-width="3"/>
    `,
  },
  nail: {
    label: 'nail',
    tool: 'hammer',
    broken: `
      <rect x="10" y="70" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="10" y1="84" x2="110" y2="84" stroke="#7a5328" stroke-width="2"/>
      <rect x="56" y="20" width="8" height="56" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <ellipse cx="60" cy="22" rx="14" ry="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
    `,
    fixed: `
      <rect x="10" y="70" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="10" y1="84" x2="110" y2="84" stroke="#7a5328" stroke-width="2"/>
      <ellipse cx="60" cy="70" rx="10" ry="4" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
    `,
  },
  branch: {
    label: 'branch',
    tool: 'saw',
    broken: `
      <rect x="50" y="40" width="20" height="80" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
      <path d="M50 50 Q20 40 10 20 L20 36 Q14 22 14 14 L26 28 Q22 14 30 8 L34 24 Q38 14 46 14 L42 30 Z"
            fill="#3e9c3e" stroke="#1a4a1a" stroke-width="3"/>
      <path d="M70 50 Q100 38 110 18 L98 32 Q108 20 106 12 L94 28 Z"
            fill="#3e9c3e" stroke="#1a4a1a" stroke-width="3"/>
    `,
    fixed: `
      <rect x="50" y="80" width="20" height="40" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
      <ellipse cx="60" cy="80" rx="10" ry="4" fill="#a07040" stroke="#3a4756" stroke-width="2"/>
      <circle cx="60" cy="80" r="5" fill="#7a5328"/>
      <circle cx="60" cy="80" r="2" fill="#3a4756"/>
    `,
  },
  tire: {
    label: 'flat tire',
    tool: 'pump',
    broken: `
      <ellipse cx="60" cy="80" rx="48" ry="16" fill="#1a2230" stroke="#000" stroke-width="3"/>
      <ellipse cx="60" cy="80" rx="28" ry="8" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="60" cy="80" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <path d="M30 90 L20 100 M90 90 L100 100" stroke="#3a4756" stroke-width="2"/>
    `,
    fixed: `
      <circle cx="60" cy="62" r="42" fill="#1a2230" stroke="#000" stroke-width="3"/>
      <circle cx="60" cy="62" r="22" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="60" cy="62" r="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <path d="M60 24 L60 38 M60 86 L60 100 M22 62 L36 62 M84 62 L98 62"
            stroke="#bbc4d0" stroke-width="2"/>
    `,
  },
  wall: {
    label: 'wall',
    tool: 'paintbrush',
    broken: `
      <rect x="6" y="10" width="108" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <line x1="6" y1="40" x2="114" y2="40" stroke="#888" stroke-width="2"/>
      <line x1="6" y1="80" x2="114" y2="80" stroke="#888" stroke-width="2"/>
      <line x1="40" y1="10" x2="40" y2="40" stroke="#888" stroke-width="2"/>
      <line x1="80" y1="40" x2="80" y2="80" stroke="#888" stroke-width="2"/>
      <line x1="50" y1="80" x2="50" y2="110" stroke="#888" stroke-width="2"/>
    `,
    fixed: `
      <rect x="6" y="10" width="108" height="100" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <line x1="6" y1="40" x2="114" y2="40" stroke="#c19a30" stroke-width="2"/>
      <line x1="6" y1="80" x2="114" y2="80" stroke="#c19a30" stroke-width="2"/>
      <line x1="40" y1="10" x2="40" y2="40" stroke="#c19a30" stroke-width="2"/>
      <line x1="80" y1="40" x2="80" y2="80" stroke="#c19a30" stroke-width="2"/>
      <line x1="50" y1="80" x2="50" y2="110" stroke="#c19a30" stroke-width="2"/>
    `,
  },
  hole: {
    label: 'plank',
    tool: 'drill',
    broken: `
      <rect x="6" y="30" width="108" height="60" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="6" y1="50" x2="114" y2="50" stroke="#7a5328" stroke-width="2"/>
      <line x1="6" y1="70" x2="114" y2="70" stroke="#7a5328" stroke-width="2"/>
      <circle cx="60" cy="60" r="6" fill="none" stroke="#3a4756" stroke-width="2" stroke-dasharray="3 2"/>
    `,
    fixed: `
      <rect x="6" y="30" width="108" height="60" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="6" y1="50" x2="114" y2="50" stroke="#7a5328" stroke-width="2"/>
      <line x1="6" y1="70" x2="114" y2="70" stroke="#7a5328" stroke-width="2"/>
      <circle cx="60" cy="60" r="7" fill="#1a2230" stroke="#3a4756" stroke-width="2"/>
      <circle cx="60" cy="60" r="3" fill="#000"/>
    `,
  },
  stuckNail: {
    label: 'stuck nail',
    tool: 'pliers',
    broken: `
      <rect x="6" y="60" width="108" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="6" y1="78" x2="114" y2="78" stroke="#7a5328" stroke-width="2"/>
      <rect x="56" y="34" width="8" height="34" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(15 60 60)"/>
      <ellipse cx="56" cy="38" rx="10" ry="4" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(15 60 60)"/>
    `,
    fixed: `
      <rect x="6" y="60" width="108" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      <line x1="6" y1="78" x2="114" y2="78" stroke="#7a5328" stroke-width="2"/>
      <circle cx="60" cy="74" r="3" fill="#3a4756"/>
    `,
  },
  vase: {
    label: 'broken vase',
    tool: 'glue',
    broken: `
      <path d="M30 40 L40 30 L52 38 L46 60 L34 70 Z" fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
      <path d="M58 30 L78 28 L72 56 L60 50 Z" fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
      <path d="M50 78 L80 82 L90 100 L60 104 Z" fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
      <path d="M16 86 L36 80 L40 100 L20 106 Z" fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
    `,
    fixed: `
      <path d="M34 30 Q34 20 60 20 Q86 20 86 30 L80 100 Q60 110 40 100 Z"
            fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
      <ellipse cx="60" cy="30" rx="26" ry="6" fill="#1f5d99"/>
      <path d="M44 40 Q42 70 50 95 M76 40 Q78 70 70 95"
            stroke="#1f5d99" stroke-width="2" fill="none" opacity="0.5"/>
    `,
  },
  paper: {
    label: 'paper',
    tool: 'scissors',
    broken: `
      <rect x="20" y="14" width="80" height="92" fill="#fff8d0" stroke="#3a4756" stroke-width="3"/>
      <line x1="28" y1="30" x2="92" y2="30" stroke="#888" stroke-width="2"/>
      <line x1="28" y1="44" x2="92" y2="44" stroke="#888" stroke-width="2"/>
      <line x1="28" y1="58" x2="74" y2="58" stroke="#888" stroke-width="2"/>
      <line x1="28" y1="72" x2="92" y2="72" stroke="#888" stroke-width="2"/>
      <line x1="28" y1="86" x2="80" y2="86" stroke="#888" stroke-width="2"/>
      <path d="M20 60 L100 60" stroke="#d33" stroke-width="2" stroke-dasharray="4 3"/>
    `,
    fixed: `
      <rect x="20" y="14" width="80" height="40" fill="#fff8d0" stroke="#3a4756" stroke-width="3"/>
      <line x1="28" y1="30" x2="92" y2="30" stroke="#888" stroke-width="2"/>
      <line x1="28" y1="44" x2="92" y2="44" stroke="#888" stroke-width="2"/>
      <rect x="20" y="68" width="80" height="38" fill="#fff8d0" stroke="#3a4756" stroke-width="3"/>
      <line x1="28" y1="82" x2="92" y2="82" stroke="#888" stroke-width="2"/>
      <line x1="28" y1="96" x2="80" y2="96" stroke="#888" stroke-width="2"/>
    `,
  },
  poster: {
    label: 'ripped poster',
    tool: 'tape',
    broken: `
      <path d="M10 14 L66 14 L58 62 L66 110 L10 110 Z" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <path d="M66 14 L110 14 L110 110 L66 110 L60 62 Z" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <circle cx="36" cy="50" r="8" fill="#d33"/>
      <circle cx="88" cy="50" r="8" fill="#3aa3ff"/>
      <rect x="20" y="80" width="80" height="6" fill="#3a4756"/>
    `,
    fixed: `
      <rect x="10" y="14" width="100" height="96" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
      <circle cx="36" cy="50" r="8" fill="#d33"/>
      <circle cx="88" cy="50" r="8" fill="#3aa3ff"/>
      <rect x="20" y="80" width="80" height="6" fill="#3a4756"/>
      <rect x="56" y="20" width="14" height="84" fill="#fff8d0" opacity="0.8" stroke="#888" stroke-width="1"/>
    `,
  },
  lamp: {
    label: 'dead lamp',
    tool: 'bulb',
    broken: `
      <path d="M30 22 L90 22 L80 60 L40 60 Z" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="56" y="60" width="8" height="40" fill="#3a4756"/>
      <rect x="36" y="100" width="48" height="10" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="60" cy="50" r="8" fill="#1a2230" stroke="#000" stroke-width="2"/>
    `,
    fixed: `
      <path d="M30 22 L90 22 L80 60 L40 60 Z" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="56" y="60" width="8" height="40" fill="#3a4756"/>
      <rect x="36" y="100" width="48" height="10" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="60" cy="50" r="12" fill="#fff58a" stroke="#7a5a1f" stroke-width="2"
              filter="url(#glow)"/>
      <circle cx="60" cy="50" r="20" fill="#ffd966" opacity="0.3"/>
    `,
  },
  // ===== Multi-step jobs =====================================================
  // Stage SVGs are stored under stages[] indexed by step number (0 = initial,
  // length = final). Multi-step jobs use `tools: [...]` and `stages: [svg...]`.
  loosePlank: {
    label: 'loose plank',
    tools: ['hammer', 'paintbrush'],
    stages: [
      // 0: nail sticking up out of plank
      `
        <rect x="10" y="60" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <line x1="10" y1="78" x2="110" y2="78" stroke="#7a5328" stroke-width="2"/>
        <rect x="56" y="20" width="8" height="48" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <ellipse cx="60" cy="22" rx="14" ry="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      `,
      // 1: nail hammered, plank looks raw
      `
        <rect x="10" y="60" width="100" height="40" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <line x1="10" y1="78" x2="110" y2="78" stroke="#7a5328" stroke-width="2"/>
        <ellipse cx="60" cy="60" rx="10" ry="4" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      `,
      // 2: painted finish
      `
        <rect x="10" y="60" width="100" height="40" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
        <line x1="10" y1="78" x2="110" y2="78" stroke="#c19a30" stroke-width="2"/>
        <ellipse cx="60" cy="60" rx="10" ry="4" fill="#fff58a" stroke="#c19a30" stroke-width="2"/>
      `,
    ],
  },
  brokenChair: {
    label: 'broken chair',
    tools: ['glue', 'screwdriver'],
    stages: [
      // 0: pieces apart
      `
        <rect x="10" y="60" width="40" height="14" fill="#a07040" stroke="#3a4756" stroke-width="3" transform="rotate(-10 30 67)"/>
        <rect x="70" y="50" width="40" height="14" fill="#a07040" stroke="#3a4756" stroke-width="3" transform="rotate(20 90 57)"/>
        <rect x="20" y="84" width="14" height="30" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="86" y="88" width="14" height="30" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
      `,
      // 1: assembled, screw not in
      `
        <rect x="20" y="20" width="14" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="86" y="20" width="14" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="14" y="64" width="92" height="14" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="78" width="14" height="34" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="86" y="78" width="14" height="34" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <circle cx="26" cy="72" r="2" fill="#3a4756"/>
        <circle cx="94" cy="72" r="2" fill="#3a4756"/>
      `,
      // 2: with shiny screws
      `
        <rect x="20" y="20" width="14" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="86" y="20" width="14" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="14" y="64" width="92" height="14" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="78" width="14" height="34" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="86" y="78" width="14" height="34" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <circle cx="26" cy="72" r="4" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <line x1="23" y1="72" x2="29" y2="72" stroke="#1a2230" stroke-width="2"/>
        <circle cx="94" cy="72" r="4" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <line x1="91" y1="72" x2="97" y2="72" stroke="#1a2230" stroke-width="2"/>
      `,
    ],
  },
  crackedWall: {
    label: 'cracked wall',
    tools: ['drill', 'glue', 'paintbrush'],
    stages: [
      // 0: cracked
      `
        <rect x="6" y="10" width="108" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <path d="M40 14 L46 40 L36 60 L50 80 L40 108"
              stroke="#3a4756" stroke-width="3" fill="none"/>
        <path d="M70 14 L66 32 L78 50 L70 70 L80 100"
              stroke="#3a4756" stroke-width="3" fill="none"/>
      `,
      // 1: drilled holes along the crack
      `
        <rect x="6" y="10" width="108" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <circle cx="42" cy="30" r="4" fill="#1a2230"/>
        <circle cx="40" cy="60" r="4" fill="#1a2230"/>
        <circle cx="46" cy="92" r="4" fill="#1a2230"/>
        <circle cx="70" cy="30" r="4" fill="#1a2230"/>
        <circle cx="74" cy="60" r="4" fill="#1a2230"/>
        <circle cx="74" cy="92" r="4" fill="#1a2230"/>
      `,
      // 2: holes filled
      `
        <rect x="6" y="10" width="108" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <circle cx="42" cy="30" r="4" fill="#fff58a"/>
        <circle cx="40" cy="60" r="4" fill="#fff58a"/>
        <circle cx="46" cy="92" r="4" fill="#fff58a"/>
        <circle cx="70" cy="30" r="4" fill="#fff58a"/>
        <circle cx="74" cy="60" r="4" fill="#fff58a"/>
        <circle cx="74" cy="92" r="4" fill="#fff58a"/>
      `,
      // 3: painted smooth
      `
        <rect x="6" y="10" width="108" height="100" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
        <line x1="6" y1="40" x2="114" y2="40" stroke="#c19a30" stroke-width="2"/>
        <line x1="6" y1="80" x2="114" y2="80" stroke="#c19a30" stroke-width="2"/>
      `,
    ],
  },
  sawAndSand: {
    label: 'rough branch',
    tools: ['saw', 'paintbrush'],
    stages: [
      // 0: long branch with leaves
      `
        <rect x="50" y="20" width="20" height="100" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <path d="M50 30 Q24 28 14 12 L22 26 Q16 14 18 6 L28 22 Z"
              fill="#3e9c3e" stroke="#1a4a1a" stroke-width="2"/>
        <path d="M70 38 Q98 30 106 14 L96 26 Q104 14 102 6 L92 22 Z"
              fill="#3e9c3e" stroke="#1a4a1a" stroke-width="2"/>
      `,
      // 1: sawn flat top
      `
        <rect x="50" y="60" width="20" height="60" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <ellipse cx="60" cy="60" rx="10" ry="3" fill="#a07040" stroke="#3a4756" stroke-width="2"/>
        <line x1="50" y1="70" x2="70" y2="70" stroke="#5a3a1a" stroke-width="1"/>
        <line x1="52" y1="80" x2="68" y2="80" stroke="#5a3a1a" stroke-width="1"/>
      `,
      // 2: painted/varnished
      `
        <rect x="50" y="60" width="20" height="60" fill="#ffd966" stroke="#3a4756" stroke-width="3"/>
        <ellipse cx="60" cy="60" rx="10" ry="3" fill="#fff58a" stroke="#c19a30" stroke-width="2"/>
      `,
    ],
  },
  loosePipe: {
    label: 'loose pipe',
    tools: ['wrench', 'tape'],
    stages: [
      // 0: pipe with leaking bolt + drip
      `
        <rect x="10" y="50" width="100" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="50" y="44" width="20" height="32" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        <polygon points="60,32 72,40 72,52 60,60 48,52 48,40"
                 fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(15 60 46)"/>
        <circle cx="60" cy="86" r="4" fill="#3aa3ff"/>
        <circle cx="48" cy="92" r="3" fill="#3aa3ff"/>
      `,
      // 1: bolt tightened, still a bit damp
      `
        <rect x="10" y="50" width="100" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="50" y="44" width="20" height="32" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        <polygon points="60,32 72,40 72,52 60,60 48,52 48,40"
                 fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <circle cx="60" cy="84" r="3" fill="#3aa3ff" opacity="0.5"/>
      `,
      // 2: taped — fully fixed
      `
        <rect x="10" y="50" width="100" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="50" y="44" width="20" height="32" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        <polygon points="60,32 72,40 72,52 60,60 48,52 48,40"
                 fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="44" y="44" width="32" height="10" fill="#ffd966" stroke="#c19a30" stroke-width="2"/>
        <rect x="44" y="62" width="32" height="10" fill="#ffd966" stroke="#c19a30" stroke-width="2"/>
      `,
    ],
  },
  // ===== Single-step additions =================================================
  leakyFaucet: {
    label: 'leaky faucet',
    tool: 'wrench',
    broken: `
      <rect x="20" y="74" width="80" height="14" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="52" y="30" width="16" height="48" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <circle cx="60" cy="26" r="10" fill="#d33" stroke="#7a1a1a" stroke-width="2"/>
      <line x1="50" y1="26" x2="70" y2="26" stroke="#7a1a1a" stroke-width="2"/>
      <line x1="60" y1="16" x2="60" y2="36" stroke="#7a1a1a" stroke-width="2"/>
      <circle cx="60" cy="98" r="5" fill="#3aa3ff"/>
      <circle cx="50" cy="106" r="4" fill="#3aa3ff"/>
      <circle cx="70" cy="104" r="3" fill="#3aa3ff"/>
    `,
    fixed: `
      <rect x="20" y="74" width="80" height="14" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="52" y="30" width="16" height="48" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <circle cx="60" cy="26" r="10" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
      <line x1="50" y1="26" x2="70" y2="26" stroke="#1f5d99" stroke-width="2"/>
      <line x1="60" y1="16" x2="60" y2="36" stroke="#1f5d99" stroke-width="2"/>
    `,
  },
  // ===== Multi-step additions ==================================================
  looseTile: {
    label: 'loose tile',
    tools: ['hammer', 'glue', 'paintbrush'],
    stages: [
      // 0: tile popped up, askew
      `
        <rect x="6" y="80" width="108" height="30" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="40" width="40" height="40" fill="#bbc4d0" stroke="#3a4756" stroke-width="3" transform="rotate(-12 40 60)"/>
        <rect x="64" y="80" width="40" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      `,
      // 1: hammered flat
      `
        <rect x="6" y="80" width="108" height="30" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="80" width="40" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="64" y="80" width="40" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <line x1="60" y1="80" x2="60" y2="100" stroke="#3a4756" stroke-width="2" stroke-dasharray="3 2"/>
      `,
      // 2: glued
      `
        <rect x="6" y="80" width="108" height="30" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="80" width="40" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="64" y="80" width="40" height="20" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="56" y="78" width="8" height="24" fill="#fff58a" stroke="#c19a30" stroke-width="2"/>
      `,
      // 3: painted
      `
        <rect x="6" y="80" width="108" height="30" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="20" y="80" width="40" height="20" fill="#ffd966" stroke="#c19a30" stroke-width="3"/>
        <rect x="64" y="80" width="40" height="20" fill="#ffd966" stroke="#c19a30" stroke-width="3"/>
        <line x1="60" y1="80" x2="60" y2="100" stroke="#c19a30" stroke-width="2"/>
      `,
    ],
  },
  brokenRadio: {
    label: 'broken radio',
    tools: ['screwdriver', 'wrench', 'bulb'],
    stages: [
      // 0: radio with loose panel
      `
        <rect x="14" y="30" width="92" height="70" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <rect x="22" y="40" width="50" height="30" fill="#1a2230" stroke="#000" stroke-width="2" transform="rotate(-8 47 55)"/>
        <circle cx="86" cy="50" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <circle cx="86" cy="74" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <rect x="28" y="78" width="40" height="16" fill="#1a2230" stroke="#000" stroke-width="2"/>
      `,
      // 1: panel screwed on
      `
        <rect x="14" y="30" width="92" height="70" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <rect x="22" y="40" width="50" height="30" fill="#1a2230" stroke="#000" stroke-width="2"/>
        <circle cx="86" cy="50" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <circle cx="86" cy="74" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <rect x="28" y="78" width="40" height="16" fill="#1a2230" stroke="#000" stroke-width="2"/>
        <circle cx="26" cy="44" r="2" fill="#bbc4d0"/>
        <circle cx="68" cy="44" r="2" fill="#bbc4d0"/>
        <circle cx="26" cy="66" r="2" fill="#bbc4d0"/>
        <circle cx="68" cy="66" r="2" fill="#bbc4d0"/>
      `,
      // 2: antenna bolt tight
      `
        <rect x="14" y="30" width="92" height="70" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <rect x="22" y="40" width="50" height="30" fill="#1a2230" stroke="#000" stroke-width="2"/>
        <circle cx="86" cy="50" r="6" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <circle cx="86" cy="74" r="6" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="28" y="78" width="40" height="16" fill="#1a2230" stroke="#000" stroke-width="2"/>
        <line x1="60" y1="30" x2="78" y2="10" stroke="#bbc4d0" stroke-width="3"/>
        <circle cx="60" cy="30" r="4" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      `,
      // 3: indicator light on
      `
        <rect x="14" y="30" width="92" height="70" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <rect x="22" y="40" width="50" height="30" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <circle cx="86" cy="50" r="6" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <circle cx="86" cy="74" r="6" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="28" y="78" width="40" height="16" fill="#1a2230" stroke="#000" stroke-width="2"/>
        <line x1="60" y1="30" x2="78" y2="10" stroke="#bbc4d0" stroke-width="3"/>
        <circle cx="60" cy="30" r="4" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <circle cx="96" cy="38" r="5" fill="#fff58a" stroke="#c19a30" stroke-width="2"/>
        <circle cx="96" cy="38" r="9" fill="#ffd966" opacity="0.35"/>
      `,
    ],
  },
  rustyBike: {
    label: 'rusty bike',
    tools: ['wrench', 'paintbrush', 'pump'],
    stages: [
      // 0: rusty, flat tire, loose bolt
      `
        <circle cx="32" cy="80" r="20" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <ellipse cx="88" cy="86" rx="22" ry="10" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <line x1="32" y1="80" x2="70" y2="40" stroke="#7a5328" stroke-width="4"/>
        <line x1="88" y1="80" x2="70" y2="40" stroke="#7a5328" stroke-width="4"/>
        <line x1="32" y1="80" x2="88" y2="80" stroke="#7a5328" stroke-width="4"/>
        <polygon points="70,30 80,36 80,46 70,52 60,46 60,36" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <rect x="60" y="20" width="20" height="6" fill="#7a5328"/>
      `,
      // 1: bolt tightened
      `
        <circle cx="32" cy="80" r="20" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <ellipse cx="88" cy="86" rx="22" ry="10" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <line x1="32" y1="80" x2="70" y2="40" stroke="#7a5328" stroke-width="4"/>
        <line x1="88" y1="80" x2="70" y2="40" stroke="#7a5328" stroke-width="4"/>
        <line x1="32" y1="80" x2="88" y2="80" stroke="#7a5328" stroke-width="4"/>
        <polygon points="70,30 80,36 80,46 70,52 60,46 60,36" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="60" y="20" width="20" height="6" fill="#7a5328"/>
      `,
      // 2: painted bright
      `
        <circle cx="32" cy="80" r="20" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <ellipse cx="88" cy="86" rx="22" ry="10" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <line x1="32" y1="80" x2="70" y2="40" stroke="#d33" stroke-width="4"/>
        <line x1="88" y1="80" x2="70" y2="40" stroke="#d33" stroke-width="4"/>
        <line x1="32" y1="80" x2="88" y2="80" stroke="#d33" stroke-width="4"/>
        <polygon points="70,30 80,36 80,46 70,52 60,46 60,36" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="60" y="20" width="20" height="6" fill="#d33"/>
      `,
      // 3: tire pumped
      `
        <circle cx="32" cy="80" r="20" fill="#1a2230" stroke="#000" stroke-width="3"/>
        <circle cx="32" cy="80" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <circle cx="88" cy="80" r="20" fill="#1a2230" stroke="#000" stroke-width="3"/>
        <circle cx="88" cy="80" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <line x1="32" y1="80" x2="70" y2="40" stroke="#d33" stroke-width="4"/>
        <line x1="88" y1="80" x2="70" y2="40" stroke="#d33" stroke-width="4"/>
        <line x1="32" y1="80" x2="88" y2="80" stroke="#d33" stroke-width="4"/>
        <polygon points="70,30 80,36 80,46 70,52 60,46 60,36" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="60" y="20" width="20" height="6" fill="#d33"/>
      `,
    ],
  },
  cloggedDrain: {
    label: 'clogged drain',
    tools: ['pliers', 'pump'],
    stages: [
      // 0: drain with junk clog
      `
        <rect x="6" y="60" width="108" height="50" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <circle cx="60" cy="80" r="22" fill="#1a2230" stroke="#000" stroke-width="3"/>
        <path d="M40 76 Q50 60 60 74 Q70 60 80 76 Q70 90 60 80 Q50 90 40 76 Z"
              fill="#7a5328" stroke="#3a4756" stroke-width="2"/>
        <circle cx="48" cy="72" r="3" fill="#3e9c3e"/>
        <circle cx="72" cy="78" r="3" fill="#3e9c3e"/>
      `,
      // 1: clog removed by pliers
      `
        <rect x="6" y="60" width="108" height="50" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <circle cx="60" cy="80" r="22" fill="#1a2230" stroke="#000" stroke-width="3"/>
        <circle cx="60" cy="80" r="14" fill="#2a3a50" stroke="#1a2230" stroke-width="2"/>
        <circle cx="56" cy="86" r="2" fill="#3aa3ff" opacity="0.6"/>
      `,
      // 2: pumped clean and clear
      `
        <rect x="6" y="60" width="108" height="50" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
        <circle cx="60" cy="80" r="22" fill="#3aa3ff" stroke="#1f5d99" stroke-width="3"/>
        <circle cx="60" cy="80" r="14" fill="#7ec0ff" stroke="#1f5d99" stroke-width="2"/>
        <path d="M50 78 Q60 72 70 78 M50 86 Q60 80 70 86" stroke="#fff" stroke-width="2" fill="none"/>
      `,
    ],
  },
  brokenWindow: {
    label: 'broken window',
    tools: ['scissors', 'tape', 'glue'],
    stages: [
      // 0: shattered window
      `
        <rect x="10" y="10" width="100" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="16" y="16" width="88" height="88" fill="#7ec0ff" stroke="#1f5d99" stroke-width="2"/>
        <path d="M16 16 L60 60 L104 16 M16 104 L60 60 L104 104 M16 60 L104 60 M60 16 L60 104"
              stroke="#1f5d99" stroke-width="2" fill="none"/>
        <path d="M40 20 L48 50 L36 80" stroke="#fff" stroke-width="2" fill="none"/>
      `,
      // 1: cut to fit (scissors)
      `
        <rect x="10" y="10" width="100" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="16" y="16" width="88" height="88" fill="#7ec0ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="40" y="40" width="40" height="40" fill="#fff8d0" stroke="#3a4756" stroke-width="2" stroke-dasharray="4 2"/>
      `,
      // 2: taped
      `
        <rect x="10" y="10" width="100" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="16" y="16" width="88" height="88" fill="#7ec0ff" stroke="#1f5d99" stroke-width="2"/>
        <rect x="40" y="40" width="40" height="40" fill="#fff8d0" stroke="#3a4756" stroke-width="2"/>
        <rect x="34" y="56" width="52" height="8" fill="#ffd966" stroke="#c19a30" stroke-width="2"/>
        <rect x="56" y="34" width="8" height="52" fill="#ffd966" stroke="#c19a30" stroke-width="2"/>
      `,
      // 3: glued (sealed clean edge)
      `
        <rect x="10" y="10" width="100" height="100" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
        <rect x="16" y="16" width="88" height="88" fill="#7ec0ff" stroke="#1f5d99" stroke-width="2"/>
        <path d="M30 30 Q60 24 90 30 Q96 60 90 90 Q60 96 30 90 Q24 60 30 30 Z"
              fill="#aedaff" stroke="#1f5d99" stroke-width="2"/>
        <path d="M36 38 L50 32" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      `,
    ],
  },
  wobblyTable: {
    label: 'wobbly table',
    tools: ['screwdriver', 'glue', 'hammer'],
    stages: [
      // 0: leg falling off
      `
        <rect x="10" y="40" width="100" height="12" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="18" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="92" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="50" y="60" width="10" height="44" fill="#a07040" stroke="#3a4756" stroke-width="3" transform="rotate(25 55 82)"/>
      `,
      // 1: leg screwed in place
      `
        <rect x="10" y="40" width="100" height="12" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="18" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="92" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="55" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <circle cx="60" cy="46" r="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="1"/>
      `,
      // 2: joints glued
      `
        <rect x="10" y="40" width="100" height="12" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="18" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="92" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="55" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <circle cx="23" cy="52" r="3" fill="#fff58a"/>
        <circle cx="60" cy="52" r="3" fill="#fff58a"/>
        <circle cx="97" cy="52" r="3" fill="#fff58a"/>
      `,
      // 3: hammered tight & solid
      `
        <rect x="10" y="38" width="100" height="14" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <line x1="10" y1="44" x2="110" y2="44" stroke="#7a5328" stroke-width="2"/>
        <rect x="18" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="92" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <rect x="55" y="52" width="10" height="50" fill="#a07040" stroke="#3a4756" stroke-width="3"/>
        <ellipse cx="23" cy="52" rx="6" ry="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="1"/>
        <ellipse cx="60" cy="52" rx="6" ry="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="1"/>
        <ellipse cx="97" cy="52" rx="6" ry="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="1"/>
      `,
    ],
  },
  oldFence: {
    label: 'old fence',
    tools: ['saw', 'hammer', 'paintbrush'],
    stages: [
      // 0: overgrown, broken
      `
        <rect x="10" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="34" y="50" width="14" height="60" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="58" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="82" y="40" width="14" height="70" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <path d="M40 40 Q34 20 26 30 L32 36 Q26 26 30 22 L36 32 Z"
              fill="#3e9c3e" stroke="#1a4a1a" stroke-width="2"/>
        <path d="M88 30 Q98 14 106 24 L98 30 Q104 22 100 18 L94 26 Z"
              fill="#3e9c3e" stroke="#1a4a1a" stroke-width="2"/>
        <rect x="6" y="76" width="100" height="6" fill="#7a5328"/>
      `,
      // 1: sawn even
      `
        <rect x="10" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="34" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="58" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="82" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="6" y="76" width="100" height="6" fill="#7a5328"/>
      `,
      // 2: nailed crossbeam
      `
        <rect x="10" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="34" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="58" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="82" y="60" width="14" height="50" fill="#7a5328" stroke="#3a4756" stroke-width="3"/>
        <rect x="6" y="76" width="100" height="6" fill="#a07040" stroke="#3a4756" stroke-width="2"/>
        <circle cx="17" cy="79" r="2" fill="#bbc4d0"/>
        <circle cx="41" cy="79" r="2" fill="#bbc4d0"/>
        <circle cx="65" cy="79" r="2" fill="#bbc4d0"/>
        <circle cx="89" cy="79" r="2" fill="#bbc4d0"/>
      `,
      // 3: painted clean
      `
        <rect x="10" y="60" width="14" height="50" fill="#ffd966" stroke="#c19a30" stroke-width="3"/>
        <rect x="34" y="60" width="14" height="50" fill="#ffd966" stroke="#c19a30" stroke-width="3"/>
        <rect x="58" y="60" width="14" height="50" fill="#ffd966" stroke="#c19a30" stroke-width="3"/>
        <rect x="82" y="60" width="14" height="50" fill="#ffd966" stroke="#c19a30" stroke-width="3"/>
        <rect x="6" y="76" width="100" height="6" fill="#ffd966" stroke="#c19a30" stroke-width="2"/>
      `,
    ],
  },
};

// ----- Levels ----------------------------------------------------------------
// Each level lists:
//   - name
//   - jobs:  [{ id, kind, x, y }]
//     where kind is a key in JOB_DEFS. Single-step jobs use the kind's tool.
//     Multi-step jobs follow JOB_DEFS[kind].tools sequentially.
//   - trayTools: tools that appear in the toolbox (includes the right ones +
//     decoys)
//
// Job positions are inside a 360x320 scene area (px coords).
export const TOOLBOX_LEVELS = [
  // ===== L1-L5 single broken thing, 2-3 decoys =====
  { name: 'Loose Bolt',
    jobs: [{ id: 'j1', kind: 'bolt', x: 180, y: 130 }],
    trayTools: ['wrench', 'hammer', 'screwdriver'] },
  { name: 'Loose Screw',
    jobs: [{ id: 'j1', kind: 'screw', x: 180, y: 130 }],
    trayTools: ['screwdriver', 'wrench', 'pliers'] },
  { name: 'Sticky Nail',
    jobs: [{ id: 'j1', kind: 'nail', x: 180, y: 120 }],
    trayTools: ['hammer', 'screwdriver', 'wrench'] },
  { name: 'Big Branch',
    jobs: [{ id: 'j1', kind: 'branch', x: 180, y: 130 }],
    trayTools: ['saw', 'hammer', 'paintbrush'] },
  { name: 'Flat Tire',
    jobs: [{ id: 'j1', kind: 'tire', x: 180, y: 140 }],
    trayTools: ['pump', 'wrench', 'tape'] },

  // ===== L6-L10 1-2 broken things, 4-5 tools =====
  { name: 'Paint Job',
    jobs: [{ id: 'j1', kind: 'wall', x: 180, y: 130 }],
    trayTools: ['paintbrush', 'hammer', 'saw', 'pump', 'drill'] },
  { name: 'Drill It',
    jobs: [{ id: 'j1', kind: 'hole', x: 180, y: 130 }],
    trayTools: ['drill', 'wrench', 'screwdriver', 'hammer', 'pliers'] },
  { name: 'Pull It Out',
    jobs: [{ id: 'j1', kind: 'stuckNail', x: 180, y: 130 }],
    trayTools: ['pliers', 'hammer', 'wrench', 'screwdriver'] },
  { name: 'Two Jobs',
    jobs: [
      { id: 'j1', kind: 'bolt', x: 110, y: 120 },
      { id: 'j2', kind: 'screw', x: 250, y: 160 },
    ],
    trayTools: ['wrench', 'screwdriver', 'hammer', 'saw'] },
  { name: 'Tire & Nail',
    jobs: [
      { id: 'j1', kind: 'tire', x: 100, y: 140 },
      { id: 'j2', kind: 'nail', x: 250, y: 130 },
    ],
    trayTools: ['pump', 'hammer', 'wrench', 'pliers', 'screwdriver'] },

  // ===== L11-L15 2-3 broken things, 5-6 tools =====
  { name: 'Fix the Vase',
    jobs: [{ id: 'j1', kind: 'vase', x: 180, y: 130 }],
    trayTools: ['glue', 'tape', 'hammer', 'paintbrush', 'scissors', 'wrench'] },
  { name: 'Cut & Tape',
    jobs: [
      { id: 'j1', kind: 'paper', x: 100, y: 130 },
      { id: 'j2', kind: 'poster', x: 250, y: 130 },
    ],
    trayTools: ['scissors', 'tape', 'glue', 'pliers', 'paintbrush', 'drill'] },
  { name: 'Light It Up',
    jobs: [
      { id: 'j1', kind: 'lamp', x: 100, y: 130 },
      { id: 'j2', kind: 'hole', x: 250, y: 130 },
    ],
    trayTools: ['bulb', 'drill', 'screwdriver', 'wrench', 'pliers', 'tape'] },
  { name: 'Three Fixes',
    jobs: [
      { id: 'j1', kind: 'bolt',  x: 70,  y: 120 },
      { id: 'j2', kind: 'screw', x: 180, y: 150 },
      { id: 'j3', kind: 'nail',  x: 280, y: 120 },
    ],
    trayTools: ['wrench', 'screwdriver', 'hammer', 'saw', 'pliers', 'paintbrush'] },
  { name: 'Workshop Day',
    jobs: [
      { id: 'j1', kind: 'tire',   x: 80,  y: 140 },
      { id: 'j2', kind: 'branch', x: 200, y: 130 },
      { id: 'j3', kind: 'wall',   x: 290, y: 140 },
    ],
    trayTools: ['pump', 'saw', 'paintbrush', 'wrench', 'hammer', 'drill'] },

  // ===== L16-L20 multi-step fixes =====
  { name: 'Loose Plank',
    jobs: [{ id: 'j1', kind: 'loosePlank', x: 180, y: 130 }],
    trayTools: ['hammer', 'paintbrush', 'saw', 'wrench'] },
  { name: 'Saw and Paint',
    jobs: [{ id: 'j1', kind: 'sawAndSand', x: 180, y: 130 }],
    trayTools: ['saw', 'paintbrush', 'hammer', 'drill', 'pliers'] },
  { name: 'Glue and Screw',
    jobs: [{ id: 'j1', kind: 'brokenChair', x: 180, y: 130 }],
    trayTools: ['glue', 'screwdriver', 'hammer', 'tape', 'wrench'] },
  { name: 'Loose Pipe',
    jobs: [{ id: 'j1', kind: 'loosePipe', x: 180, y: 130 }],
    trayTools: ['wrench', 'tape', 'pump', 'hammer', 'screwdriver'] },
  { name: 'Two Repairs',
    jobs: [
      { id: 'j1', kind: 'loosePlank', x: 100, y: 140 },
      { id: 'j2', kind: 'bolt',       x: 270, y: 130 },
    ],
    trayTools: ['hammer', 'paintbrush', 'wrench', 'saw', 'screwdriver'] },

  // ===== L21-L25 finale — multi-step + mixed jobs + more tools =====
  { name: 'Branch and Pipe',
    jobs: [
      { id: 'j1', kind: 'sawAndSand', x: 100, y: 140 },
      { id: 'j2', kind: 'loosePipe',  x: 270, y: 130 },
    ],
    trayTools: ['saw', 'paintbrush', 'wrench', 'tape', 'pump', 'hammer'] },
  { name: 'Chair and Lamp',
    jobs: [
      { id: 'j1', kind: 'brokenChair', x: 100, y: 130 },
      { id: 'j2', kind: 'lamp',        x: 270, y: 130 },
    ],
    trayTools: ['glue', 'screwdriver', 'bulb', 'pliers', 'hammer', 'tape'] },
  { name: 'Crack Repair',
    jobs: [{ id: 'j1', kind: 'crackedWall', x: 180, y: 130 }],
    trayTools: ['drill', 'glue', 'paintbrush', 'hammer', 'wrench', 'tape'] },
  { name: 'Triple Job',
    jobs: [
      { id: 'j1', kind: 'loosePlank', x: 80,  y: 140 },
      { id: 'j2', kind: 'tire',       x: 200, y: 140 },
      { id: 'j3', kind: 'vase',       x: 290, y: 140 },
    ],
    trayTools: ['hammer', 'paintbrush', 'pump', 'glue', 'wrench', 'saw', 'tape'] },
  { name: 'Master Fixer',
    jobs: [
      { id: 'j1', kind: 'crackedWall', x: 90,  y: 140 },
      { id: 'j2', kind: 'loosePipe',   x: 220, y: 140 },
      { id: 'j3', kind: 'lamp',        x: 310, y: 140 },
    ],
    trayTools: ['drill', 'glue', 'paintbrush', 'wrench', 'tape', 'bulb', 'hammer', 'saw'] },

  // ===== L26-L30 2-3 jobs, mostly single-step, 6-7 tools =====
  { name: 'Drip Drip',
    jobs: [
      { id: 'j1', kind: 'leakyFaucet', x: 110, y: 130 },
      { id: 'j2', kind: 'bolt',        x: 260, y: 140 },
    ],
    trayTools: ['wrench', 'hammer', 'screwdriver', 'tape', 'pliers', 'pump'] },
  { name: 'Kitchen Repair',
    jobs: [
      { id: 'j1', kind: 'leakyFaucet', x: 90,  y: 140 },
      { id: 'j2', kind: 'lamp',        x: 200, y: 140 },
      { id: 'j3', kind: 'screw',       x: 300, y: 140 },
    ],
    trayTools: ['wrench', 'bulb', 'screwdriver', 'hammer', 'tape', 'paintbrush', 'glue'] },
  { name: 'Backyard Job',
    jobs: [
      { id: 'j1', kind: 'branch', x: 90,  y: 130 },
      { id: 'j2', kind: 'tire',   x: 220, y: 140 },
      { id: 'j3', kind: 'wall',   x: 310, y: 140 },
    ],
    trayTools: ['saw', 'pump', 'paintbrush', 'hammer', 'wrench', 'drill'] },
  { name: 'Three Holes',
    jobs: [
      { id: 'j1', kind: 'hole', x: 80,  y: 140 },
      { id: 'j2', kind: 'hole', x: 200, y: 140 },
      { id: 'j3', kind: 'hole', x: 300, y: 140 },
    ],
    trayTools: ['drill', 'hammer', 'wrench', 'screwdriver', 'glue', 'pliers'] },
  { name: 'Tidy Up',
    jobs: [
      { id: 'j1', kind: 'paper',  x: 90,  y: 130 },
      { id: 'j2', kind: 'poster', x: 220, y: 130 },
      { id: 'j3', kind: 'vase',   x: 310, y: 140 },
    ],
    trayTools: ['scissors', 'tape', 'glue', 'paintbrush', 'pliers', 'hammer', 'wrench'] },

  // ===== L31-L35 2-3 jobs with multi-step fixes, 7 tools =====
  { name: 'Bathroom Day',
    jobs: [
      { id: 'j1', kind: 'cloggedDrain', x: 100, y: 140 },
      { id: 'j2', kind: 'leakyFaucet',  x: 260, y: 130 },
    ],
    trayTools: ['pliers', 'pump', 'wrench', 'tape', 'hammer', 'screwdriver', 'glue'] },
  { name: 'Stuck Window',
    jobs: [
      { id: 'j1', kind: 'brokenWindow', x: 110, y: 140 },
      { id: 'j2', kind: 'nail',         x: 270, y: 130 },
    ],
    trayTools: ['scissors', 'tape', 'glue', 'hammer', 'paintbrush', 'wrench', 'pliers'] },
  { name: 'Wobble Stop',
    jobs: [
      { id: 'j1', kind: 'wobblyTable', x: 100, y: 140 },
      { id: 'j2', kind: 'screw',       x: 270, y: 130 },
    ],
    trayTools: ['screwdriver', 'glue', 'hammer', 'wrench', 'tape', 'saw', 'paintbrush'] },
  { name: 'Loose Tiles',
    jobs: [
      { id: 'j1', kind: 'looseTile', x: 100, y: 140 },
      { id: 'j2', kind: 'tire',      x: 270, y: 140 },
    ],
    trayTools: ['hammer', 'glue', 'paintbrush', 'pump', 'wrench', 'pliers', 'tape'] },
  { name: 'Old Radio',
    jobs: [
      { id: 'j1', kind: 'brokenRadio', x: 100, y: 130 },
      { id: 'j2', kind: 'bolt',        x: 270, y: 140 },
    ],
    trayTools: ['screwdriver', 'wrench', 'bulb', 'hammer', 'tape', 'glue', 'pliers'] },

  // ===== L36-L40 3-4 jobs, mix of 1/2/3-step fixes, 8 tools =====
  { name: 'Garage Saturday',
    jobs: [
      { id: 'j1', kind: 'rustyBike',   x: 90,  y: 140 },
      { id: 'j2', kind: 'leakyFaucet', x: 230, y: 130 },
      { id: 'j3', kind: 'bolt',        x: 320, y: 140 },
    ],
    trayTools: ['wrench', 'paintbrush', 'pump', 'tape', 'hammer', 'screwdriver', 'glue', 'pliers'] },
  { name: 'Window & Drain',
    jobs: [
      { id: 'j1', kind: 'brokenWindow', x: 90,  y: 140 },
      { id: 'j2', kind: 'cloggedDrain', x: 220, y: 140 },
      { id: 'j3', kind: 'screw',        x: 320, y: 140 },
    ],
    trayTools: ['scissors', 'tape', 'glue', 'pliers', 'pump', 'screwdriver', 'wrench', 'hammer'] },
  { name: 'Living Room',
    jobs: [
      { id: 'j1', kind: 'wobblyTable', x: 80,  y: 140 },
      { id: 'j2', kind: 'lamp',        x: 200, y: 130 },
      { id: 'j3', kind: 'vase',        x: 290, y: 140 },
      { id: 'j4', kind: 'poster',      x: 340, y: 140 },
    ],
    trayTools: ['screwdriver', 'glue', 'hammer', 'bulb', 'tape', 'paintbrush', 'scissors', 'wrench'] },
  { name: 'Workshop Mix',
    jobs: [
      { id: 'j1', kind: 'looseTile',  x: 80,  y: 140 },
      { id: 'j2', kind: 'branch',     x: 200, y: 140 },
      { id: 'j3', kind: 'stuckNail',  x: 290, y: 140 },
      { id: 'j4', kind: 'screw',      x: 340, y: 140 },
    ],
    trayTools: ['hammer', 'glue', 'paintbrush', 'saw', 'pliers', 'screwdriver', 'wrench', 'tape'] },
  { name: 'Yard & Roof',
    jobs: [
      { id: 'j1', kind: 'oldFence',  x: 90,  y: 140 },
      { id: 'j2', kind: 'tire',      x: 220, y: 140 },
      { id: 'j3', kind: 'nail',      x: 320, y: 140 },
    ],
    trayTools: ['saw', 'hammer', 'paintbrush', 'pump', 'wrench', 'pliers', 'glue', 'drill'] },

  // ===== L41-L45 3-4 jobs, mostly multi-step, 9 tools =====
  { name: 'Big Fix Day',
    jobs: [
      { id: 'j1', kind: 'rustyBike',   x: 90,  y: 140 },
      { id: 'j2', kind: 'brokenRadio', x: 230, y: 140 },
      { id: 'j3', kind: 'leakyFaucet', x: 330, y: 140 },
    ],
    trayTools: ['wrench', 'paintbrush', 'pump', 'screwdriver', 'bulb', 'tape', 'hammer', 'glue', 'pliers'] },
  { name: 'Triple Trouble',
    jobs: [
      { id: 'j1', kind: 'looseTile',    x: 90,  y: 140 },
      { id: 'j2', kind: 'brokenWindow', x: 220, y: 140 },
      { id: 'j3', kind: 'cloggedDrain', x: 330, y: 140 },
    ],
    trayTools: ['hammer', 'glue', 'paintbrush', 'scissors', 'tape', 'pliers', 'pump', 'wrench', 'screwdriver'] },
  { name: 'Saturday Sweat',
    jobs: [
      { id: 'j1', kind: 'oldFence',    x: 90,  y: 140 },
      { id: 'j2', kind: 'wobblyTable', x: 220, y: 140 },
      { id: 'j3', kind: 'loosePipe',   x: 330, y: 140 },
    ],
    trayTools: ['saw', 'hammer', 'paintbrush', 'screwdriver', 'glue', 'wrench', 'tape', 'pump', 'pliers'] },
  { name: 'House Patrol',
    jobs: [
      { id: 'j1', kind: 'crackedWall', x: 80,  y: 140 },
      { id: 'j2', kind: 'looseTile',   x: 200, y: 140 },
      { id: 'j3', kind: 'lamp',        x: 290, y: 140 },
      { id: 'j4', kind: 'bolt',        x: 340, y: 140 },
    ],
    trayTools: ['drill', 'glue', 'paintbrush', 'hammer', 'bulb', 'wrench', 'tape', 'screwdriver', 'pliers'] },
  { name: 'Repair Spree',
    jobs: [
      { id: 'j1', kind: 'brokenChair',  x: 80,  y: 140 },
      { id: 'j2', kind: 'brokenRadio',  x: 200, y: 140 },
      { id: 'j3', kind: 'sawAndSand',   x: 290, y: 140 },
      { id: 'j4', kind: 'tire',         x: 340, y: 140 },
    ],
    trayTools: ['glue', 'screwdriver', 'wrench', 'bulb', 'saw', 'paintbrush', 'pump', 'hammer', 'tape'] },

  // ===== L46-L50 4-5 jobs, complex sequences, all 12 tools =====
  { name: 'Whole House',
    jobs: [
      { id: 'j1', kind: 'rustyBike',    x: 70,  y: 140 },
      { id: 'j2', kind: 'brokenWindow', x: 180, y: 140 },
      { id: 'j3', kind: 'leakyFaucet',  x: 270, y: 140 },
      { id: 'j4', kind: 'lamp',         x: 330, y: 140 },
    ],
    trayTools: ['wrench','screwdriver','hammer','saw','pump','paintbrush','drill','pliers','glue','scissors','tape','bulb'] },
  { name: 'Total Reno',
    jobs: [
      { id: 'j1', kind: 'crackedWall',  x: 70,  y: 140 },
      { id: 'j2', kind: 'looseTile',    x: 180, y: 140 },
      { id: 'j3', kind: 'wobblyTable',  x: 270, y: 140 },
      { id: 'j4', kind: 'cloggedDrain', x: 330, y: 140 },
    ],
    trayTools: ['wrench','screwdriver','hammer','saw','pump','paintbrush','drill','pliers','glue','scissors','tape','bulb'] },
  { name: 'Five Alarm',
    jobs: [
      { id: 'j1', kind: 'oldFence',     x: 60,  y: 140 },
      { id: 'j2', kind: 'brokenRadio',  x: 150, y: 140 },
      { id: 'j3', kind: 'loosePipe',    x: 230, y: 140 },
      { id: 'j4', kind: 'vase',         x: 300, y: 140 },
      { id: 'j5', kind: 'lamp',         x: 340, y: 140 },
    ],
    trayTools: ['wrench','screwdriver','hammer','saw','pump','paintbrush','drill','pliers','glue','scissors','tape','bulb'] },
  { name: 'Fix Marathon',
    jobs: [
      { id: 'j1', kind: 'brokenChair',  x: 60,  y: 140 },
      { id: 'j2', kind: 'rustyBike',    x: 160, y: 140 },
      { id: 'j3', kind: 'brokenWindow', x: 250, y: 140 },
      { id: 'j4', kind: 'sawAndSand',   x: 320, y: 140 },
      { id: 'j5', kind: 'paper',        x: 350, y: 140 },
    ],
    trayTools: ['wrench','screwdriver','hammer','saw','pump','paintbrush','drill','pliers','glue','scissors','tape','bulb'] },
  { name: 'Grand Master',
    jobs: [
      { id: 'j1', kind: 'oldFence',     x: 50,  y: 140 },
      { id: 'j2', kind: 'looseTile',    x: 140, y: 140 },
      { id: 'j3', kind: 'brokenRadio',  x: 220, y: 140 },
      { id: 'j4', kind: 'wobblyTable',  x: 290, y: 140 },
      { id: 'j5', kind: 'crackedWall',  x: 340, y: 140 },
    ],
    trayTools: ['wrench','screwdriver','hammer','saw','pump','paintbrush','drill','pliers','glue','scissors','tape','bulb'] },
];

// ----- Helpers ---------------------------------------------------------------
function svgWrap(def, opts = {}) {
  const extra = opts.style ? ` style="${opts.style}"` : '';
  return `
    <svg viewBox="0 0 ${def.w} ${def.h}" width="${def.w}" height="${def.h}"
         style="display:block;pointer-events:none;">
      ${def.svg}
    </svg>
  `.trim();
}

function jobIsMulti(kind) {
  return Array.isArray(JOB_DEFS[kind]?.tools);
}

function jobToolsList(kind) {
  const def = JOB_DEFS[kind];
  if (!def) return [];
  return def.tools ? def.tools.slice() : [def.tool];
}

function jobStageSvg(kind, step) {
  const def = JOB_DEFS[kind];
  if (!def) return '';
  if (def.stages) return def.stages[Math.min(step, def.stages.length - 1)];
  return step === 0 ? def.broken : def.fixed;
}

function jobToolFlavor(tool) {
  // Pick an appropriate sfx for the tool's "fix" sound effect
  switch (tool) {
    case 'hammer':      return () => sfx.snap();
    case 'saw':         return () => sfx.buzz();
    case 'wrench':      return () => sfx.toggle();
    case 'screwdriver': return () => sfx.toggle();
    case 'drill':       return () => sfx.buzz();
    case 'pliers':      return () => sfx.snap();
    case 'pump':        return () => sfx.flow();
    case 'paintbrush':  return () => sfx.toggle();
    case 'glue':        return () => sfx.toggle();
    case 'scissors':    return () => sfx.click();
    case 'tape':        return () => sfx.toggle();
    case 'bulb':        return () => sfx.spark();
    default:            return () => sfx.snap();
  }
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Scene dimensions
const SCENE_W = 360;
const SCENE_H = 320;
const JOB_SIZE = 120; // each job thing is rendered inside a 120x120 box

// ----- Renderer --------------------------------------------------------------
export function renderToolboxLevel(container, levelIndex, opts) {
  const level = TOOLBOX_LEVELS[levelIndex];
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
    <div class="toolbox-stage">
      <div class="toolbox-scene" id="tb-scene"
           style="width:${SCENE_W}px;height:${SCENE_H}px;"></div>
      <div class="toolbox-tray" id="tb-tray"></div>
    </div>
  `;

  const scene = container.querySelector('#tb-scene');
  const tray = container.querySelector('#tb-tray');

  // ----- Build job elements -----
  // Each job tracks its current step (0 = original) and the remaining tools.
  const jobState = level.jobs.map((job) => {
    const tools = jobToolsList(job.kind);
    const el = document.createElement('div');
    el.className = 'tb-job';
    el.dataset.jobId = job.id;
    el.style.left = (job.x - JOB_SIZE / 2) + 'px';
    el.style.top  = (job.y - JOB_SIZE / 2) + 'px';
    el.style.width  = JOB_SIZE + 'px';
    el.style.height = JOB_SIZE + 'px';
    el.innerHTML = `
      <svg viewBox="0 0 120 120" width="${JOB_SIZE}" height="${JOB_SIZE}"
           style="display:block;">
        ${jobStageSvg(job.kind, 0)}
      </svg>
    `;
    scene.appendChild(el);
    return { job, el, step: 0, remaining: tools, done: false };
  });

  // ----- Build tool tray -----
  const trayToolEls = [];
  const tools = shuffled(level.trayTools);
  tools.forEach((toolName) => {
    const def = TOOL_DEFS[toolName];
    if (!def) return;
    const el = document.createElement('div');
    el.className = 'tb-tool';
    el.dataset.tool = toolName;
    el.style.width = def.w + 'px';
    el.style.height = def.h + 'px';
    el.innerHTML = svgWrap(def);
    tray.appendChild(el);
    trayToolEls.push(el);
    setupToolDrag(el, toolName);
  });

  let completedJobs = 0;
  let won = false;

  function setupToolDrag(toolEl, toolName) {
    let dragging = false;
    let pointerId = null;
    let offsetX = 0, offsetY = 0;
    let homeRect = null;

    toolEl.addEventListener('pointerdown', (e) => {
      if (won) return;
      e.preventDefault();
      dragging = true;
      pointerId = e.pointerId;
      toolEl.setPointerCapture(e.pointerId);
      const rect = toolEl.getBoundingClientRect();
      homeRect = rect;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.body.appendChild(toolEl);
      toolEl.style.position = 'fixed';
      toolEl.style.left = rect.left + 'px';
      toolEl.style.top  = rect.top + 'px';
      toolEl.style.zIndex = '9999';
      toolEl.style.transition = 'none';
      toolEl.classList.add('dragging');
      sfx.pickup();
    });

    toolEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      toolEl.style.left = (e.clientX - offsetX) + 'px';
      toolEl.style.top  = (e.clientY - offsetY) + 'px';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      toolEl.releasePointerCapture(pointerId);
      toolEl.classList.remove('dragging');

      const cx = e.clientX, cy = e.clientY;
      // Find a job under the pointer
      const hit = jobState.find((st) => {
        if (st.done) return false;
        const r = st.el.getBoundingClientRect();
        const pad = 16;
        return cx >= r.left - pad && cx <= r.right + pad &&
               cy >= r.top  - pad && cy <= r.bottom + pad;
      });

      let applied = false;
      if (hit) {
        const expected = hit.remaining[0];
        if (expected === toolName) {
          // Correct tool — advance the job
          applied = true;
          hit.step += 1;
          hit.remaining.shift();
          const svg = hit.el.querySelector('svg');
          if (svg) svg.innerHTML = jobStageSvg(hit.job.kind, hit.step);
          hit.el.classList.add('fixing');
          setTimeout(() => hit.el.classList.remove('fixing'), 360);
          jobToolFlavor(toolName)();
          if (hit.remaining.length === 0) {
            hit.done = true;
            hit.el.classList.add('done');
            completedJobs += 1;
            setTimeout(() => sfx.snap(), 180);
            if (completedJobs === jobState.length) {
              won = true;
              setTimeout(onWin, 500);
            }
          }
        } else {
          // Wrong tool — wiggle the job
          hit.el.classList.add('wiggle');
          setTimeout(() => hit.el.classList.remove('wiggle'), 400);
          sfx.reject();
        }
      }

      // Either way, return tool to its tray home position.
      toolEl.style.transition = 'left 0.22s ease, top 0.22s ease';
      toolEl.style.left = homeRect.left + 'px';
      toolEl.style.top  = homeRect.top + 'px';
      setTimeout(() => {
        if (!toolEl.isConnected) return;
        tray.appendChild(toolEl);
        toolEl.style.position = '';
        toolEl.style.left = '';
        toolEl.style.top = '';
        toolEl.style.transition = '';
        toolEl.style.zIndex = '';
      }, 240);
    }

    toolEl.addEventListener('pointerup', endDrag);
    toolEl.addEventListener('pointercancel', endDrag);
  }

  function onWin() {
    sfx.win();
    scene.classList.add('tb-celebrate');
    const rect = scene.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div');
      s.className = 'star-burst';
      s.textContent = '⭐';
      const angle = (Math.PI * 2 * i) / 14;
      const dist = 120 + Math.random() * 80;
      s.style.setProperty('--end', `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`);
      s.style.left = (rect.left + rect.width / 2) + 'px';
      s.style.top = (rect.top + rect.height / 2) + 'px';
      s.style.position = 'fixed';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
    if (opts && typeof opts.onComplete === 'function') opts.onComplete(levelIndex);
    setTimeout(() => showWinOverlay(), 1300);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < TOOLBOX_LEVELS.length;
    overlay.innerHTML = `
      <div class="win-title">FIXED!</div>
      <div class="win-buttons">
        <button class="big-btn secondary" data-act="levels">Pick Job</button>
        ${hasNext ? '<button class="big-btn" data-act="next">Next ›</button>' : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act === 'next' && opts && opts.onNext) opts.onNext(levelIndex + 1);
      else if (act === 'levels' && opts && opts.onBack) opts.onBack();
    });
    container.appendChild(overlay);
  }

  container.querySelector('[data-act="back"]').addEventListener('click', () => {
    if (opts && opts.onBack) opts.onBack();
  });
}
