// Cables mechanic: planarity-style untangling puzzle.
//
// Each level has N colored cables connecting a fixed node on the LEFT wall to
// a draggable node on the RIGHT wall. The right nodes start in a scrambled
// order so cables cross over each other. Drag the right-side nodes up/down
// (constrained to the right wall) until no two cables cross.
//
// Win = zero segment intersections between any pair of cables.
// Since left nodes are fixed in vertical order top-to-bottom and the right
// nodes are free, a no-crossing arrangement is always reachable: place each
// right node at the same vertical slot as its same-color left node (i.e. sort
// the right side to match the left side's order). The starting permutation is
// chosen to guarantee at least one crossing.

import { sfx } from './sound.js';

// Inject the cable-specific stylesheet once.
(function ensureStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-cables-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles-cables.css';
  link.setAttribute('data-cables-css', '1');
  document.head.appendChild(link);
})();

// Palette: bright cable colors that stand out on the dark navy board.
const PALETTE = [
  '#ff4d4d', // red
  '#3aa3ff', // blue
  '#ffd966', // yellow
  '#6dcf6d', // green
  '#c66cff', // purple
  '#ff8a3a', // orange
  '#ff6ad5', // pink
  '#3ad6c8', // teal
  '#a3e635', // lime
  '#e3e3e3', // white
];

// ---- Level builder helpers ----
//
// A level is { n, perm } where:
//   n     = number of cables (same as colors).
//   perm  = array of length n, perm[i] is the COLOR INDEX placed at right
//           slot i (top -> bottom). Left side is always [0, 1, 2, ..., n-1]
//           top -> bottom.
//
// The solved state has perm = [0, 1, ..., n-1] (identity).

function isIdentity(perm) {
  return perm.every((v, i) => v === i);
}

// Count crossings combinatorially for a permutation (inversions).
// For straight segments between sorted left endpoints and a permuted right
// side, the number of crossings == number of inversions in `perm`.
function inversions(perm) {
  let c = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) c++;
    }
  }
  return c;
}

