// Lego mechanic: build models brick-by-brick following step-by-step instructions.
//
// Each level is a sequence of build steps. The player drags the highlighted
// "next block" from a tray onto the baseplate at the matching grid position.
// Difficulty ramps via "ghost outline" visibility:
//   L1-L5  (vehicles):    full ghost + arrow.
//   L6-L10 (animals):     faint ghost (40% opacity).
//   L11-L15 (buildings):  ghost only appears when dragging within ~80px.
//   L16-L20 (space):      no ghost. Silhouette preview of finished model in corner.
//
// Tray decoys appear from L6 onward (1-3 wrong blocks alongside the right one).
//
// Reuses the pointer-events drag pattern from robot.js.

import { sfx } from './sound.js';

// ----- Constants -----
const STUD = 30;                  // 1 stud = 30px on the baseplate
const TRAY_SCALE = 1.5;           // tray blocks render bigger so 1x1 isn't a finger-killer
const BOARD_W = 14;               // baseplate width in studs (420px)
const BOARD_H = 14;               // baseplate height in studs (420px)
const SNAP_TOL = 45;              // px tolerance for snapping to ghost spot
const PROX_REVEAL = 80;           // px proximity to reveal ghost (L11+)

// ----- Colors (Lego-ish, kid friendly) -----
const COLORS = {
  red:        { fill: '#d33b3b', shadow: '#8a1f1f', highlight: '#ff6e6e', stud: '#a82a2a' },
  blue:       { fill: '#2a6fd6', shadow: '#1a417f', highlight: '#5a9aff', stud: '#1f56a8' },
  yellow:     { fill: '#ffd23a', shadow: '#b58a14', highlight: '#fff08a', stud: '#d8a82a' },
  green:      { fill: '#3aaa46', shadow: '#1c6724', highlight: '#7fdc7f', stud: '#2c8233' },
  orange:     { fill: '#ff8a2a', shadow: '#a8551a', highlight: '#ffb472', stud: '#cc6e1f' },
  white:      { fill: '#f4f4f0', shadow: '#bdbdb5', highlight: '#ffffff', stud: '#d8d8d0' },
  black:      { fill: '#272a30', shadow: '#0e0f12', highlight: '#48505a', stud: '#181a1f' },
  brown:      { fill: '#7a4a26', shadow: '#4a2a12', highlight: '#a7724a', stud: '#5e3819' },
  lightGrey:  { fill: '#a8b0b8', shadow: '#6a7078', highlight: '#d4d8dc', stud: '#878d94' },
  darkGrey:   { fill: '#525a64', shadow: '#2a2f36', highlight: '#7a838e', stud: '#3e444c' },
  lightBlue:  { fill: '#7ec8ff', shadow: '#3a8ac4', highlight: '#bfe2ff', stud: '#5fa8e6' },
  pink:       { fill: '#ff8ec8', shadow: '#b8528d', highlight: '#ffb8de', stud: '#e070ad' },
};

// ----- SVG block renderer -----
// w,h in studs. Renders a side-view brick with shadow stripe, highlight, and studs.
function blockSvg(w, h, colorName, opts = {}) {
  const c = COLORS[colorName] || COLORS.lightGrey;
  const px = w * STUD;
  const py = h * STUD;
  const ghost = !!opts.ghost;
  const scale = opts.scale ?? 1;

  // ghost = dashed outline only
  if (ghost) {
    return `
      <svg viewBox="0 0 ${px} ${py}" width="${px * scale}" height="${py * scale}"
           style="display:block;pointer-events:none;overflow:visible;">
        <rect x="1" y="1" width="${px - 2}" height="${py - 2}" rx="3"
              fill="rgba(255,255,255,0.06)" stroke="#9aa6b3" stroke-width="2"
              stroke-dasharray="6 4"/>
        ${studsRow(w, h, '#9aa6b3', true)}
      </svg>
    `;
  }

  // shadow stripe at bottom, highlight stripe at top
  const shadowH = Math.min(6, py * 0.18);
  const highlightH = Math.min(4, py * 0.12);

  return `
    <svg viewBox="0 0 ${px} ${py}" width="${px * scale}" height="${py * scale}"
         style="display:block;pointer-events:none;overflow:visible;">
      <rect x="0" y="0" width="${px}" height="${py}" rx="3" fill="${c.fill}"
            stroke="${c.shadow}" stroke-width="2"/>
      <rect x="2" y="2" width="${px - 4}" height="${highlightH}" rx="2"
            fill="${c.highlight}" opacity="0.55"/>
      <rect x="2" y="${py - shadowH - 2}" width="${px - 4}" height="${shadowH}" rx="2"
            fill="${c.shadow}" opacity="0.55"/>
      ${studsRow(w, h, c.stud, false)}
    </svg>
  `;
}

// Studs on top of the brick (row of w circles).
function studsRow(w, h, color, isGhost) {
  let s = '';
  const r = STUD * 0.28;
  const y = -r * 0.6; // protrude above the brick top
  for (let i = 0; i < w; i++) {
    const cx = i * STUD + STUD / 2;
    if (isGhost) {
      s += `<circle cx="${cx}" cy="${y}" r="${r}" fill="none" stroke="${color}"
                    stroke-width="1.5" stroke-dasharray="3 2"/>`;
    } else {
      s += `<circle cx="${cx}" cy="${y}" r="${r}" fill="${color}"
                    stroke="rgba(0,0,0,0.25)" stroke-width="1"/>`;
      s += `<circle cx="${cx - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}"
                    fill="rgba(255,255,255,0.4)"/>`;
    }
  }
  return s;
}

// Silhouette of the whole completed model (used in L16-L20 corner preview).
function silhouetteSvg(steps, modelW, modelH) {
  const px = modelW * STUD;
  const py = modelH * STUD;
  let s = '';
  for (const step of steps) {
    const [sw, sh] = step.size;
    const [sx, sy] = step.pos;
    s += `<rect x="${sx * STUD}" y="${sy * STUD}" width="${sw * STUD}"
                height="${sh * STUD}" rx="2" fill="rgba(255,255,255,0.85)"/>`;
  }
  return `
    <svg viewBox="0 0 ${px} ${py}" width="100%" height="100%"
         preserveAspectRatio="xMidYMid meet"
         style="display:block;overflow:visible;">
      ${s}
    </svg>
  `;
}

