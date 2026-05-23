// Gears mechanic: drag the right-sized gears into the empty slots to form a
// chain from the crank to the driven object. When complete, the crank turns,
// the chain rotates (alternating directions) and the driven thing animates.

import { sfx } from './sound.js';

// ---- Gear sizing ----
// radius = outer radius (where teeth tips reach). Touch/snap radius derived
// from this. Chain meshing places adjacent centres at distance r1 + r2.
const GEAR_DEFS = {
  S: { r: 24, teeth: 10, fill: '#d33',    rim: '#7a1f1f' },
  M: { r: 36, teeth: 14, fill: '#3aa3ff', rim: '#1f5d99' },
  L: { r: 50, teeth: 18, fill: '#ffd966', rim: '#7a5a1f' },
};

// Stage padding so even the largest gears never clip the edge.
const STAGE_PAD = 12;

// ---- SVG builders ----
function gearSvgInner(size, opts = {}) {
  const def = GEAR_DEFS[size];
  const r = def.r;
  const teeth = def.teeth;
  const fill = opts.outline ? 'none'   : def.fill;
  const rim  = opts.outline ? '#5a6878' : def.rim;
  const hubFill = opts.outline ? 'none' : '#2a3a50';
  // Build teeth as little rectangles around the perimeter.
  const toothW = Math.max(4, r * 0.32);
  const toothH = Math.max(5, r * 0.22);
  const innerR = r - toothH * 0.55; // body radius (where teeth attach)
  let teethSvg = '';
  for (let i = 0; i < teeth; i++) {
    const a = (i * 360) / teeth;
    teethSvg += `<rect x="${-toothW/2}" y="${-r}" width="${toothW}" height="${toothH}" rx="1.5"
                   fill="${fill}" stroke="${rim}" stroke-width="2"
                   transform="rotate(${a})" />`;
  }
  const dashAttr = opts.outline ? 'stroke-dasharray="6 4"' : '';
  return `
    <g class="gear-body">
      ${teethSvg}
      <circle r="${innerR}" fill="${fill}" stroke="${rim}" stroke-width="3" ${dashAttr}/>
      <circle r="${innerR * 0.55}" fill="${hubFill}" stroke="${rim}" stroke-width="2"/>
      <circle r="${innerR * 0.18}" fill="${rim}"/>
      <!-- spoke marks for rotation feedback -->
      <rect x="${-innerR*0.55}" y="-2" width="${innerR*1.1}" height="4" fill="${rim}" opacity="0.45"/>
      <rect x="-2" y="${-innerR*0.55}" width="4" height="${innerR*1.1}" fill="${rim}" opacity="0.45"/>
    </g>
  `;
}

function gearSvgEl(size, opts = {}) {
  const def = GEAR_DEFS[size];
  const d = def.r * 2 + 6; // a little padding for stroke
  return `
    <svg class="gear-svg" viewBox="${-d/2} ${-d/2} ${d} ${d}" width="${d}" height="${d}"
         style="display:block;pointer-events:none;overflow:visible;">
      ${gearSvgInner(size, opts)}
    </svg>
  `;
}