// ---- 25 hand-tuned levels with at least 1 starting crossing ----
//
// Note: perm[i] is the color index at right-slot i (top to bottom).
export const CABLES_LEVELS = [
  // L1-L3 : 2 cables, 1 crossing (the trivial swap)
  { name: 'First Tangle',  n: 2, perm: [1, 0] },
  { name: 'Crossed Wires', n: 2, perm: [1, 0] },
  { name: 'Quick Fix',     n: 2, perm: [1, 0] },

  // L4-L7 : 3 cables
  { name: 'Triple Swap',   n: 3, perm: [2, 0, 1] },
  { name: 'Three Tangle',  n: 3, perm: [2, 1, 0] }, // 3 crossings
  { name: 'Mixed Up 3',    n: 3, perm: [1, 2, 0] },
  { name: 'Trio Trouble',  n: 3, perm: [2, 1, 0] },

  // L8-L12 : 4 cables
  { name: 'Four Wires',     n: 4, perm: [3, 2, 1, 0] }, // 6 inv (max)
  { name: 'Quad Cross',     n: 4, perm: [1, 3, 0, 2] },
  { name: 'Knotted Four',   n: 4, perm: [2, 3, 0, 1] },
  { name: 'Four Untangle',  n: 4, perm: [3, 0, 2, 1] },
  { name: 'Four Chaos',     n: 4, perm: [3, 1, 2, 0] },

  // L13-L17 : 5 cables
  { name: 'Five Lines',     n: 5, perm: [4, 3, 2, 1, 0] },
  { name: 'Penta Tangle',   n: 5, perm: [2, 4, 0, 3, 1] },
  { name: 'Mixed Five',     n: 5, perm: [3, 0, 4, 1, 2] },
  { name: 'Big Knot',       n: 5, perm: [4, 2, 0, 3, 1] },
  { name: 'Five Star',      n: 5, perm: [1, 4, 3, 0, 2] },

  // L18-L22 : 6-7 cables
  { name: 'Six Snarl',      n: 6, perm: [5, 3, 1, 4, 0, 2] },
  { name: 'Sixfold',        n: 6, perm: [3, 5, 0, 4, 1, 2] },
  { name: 'Seven Wires',    n: 7, perm: [6, 4, 2, 0, 5, 1, 3] },
  { name: 'Seven Snake',    n: 7, perm: [3, 5, 1, 6, 0, 4, 2] },
  { name: 'Lucky Seven',    n: 7, perm: [6, 0, 5, 1, 4, 2, 3] },

  // L23-L25 : 8+ cables
  { name: 'Mega Tangle',    n: 8, perm: [7, 4, 1, 6, 2, 5, 0, 3] },
  { name: 'Cable Knot',     n: 8, perm: [3, 6, 0, 7, 2, 5, 1, 4] },
  { name: 'GRAND TANGLE',   n: 9, perm: [8, 5, 2, 7, 0, 4, 1, 6, 3] },

  // ---- L26-L50: expansion levels. Higher cable counts, dense tangles, and
  // permutations chosen so most/all cables must be moved to resolve. ----

  // L26-L30 : 7-8 cables, moderate crossings.
  { name: 'Spaghetti Junction', n: 7,  perm: [2, 5, 0, 6, 1, 4, 3] },
  { name: 'Switchback Seven',   n: 7,  perm: [4, 1, 6, 0, 5, 2, 3] },
  { name: 'Octo Snarl',         n: 8,  perm: [2, 5, 0, 7, 1, 6, 3, 4] },
  { name: 'Eight Eddies',       n: 8,  perm: [4, 1, 6, 3, 0, 7, 2, 5] },
  { name: 'Reverse Weave',      n: 8,  perm: [5, 2, 7, 0, 4, 1, 6, 3] },

  // L31-L35 : 8-9 cables, more crossings.
  { name: 'Maximum Eight',      n: 8,  perm: [7, 3, 5, 1, 6, 2, 4, 0] },
  { name: 'Nine Lives',         n: 9,  perm: [3, 6, 1, 8, 0, 5, 7, 2, 4] },
  { name: 'Cable Cyclone',      n: 9,  perm: [5, 2, 7, 0, 8, 3, 1, 6, 4] },
  { name: 'Wire Whirlpool',     n: 9,  perm: [8, 5, 2, 7, 1, 6, 0, 4, 3] },
  { name: 'Nine Tail Knot',     n: 9,  perm: [4, 8, 1, 6, 0, 7, 3, 5, 2] },

  // L36-L40 : 9-10 cables, dense tangle.
  { name: 'Full Reverse Nine',  n: 9,  perm: [8, 6, 4, 2, 0, 7, 5, 3, 1] },
  { name: 'Ten Tendrils',       n: 10, perm: [3, 7, 1, 9, 0, 6, 2, 8, 4, 5] },
  { name: 'Decimal Disaster',   n: 10, perm: [5, 9, 2, 7, 0, 8, 1, 6, 3, 4] },
  { name: 'Ten Tornado',        n: 10, perm: [8, 5, 2, 9, 1, 6, 0, 7, 3, 4] },
  { name: 'Ten Twister',        n: 10, perm: [9, 6, 3, 0, 8, 5, 2, 7, 4, 1] },

  // L41-L45 : 10-11 cables, harder permutations.
  { name: 'Perfect Ten Mirror', n: 10, perm: [9, 7, 5, 3, 1, 8, 6, 4, 2, 0] },
  { name: 'Eleven Edge',        n: 11, perm: [5, 9, 2, 7, 0, 10, 3, 8, 1, 6, 4] },
  { name: 'Tangle Eleven',      n: 11, perm: [8, 3, 10, 1, 6, 2, 9, 0, 7, 4, 5] },
  { name: 'Wire Hurricane',     n: 11, perm: [10, 6, 2, 8, 4, 0, 9, 5, 1, 7, 3] },
  { name: 'Eleventh Hour',      n: 11, perm: [4, 8, 1, 10, 5, 0, 9, 2, 7, 3, 6] },

  // L46-L50 : 11-12 cables, the wildest tangles.
  { name: 'Eleven Mirror',      n: 11, perm: [10, 8, 6, 4, 2, 0, 9, 7, 5, 3, 1] },
  { name: 'Dozen Dilemma',      n: 12, perm: [5, 10, 2, 8, 0, 11, 3, 9, 1, 7, 4, 6] },
  { name: 'Twelve Tempest',     n: 12, perm: [11, 7, 3, 9, 1, 8, 0, 10, 4, 6, 2, 5] },
  { name: 'Cable Catastrophe',  n: 12, perm: [8, 11, 4, 1, 9, 6, 0, 10, 3, 7, 2, 5] },
  { name: 'ULTIMATE TANGLE',    n: 12, perm: [11, 9, 7, 5, 3, 1, 10, 8, 6, 4, 2, 0] },
];

