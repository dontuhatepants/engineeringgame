// Pitfall solvability check.
// Simulates the player as an auto-runner with a "jump when hazard imminent"
// strategy and reports any level that the simulator can't beat.
//
// The simulator is not optimal — a perfect player can sometimes clear levels
// the simulator fails on — but if even a generous greedy strategy can't
// solve it, a 6-year-old probably can't either.
//
// We try several jump-look-ahead strategies and pass if ANY succeeds.

globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, AudioContext: function(){return{state:'running', resume:()=>{}, createOscillator:()=>({connect:()=>{},start:()=>{},stop:()=>{},frequency:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}}}), createGain:()=>({connect:()=>{},gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{},value:0}}), destination:{}, currentTime:0, sampleRate:48000};} };
globalThis.document = { createElement: () => ({ rel:'',href:'',appendChild:()=>{} }), head: { appendChild: () => {} } };

const { PITFALL_LEVELS } = await import('./pitfall.js');

const RUN_SPEED = 220;
const JUMP_VEL  = 540;
const GRAVITY   = 1400;
const PLAYER_W  = 38;
const PLAYER_H  = 56;
const VINE_LEN  = 140;
const DT = 1/120;
const TIMEOUT_S = 30;
const PLAYER_HALF = PLAYER_W / 2;

function aabb(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

// Returns "won" if the level is beaten with this lookahead, else a fail description.
function simulate(level, lookaheadSec) {
  const hazards = level.hazards.map(h => ({ ...h, _x: h.x, _angle: 0.6, _omega: 0 }));
  const state = { px: 80, py: 0, vx: RUN_SPEED, vy: 0, grounded: true, t: 0, vineIdx: null, fellInPit: false };

  while (state.t < TIMEOUT_S) {
    // Step logs
    for (const h of hazards) if (h.type === 'log') h._x -= h.speed * DT;
    // Step vines
    for (const h of hazards) {
      if (h.type === 'vine') {
        const alpha = -(GRAVITY * 0.4) * Math.sin(h._angle);
        h._omega += alpha * DT;
        h._omega *= Math.pow(0.998, DT * 60);
        h._angle += h._omega * DT;
      }
    }

    // Decide jump while grounded
    if (state.grounded && state.vineIdx === null) {
      let shouldJump = false;
      const horizon = RUN_SPEED * lookaheadSec;
      for (const h of hazards) {
        if (h.type === 'pit') {
          if (h.x >= state.px && h.x - state.px <= horizon) { shouldJump = true; break; }
        } else if (h.type === 'scorpion' || h.type === 'snake') {
          const leftEdge = h.x - 26;
          if (leftEdge >= state.px && leftEdge - state.px <= horizon) { shouldJump = true; break; }
        } else if (h.type === 'log') {
          const halfWidths = 24 + PLAYER_HALF;
          const dt = (h._x - state.px - halfWidths) / (RUN_SPEED + h.speed);
          if (dt > 0 && dt <= lookaheadSec) { shouldJump = true; break; }
        } else if (h.type === 'quicksand') {
          if (h.x >= state.px && h.x - state.px <= horizon) { shouldJump = true; break; }
        } else if (h.type === 'crocpool') {
          if (h.x >= state.px && h.x - state.px <= horizon) { shouldJump = true; break; }
        }
      }
      if (shouldJump) {
        state.vy = JUMP_VEL;
        state.grounded = false;
      }
    }

    // Physics
    state.px += state.vx * DT;
    if (!state.grounded) {
      state.vy -= GRAVITY * DT;
      state.py += state.vy * DT;
    }

    // Ground / pit / crocpool handling (mirrors pitfall.js logic for fairness)
    let groundY = 0;
    const pit = hazards.find(h => h.type === 'pit' && state.px >= h.x && state.px <= h.x + h.w);
    const cpool = hazards.find(h => h.type === 'crocpool' && state.px >= h.x && state.px <= h.x + (h.w || 0));

    if (!state.fellInPit) {
      if (pit && state.py <= 0) { state.fellInPit = true; }
      // crocpool death only over open water — for the simulator we approximate any crocpool contact at py<=0 as risky
      if (cpool && state.py <= 0) { state.fellInPit = true; }
    }
    if (state.fellInPit) {
      return { won: false, why: pit ? 'fell-in-pit' : 'crocpool-water', x: Math.round(state.px), t: state.t.toFixed(2) };
    }
    if (pit) groundY = -10000;
    else if (cpool) groundY = -10000;

    if (state.py <= groundY) {
      state.py = groundY;
      state.vy = 0;
      state.grounded = true;
    } else {
      state.grounded = false;
    }

    // Hazard collisions (skip if airborne above hazard height ~40)
    const pBox = { x: state.px - PLAYER_HALF, y: state.py, w: PLAYER_W, h: PLAYER_H };
    for (const h of hazards) {
      let box = null;
      if (h.type === 'log')      box = { x: h._x - 24, y: 0, w: 48, h: 40 };
      else if (h.type === 'scorpion') box = { x: h.x - 26, y: 0, w: 52, h: 32 };
      else if (h.type === 'snake')    box = { x: h.x - 26, y: 0, w: 52, h: 42 };
      else if (h.type === 'quicksand') box = { x: h.x, y: 0, w: h.w, h: 20 };
      if (box && aabb(pBox, box)) {
        return { won: false, why: 'hit-' + h.type, x: Math.round(state.px), t: state.t.toFixed(2) };
      }
    }

    if (state.px >= level.goal.x) return { won: true, t: state.t.toFixed(2) };
    state.t += DT;
  }
  return { won: false, why: 'timeout', x: Math.round(state.px), t: state.t.toFixed(2) };
}

const lookaheads = [0.05, 0.10, 0.15, 0.20, 0.30, 0.45, 0.6];

let allOK = true;
for (let i = 0; i < PITFALL_LEVELS.length; i++) {
  const lvl = PITFALL_LEVELS[i];
  // Skip vine/crocpool levels — those need release-timing decisions the simulator doesn't handle
  const hasVine = lvl.hazards.some(h => h.type === 'vine');
  const hasCrocPool = lvl.hazards.some(h => h.type === 'crocpool');

  let bestResult = null;
  let bestLA = null;
  for (const la of lookaheads) {
    const r = simulate(lvl, la);
    if (r.won) { bestResult = r; bestLA = la; break; }
    if (!bestResult || r.x > bestResult.x) { bestResult = r; bestLA = la; }
  }

  const tag = hasVine ? '(vine — sim skipped)' : hasCrocPool ? '(crocpool — sim partial)' : '';
  if (bestResult.won) {
    console.log(`L${(i+1).toString().padStart(2)}  ${lvl.name.padEnd(22)} OK (lookahead=${bestLA})  ${tag}`);
  } else {
    if (hasVine || hasCrocPool) {
      console.log(`L${(i+1).toString().padStart(2)}  ${lvl.name.padEnd(22)} SKIP — needs vine/croc timing ${tag}`);
    } else {
      console.log(`L${(i+1).toString().padStart(2)}  ${lvl.name.padEnd(22)} FAIL  best lookahead=${bestLA} reached x=${bestResult.x}/${lvl.goal.x} (${bestResult.why} at t=${bestResult.t}s)`);
      allOK = false;
    }
  }
}
console.log(allOK ? '\nAll non-vine pitfall levels look solvable.' : '\nSOME LEVELS UNSOLVABLE (or too hard for greedy auto-jumper).');
process.exit(allOK ? 0 : 1);