// ---- Driven object SVG (drawn in background SVG layer) ----
function drivenSvg(type, x, y) {
  switch (type) {
    case 'windmill': return `
      <g class="driven driven-windmill" data-type="windmill" transform="translate(${x},${y})">
        <rect x="-6" y="0" width="12" height="80" fill="#7a5a1f" stroke="#3a2818" stroke-width="2"/>
        <rect x="-22" y="78" width="44" height="14" rx="2" fill="#5a4028" stroke="#2a1808" stroke-width="2"/>
        <g class="windmill-blades">
          <rect x="-4" y="-40" width="8" height="38" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
          <rect x="2"  y="-4" width="38" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
          <rect x="-4" y="2" width="8" height="38" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
          <rect x="-40" y="-4" width="38" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
          <circle r="6" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        </g>
      </g>`;
    case 'flag': return `
      <g class="driven driven-flag" data-type="flag" transform="translate(${x},${y})">
        <rect x="-3" y="-60" width="6" height="110" fill="#7a5a1f" stroke="#3a2818" stroke-width="2"/>
        <circle cx="0" cy="-62" r="5" fill="#ffd966" stroke="#7a5a1f" stroke-width="2"/>
        <rect x="-22" y="46" width="44" height="10" rx="2" fill="#5a4028" stroke="#2a1808" stroke-width="2"/>
        <g class="flag-flag">
          <path d="M 3 0 L 40 -8 L 36 6 L 40 20 L 3 12 Z" fill="#d33" stroke="#7a1f1f" stroke-width="2"/>
          <circle cx="18" cy="6" r="4" fill="#ffd966" stroke="#7a5a1f" stroke-width="1.5"/>
        </g>
      </g>`;
    case 'lift': return `
      <g class="driven driven-lift" data-type="lift" transform="translate(${x},${y})">
        <rect x="-26" y="-60" width="52" height="110" rx="3" fill="#1a2230" stroke="#3a4756" stroke-width="2"/>
        <line x1="0" y1="-58" x2="0" y2="48" stroke="#3a4756" stroke-width="2" stroke-dasharray="4 3"/>
        <g class="lift-cab">
          <rect x="-22" y="30" width="44" height="20" rx="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
          <rect x="-18" y="34" width="14" height="12" fill="#3aa3ff" stroke="#1f5d99" stroke-width="1.5"/>
          <rect x="4" y="34" width="14" height="12" fill="#3aa3ff" stroke="#1f5d99" stroke-width="1.5"/>
        </g>
      </g>`;
    case 'drawbridge': return `
      <g class="driven driven-bridge" data-type="drawbridge" transform="translate(${x},${y})">
        <rect x="-4" y="-30" width="8" height="40" fill="#5a4028" stroke="#2a1808" stroke-width="2"/>
        <circle r="6" cx="0" cy="-30" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        <g class="bridge-deck" style="transform-origin: 0px -30px;">
          <rect x="0" y="-34" width="64" height="10" fill="#7a5a1f" stroke="#3a2818" stroke-width="2"/>
          <rect x="6" y="-32" width="6" height="6" fill="#3a2818"/>
          <rect x="20" y="-32" width="6" height="6" fill="#3a2818"/>
          <rect x="34" y="-32" width="6" height="6" fill="#3a2818"/>
          <rect x="48" y="-32" width="6" height="6" fill="#3a2818"/>
        </g>
        <rect x="60" y="-16" width="14" height="60" fill="#5a4028" stroke="#2a1808" stroke-width="2"/>
      </g>`;
    case 'waterwheel': return `
      <g class="driven driven-wheel" data-type="waterwheel" transform="translate(${x},${y})">
        <circle r="42" fill="#1a2230" stroke="#3a4756" stroke-width="2" opacity="0.5"/>
        <g class="wheel-spokes">
          <circle r="40" fill="none" stroke="#7a5a1f" stroke-width="4"/>
          <circle r="28" fill="none" stroke="#7a5a1f" stroke-width="3"/>
          <rect x="-2" y="-40" width="4" height="80" fill="#7a5a1f"/>
          <rect x="-40" y="-2" width="80" height="4" fill="#7a5a1f"/>
          <rect x="-2" y="-40" width="4" height="80" fill="#7a5a1f" transform="rotate(45)"/>
          <rect x="-40" y="-2" width="80" height="4" fill="#7a5a1f" transform="rotate(45)"/>
          <!-- paddles -->
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(45)"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(90)"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(135)"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(180)"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(225)"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(270)"/>
          <rect x="-6" y="-44" width="12" height="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(315)"/>
          <circle r="5" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
        </g>
      </g>`;
  }
  return '';
}

function crankSvg(x, y) {
  return `
    <g class="crank" transform="translate(${x},${y})">
      <rect x="-22" y="-22" width="44" height="44" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="-26" y="18" width="52" height="14" rx="2" fill="#5a6878" stroke="#1a2230" stroke-width="2"/>
      <g class="crank-arm">
        <rect x="-3" y="-26" width="6" height="34" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
        <circle cx="0" cy="-26" r="8" fill="#d33" stroke="#7a1f1f" stroke-width="2"/>
        <circle cx="0" cy="-26" r="3" fill="#ff8a8a"/>
        <circle cx="0" cy="0" r="5" fill="#1a2230"/>
      </g>
    </g>
  `;
}

// ---- Chain helper: build a chain of slot positions, meshing edge-to-edge ----
// Starting at (startX, startY), heading in direction (dx, dy unit vector),
// produce N slots whose centres are separated by r[i]+r[i+1].
function chainSlots(startX, startY, dx, dy, sizes, idPrefix = 'g') {
  const slots = [];
  let x = startX, y = startY;
  for (let i = 0; i < sizes.length; i++) {
    slots.push({ id: `${idPrefix}${i}`, x, y, size: sizes[i] });
    if (i < sizes.length - 1) {
      const r1 = GEAR_DEFS[sizes[i]].r;
      const r2 = GEAR_DEFS[sizes[i+1]].r;
      const d = r1 + r2 - 4; // slight overlap so teeth visually mesh
      x += dx * d;
      y += dy * d;
    }
  }
  return slots;
}