// Sanity-check at module load: every level should be a valid permutation with
// at least 1 inversion (i.e. starts tangled).
if (typeof console !== 'undefined') {
  for (const lvl of CABLES_LEVELS) {
    const seen = new Set(lvl.perm);
    if (seen.size !== lvl.n || lvl.perm.length !== lvl.n) {
      console.warn('[cables] bad perm', lvl);
    }
    if (isIdentity(lvl.perm)) {
      console.warn('[cables] level starts solved', lvl);
    }
  }
}

// ---- Geometry: segment-intersection test (strict, ignores shared endpoints) ----
function ccw(A, B, C) {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}
function segmentsIntersect(p1, p2, p3, p4) {
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
         ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

// Sample a quadratic Bezier curve to get N points along it.
// Used purely for visual rendering — crossing detection uses the straight
// endpoint-to-endpoint segments since cables visually pass through their
// endpoints (no slack/bezier control causes false negatives for the player).
function bezierPath(p1, p2) {
  const dx = p2.x - p1.x;
  const midX = p1.x + dx * 0.5;
  // Pull control points slightly inward so the cable has a gentle S-curve.
  const c1 = { x: midX, y: p1.y };
  const c2 = { x: midX, y: p2.y };
  return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
}

export function renderCablesLevel(container, levelIndex, opts) {
  const level = CABLES_LEVELS[levelIndex];
  if (!level) {
    container.innerHTML = '<p style="padding:20px;">Level not found.</p>';
    return;
  }

  const n = level.n;
  // Make a working copy of the permutation. We will mutate `rightOrder` as the
  // player drags nodes around.
  const rightOrder = level.perm.slice();

  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="cables-stage">
      <div class="cables-board" id="cables-board">
        <div class="cables-wall left"></div>
        <div class="cables-wall right"></div>
        <svg class="cables-svg" id="cables-svg"
             xmlns="http://www.w3.org/2000/svg"></svg>
        <!-- nodes get appended here -->
      </div>
    </div>
  `;

  const board = container.querySelector('#cables-board');
  const svg = container.querySelector('#cables-svg');

  // Layout sizing is read from getBoundingClientRect so we adapt to the board.
  function dims() {
    const r = board.getBoundingClientRect();
    return {
      w: r.width,
      h: r.height,
      wallInset: 30,           // x-position of nodes from each wall
      vPad: 50,                // vertical padding
    };
  }

  // Compute the y position of the i-th slot (0-indexed top-down).
  function slotY(i, total, h, vPad) {
    if (total === 1) return h / 2;
    return vPad + (i * (h - 2 * vPad)) / (total - 1);
  }

  // ---- Build node DOM ----
  // Left nodes: identity, fixed. Stored by color index -> element.
  // Right nodes: draggable. Stored by color index -> element. Each right node
  // also tracks its current slot index in `rightSlotOf[colorIdx]`.
  const leftEls = [];
  const rightEls = [];
  const rightSlotOf = new Array(n); // colorIdx -> slot index (0..n-1)

  for (let i = 0; i < n; i++) {
    const leftColor = PALETTE[i % PALETTE.length];
    const left = document.createElement('div');
    left.className = 'cable-node fixed';
    left.style.setProperty('--node-color', leftColor);
    board.appendChild(left);
    leftEls.push(left);

    const right = document.createElement('div');
    right.className = 'cable-node draggable';
    right.dataset.color = String(i);
    right.style.setProperty('--node-color', leftColor);
    board.appendChild(right);
    rightEls.push(right);
  }
  // Establish initial right-side slots from the level permutation.
  for (let slot = 0; slot < n; slot++) {
    const colorIdx = level.perm[slot];
    rightSlotOf[colorIdx] = slot;
  }

  // SVG paths for cables (one per color). Each has outer + inner + shine.
  const cablePaths = [];
  for (let i = 0; i < n; i++) {
    const color = PALETTE[i % PALETTE.length];
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    outer.setAttribute('class', 'cable-outer');
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    inner.setAttribute('class', 'cable-inner');
    inner.setAttribute('stroke', color);
    inner.style.color = color; // for currentColor in win glow
    const shine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shine.setAttribute('class', 'cable-shine');
    g.appendChild(outer);
    g.appendChild(inner);
    g.appendChild(shine);
    svg.appendChild(g);
    cablePaths.push({ outer, inner, shine });
  }

  let won = false;
  let lastCrossings = -1;

  function positionAndRedraw() {
    const d = dims();
    const { w, h, wallInset, vPad } = d;
    const leftX = wallInset;
    const rightX = w - wallInset;

    // Position the left fixed nodes.
    for (let i = 0; i < n; i++) {
      const y = slotY(i, n, h, vPad);
      leftEls[i].style.left = leftX + 'px';
      leftEls[i].style.top = y + 'px';
    }
    // Position the right (draggable) nodes by their current slot.
    for (let c = 0; c < n; c++) {
      const slot = rightSlotOf[c];
      const y = slotY(slot, n, h, vPad);
      rightEls[c].style.left = rightX + 'px';
      rightEls[c].style.top = y + 'px';
    }
    redrawCables();
  }

  function leftPoint(colorIdx, d) {
    return { x: d.wallInset, y: slotY(colorIdx, n, d.h, d.vPad) };
  }
  function rightPoint(colorIdx, d, draggedColor, draggedY) {
    if (draggedColor === colorIdx && draggedY != null) {
      return { x: d.w - d.wallInset, y: draggedY };
    }
    const slot = rightSlotOf[colorIdx];
    return { x: d.w - d.wallInset, y: slotY(slot, n, d.h, d.vPad) };
  }

  function redrawCables(draggedColor = null, draggedY = null) {
    const d = dims();
    svg.setAttribute('viewBox', `0 0 ${d.w} ${d.h}`);
    svg.setAttribute('width', d.w);
    svg.setAttribute('height', d.h);

    const endpoints = [];
    for (let c = 0; c < n; c++) {
      const p1 = leftPoint(c, d);
      const p2 = rightPoint(c, d, draggedColor, draggedY);
      const dPath = bezierPath(p1, p2);
      cablePaths[c].outer.setAttribute('d', dPath);
      cablePaths[c].inner.setAttribute('d', dPath);
      cablePaths[c].shine.setAttribute('d', dPath);
      endpoints.push([p1, p2]);
    }

    // Detect crossings (straight-segment intersections).
    const crossingSet = new Set();
    let crossings = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const [a1, a2] = endpoints[i];
        const [b1, b2] = endpoints[j];
        if (segmentsIntersect(a1, a2, b1, b2)) {
          crossings++;
          crossingSet.add(i);
          crossingSet.add(j);
        }
      }
    }
    for (let c = 0; c < n; c++) {
      cablePaths[c].outer.classList.toggle('crossing', crossingSet.has(c));
    }

    // Audio feedback for crossing count changes (subtle).
    if (lastCrossings !== -1 && crossings !== lastCrossings) {
      // Higher pitch = fewer crossings, lower pitch = more.
      try { sfx.click(); } catch {}
    }
    lastCrossings = crossings;

    // Win check (only when not actively dragging — caller passes draggedColor
    // null when settled).
    if (draggedColor === null && crossings === 0 && !won) {
      won = true;
      onWin();
    }
  }

  // ---- Drag handling on right nodes ----
  rightEls.forEach((node, colorIdx) => setupDrag(node, colorIdx));

  function setupDrag(node, colorIdx) {
    let dragging = false;
    let pointerId = null;
    let startY = 0;
    let startSlotY = 0;

    node.addEventListener('pointerdown', (e) => {
      if (won) return;
      e.preventDefault();
      dragging = true;
      pointerId = e.pointerId;
      try { node.setPointerCapture(e.pointerId); } catch {}
      node.classList.add('dragging');
      const d = dims();
      startSlotY = slotY(rightSlotOf[colorIdx], n, d.h, d.vPad);
      startY = e.clientY;
      sfx.pickup();
    });

    node.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const d = dims();
      const boardRect = board.getBoundingClientRect();
      // Convert pointer Y to board-local coords, clamp to padding.
      let localY = e.clientY - boardRect.top;
      const minY = d.vPad;
      const maxY = d.h - d.vPad;
      if (localY < minY) localY = minY;
      if (localY > maxY) localY = maxY;
      node.style.top = localY + 'px';
      // Live cable redraw with this node's y overridden.
      redrawCables(colorIdx, localY);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      try { node.releasePointerCapture(pointerId); } catch {}
      node.classList.remove('dragging');
      sfx.drop();
      // Figure out which slot the node landed in.
      const d = dims();
      const boardRect = board.getBoundingClientRect();
      let localY = (e?.clientY ?? boardRect.top + startSlotY) - boardRect.top;
      const minY = d.vPad;
      const maxY = d.h - d.vPad;
      if (localY < minY) localY = minY;
      if (localY > maxY) localY = maxY;
      // Find nearest slot index.
      let nearest = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < n; i++) {
        const sy = slotY(i, n, d.h, d.vPad);
        const dist = Math.abs(sy - localY);
        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
      }
      // Swap whoever currently holds `nearest` with this color's old slot.
      const oldSlot = rightSlotOf[colorIdx];
      if (nearest !== oldSlot) {
        // Find which color currently occupies `nearest`.
        let other = -1;
        for (let c = 0; c < n; c++) {
          if (c !== colorIdx && rightSlotOf[c] === nearest) { other = c; break; }
        }
        if (other >= 0) {
          rightSlotOf[other] = oldSlot;
          rightSlotOf[colorIdx] = nearest;
          sfx.snap();
        }
      }
      positionAndRedraw();
    }
    node.addEventListener('pointerup', endDrag);
    node.addEventListener('pointercancel', endDrag);
  }

  // ---- Resize handling ----
  const resizeObs = new ResizeObserver(() => positionAndRedraw());
  resizeObs.observe(board);

  // Initial layout (defer one frame so the board has measurable dimensions).
  requestAnimationFrame(() => positionAndRedraw());

  function onWin() {
    sfx.win();
    board.classList.add('won');
    // Star burst from centre of board.
    const rect = board.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div');
      s.className = 'star-burst';
      s.textContent = '⭐';
      const angle = (Math.PI * 2 * i) / 14;
      const dist = 120 + Math.random() * 80;
      s.style.setProperty('--end', `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`);
      s.style.left = (rect.left + rect.width / 2) + 'px';
      s.style.top = (rect.top + rect.height / 2) + 'px';
      s.style.position = 'fixed';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
    opts.onComplete(levelIndex);
    setTimeout(() => showWinOverlay(), 1200);
  }

  function showWinOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    const hasNext = levelIndex + 1 < CABLES_LEVELS.length;
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

  container.querySelector('[data-act="back"]').addEventListener('click', () => {
    resizeObs.disconnect();
    opts.onBack();
  });
}