// Shuffle helper
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----- Decoy generation -----
// Returns N "wrong" blocks (different size or color than target).
function makeDecoys(target, count) {
  const sizes = [[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[1,4],[2,4]];
  const colorNames = Object.keys(COLORS);
  const decoys = [];
  let tries = 0;
  while (decoys.length < count && tries < 50) {
    tries++;
    const sz = sizes[Math.floor(Math.random() * sizes.length)];
    const col = colorNames[Math.floor(Math.random() * colorNames.length)];
    // Must differ from target in size OR color
    const sameSize = sz[0] === target.size[0] && sz[1] === target.size[1];
    const sameColor = col === target.color;
    if (sameSize && sameColor) continue;
    // Avoid duplicates among decoys
    const dup = decoys.find(d => d.size[0]===sz[0] && d.size[1]===sz[1] && d.color===col);
    if (dup) continue;
    decoys.push({ size: sz, color: col });
  }
  return decoys;
}

// ===================================================================
// LEVEL DEFINITIONS
// Each step: { size:[w,h], color, pos:[x,y] } in studs.
// modelW/modelH = bounding box of the completed model in studs.
// difficulty: 'full' | 'faint' | 'proximity' | 'silhouette'
// decoys: number of wrong blocks to add to the tray each step
// finishAnim: 'driveRight' | 'wagTail' | 'liftOff' | 'bobUpDown' | 'spin'
// ===================================================================

export const LEGO_LEVELS = [
  // ============== VEHICLES (L1-L5) — full ghost ==============
  {
    name: 'Red Car', theme: 'vehicles', difficulty: 'full', decoys: 0,
    modelW: 10, modelH: 6, finishAnim: 'driveRight',
    steps: [
      { size: [2, 1], color: 'black',    pos: [1, 4] }, // rear wheel
      { size: [2, 1], color: 'black',    pos: [6, 4] }, // front wheel
      { size: [8, 1], color: 'darkGrey', pos: [1, 3] }, // chassis
      { size: [6, 2], color: 'red',      pos: [2, 1] }, // body
      { size: [3, 1], color: 'lightBlue',pos: [3, 0] }, // cabin window
      { size: [1, 1], color: 'yellow',   pos: [7, 1] }, // headlight
    ],
  },
  {
    name: 'Pickup Truck', theme: 'vehicles', difficulty: 'full', decoys: 0,
    modelW: 12, modelH: 7, finishAnim: 'driveRight',
    steps: [
      { size: [2, 1], color: 'black',    pos: [1, 5] }, // rear wheel
      { size: [2, 1], color: 'black',    pos: [8, 5] }, // front wheel
      { size: [10, 1], color: 'darkGrey',pos: [1, 4] }, // chassis
      { size: [6, 2], color: 'lightGrey',pos: [1, 2] }, // truck bed
      { size: [4, 3], color: 'blue',     pos: [7, 1] }, // cab
      { size: [2, 1], color: 'lightBlue',pos: [8, 2] }, // window
      { size: [1, 1], color: 'yellow',   pos: [10, 3] }, // headlight
    ],
  },
  {
    name: 'Aeroplane', theme: 'vehicles', difficulty: 'full', decoys: 0,
    modelW: 12, modelH: 8, finishAnim: 'bobUpDown',
    steps: [
      { size: [8, 2], color: 'white',    pos: [2, 4] }, // fuselage
      { size: [1, 1], color: 'lightBlue',pos: [3, 4] }, // window 1
      { size: [1, 1], color: 'lightBlue',pos: [5, 4] }, // window 2
      { size: [1, 1], color: 'lightBlue',pos: [7, 4] }, // window 3
      { size: [2, 1], color: 'red',      pos: [9, 3] }, // nose
      { size: [12, 1], color: 'lightGrey',pos: [0, 6] }, // wings
      { size: [3, 1], color: 'red',      pos: [1, 3] }, // tail
      { size: [2, 1], color: 'red',      pos: [10, 5] }, // tail fin
    ],
  },
  {
    name: 'Rocket', theme: 'vehicles', difficulty: 'full', decoys: 0,
    modelW: 6, modelH: 12, finishAnim: 'liftOff',
    steps: [
      { size: [4, 2], color: 'white',    pos: [1, 8] }, // base
      { size: [4, 3], color: 'white',    pos: [1, 5] }, // mid body
      { size: [4, 1], color: 'red',      pos: [1, 4] }, // red stripe
      { size: [2, 2], color: 'white',    pos: [2, 2] }, // top
      { size: [2, 1], color: 'red',      pos: [2, 1] }, // nose cone bottom
      { size: [1, 1], color: 'red',      pos: [2, 0] }, // tip 1
      { size: [1, 1], color: 'red',      pos: [3, 0] }, // tip 2
      { size: [1, 2], color: 'darkGrey', pos: [0, 9] }, // left fin
      { size: [1, 2], color: 'darkGrey', pos: [5, 9] }, // right fin
      { size: [2, 1], color: 'lightBlue',pos: [2, 6] }, // window
    ],
  },
  {
    name: 'Submarine', theme: 'vehicles', difficulty: 'full', decoys: 0,
    modelW: 12, modelH: 7, finishAnim: 'bobUpDown',
    steps: [
      { size: [8, 3], color: 'yellow',   pos: [2, 3] }, // hull body
      { size: [2, 1], color: 'yellow',   pos: [1, 4] }, // tail
      { size: [2, 1], color: 'yellow',   pos: [9, 4] }, // nose
      { size: [3, 2], color: 'yellow',   pos: [4, 1] }, // tower
      { size: [2, 1], color: 'lightBlue',pos: [4, 1] }, // window
      { size: [1, 1], color: 'red',      pos: [5, 0] }, // periscope tip
      { size: [3, 1], color: 'lightGrey',pos: [1, 5] }, // rudder/bottom fin
    ],
  },

  // ============== ANIMALS (L6-L10) — faint ghost + decoys ==============
  {
    name: 'Dog', theme: 'animals', difficulty: 'faint', decoys: 1,
    modelW: 12, modelH: 8, finishAnim: 'wagTail',
    steps: [
      { size: [1, 2], color: 'brown',    pos: [2, 5] }, // back leg
      { size: [1, 2], color: 'brown',    pos: [4, 5] }, // back leg 2
      { size: [1, 2], color: 'brown',    pos: [7, 5] }, // front leg
      { size: [1, 2], color: 'brown',    pos: [9, 5] }, // front leg 2
      { size: [8, 2], color: 'brown',    pos: [2, 3] }, // body
      { size: [3, 2], color: 'brown',    pos: [8, 1] }, // head
      { size: [1, 1], color: 'black',    pos: [10, 2] }, // nose
      { size: [1, 1], color: 'white',    pos: [9, 1] }, // eye
      { size: [2, 1], color: 'brown',    pos: [7, 0] }, // ear (left)
      { size: [1, 1], color: 'brown',    pos: [1, 3] }, // tail
    ],
  },
  {
    name: 'Fish', theme: 'animals', difficulty: 'faint', decoys: 1,
    modelW: 12, modelH: 6, finishAnim: 'bobUpDown',
    steps: [
      { size: [6, 4], color: 'orange',   pos: [3, 1] }, // body main
      { size: [2, 2], color: 'orange',   pos: [2, 2] }, // body taper left
      { size: [2, 2], color: 'orange',   pos: [9, 2] }, // body taper right (head end)
      { size: [3, 1], color: 'orange',   pos: [0, 1] }, // tail fin top
      { size: [3, 1], color: 'orange',   pos: [0, 4] }, // tail fin bottom
      { size: [1, 1], color: 'black',    pos: [10, 2] }, // eye
      { size: [2, 1], color: 'white',    pos: [4, 5] }, // belly stripe
      { size: [2, 1], color: 'white',    pos: [5, 0] }, // top fin
    ],
  },
  {
    name: 'Bird', theme: 'animals', difficulty: 'faint', decoys: 2,
    modelW: 10, modelH: 8, finishAnim: 'bobUpDown',
    steps: [
      { size: [4, 3], color: 'lightBlue',pos: [3, 3] }, // body
      { size: [2, 2], color: 'lightBlue',pos: [6, 2] }, // head
      { size: [1, 1], color: 'yellow',   pos: [8, 3] }, // beak
      { size: [1, 1], color: 'black',    pos: [7, 2] }, // eye
      { size: [3, 1], color: 'lightBlue',pos: [0, 4] }, // tail feathers
      { size: [2, 1], color: 'white',    pos: [4, 2] }, // wing top
      { size: [2, 1], color: 'white',    pos: [4, 6] }, // belly
      { size: [1, 1], color: 'orange',   pos: [4, 7] }, // foot
    ],
  },
  {
    name: 'Dinosaur', theme: 'animals', difficulty: 'faint', decoys: 2,
    modelW: 13, modelH: 10, finishAnim: 'wagTail',
    steps: [
      { size: [1, 3], color: 'green',    pos: [3, 6] }, // back leg
      { size: [1, 3], color: 'green',    pos: [8, 6] }, // front leg
      { size: [8, 2], color: 'green',    pos: [2, 4] }, // body
      { size: [3, 1], color: 'green',    pos: [0, 5] }, // tail base
      { size: [2, 1], color: 'green',    pos: [0, 4] }, // tail mid
      { size: [3, 3], color: 'green',    pos: [9, 1] }, // head + neck
      { size: [2, 2], color: 'green',    pos: [8, 3] }, // neck
      { size: [1, 1], color: 'white',    pos: [10, 2] }, // eye
      { size: [1, 1], color: 'black',    pos: [11, 2] }, // nostril
      { size: [1, 1], color: 'yellow',   pos: [5, 3] }, // spine spike
      { size: [1, 1], color: 'yellow',   pos: [7, 3] }, // spine spike 2
    ],
  },
  {
    name: 'Snake', theme: 'animals', difficulty: 'faint', decoys: 2,
    modelW: 13, modelH: 9, finishAnim: 'wagTail',
    steps: [
      { size: [3, 1], color: 'green',    pos: [1, 7] }, // tail
      { size: [4, 1], color: 'green',    pos: [3, 6] }, // body 1
      { size: [3, 1], color: 'green',    pos: [7, 5] }, // body 2
      { size: [2, 1], color: 'green',    pos: [9, 4] }, // body 3
      { size: [2, 1], color: 'green',    pos: [8, 3] }, // body 4
      { size: [2, 1], color: 'green',    pos: [6, 2] }, // body 5
      { size: [3, 2], color: 'green',    pos: [3, 1] }, // head
      { size: [1, 1], color: 'red',      pos: [2, 1] }, // tongue
      { size: [1, 1], color: 'white',    pos: [4, 1] }, // eye
      { size: [1, 1], color: 'yellow',   pos: [2, 8] }, // tail rattle
    ],
  },

  // ============== BUILDINGS (L11-L15) — proximity ghost + decoys ==============
  {
    name: 'House', theme: 'buildings', difficulty: 'proximity', decoys: 2,
    modelW: 10, modelH: 10, finishAnim: 'bobUpDown',
    steps: [
      { size: [8, 4], color: 'white',    pos: [1, 5] }, // walls
      { size: [2, 2], color: 'brown',    pos: [4, 7] }, // door
      { size: [2, 2], color: 'lightBlue',pos: [1, 6] }, // window left
      { size: [2, 2], color: 'lightBlue',pos: [6, 6] }, // window right
      { size: [10, 1], color: 'red',     pos: [0, 4] }, // roof base
      { size: [8, 1], color: 'red',      pos: [1, 3] },
      { size: [6, 1], color: 'red',      pos: [2, 2] },
      { size: [4, 1], color: 'red',      pos: [3, 1] },
      { size: [2, 1], color: 'red',      pos: [4, 0] }, // roof peak
      { size: [1, 1], color: 'darkGrey', pos: [7, 1] }, // chimney
    ],
  },
  {
    name: 'Castle', theme: 'buildings', difficulty: 'proximity', decoys: 2,
    modelW: 12, modelH: 11, finishAnim: 'bobUpDown',
    steps: [
      { size: [10, 5], color: 'lightGrey',pos: [1, 5] }, // main wall
      { size: [2, 6], color: 'lightGrey', pos: [0, 4] }, // left tower
      { size: [2, 6], color: 'lightGrey', pos: [10, 4] }, // right tower
      { size: [2, 3], color: 'brown',     pos: [5, 7] }, // gate
      { size: [1, 1], color: 'darkGrey',  pos: [0, 3] }, // crenellation
      { size: [1, 1], color: 'darkGrey',  pos: [2, 3] }, // crenellation
      { size: [1, 1], color: 'darkGrey',  pos: [9, 3] }, // crenellation
      { size: [1, 1], color: 'darkGrey',  pos: [11, 3] },
      { size: [3, 1], color: 'red',       pos: [4, 4] }, // banner top
      { size: [1, 2], color: 'red',       pos: [5, 5] }, // flag pole
      { size: [1, 1], color: 'yellow',    pos: [5, 2] }, // flag tip
      { size: [2, 2], color: 'lightBlue', pos: [4, 6] }, // window above gate
    ],
  },
  {
    name: 'Lighthouse', theme: 'buildings', difficulty: 'proximity', decoys: 3,
    modelW: 6, modelH: 13, finishAnim: 'bobUpDown',
    steps: [
      { size: [6, 1], color: 'darkGrey', pos: [0, 12] }, // base rocks
      { size: [4, 2], color: 'lightGrey',pos: [1, 10] }, // foot
      { size: [3, 3], color: 'white',    pos: [1, 7] }, // body lower
      { size: [3, 1], color: 'red',      pos: [1, 6] }, // red stripe
      { size: [3, 2], color: 'white',    pos: [1, 4] }, // body upper
      { size: [3, 1], color: 'red',      pos: [1, 3] }, // red stripe
      { size: [4, 1], color: 'darkGrey', pos: [0, 2] }, // platform
      { size: [3, 1], color: 'yellow',   pos: [1, 1] }, // lamp
      { size: [3, 1], color: 'red',      pos: [1, 0] }, // cap
      { size: [1, 1], color: 'lightBlue',pos: [2, 5] }, // window
    ],
  },
  {
    name: 'Windmill', theme: 'buildings', difficulty: 'proximity', decoys: 3,
    modelW: 11, modelH: 12, finishAnim: 'spin',
    steps: [
      { size: [6, 4], color: 'brown',    pos: [3, 8] }, // base
      { size: [4, 3], color: 'brown',    pos: [4, 5] }, // mid
      { size: [4, 1], color: 'red',      pos: [4, 4] }, // roof base
      { size: [2, 1], color: 'red',      pos: [5, 3] }, // roof tip
      { size: [2, 2], color: 'lightBlue',pos: [5, 9] }, // door
      { size: [1, 1], color: 'yellow',   pos: [4, 6] }, // window
      { size: [1, 1], color: 'yellow',   pos: [7, 6] }, // window
      { size: [1, 4], color: 'white',    pos: [6, 0] }, // top blade
      { size: [1, 4], color: 'white',    pos: [6, 5] }, // bottom blade (overlapping)
      { size: [4, 1], color: 'white',    pos: [0, 4] }, // left blade
      { size: [4, 1], color: 'white',    pos: [7, 4] }, // right blade
    ],
  },
  {
    name: 'Treehouse', theme: 'buildings', difficulty: 'proximity', decoys: 3,
    modelW: 11, modelH: 12, finishAnim: 'bobUpDown',
    steps: [
      { size: [2, 7], color: 'brown',    pos: [4, 5] }, // trunk
      { size: [3, 1], color: 'brown',    pos: [3, 6] }, // branch left
      { size: [3, 1], color: 'brown',    pos: [5, 4] }, // branch right
      { size: [11, 4], color: 'green',   pos: [0, 0] }, // leaves canopy
      { size: [3, 3], color: 'brown',    pos: [4, 1] }, // canopy peak overlap (treetop)
      { size: [6, 3], color: 'orange',   pos: [2, 8] }, // house body
      { size: [2, 2], color: 'brown',    pos: [4, 9] }, // door
      { size: [1, 1], color: 'lightBlue',pos: [3, 9] }, // window
      { size: [1, 1], color: 'lightBlue',pos: [6, 9] }, // window
      { size: [8, 1], color: 'red',      pos: [1, 7] }, // roof
      { size: [3, 1], color: 'yellow',   pos: [1, 11] }, // ladder
    ],
  },

  // ============== SPACE (L16-L20) — no ghost, silhouette preview, decoys ==============
  {
    name: 'UFO', theme: 'space', difficulty: 'silhouette', decoys: 3,
    modelW: 12, modelH: 6, finishAnim: 'liftOff',
    steps: [
      { size: [12, 1], color: 'darkGrey', pos: [0, 3] }, // wide disc
      { size: [10, 1], color: 'lightGrey',pos: [1, 2] }, // inner disc top
      { size: [10, 1], color: 'darkGrey', pos: [1, 4] }, // inner disc bottom
      { size: [6, 2], color: 'lightBlue', pos: [3, 0] }, // dome
      { size: [2, 1], color: 'green',     pos: [5, 1] }, // alien
      { size: [1, 1], color: 'yellow',    pos: [2, 5] }, // beam light
      { size: [1, 1], color: 'yellow',    pos: [6, 5] },
      { size: [1, 1], color: 'yellow',    pos: [9, 5] },
      { size: [1, 1], color: 'red',       pos: [0, 3] }, // hull light
      { size: [1, 1], color: 'red',       pos: [11, 3] },
    ],
  },
  {
    name: 'Spaceship', theme: 'space', difficulty: 'silhouette', decoys: 3,
    modelW: 12, modelH: 10, finishAnim: 'liftOff',
    steps: [
      { size: [4, 6], color: 'lightGrey', pos: [4, 1] }, // body
      { size: [2, 2], color: 'lightBlue', pos: [5, 2] }, // cockpit
      { size: [2, 1], color: 'red',       pos: [5, 0] }, // nose
      { size: [3, 1], color: 'white',     pos: [1, 5] }, // left wing
      { size: [3, 1], color: 'white',     pos: [8, 5] }, // right wing
      { size: [1, 2], color: 'red',       pos: [1, 6] }, // left fin
      { size: [1, 2], color: 'red',       pos: [10, 6] }, // right fin
      { size: [4, 1], color: 'darkGrey',  pos: [4, 7] }, // engine block
      { size: [2, 2], color: 'orange',    pos: [5, 8] }, // engine flame
      { size: [1, 1], color: 'yellow',    pos: [5, 9] }, // flame core
      { size: [1, 1], color: 'yellow',    pos: [6, 9] },
    ],
  },
  {
    name: 'Astronaut', theme: 'space', difficulty: 'silhouette', decoys: 3,
    modelW: 8, modelH: 12, finishAnim: 'bobUpDown',
    steps: [
      { size: [4, 3], color: 'white',     pos: [2, 1] }, // helmet
      { size: [2, 2], color: 'lightBlue', pos: [3, 2] }, // visor
      { size: [6, 4], color: 'white',     pos: [1, 4] }, // body suit
      { size: [2, 1], color: 'red',       pos: [3, 5] }, // chest panel
      { size: [1, 1], color: 'yellow',    pos: [3, 6] },
      { size: [1, 1], color: 'green',     pos: [4, 6] },
      { size: [1, 3], color: 'white',     pos: [0, 5] }, // left arm
      { size: [1, 3], color: 'white',     pos: [7, 5] }, // right arm
      { size: [2, 3], color: 'white',     pos: [2, 8] }, // left leg
      { size: [2, 3], color: 'white',     pos: [4, 8] }, // right leg
      { size: [2, 1], color: 'darkGrey',  pos: [2, 11] }, // boot
      { size: [2, 1], color: 'darkGrey',  pos: [4, 11] }, // boot
    ],
  },
  {
    name: 'Robot', theme: 'space', difficulty: 'silhouette', decoys: 3,
    modelW: 8, modelH: 12, finishAnim: 'bobUpDown',
    steps: [
      { size: [4, 3], color: 'lightGrey', pos: [2, 1] }, // head
      { size: [1, 1], color: 'red',       pos: [3, 2] }, // eye
      { size: [1, 1], color: 'red',       pos: [4, 2] }, // eye
      { size: [2, 1], color: 'yellow',    pos: [3, 0] }, // antenna base
      { size: [1, 1], color: 'red',       pos: [3, 0] }, // ant tip note: stacking
      { size: [6, 4], color: 'lightGrey', pos: [1, 4] }, // body
      { size: [2, 1], color: 'green',     pos: [3, 5] }, // chest panel
      { size: [1, 1], color: 'yellow',    pos: [3, 6] },
      { size: [1, 1], color: 'blue',      pos: [4, 6] },
      { size: [1, 3], color: 'darkGrey',  pos: [0, 5] }, // left arm
      { size: [1, 3], color: 'darkGrey',  pos: [7, 5] }, // right arm
      { size: [2, 3], color: 'lightGrey', pos: [2, 8] }, // left leg
      { size: [2, 3], color: 'lightGrey', pos: [4, 8] }, // right leg
      { size: [2, 1], color: 'darkGrey',  pos: [2, 11] }, // foot
      { size: [2, 1], color: 'darkGrey',  pos: [4, 11] },
    ],
  },
  {
    name: 'Space Station', theme: 'space', difficulty: 'silhouette', decoys: 3,
    modelW: 14, modelH: 10, finishAnim: 'spin',
    steps: [
      { size: [4, 4], color: 'lightGrey', pos: [5, 3] }, // central hub
      { size: [2, 2], color: 'lightBlue', pos: [6, 4] }, // window dome
      { size: [3, 1], color: 'darkGrey',  pos: [2, 4] }, // left strut
      { size: [3, 1], color: 'darkGrey',  pos: [9, 4] }, // right strut
      { size: [2, 3], color: 'white',     pos: [0, 3] }, // left panel
      { size: [2, 3], color: 'white',     pos: [12, 3] }, // right panel
      { size: [2, 1], color: 'lightBlue', pos: [0, 3] }, // panel detail
      { size: [2, 1], color: 'lightBlue', pos: [12, 3] },
      { size: [1, 3], color: 'darkGrey',  pos: [6, 0] }, // top strut
      { size: [3, 1], color: 'lightGrey', pos: [5, 0] }, // top antenna array
      { size: [1, 2], color: 'darkGrey',  pos: [6, 7] }, // bottom strut
      { size: [4, 1], color: 'lightGrey', pos: [5, 9] }, // bottom dock
      { size: [1, 1], color: 'red',       pos: [5, 9] }, // dock light
      { size: [1, 1], color: 'red',       pos: [8, 9] }, // dock light
    ],
  },

  // ============== DINOSAURS (L21-L25) — silhouette, decoys ==============
  {
    name: 'T-Rex', theme: 'dinosaurs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 11, finishAnim: 'wagTail',
    steps: [
      { size: [1, 3], color: 'green',     pos: [5, 7] }, // back leg
      { size: [1, 3], color: 'green',     pos: [8, 7] }, // front leg
      { size: [2, 1], color: 'darkGrey',  pos: [5, 10] }, // foot
      { size: [2, 1], color: 'darkGrey',  pos: [8, 10] }, // foot
      { size: [8, 2], color: 'green',     pos: [3, 5] }, // body
      { size: [4, 1], color: 'green',     pos: [0, 6] }, // tail base
      { size: [2, 1], color: 'green',     pos: [0, 7] }, // tail tip
      { size: [2, 3], color: 'green',     pos: [10, 3] }, // neck
      { size: [3, 2], color: 'green',     pos: [10, 1] }, // head
      { size: [1, 1], color: 'white',     pos: [11, 2] }, // eye
      { size: [1, 1], color: 'red',       pos: [12, 3] }, // mouth
      { size: [1, 1], color: 'green',     pos: [9, 5] }, // tiny arm
    ],
  },
  {
    name: 'Stegosaurus', theme: 'dinosaurs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 9, finishAnim: 'wagTail',
    steps: [
      { size: [1, 2], color: 'green',     pos: [3, 6] }, // back leg
      { size: [1, 2], color: 'green',     pos: [5, 6] }, // back leg 2
      { size: [1, 2], color: 'green',     pos: [8, 6] }, // front leg
      { size: [1, 2], color: 'green',     pos: [10, 6] }, // front leg 2
      { size: [9, 2], color: 'green',     pos: [2, 4] }, // body
      { size: [3, 1], color: 'green',     pos: [0, 5] }, // tail
      { size: [2, 2], color: 'green',     pos: [11, 3] }, // head
      { size: [1, 1], color: 'white',     pos: [12, 4] }, // eye
      { size: [1, 2], color: 'orange',    pos: [4, 2] }, // plate
      { size: [1, 2], color: 'orange',    pos: [6, 2] }, // plate
      { size: [1, 2], color: 'orange',    pos: [8, 2] }, // plate
      { size: [1, 1], color: 'red',       pos: [0, 6] }, // tail spike
    ],
  },
  {
    name: 'Triceratops', theme: 'dinosaurs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 9, finishAnim: 'wagTail',
    steps: [
      { size: [1, 2], color: 'green',     pos: [3, 6] }, // back leg
      { size: [1, 2], color: 'green',     pos: [5, 6] }, // back leg 2
      { size: [1, 2], color: 'green',     pos: [7, 6] }, // front leg
      { size: [1, 2], color: 'green',     pos: [9, 6] }, // front leg 2
      { size: [8, 2], color: 'green',     pos: [2, 4] }, // body
      { size: [2, 1], color: 'green',     pos: [0, 5] }, // tail
      { size: [3, 3], color: 'green',     pos: [10, 3] }, // head + frill
      { size: [1, 2], color: 'green',     pos: [9, 4] }, // jaw
      { size: [1, 1], color: 'white',     pos: [11, 5] }, // eye
      { size: [1, 1], color: 'lightGrey', pos: [12, 2] }, // horn
      { size: [1, 1], color: 'lightGrey', pos: [10, 2] }, // horn
      { size: [1, 1], color: 'lightGrey', pos: [12, 6] }, // nose horn
    ],
  },
  {
    name: 'Brachiosaurus', theme: 'dinosaurs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 13, finishAnim: 'bobUpDown',
    steps: [
      { size: [1, 3], color: 'green',     pos: [3, 9] }, // back leg
      { size: [1, 3], color: 'green',     pos: [5, 9] }, // back leg 2
      { size: [1, 3], color: 'green',     pos: [7, 9] }, // front leg
      { size: [1, 3], color: 'green',     pos: [9, 9] }, // front leg 2
      { size: [9, 2], color: 'green',     pos: [2, 7] }, // body
      { size: [3, 1], color: 'green',     pos: [0, 8] }, // tail
      { size: [2, 5], color: 'green',     pos: [9, 2] }, // long neck
      { size: [3, 2], color: 'green',     pos: [10, 0] }, // head
      { size: [1, 1], color: 'white',     pos: [11, 1] }, // eye
      { size: [1, 1], color: 'black',     pos: [12, 1] }, // nostril
      { size: [2, 1], color: 'darkGrey',  pos: [3, 12] }, // foot
      { size: [2, 1], color: 'darkGrey',  pos: [7, 12] }, // foot
    ],
  },
  {
    name: 'Pterodactyl', theme: 'dinosaurs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 8, finishAnim: 'bobUpDown',
    steps: [
      { size: [3, 2], color: 'brown',     pos: [5, 3] }, // body
      { size: [2, 2], color: 'brown',     pos: [8, 2] }, // head
      { size: [2, 1], color: 'yellow',    pos: [10, 3] }, // beak
      { size: [1, 1], color: 'white',     pos: [8, 2] }, // eye
      { size: [1, 1], color: 'red',       pos: [8, 1] }, // crest
      { size: [4, 1], color: 'brown',     pos: [1, 2] }, // left wing inner
      { size: [3, 1], color: 'brown',     pos: [0, 1] }, // left wing outer
      { size: [4, 1], color: 'brown',     pos: [8, 5] }, // right wing inner (lower)
      { size: [3, 1], color: 'brown',     pos: [10, 6] }, // right wing outer
      { size: [1, 2], color: 'brown',     pos: [6, 5] }, // tail
      { size: [1, 1], color: 'darkGrey',  pos: [6, 7] }, // tail tip
    ],
  },

  // ============== UNDERWATER (L26-L30) — silhouette, decoys ==============
  {
    name: 'Shark', theme: 'underwater', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 7, finishAnim: 'wagTail',
    steps: [
      { size: [7, 3], color: 'lightGrey', pos: [3, 2] }, // body
      { size: [2, 2], color: 'lightGrey', pos: [10, 2] }, // head taper
      { size: [2, 1], color: 'white',     pos: [10, 4] }, // belly
      { size: [3, 1], color: 'white',     pos: [4, 5] }, // belly mid
      { size: [3, 1], color: 'lightGrey', pos: [0, 1] }, // tail upper
      { size: [3, 1], color: 'lightGrey', pos: [0, 4] }, // tail lower
      { size: [1, 1], color: 'lightGrey', pos: [3, 5] }, // bottom fin
      { size: [2, 1], color: 'lightGrey', pos: [6, 1] }, // top fin
      { size: [1, 1], color: 'black',     pos: [11, 3] }, // eye
      { size: [3, 1], color: 'white',     pos: [9, 4] }, // teeth
    ],
  },
  {
    name: 'Octopus', theme: 'underwater', difficulty: 'silhouette', decoys: 3,
    modelW: 11, modelH: 10, finishAnim: 'wagTail',
    steps: [
      { size: [5, 3], color: 'pink',      pos: [3, 1] }, // head/body
      { size: [3, 1], color: 'pink',      pos: [4, 0] }, // top of head
      { size: [3, 1], color: 'pink',      pos: [4, 4] }, // base of head
      { size: [1, 1], color: 'white',     pos: [4, 2] }, // eye
      { size: [1, 1], color: 'white',     pos: [6, 2] }, // eye
      { size: [1, 1], color: 'black',     pos: [4, 2] }, // pupil
      { size: [1, 4], color: 'pink',      pos: [1, 5] }, // tentacle
      { size: [1, 5], color: 'pink',      pos: [3, 5] }, // tentacle
      { size: [1, 5], color: 'pink',      pos: [5, 5] }, // tentacle
      { size: [1, 5], color: 'pink',      pos: [7, 5] }, // tentacle
      { size: [1, 4], color: 'pink',      pos: [9, 5] }, // tentacle
      { size: [1, 1], color: 'pink',      pos: [0, 8] }, // curl
      { size: [1, 1], color: 'pink',      pos: [10, 8] }, // curl
    ],
  },
  {
    name: 'Sub', theme: 'underwater', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 8, finishAnim: 'driveRight',
    steps: [
      { size: [9, 3], color: 'yellow',    pos: [2, 3] }, // hull
      { size: [2, 1], color: 'yellow',    pos: [1, 4] }, // tail
      { size: [2, 1], color: 'yellow',    pos: [11, 4] }, // nose
      { size: [3, 2], color: 'yellow',    pos: [5, 1] }, // tower
      { size: [2, 1], color: 'lightBlue', pos: [5, 1] }, // tower window
      { size: [1, 1], color: 'red',       pos: [6, 0] }, // periscope
      { size: [1, 1], color: 'lightBlue', pos: [4, 4] }, // porthole
      { size: [1, 1], color: 'lightBlue', pos: [7, 4] }, // porthole
      { size: [1, 1], color: 'lightBlue', pos: [9, 4] }, // porthole
      { size: [3, 1], color: 'darkGrey',  pos: [3, 6] }, // bottom fin
      { size: [1, 1], color: 'lightGrey', pos: [0, 4] }, // propeller
    ],
  },
  {
    name: 'Whale', theme: 'underwater', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 7, finishAnim: 'bobUpDown',
    steps: [
      { size: [8, 3], color: 'blue',      pos: [3, 2] }, // body
      { size: [2, 1], color: 'blue',      pos: [2, 3] }, // body taper left
      { size: [2, 1], color: 'blue',      pos: [11, 3] }, // head taper
      { size: [3, 1], color: 'blue',      pos: [0, 2] }, // tail upper
      { size: [3, 1], color: 'blue',      pos: [0, 4] }, // tail lower
      { size: [7, 1], color: 'lightBlue', pos: [4, 5] }, // belly
      { size: [1, 1], color: 'white',     pos: [11, 3] }, // eye
      { size: [1, 1], color: 'black',     pos: [12, 3] }, // mouth
      { size: [2, 1], color: 'blue',      pos: [6, 1] }, // top fin
      { size: [1, 2], color: 'lightBlue', pos: [6, 0] }, // water spout
      { size: [1, 1], color: 'lightBlue', pos: [7, 0] }, // spout droplet
    ],
  },
  {
    name: 'Crab', theme: 'underwater', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 8, finishAnim: 'wagTail',
    steps: [
      { size: [7, 3], color: 'red',       pos: [3, 3] }, // body
      { size: [5, 1], color: 'red',       pos: [4, 2] }, // body top
      { size: [1, 1], color: 'white',     pos: [5, 2] }, // eye
      { size: [1, 1], color: 'white',     pos: [7, 2] }, // eye
      { size: [1, 1], color: 'red',       pos: [5, 1] }, // eye stalk
      { size: [1, 1], color: 'red',       pos: [7, 1] }, // eye stalk
      { size: [2, 2], color: 'red',       pos: [0, 3] }, // left claw
      { size: [2, 2], color: 'red',       pos: [11, 3] }, // right claw
      { size: [1, 2], color: 'red',       pos: [2, 6] }, // leg
      { size: [1, 2], color: 'red',       pos: [4, 6] }, // leg
      { size: [1, 2], color: 'red',       pos: [8, 6] }, // leg
      { size: [1, 2], color: 'red',       pos: [10, 6] }, // leg
    ],
  },

  // ============== ROBOTS / MECHS (L31-L35) — silhouette, decoys ==============
  {
    name: 'Mech-Warrior', theme: 'mechs', difficulty: 'silhouette', decoys: 3,
    modelW: 10, modelH: 13, finishAnim: 'bobUpDown',
    steps: [
      { size: [4, 3], color: 'darkGrey',  pos: [3, 1] }, // head
      { size: [1, 1], color: 'red',       pos: [4, 2] }, // eye
      { size: [1, 1], color: 'red',       pos: [5, 2] }, // eye
      { size: [1, 1], color: 'yellow',    pos: [3, 0] }, // antenna
      { size: [6, 4], color: 'lightGrey', pos: [2, 4] }, // torso
      { size: [2, 1], color: 'red',       pos: [4, 5] }, // chest plate
      { size: [1, 4], color: 'darkGrey',  pos: [0, 4] }, // left arm
      { size: [1, 4], color: 'darkGrey',  pos: [9, 4] }, // right arm
      { size: [2, 1], color: 'orange',    pos: [0, 8] }, // left fist (gun)
      { size: [2, 1], color: 'orange',    pos: [8, 8] }, // right fist (gun)
      { size: [2, 4], color: 'lightGrey', pos: [2, 8] }, // left leg
      { size: [2, 4], color: 'lightGrey', pos: [6, 8] }, // right leg
      { size: [3, 1], color: 'darkGrey',  pos: [1, 12] }, // left foot
      { size: [3, 1], color: 'darkGrey',  pos: [6, 12] }, // right foot
    ],
  },
  {
    name: 'Mech-Tank', theme: 'mechs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 9, finishAnim: 'driveRight',
    steps: [
      { size: [11, 3], color: 'green',    pos: [1, 4] }, // body
      { size: [11, 1], color: 'darkGrey', pos: [1, 7] }, // tread base
      { size: [2, 1], color: 'black',     pos: [1, 8] }, // wheel
      { size: [2, 1], color: 'black',     pos: [5, 8] }, // wheel
      { size: [2, 1], color: 'black',     pos: [10, 8] }, // wheel
      { size: [5, 2], color: 'green',     pos: [3, 2] }, // turret
      { size: [4, 1], color: 'darkGrey',  pos: [9, 3] }, // gun barrel
      { size: [1, 1], color: 'red',       pos: [4, 2] }, // hatch light
      { size: [1, 1], color: 'lightBlue', pos: [5, 2] }, // scope
      { size: [2, 1], color: 'green',     pos: [4, 1] }, // top hatch
      { size: [1, 1], color: 'yellow',    pos: [12, 3] }, // muzzle
    ],
  },
  {
    name: 'Mech-Bird', theme: 'mechs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 8, finishAnim: 'liftOff',
    steps: [
      { size: [5, 2], color: 'lightGrey', pos: [4, 3] }, // body
      { size: [2, 2], color: 'lightGrey', pos: [9, 2] }, // head
      { size: [2, 1], color: 'yellow',    pos: [11, 3] }, // beak
      { size: [1, 1], color: 'red',       pos: [9, 2] }, // eye
      { size: [4, 1], color: 'darkGrey',  pos: [0, 2] }, // left wing outer
      { size: [3, 1], color: 'lightGrey', pos: [1, 3] }, // left wing inner
      { size: [4, 1], color: 'darkGrey',  pos: [5, 1] }, // top wing strut
      { size: [3, 1], color: 'lightGrey', pos: [3, 5] }, // tail
      { size: [1, 2], color: 'darkGrey',  pos: [5, 5] }, // leg
      { size: [1, 2], color: 'darkGrey',  pos: [7, 5] }, // leg
      { size: [2, 1], color: 'orange',    pos: [4, 7] }, // foot/jet
      { size: [2, 1], color: 'orange',    pos: [7, 7] }, // foot/jet
    ],
  },
  {
    name: 'Mech-Spider', theme: 'mechs', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 9, finishAnim: 'bobUpDown',
    steps: [
      { size: [5, 3], color: 'darkGrey',  pos: [4, 3] }, // body
      { size: [3, 1], color: 'lightGrey', pos: [5, 2] }, // dome top
      { size: [1, 1], color: 'red',       pos: [5, 3] }, // eye
      { size: [1, 1], color: 'red',       pos: [7, 3] }, // eye
      { size: [3, 1], color: 'lightGrey', pos: [5, 6] }, // belly
      { size: [1, 3], color: 'darkGrey',  pos: [2, 1] }, // upper-left leg
      { size: [2, 1], color: 'darkGrey',  pos: [0, 3] }, // leg foot
      { size: [1, 3], color: 'darkGrey',  pos: [10, 1] }, // upper-right leg
      { size: [2, 1], color: 'darkGrey',  pos: [11, 3] }, // leg foot
      { size: [1, 3], color: 'darkGrey',  pos: [2, 6] }, // lower-left leg
      { size: [2, 1], color: 'darkGrey',  pos: [0, 8] }, // leg foot
      { size: [1, 3], color: 'darkGrey',  pos: [10, 6] }, // lower-right leg
      { size: [2, 1], color: 'darkGrey',  pos: [11, 8] }, // leg foot
    ],
  },
  {
    name: 'Battle-Bot', theme: 'mechs', difficulty: 'silhouette', decoys: 3,
    modelW: 10, modelH: 12, finishAnim: 'bobUpDown',
    steps: [
      { size: [4, 3], color: 'orange',    pos: [3, 0] }, // head
      { size: [2, 1], color: 'lightBlue', pos: [4, 1] }, // visor
      { size: [1, 1], color: 'red',       pos: [3, 0] }, // antenna light
      { size: [1, 1], color: 'red',       pos: [6, 0] }, // antenna light
      { size: [6, 4], color: 'orange',    pos: [2, 3] }, // torso
      { size: [2, 2], color: 'yellow',    pos: [4, 4] }, // core
      { size: [1, 1], color: 'red',       pos: [4, 5] }, // core dot
      { size: [1, 3], color: 'darkGrey',  pos: [0, 4] }, // left arm
      { size: [1, 3], color: 'darkGrey',  pos: [9, 4] }, // right arm
      { size: [2, 1], color: 'lightGrey', pos: [0, 7] }, // left claw
      { size: [2, 1], color: 'lightGrey', pos: [8, 7] }, // right claw
      { size: [2, 4], color: 'orange',    pos: [2, 7] }, // left leg
      { size: [2, 4], color: 'orange',    pos: [6, 7] }, // right leg
      { size: [3, 1], color: 'darkGrey',  pos: [1, 11] }, // foot
      { size: [3, 1], color: 'darkGrey',  pos: [6, 11] }, // foot
    ],
  },

  // ============== BIG BUILDS (L36-L40) — silhouette, decoys ==============
  {
    name: 'City Skyline', theme: 'big', difficulty: 'silhouette', decoys: 3,
    modelW: 14, modelH: 12, finishAnim: 'bobUpDown',
    steps: [
      { size: [3, 7], color: 'lightGrey', pos: [0, 4] }, // building 1
      { size: [2, 10], color: 'darkGrey', pos: [3, 1] }, // tall tower
      { size: [3, 8], color: 'lightBlue', pos: [5, 3] }, // building 3
      { size: [2, 11], color: 'lightGrey',pos: [8, 0] }, // tallest spire
      { size: [3, 9], color: 'orange',    pos: [10, 2] }, // building 5
      { size: [1, 2], color: 'darkGrey',  pos: [13, 9] }, // small box
      { size: [1, 1], color: 'yellow',    pos: [1, 5] }, // window
      { size: [1, 1], color: 'yellow',    pos: [3, 3] }, // window
      { size: [1, 1], color: 'yellow',    pos: [6, 5] }, // window
      { size: [1, 1], color: 'yellow',    pos: [9, 2] }, // window
      { size: [1, 1], color: 'yellow',    pos: [11, 4] }, // window
      { size: [1, 1], color: 'red',       pos: [8, 0] }, // spire light
      { size: [14, 1], color: 'green',    pos: [0, 11] }, // ground
    ],
  },
  {
    name: 'Pirate Ship', theme: 'big', difficulty: 'silhouette', decoys: 3,
    modelW: 14, modelH: 14, finishAnim: 'driveRight',
    steps: [
      { size: [10, 2], color: 'brown',    pos: [2, 10] }, // hull
      { size: [12, 1], color: 'brown',    pos: [1, 9] }, // deck rim
      { size: [2, 1], color: 'brown',     pos: [0, 11] }, // hull taper left
      { size: [2, 1], color: 'brown',     pos: [12, 11] }, // hull taper right
      { size: [14, 1], color: 'lightBlue',pos: [0, 13] }, // water
      { size: [1, 9], color: 'brown',     pos: [6, 0] }, // mast
      { size: [7, 3], color: 'white',     pos: [3, 2] }, // sail 1
      { size: [5, 2], color: 'white',     pos: [4, 5] }, // sail 2
      { size: [2, 1], color: 'black',     pos: [5, 3] }, // skull patch
      { size: [3, 1], color: 'red',       pos: [4, 0] }, // flag
      { size: [1, 1], color: 'yellow',    pos: [3, 11] }, // porthole
      { size: [1, 1], color: 'yellow',    pos: [7, 11] }, // porthole
      { size: [1, 1], color: 'yellow',    pos: [10, 11] }, // porthole
      { size: [2, 1], color: 'darkGrey',  pos: [10, 8] }, // cannon
    ],
  },
  {
    name: 'Roller Coaster', theme: 'big', difficulty: 'silhouette', decoys: 3,
    modelW: 14, modelH: 13, finishAnim: 'driveRight',
    steps: [
      { size: [14, 1], color: 'green',    pos: [0, 12] }, // ground
      { size: [1, 8], color: 'brown',     pos: [1, 4] }, // tall support
      { size: [1, 6], color: 'brown',     pos: [4, 6] }, // support
      { size: [1, 4], color: 'brown',     pos: [7, 8] }, // support
      { size: [1, 6], color: 'brown',     pos: [10, 6] }, // support
      { size: [1, 8], color: 'brown',     pos: [13, 4] }, // tall support
      { size: [4, 1], color: 'red',       pos: [0, 3] }, // track peak left
      { size: [4, 1], color: 'red',       pos: [10, 3] }, // track peak right
      { size: [3, 1], color: 'red',       pos: [4, 5] }, // dip
      { size: [3, 1], color: 'red',       pos: [7, 7] }, // valley
      { size: [3, 1], color: 'red',       pos: [4, 5] }, // overlap accent
      { size: [2, 2], color: 'yellow',    pos: [1, 1] }, // car
      { size: [1, 1], color: 'blue',      pos: [1, 0] }, // car head
      { size: [1, 1], color: 'black',     pos: [1, 3] }, // wheel
      { size: [1, 1], color: 'black',     pos: [2, 3] }, // wheel
    ],
  },
  {
    name: 'Dragon', theme: 'big', difficulty: 'silhouette', decoys: 3,
    modelW: 14, modelH: 12, finishAnim: 'wagTail',
    steps: [
      { size: [8, 3], color: 'red',       pos: [3, 5] }, // body
      { size: [3, 1], color: 'red',       pos: [0, 6] }, // tail base
      { size: [2, 1], color: 'red',       pos: [0, 7] }, // tail mid
      { size: [1, 1], color: 'yellow',    pos: [0, 8] }, // tail spike
      { size: [3, 3], color: 'red',       pos: [10, 3] }, // head
      { size: [2, 2], color: 'red',       pos: [9, 5] }, // neck
      { size: [1, 1], color: 'white',     pos: [11, 4] }, // eye
      { size: [1, 1], color: 'orange',    pos: [13, 5] }, // fire breath
      { size: [1, 1], color: 'yellow',    pos: [13, 4] }, // fire tip
      { size: [4, 2], color: 'orange',    pos: [4, 2] }, // left wing
      { size: [4, 2], color: 'orange',    pos: [5, 0] }, // wing top
      { size: [1, 1], color: 'yellow',    pos: [4, 4] }, // spine
      { size: [1, 1], color: 'yellow',    pos: [6, 4] }, // spine
      { size: [1, 2], color: 'red',       pos: [4, 8] }, // leg
      { size: [1, 2], color: 'red',       pos: [9, 8] }, // leg
      { size: [2, 1], color: 'darkGrey',  pos: [4, 10] }, // claw
      { size: [2, 1], color: 'darkGrey',  pos: [8, 10] }, // claw
    ],
  },
  {
    name: 'Carnival Wheel', theme: 'big', difficulty: 'silhouette', decoys: 3,
    modelW: 13, modelH: 13, finishAnim: 'spin',
    steps: [
      { size: [13, 1], color: 'green',    pos: [0, 12] }, // ground
      { size: [1, 5], color: 'darkGrey',  pos: [4, 7] }, // left support
      { size: [1, 5], color: 'darkGrey',  pos: [8, 7] }, // right support
      { size: [3, 1], color: 'lightGrey', pos: [5, 6] }, // axle hub
      { size: [11, 1], color: 'yellow',   pos: [1, 6] }, // horiz spoke
      { size: [1, 11], color: 'yellow',   pos: [6, 1] }, // vert spoke
      { size: [3, 1], color: 'red',       pos: [0, 5] }, // top-left cabin
      { size: [3, 1], color: 'blue',      pos: [10, 5] }, // top-right cabin
      { size: [3, 1], color: 'orange',    pos: [0, 7] }, // bot-left cabin
      { size: [3, 1], color: 'green',     pos: [10, 7] }, // bot-right cabin
      { size: [3, 1], color: 'pink',      pos: [5, 0] }, // top cabin
      { size: [3, 1], color: 'lightBlue', pos: [5, 11] }, // bottom cabin
      { size: [1, 1], color: 'red',       pos: [6, 0] }, // top flag
    ],
  },
];

// ----- Helper: convert grid pos to px relative to baseplate top-left -----
function gridToPx(gx, gy) {
  return { x: gx * STUD, y: gy * STUD };
}

// ----- Render function -----
export function renderLegoLevel(container, levelIndex, opts) {
  const level = LEGO_LEVELS[levelIndex];
  if (!level) return;

  // Centre the model on the baseplate.
  const offsetX = Math.max(0, Math.floor((BOARD_W - level.modelW) / 2));
  const offsetY = Math.max(0, Math.floor((BOARD_H - level.modelH) / 2));

  // Adjust steps to baseplate coordinates.
  const steps = level.steps.map(s => ({
    ...s,
    boardPos: [s.pos[0] + offsetX, s.pos[1] + offsetY],
  }));

  const boardPx = BOARD_W * STUD;
  const difficulty = level.difficulty;

  const showSilhouette = difficulty === 'silhouette';

  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="lego-stage">
      <div class="lego-board-wrap">
        <div class="lego-board" id="lego-board"
             style="width:${boardPx}px;height:${boardPx}px;
                    background-size:${STUD}px ${STUD}px;"></div>
        ${showSilhouette ? `
          <div class="lego-silhouette" aria-hidden="true">
            <div class="lego-silhouette-label">Goal</div>
            <div class="lego-silhouette-inner"
                 style="aspect-ratio:${level.modelW}/${level.modelH};">
              ${silhouetteSvg(level.steps, level.modelW, level.modelH)}
            </div>
          </div>
        ` : ''}
      </div>
      <p class="hint">${difficultyHint(difficulty)}</p>
      <div class="lego-tray" id="lego-tray"></div>
    </div>
  `;

  const board = container.querySelector('#lego-board');
  const tray = container.querySelector('#lego-tray');

  // ----- Placed blocks accumulator + ghost -----
  // We render the "current ghost" (the next block) and any "near-ghost" reveal.
  let currentStep = 0;
  let won = false;
  let ghostEl = null;     // ghost outline element for current step
  let arrowEl = null;     // arrow indicator (full mode only)

  // ----- Render all already-placed blocks (none initially) -----
  function placeBlock(step) {
    const el = document.createElement('div');
    el.className = 'lego-block placed';
    const { x, y } = gridToPx(step.boardPos[0], step.boardPos[1]);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.zIndex = '5';
    el.innerHTML = blockSvg(step.size[0], step.size[1], step.color);
    board.appendChild(el);
  }

  // ----- Ghost rendering for current step -----
  function renderGhost() {
    if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    if (arrowEl) { arrowEl.remove(); arrowEl = null; }
    if (currentStep >= steps.length) return;
    const step = steps[currentStep];
    const { x, y } = gridToPx(step.boardPos[0], step.boardPos[1]);

    ghostEl = document.createElement('div');
    ghostEl.className = 'lego-ghost';
    ghostEl.style.left = x + 'px';
    ghostEl.style.top = y + 'px';
    ghostEl.style.zIndex = '3';
    ghostEl.innerHTML = blockSvg(step.size[0], step.size[1], step.color, { ghost: true });
    board.appendChild(ghostEl);

    if (difficulty === 'full') {
      ghostEl.classList.add('ghost-full');
      // arrow pointing down toward the ghost
      arrowEl = document.createElement('div');
      arrowEl.className = 'lego-arrow';
      const aw = step.size[0] * STUD;
      arrowEl.style.left = (x + aw / 2 - 14) + 'px';
      arrowEl.style.top = (y - 36) + 'px';
      arrowEl.innerHTML = `
        <svg viewBox="0 0 28 32" width="28" height="32">
          <path d="M14 30 L4 14 L10 14 L10 4 L18 4 L18 14 L24 14 Z"
                fill="#ffd23a" stroke="#7a5a1f" stroke-width="2"/>
        </svg>
      `;
      board.appendChild(arrowEl);
    } else if (difficulty === 'faint') {
      ghostEl.classList.add('ghost-faint');
    } else if (difficulty === 'proximity') {
      ghostEl.classList.add('ghost-hidden');
    } else if (difficulty === 'silhouette') {
      // fully hidden until win; remove entirely
      ghostEl.style.display = 'none';
    }
  }

  // ----- Tray rendering for current step -----
  let trayBlocks = [];
  function renderTray() {
    trayBlocks.forEach(b => b.remove());
    trayBlocks = [];
    if (currentStep >= steps.length) return;
    const step = steps[currentStep];
    const target = { size: step.size, color: step.color };
    const decoyCount = level.decoys || 0;
    const decoys = makeDecoys(target, decoyCount);
    const choices = shuffled([target, ...decoys]);

    for (const choice of choices) {
      const el = document.createElement('div');
      el.className = 'lego-tray-block';
      el.dataset.color = choice.color;
      el.dataset.w = choice.size[0];
      el.dataset.h = choice.size[1];
      const w = choice.size[0] * STUD * TRAY_SCALE;
      const h = choice.size[1] * STUD * TRAY_SCALE;
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      // highlight the correct one only when no decoys (L1-L5)
      if (decoyCount === 0) el.classList.add('highlight');
      el.innerHTML = blockSvg(choice.size[0], choice.size[1], choice.color, { scale: TRAY_SCALE });
      tray.appendChild(el);
      trayBlocks.push(el);
      setupDrag(el, choice);
    }
  }

  // ----- Drag handling -----
  function setupDrag(part, choice) {
    let dragging = false;
    let pointerId = null;
    let offsetX = 0, offsetY = 0;
    let homeRect = null;

    part.addEventListener('pointerdown', (e) => {
      if (won) return;
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
      part.style.top = rect.top + 'px';
      part.style.zIndex = '9999';
      part.style.transition = 'none';
      part.classList.add('dragging');
      sfx.pickup();
    });

    part.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      part.style.left = (e.clientX - offsetX) + 'px';
      part.style.top  = (e.clientY - offsetY) + 'px';
      // Proximity reveal of ghost for L11-L15
      if (difficulty === 'proximity' && ghostEl && currentStep < steps.length) {
        const step = steps[currentStep];
        const { x: gx, y: gy } = gridToPx(step.boardPos[0], step.boardPos[1]);
        const boardRect = board.getBoundingClientRect();
        const ghostCx = boardRect.left + gx + (step.size[0] * STUD) / 2;
        const ghostCy = boardRect.top + gy + (step.size[1] * STUD) / 2;
        const partCx = e.clientX, partCy = e.clientY;
        const dist = Math.hypot(ghostCx - partCx, ghostCy - partCy);
        if (dist < PROX_REVEAL) {
          ghostEl.classList.remove('ghost-hidden');
          ghostEl.classList.add('ghost-revealed');
        } else {
          ghostEl.classList.add('ghost-hidden');
          ghostEl.classList.remove('ghost-revealed');
        }
      }
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { part.releasePointerCapture(pointerId); } catch (_) {}
      part.classList.remove('dragging');

      const cx = e.clientX, cy = e.clientY;
      const step = steps[currentStep];
      const isRightBlock = choice.size[0] === step.size[0]
                        && choice.size[1] === step.size[1]
                        && choice.color === step.color;

      // Compute target center on screen
      const boardRect = board.getBoundingClientRect();
      const { x: gx, y: gy } = gridToPx(step.boardPos[0], step.boardPos[1]);
      const targetCx = boardRect.left + gx + (step.size[0] * STUD) / 2;
      const targetCy = boardRect.top + gy + (step.size[1] * STUD) / 2;
      const dist = Math.hypot(targetCx - cx, targetCy - cy);

      // For silhouette mode the snap tolerance is a touch wider to be forgiving
      const tol = difficulty === 'silhouette' ? SNAP_TOL + 10 : SNAP_TOL;

      if (isRightBlock && dist <= tol) {
        // SNAP! Animate to position then commit
        const finalLeftScreen = boardRect.left + gx;
        const finalTopScreen  = boardRect.top + gy;
        part.style.transition = 'left 0.18s ease, top 0.18s ease, transform 0.18s ease';
        // Snap-target dimensions (use board scale, not tray scale)
        const targetW = step.size[0] * STUD;
        const targetH = step.size[1] * STUD;
        part.style.width = targetW + 'px';
        part.style.height = targetH + 'px';
        // We need to rerender at board scale (tray was 1.5x)
        part.innerHTML = blockSvg(step.size[0], step.size[1], step.color);
        part.style.left = finalLeftScreen + 'px';
        part.style.top = finalTopScreen + 'px';
        sfx.snap();

        setTimeout(() => {
          // Commit: replace draggable with permanent placed block in board
          part.remove();
          placeBlock(step);
          currentStep++;
          renderGhost();
          renderTray();
          if (currentStep >= steps.length) {
            won = true;
            setTimeout(onWin, 350);
          }
        }, 190);
      } else {
        // reject — snap back to tray
        part.style.transition = 'left 0.22s ease, top 0.22s ease';
        part.style.left = homeRect.left + 'px';
        part.style.top = homeRect.top + 'px';
        sfx.reject();
        setTimeout(() => {
          tray.appendChild(part);
          part.style.position = '';
          part.style.left = '';
          part.style.top = '';
          part.style.transition = '';
          part.style.zIndex = '';
        }, 240);
      }
    }
    part.addEventListener('pointerup', endDrag);
    part.addEventListener('pointercancel', endDrag);
  }

  // ----- Win -----
  function onWin() {
    sfx.win();
    // Apply finishAnim to the board (or to a wrapper to contain placed blocks)
    board.classList.add('lego-finished');
    board.classList.add('anim-' + (level.finishAnim || 'bobUpDown'));

    // Star burst
    const rect = board.getBoundingClientRect();
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
    setTimeout(showWinOverlay, 1600);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < LEGO_LEVELS.length;
    overlay.innerHTML = `
      <div class="win-title">FIXED!</div>
      <div class="win-buttons">
        <button class="big-btn secondary" data-act="levels">Pick Job</button>
        ${hasNext ? '<button class="big-btn" data-act="next">Next ›</button>' : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act) sfx.click();
      if (act === 'next') opts.onNext(levelIndex + 1);
      else if (act === 'levels') opts.onBack();
    });
    container.appendChild(overlay);
  }

  // Back button
  container.querySelector('[data-act="back"]').addEventListener('click', () => {
    sfx.click();
    opts.onBack();
  });

  // Kick off
  renderGhost();
  renderTray();
}

function difficultyHint(d) {
  switch (d) {
    case 'full':       return 'Drag the next block onto the outline';
    case 'faint':      return 'Find the outline and place each block';
    case 'proximity':  return 'Drag near where you think it goes';
    case 'silhouette': return 'Build from the picture in the corner';
    default:           return '';
  }
}