// Pick a driven type based on level for variety.
const DRIVEN_CYCLE = ['windmill', 'flag', 'lift', 'drawbridge', 'waterwheel'];

// ---- Level definitions (25) ----
function makeLevels() {
  const L = [];

  // ----- L1-L5: 2-3 gears, horizontal, no decoys -----
  // L1 — simplest: 2 medium gears in a row.
  {
    const slots = chainSlots(120, 140, 1, 0, ['M', 'M']);
    const driven = { type: 'windmill', x: slots[slots.length-1].x + GEAR_DEFS.M.r + 30, y: 140 };
    L.push({ name: 'First Crank', width: 420, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['M', 'M'] });
  }
  // L2 — 2 large gears.
  {
    const slots = chainSlots(130, 140, 1, 0, ['L', 'L']);
    const driven = { type: 'waterwheel', x: slots[slots.length-1].x + GEAR_DEFS.L.r + 60, y: 140 };
    L.push({ name: 'Big Wheels', width: 480, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['L', 'L'] });
  }
  // L3 — 3 small gears.
  {
    const slots = chainSlots(110, 140, 1, 0, ['S', 'S', 'S']);
    const driven = { type: 'flag', x: slots[slots.length-1].x + GEAR_DEFS.S.r + 40, y: 140 };
    L.push({ name: 'Hoist It', width: 380, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['S', 'S', 'S'] });
  }
  // L4 — mixed S/M/S.
  {
    const slots = chainSlots(110, 140, 1, 0, ['S', 'M', 'S']);
    const driven = { type: 'windmill', x: slots[slots.length-1].x + GEAR_DEFS.S.r + 36, y: 140 };
    L.push({ name: 'Little Big', width: 400, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['S', 'M', 'S'] });
  }
  // L5 — 3 mediums.
  {
    const slots = chainSlots(120, 140, 1, 0, ['M', 'M', 'M']);
    const driven = { type: 'lift', x: slots[slots.length-1].x + GEAR_DEFS.M.r + 40, y: 140 };
    L.push({ name: 'Up and Up', width: 440, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['M', 'M', 'M'] });
  }

  // ----- L6-L10: 3-4 gears, vertical / diagonal, no decoys -----
  // L6 — diagonal down.
  {
    const ux = Math.cos(Math.PI / 6), uy = Math.sin(Math.PI / 6); // 30 deg down
    const slots = chainSlots(120, 90, ux, uy, ['M', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'flag', x: last.x + GEAR_DEFS.M.r + 30, y: last.y };
    L.push({ name: 'Slope', width: 440, height: 300, crank: { x: 60, y: 90 }, slots, driven, trayGears: ['M', 'M', 'M'] });
  }
  // L7 — 4 gears horizontal.
  {
    const slots = chainSlots(110, 140, 1, 0, ['S', 'M', 'M', 'S']);
    const last = slots[slots.length-1];
    const driven = { type: 'waterwheel', x: last.x + GEAR_DEFS.S.r + 60, y: 140 };
    L.push({ name: 'Long Chain', width: 480, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['S', 'M', 'M', 'S'] });
  }
  // L8 — diagonal up.
  {
    const ux = Math.cos(-Math.PI / 6), uy = Math.sin(-Math.PI / 6);
    const slots = chainSlots(120, 200, ux, uy, ['M', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'windmill', x: last.x + GEAR_DEFS.M.r + 30, y: last.y };
    L.push({ name: 'Climbing', width: 440, height: 280, crank: { x: 60, y: 200 }, slots, driven, trayGears: ['M', 'M', 'M'] });
  }
  // L9 — 4 mediums horizontal.
  {
    const slots = chainSlots(110, 140, 1, 0, ['M', 'M', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'lift', x: last.x + GEAR_DEFS.M.r + 40, y: 140 };
    L.push({ name: 'Quartet', width: 500, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['M', 'M', 'M', 'M'] });
  }
  // L10 — sized down: L → M → S → M.
  {
    const slots = chainSlots(110, 140, 1, 0, ['L', 'M', 'S', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'drawbridge', x: last.x + GEAR_DEFS.M.r + 20, y: last.y };
    L.push({ name: 'Step Down', width: 500, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['L', 'M', 'S', 'M'] });
  }

  // ----- L11-L15: 4-5 gears, vary driven, occasional decoy -----
  // L11 — 5 mediums + 1 decoy small.
  {
    const slots = chainSlots(110, 140, 1, 0, ['M', 'M', 'M', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'windmill', x: last.x + GEAR_DEFS.M.r + 30, y: 140 };
    L.push({ name: 'Five Alive', width: 560, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'S'] });
  }
  // L12 — descending sizes + decoy.
  {
    const slots = chainSlots(110, 110, 0.94, 0.34, ['L', 'M', 'S', 'S']);
    const last = slots[slots.length-1];
    const driven = { type: 'flag', x: last.x + GEAR_DEFS.S.r + 30, y: last.y };
    L.push({ name: 'Tapering', width: 480, height: 300, crank: { x: 60, y: 110 }, slots, driven, trayGears: ['L', 'M', 'S', 'S', 'L'] });
  }
  // L13 — 4 gears, vertical chain.
  {
    const slots = chainSlots(180, 60, 0, 1, ['M', 'M', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'lift', x: 320, y: 200 };
    L.push({ name: 'Tower', width: 420, height: 360, crank: { x: 180, y: -10 + 20 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'S'] });
  }
  // L14 — 5 gears mixed.
  {
    const slots = chainSlots(110, 140, 1, 0, ['S', 'M', 'L', 'M', 'S']);
    const last = slots[slots.length-1];
    const driven = { type: 'waterwheel', x: last.x + GEAR_DEFS.S.r + 60, y: 140 };
    L.push({ name: 'Hourglass', width: 560, height: 280, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['S', 'M', 'L', 'M', 'S'] });
  }
  // L15 — 5 large gears, decoy medium.
  {
    const slots = chainSlots(120, 150, 1, 0, ['L', 'L', 'L', 'L']);
    const last = slots[slots.length-1];
    const driven = { type: 'drawbridge', x: last.x + GEAR_DEFS.L.r + 10, y: last.y };
    L.push({ name: 'Heavy Lift', width: 580, height: 300, crank: { x: 60, y: 150 }, slots, driven, trayGears: ['L', 'L', 'L', 'L', 'M'] });
  }

  // ----- L16-L20: 5-6 gears, L-shapes, 1-2 decoys -----
  // L16 — L-shape: across then down. Use two chain segments meshing at a pivot gear.
  {
    // Manual layout to make an L.
    const slots = [
      { id: 'g0', x: 110, y: 100, size: 'M' },
      { id: 'g1', x: 110 + 68, y: 100, size: 'M' },
      { id: 'g2', x: 110 + 68*2, y: 100, size: 'M' },
      { id: 'g3', x: 110 + 68*2, y: 100 + 68, size: 'M' },
      { id: 'g4', x: 110 + 68*2, y: 100 + 68*2, size: 'M' },
    ];
    const last = slots[slots.length-1];
    const driven = { type: 'lift', x: last.x + GEAR_DEFS.M.r + 30, y: last.y };
    L.push({ name: 'Corner', width: 500, height: 360, crank: { x: 60, y: 100 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'S'] });
  }
  // L17 — 6 mixed.
  {
    const slots = chainSlots(110, 140, 1, 0, ['S', 'M', 'M', 'L', 'M', 'S']);
    const last = slots[slots.length-1];
    const driven = { type: 'windmill', x: last.x + GEAR_DEFS.S.r + 40, y: 140 };
    L.push({ name: 'Convoy', width: 620, height: 300, crank: { x: 60, y: 140 }, slots, driven, trayGears: ['S', 'M', 'M', 'L', 'M', 'S', 'L'] });
  }
  // L18 — diagonal L: down-right, then up-right.
  {
    const dx1 = Math.cos(Math.PI / 5), dy1 = Math.sin(Math.PI / 5);
    const seg1 = chainSlots(110, 80, dx1, dy1, ['M', 'M', 'M']);
    const last1 = seg1[seg1.length-1];
    // continue with up-right
    const dx2 = Math.cos(-Math.PI / 5), dy2 = Math.sin(-Math.PI / 5);
    const r = GEAR_DEFS.M.r + GEAR_DEFS.M.r - 4;
    const seg2 = chainSlots(last1.x + dx2*r, last1.y + dy2*r, dx2, dy2, ['M', 'M']);
    const slots = [...seg1, ...seg2].map((s, i) => ({ ...s, id: 'g'+i }));
    const last = slots[slots.length-1];
    const driven = { type: 'flag', x: last.x + GEAR_DEFS.M.r + 24, y: last.y };
    L.push({ name: 'Zigzag', width: 540, height: 300, crank: { x: 60, y: 80 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'S', 'L'] });
  }
  // L19 — 6 gears mixed, two decoys.
  {
    const slots = chainSlots(100, 140, 1, 0, ['L', 'S', 'M', 'M', 'S', 'L']);
    const last = slots[slots.length-1];
    const driven = { type: 'waterwheel', x: last.x + GEAR_DEFS.L.r + 60, y: 140 };
    L.push({ name: 'Bookends', width: 620, height: 300, crank: { x: 50, y: 140 }, slots, driven, trayGears: ['L', 'S', 'M', 'M', 'S', 'L', 'M', 'S'] });
  }
  // L20 — vertical 5 + decoys.
  {
    const slots = chainSlots(200, 50, 0, 1, ['M', 'M', 'M', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'drawbridge', x: last.x + GEAR_DEFS.M.r + 20, y: last.y };
    L.push({ name: 'Deep Shaft', width: 480, height: 420, crank: { x: 200, y: -10 + 20 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'S', 'L'] });
  }

  // ----- L21-L25: 6+ gears, complex chains, multiple driven objects -----
  // L21 — 7 gears, mixed, 2 decoys.
  {
    const slots = chainSlots(90, 140, 1, 0, ['M', 'S', 'M', 'M', 'S', 'M', 'M']);
    const last = slots[slots.length-1];
    const driven = { type: 'windmill', x: last.x + GEAR_DEFS.M.r + 24, y: 140 };
    L.push({ name: 'Long Haul', width: 640, height: 300, crank: { x: 40, y: 140 }, slots, driven, trayGears: ['M', 'S', 'M', 'M', 'S', 'M', 'M', 'L', 'S'] });
  }
  // L22 — Y-split: one chain → splits to two driven objects (flag + windmill).
  // We model the split as a single chain with a branch slot at the fork.
  {
    // main chain horizontal
    const main = chainSlots(90, 160, 1, 0, ['M', 'M', 'M', 'M']);
    const forkBase = main[main.length-1]; // last main gear
    // branch upward from forkBase
    const branchUp = chainSlots(forkBase.x, forkBase.y - (GEAR_DEFS.M.r*2-4), 0, -1, ['M']);
    // branch downward
    const branchDn = chainSlots(forkBase.x, forkBase.y + (GEAR_DEFS.M.r*2-4), 0, 1, ['M']);
    const slots = [...main, ...branchUp, ...branchDn].map((s, i) => ({ ...s, id: 'g'+i }));
    const lastUp = branchUp[branchUp.length-1];
    const lastDn = branchDn[branchDn.length-1];
    const driven = [
      { type: 'flag',     x: lastUp.x + GEAR_DEFS.M.r + 22, y: lastUp.y },
      { type: 'windmill', x: lastDn.x + GEAR_DEFS.M.r + 22, y: lastDn.y },
    ];
    L.push({ name: 'Y Split', width: 580, height: 360, crank: { x: 40, y: 160 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'M', 'S', 'L'] });
  }
  // L23 — 8 gears mixed with L-bend.
  {
    const seg1 = chainSlots(90, 90, 1, 0, ['M', 'M', 'M', 'M']);
    const last1 = seg1[seg1.length-1];
    const seg2 = chainSlots(last1.x, last1.y + (GEAR_DEFS.M.r*2-4), 0, 1, ['M', 'M', 'M', 'M']);
    const slots = [...seg1, ...seg2].map((s, i) => ({ ...s, id: 'g'+i }));
    const last = slots[slots.length-1];
    const driven = { type: 'lift', x: last.x + GEAR_DEFS.M.r + 40, y: last.y };
    L.push({ name: 'Snake', width: 540, height: 420, crank: { x: 40, y: 90 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'S', 'L'] });
  }
  // L24 — 9 mixed sizes in a long chain.
  {
    const slots = chainSlots(70, 150, 1, 0, ['S', 'M', 'S', 'M', 'L', 'M', 'S', 'M', 'S']);
    const last = slots[slots.length-1];
    const driven = { type: 'waterwheel', x: last.x + GEAR_DEFS.S.r + 60, y: 150 };
    L.push({ name: 'Grand Run', width: 700, height: 320, crank: { x: 30, y: 150 }, slots, driven, trayGears: ['S', 'M', 'S', 'M', 'L', 'M', 'S', 'M', 'S', 'L', 'S'] });
  }
  // L25 — Final: T-shape with three driven objects.
  {
    // horizontal trunk
    const trunk = chainSlots(80, 200, 1, 0, ['M', 'M', 'M', 'M', 'M']);
    const mid = trunk[Math.floor(trunk.length / 2)];
    // up branch
    const upBranch = chainSlots(mid.x, mid.y - (GEAR_DEFS.M.r*2-4), 0, -1, ['M', 'M']);
    // last trunk powers a windmill at right; up branch tip powers flag; left start has lift below crank? simpler: 3 driven on three tips of T (left absent — left is crank), so up tip + right tip + down branch tip.
    const dnBranch = chainSlots(mid.x, mid.y + (GEAR_DEFS.M.r*2-4), 0, 1, ['M', 'M']);
    const slots = [...trunk, ...upBranch, ...dnBranch].map((s, i) => ({ ...s, id: 'g'+i }));
    const lastTrunk = trunk[trunk.length-1];
    const lastUp = upBranch[upBranch.length-1];
    const lastDn = dnBranch[dnBranch.length-1];
    const driven = [
      { type: 'windmill', x: lastTrunk.x + GEAR_DEFS.M.r + 24, y: lastTrunk.y },
      { type: 'flag',     x: lastUp.x,    y: lastUp.y - GEAR_DEFS.M.r - 40 },
      { type: 'drawbridge', x: lastDn.x + GEAR_DEFS.M.r + 20, y: lastDn.y },
    ];
    L.push({ name: 'Workshop', width: 680, height: 460, crank: { x: 30, y: 200 }, slots, driven, trayGears: ['M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'M', 'S', 'S', 'L'] });
  }

  return L;
}

export const GEARS_LEVELS = makeLevels();

// ---- Rendering ----
export function renderGearsLevel(container, levelIndex, opts) {
  // Defensive: drag lifts gears to document.body during pointer-capture.
  // If a prior session got into a weird state and stranded one, clean it up.
  document.querySelectorAll('body > .gear-part').forEach(el => el.remove());

  const level = GEARS_LEVELS[levelIndex];
  if (!level) {
    container.innerHTML = '<p style="padding:20px;">Level not found.</p>';
    return;
  }

  // Normalise driven into array.
  const drivens = Array.isArray(level.driven) ? level.driven : [level.driven];

  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="gears-stage">
      <div class="gears-frame" id="gears-frame"
           style="width:${level.width}px;height:${level.height}px;">
        <svg class="gears-bg" viewBox="0 0 ${level.width} ${level.height}"
             width="${level.width}" height="${level.height}"
             style="position:absolute;inset:0;pointer-events:none;overflow:visible;">
          ${chainLines(level)}
          ${crankSvg(level.crank.x, level.crank.y)}
          ${drivens.map(d => drivenSvg(d.type, d.x, d.y)).join('')}
        </svg>
      </div>
      <div class="parts-tray gears-tray" id="gears-tray"></div>
    </div>
  `;

  const frame = container.querySelector('#gears-frame');
  const tray = container.querySelector('#gears-tray');

  // ----- Slot elements (dashed outlines) -----
  const slotEls = {};
  level.slots.forEach((slot, idx) => {
    const def = GEAR_DEFS[slot.size];
    const d = def.r * 2 + 6;
    const el = document.createElement('div');
    el.className = 'gear-slot';
    el.dataset.id = slot.id;
    el.dataset.size = slot.size;
    el.dataset.idx = String(idx);
    el.style.left = (slot.x - d / 2) + 'px';
    el.style.top  = (slot.y - d / 2) + 'px';
    el.style.width  = d + 'px';
    el.style.height = d + 'px';
    el.innerHTML = gearSvgEl(slot.size, { outline: true });
    frame.appendChild(el);
    slotEls[slot.id] = el;
  });

  // ----- Tray gears -----
  // Shuffle tray order so decoys are mixed in.
  const trayGearList = shuffled(level.trayGears);
  const gearEls = [];
  trayGearList.forEach((size, i) => {
    const def = GEAR_DEFS[size];
    const d = def.r * 2 + 6;
    const part = document.createElement('div');
    part.className = 'gear-part';
    part.dataset.size = size;
    part.dataset.trayIdx = String(i);
    part.style.width = d + 'px';
    part.style.height = d + 'px';
    // Ensure touch target is at least 60px (touch-first).
    if (d < 60) {
      part.style.padding = ((60 - d) / 2) + 'px';
    }
    part.innerHTML = gearSvgEl(size);
    tray.appendChild(part);
    gearEls.push(part);
    setupDrag(part);
  });

  let placedCount = 0;
  let won = false;

  function setupDrag(part) {
    let dragging = false;
    let pointerId = null;
    let offsetX = 0, offsetY = 0;
    let homeRect = null;

    part.addEventListener('pointerdown', (e) => {
      if (part.classList.contains('placed') || won) return;
      e.preventDefault();
      dragging = true;
      pointerId = e.pointerId;
      try { part.setPointerCapture(e.pointerId); } catch (_) {}
      const rect = part.getBoundingClientRect();
      homeRect = rect;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.body.appendChild(part);
      part.style.position = 'fixed';
      part.style.left = rect.left + 'px';
      part.style.top  = rect.top + 'px';
      part.style.zIndex = '9999';
      part.style.transition = 'none';
      part.classList.add('dragging');
      sfx.pickup();
    });

    part.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      part.style.left = (e.clientX - offsetX) + 'px';
      part.style.top  = (e.clientY - offsetY) + 'px';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { part.releasePointerCapture(pointerId); } catch (_) {}
      part.classList.remove('dragging');
      const cx = e.clientX, cy = e.clientY;

      // Find the closest unfilled matching slot under the pointer.
      let target = null;
      let targetSlot = null;
      let bestDist = Infinity;
      for (const slot of level.slots) {
        const el = slotEls[slot.id];
        if (el.classList.contains('filled')) continue;
        if (slot.size !== part.dataset.size) continue;
        const sr = el.getBoundingClientRect();
        const sx = sr.left + sr.width / 2;
        const sy = sr.top + sr.height / 2;
        const dist = Math.hypot(cx - sx, cy - sy);
        const acceptR = GEAR_DEFS[slot.size].r + 20; // generous touch tolerance
        if (dist < acceptR && dist < bestDist) {
          bestDist = dist;
          target = el;
          targetSlot = slot;
        }
      }

      let snapped = false;
      if (target && targetSlot) {
        const sr = target.getBoundingClientRect();
        part.style.transition = 'left 0.18s ease, top 0.18s ease';
        part.style.left = sr.left + 'px';
        part.style.top  = sr.top + 'px';
        target.classList.add('filled');
        part.classList.add('placed');
        part.dataset.slotId = targetSlot.id;
        snapped = true;
        sfx.snap();
        placedCount++;
        setTimeout(() => {
          // Always re-parent — even if `won` just got set, the win animation
          // needs every gear inside the frame. If we skip this, the last gear
          // is stranded on document.body and survives the next level render.
          frame.appendChild(part);
          const def = GEAR_DEFS[targetSlot.size];
          const d = def.r * 2 + 6;
          part.style.position = 'absolute';
          part.style.left = (targetSlot.x - d / 2) + 'px';
          part.style.top  = (targetSlot.y - d / 2) + 'px';
          part.style.padding = '';
          part.style.zIndex = '10';
          part.style.transition = '';
        }, 200);
        if (placedCount === level.slots.length) {
          won = true;
          setTimeout(onWin, 450);
        }
      } else {
        // Check if dropped on a wrong-size slot for reject feedback.
        let wrongSlotHit = false;
        for (const slot of level.slots) {
          const el = slotEls[slot.id];
          if (el.classList.contains('filled')) continue;
          if (slot.size === part.dataset.size) continue;
          const sr = el.getBoundingClientRect();
          if (cx >= sr.left - 10 && cx <= sr.right + 10 &&
              cy >= sr.top - 10  && cy <= sr.bottom + 10) {
            wrongSlotHit = true;
            break;
          }
        }
        part.style.transition = 'left 0.22s ease, top 0.22s ease';
        part.style.left = homeRect.left + 'px';
        part.style.top  = homeRect.top + 'px';
        sfx.reject();
        if (wrongSlotHit) {
          part.classList.add('wrong-shake');
          setTimeout(() => part.classList.remove('wrong-shake'), 360);
        }
        setTimeout(() => {
          if (!part.classList.contains('placed')) {
            tray.appendChild(part);
            part.style.position = '';
            part.style.left = '';
            part.style.top = '';
            part.style.transition = '';
            part.style.zIndex = '';
          }
        }, 240);
      }
    }
    part.addEventListener('pointerup', endDrag);
    part.addEventListener('pointercancel', endDrag);
  }

  function onWin() {
    sfx.win();
    // Determine spin direction per slot via BFS from crank (nearest slot to crank is index 0).
    // Adjacent slots (centres within sum of radii + tolerance) alternate direction.
    const dirs = computeSpinDirections(level);
    frame.classList.add('gears-running');

    // Apply rotation animations.
    gearEls.forEach((el) => {
      if (!el.classList.contains('placed')) return;
      const slotId = el.dataset.slotId;
      const dir = dirs[slotId] || 1;
      const size = el.dataset.size;
      // Larger gears rotate slower (so they appear meshed). Period proportional to radius.
      const period = (GEAR_DEFS[size].r / 24) * 1.2; // S=1.2s, M=1.8s, L=2.5s
      el.style.animation = `gearSpin${dir > 0 ? 'CW' : 'CCW'} ${period}s linear infinite`;
    });

    // Star burst
    const rect = frame.getBoundingClientRect();
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
    opts.onComplete(levelIndex);
    setTimeout(() => showWinOverlay(), 1500);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < GEARS_LEVELS.length;
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

  container.querySelector('[data-act="back"]').addEventListener('click', opts.onBack);
}

// Compute alternating spin directions starting from the slot nearest to the crank.
function computeSpinDirections(level) {
  const dirs = {};
  if (!level.slots.length) return dirs;
  // Find slot closest to crank.
  let startIdx = 0;
  let bestD = Infinity;
  level.slots.forEach((s, i) => {
    const d = Math.hypot(s.x - level.crank.x, s.y - level.crank.y);
    if (d < bestD) { bestD = d; startIdx = i; }
  });
  dirs[level.slots[startIdx].id] = 1; // CW

  // BFS by meshing distance.
  const visited = new Set([startIdx]);
  const queue = [startIdx];
  while (queue.length) {
    const i = queue.shift();
    const a = level.slots[i];
    const ra = GEAR_DEFS[a.size].r;
    level.slots.forEach((b, j) => {
      if (visited.has(j)) return;
      const rb = GEAR_DEFS[b.size].r;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      // Treat as meshing if distance ~ ra+rb (allow tolerance).
      if (Math.abs(d - (ra + rb)) < 12) {
        dirs[b.id] = -dirs[a.id];
        visited.add(j);
        queue.push(j);
      }
    });
  }
  // Any leftover slots (disconnected): default CW.
  level.slots.forEach((s) => { if (dirs[s.id] === undefined) dirs[s.id] = 1; });
  return dirs;
}

// Draw faint dashed connector lines between meshing slots to visually suggest the chain.
function chainLines(level) {
  const lines = [];
  // Crank → nearest slot
  let nearest = null, bestD = Infinity;
  level.slots.forEach((s) => {
    const d = Math.hypot(s.x - level.crank.x, s.y - level.crank.y);
    if (d < bestD) { bestD = d; nearest = s; }
  });
  if (nearest) {
    lines.push(`<line x1="${level.crank.x}" y1="${level.crank.y}" x2="${nearest.x}" y2="${nearest.y}"
                      stroke="rgba(255,255,255,0.12)" stroke-width="3" stroke-dasharray="4 4"/>`);
  }
  // Adjacent (meshing) slots
  for (let i = 0; i < level.slots.length; i++) {
    const a = level.slots[i];
    const ra = GEAR_DEFS[a.size].r;
    for (let j = i + 1; j < level.slots.length; j++) {
      const b = level.slots[j];
      const rb = GEAR_DEFS[b.size].r;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (Math.abs(d - (ra + rb)) < 12) {
        lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
                          stroke="rgba(255,255,255,0.12)" stroke-width="3" stroke-dasharray="4 4"/>`);
      }
    }
  }
  // Last slot → driven
  const drivens = Array.isArray(level.driven) ? level.driven : [level.driven];
  drivens.forEach((dv) => {
    let nearestSlot = null, bd = Infinity;
    level.slots.forEach((s) => {
      const dd = Math.hypot(s.x - dv.x, s.y - dv.y);
      if (dd < bd) { bd = dd; nearestSlot = s; }
    });
    if (nearestSlot) {
      lines.push(`<line x1="${nearestSlot.x}" y1="${nearestSlot.y}" x2="${dv.x}" y2="${dv.y}"
                        stroke="rgba(255,255,255,0.12)" stroke-width="3" stroke-dasharray="4 4"/>`);
    }
  });
  return lines.join('');
}

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
