// App router + workshop hub + level select.
import { renderPipesLevel } from './pipes.js';
import { PIPES_LEVELS } from './levels.js';
import { renderRobotLevel, ROBOT_LEVELS } from './robot.js';
import { renderCircuitsLevel, CIRCUIT_LEVELS } from './circuits.js';
import { renderGearsLevel, GEARS_LEVELS } from './gears.js';
import { renderMarbleLevel, MARBLE_LEVELS } from './marble.js';
import { renderCablesLevel, CABLES_LEVELS } from './cables.js';
import { renderLegoLevel, LEGO_LEVELS } from './lego.js';
import { renderToolboxLevel, TOOLBOX_LEVELS } from './toolbox.js';
import { renderBridgeLevel, BRIDGE_LEVELS } from './bridge.js';
import { renderPitfallLevel, PITFALL_LEVELS } from './pitfall.js';
import { sfx, setMuted, isMuted } from './sound.js';

const app = document.getElementById('app');

// Drag-orphan sweep: many mechanics lift the dragged element to document.body
// while drag is active so it can follow the pointer across containers. If the
// user navigates (back button, win → next level) before pointerup fires, those
// elements survive the next innerHTML swap on #app and visibly linger across
// menus. Run this before every navigation to scrub any stragglers.
function sweepDragOrphans() {
  const selectors = [
    '.robot-part', '.gear-part', '.lego-tray-block', '.tb-tool',
    '.bridge-piece.dragging', '.marble-ghost', '.lego-ghost',
  ];
  document.body.querySelectorAll(selectors.join(',')).forEach(el => {
    // Only remove if it's a direct (or near-direct) child of body — i.e.
    // it was lifted out of its container during drag. Anything still nested
    // inside #app is part of the active level and should be left alone.
    if (el.closest('#app')) return;
    el.remove();
  });
}

const MECHANICS = {
  pipes:    { name: 'Pipes',    levels: PIPES_LEVELS,    render: renderPipesLevel,    icon: pipesIcon },
  robot:    { name: 'Robot',    levels: ROBOT_LEVELS,    render: renderRobotLevel,    icon: robotIcon },
  circuits: { name: 'Circuits', levels: CIRCUIT_LEVELS,  render: renderCircuitsLevel, icon: circuitIcon },
  gears:    { name: 'Gears',    levels: GEARS_LEVELS,    render: renderGearsLevel,    icon: gearsIcon },
  marble:   { name: 'Marbles',  levels: MARBLE_LEVELS,   render: renderMarbleLevel,   icon: marbleIcon },
  cables:   { name: 'Cables',   levels: CABLES_LEVELS,   render: renderCablesLevel,   icon: cablesIcon },
  lego:     { name: 'Blocks',   levels: LEGO_LEVELS,     render: renderLegoLevel,     icon: legoIcon },
  toolbox:  { name: 'Toolbox',  levels: TOOLBOX_LEVELS,  render: renderToolboxLevel,  icon: toolboxIcon },
  bridge:   { name: 'Bridge',   levels: BRIDGE_LEVELS,   render: renderBridgeLevel,   icon: bridgeIcon },
  pitfall:  { name: 'Jungle',   levels: PITFALL_LEVELS,  render: renderPitfallLevel,  icon: pitfallIcon },
};
const MECHANIC_ORDER = ['pipes', 'robot', 'circuits', 'gears', 'marble', 'cables', 'lego', 'toolbox', 'bridge', 'pitfall'];

// ---- Progress (localStorage) ----
const SAVE_KEY = 'fixinggame_v1';
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress(p) { localStorage.setItem(SAVE_KEY, JSON.stringify(p)); }
function markComplete(mechanic, levelIdx) {
  const p = loadProgress();
  if (!p[mechanic]) p[mechanic] = { completed: [] };
  if (!p[mechanic].completed.includes(levelIdx)) p[mechanic].completed.push(levelIdx);
  saveProgress(p);
}
function isComplete(mechanic, levelIdx) {
  return loadProgress()[mechanic]?.completed?.includes(levelIdx) ?? false;
}
function isUnlocked(mechanic, levelIdx) {
  if (levelIdx === 0) return true;
  return isComplete(mechanic, levelIdx - 1);
}
function mechanicProgressLabel(mechanic) {
  const done = loadProgress()[mechanic]?.completed?.length ?? 0;
  const total = MECHANICS[mechanic].levels.length;
  return `${done} / ${total} fixed`;
}

// ---- Sound toggle ----
const mutePref = localStorage.getItem('fixinggame_mute') === '1';
setMuted(mutePref);
function toggleMute() {
  setMuted(!isMuted());
  localStorage.setItem('fixinggame_mute', isMuted() ? '1' : '0');
  renderHub();
}

// ---- Hub ----
function renderHub() {
  sweepDragOrphans();
  const cards = MECHANIC_ORDER.map((key) => {
    const m = MECHANICS[key];
    return `
      <button class="machine-card unlocked" data-mechanic="${key}">
        <div class="machine-icon">${m.icon()}</div>
        <div class="machine-name">${m.name}</div>
        <div class="machine-status">${mechanicProgressLabel(key)}</div>
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="hub">
      <h1 class="hub-title">FIXING GAME</h1>
      <p class="hub-sub">Pick a workshop</p>
      <div class="machine-grid">${cards}</div>
      <button class="mute-btn" data-act="mute">${isMuted() ? '🔇 Sound off' : '🔊 Sound on'}</button>
    </div>
  `;
  app.querySelectorAll('[data-mechanic]').forEach(el => {
    el.addEventListener('click', () => renderLevelSelect(el.dataset.mechanic));
  });
  app.querySelector('[data-act="mute"]').addEventListener('click', toggleMute);
}

// ---- Hub icons (inline SVG so they render identically everywhere) ----
function pipesIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <path d="M 10 50 Q 50 50 50 90" stroke="#555" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M 10 50 Q 50 50 50 90" stroke="#bbb" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M 10 50 Q 50 50 50 90" stroke="#3aa3ff" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M 75 20 C 75 35, 90 35, 90 20 C 90 10, 82 5, 82 5 C 82 5, 75 10, 75 20 Z"
            fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
    </svg>
  `;
}
function robotIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <rect x="25" y="30" width="50" height="50" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="35" y="10" width="30" height="22" rx="4" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <circle cx="42" cy="22" r="3" fill="#3aa3ff"/>
      <circle cx="58" cy="22" r="3" fill="#3aa3ff"/>
      <rect x="40" y="52" width="20" height="6" fill="#3a4756"/>
      <rect x="10" y="40" width="14" height="30" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="76" y="40" width="14" height="30" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="32" y="80" width="14" height="14" rx="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="54" y="80" width="14" height="14" rx="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
    </svg>
  `;
}
function circuitIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <rect x="6" y="55" width="22" height="18" rx="2" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
      <rect x="28" y="60" width="4" height="8" fill="#7a5a1f"/>
      <path d="M 32 64 L 60 64 L 60 80 L 80 80" stroke="#d33" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 14 55 L 14 30 L 70 30 L 70 50" stroke="#d33" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="70" cy="60" r="14" fill="#fff58a" stroke="#7a5a1f" stroke-width="3"/>
      <rect x="65" y="73" width="10" height="6" fill="#888" stroke="#333" stroke-width="2"/>
      <line x1="70" y1="50" x2="70" y2="46" stroke="#fff58a" stroke-width="2"/>
    </svg>
  `;
}
function gearsIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- big gear -->
      <g transform="translate(38,38)">
        <circle r="28" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
        <g stroke="#7a5a1f" stroke-width="3" fill="#ffd966">
          <rect x="-4" y="-34" width="8" height="10"/>
          <rect x="-4" y="24" width="8" height="10"/>
          <rect x="-34" y="-4" width="10" height="8"/>
          <rect x="24" y="-4" width="10" height="8"/>
          <rect x="-26" y="-26" width="8" height="8" transform="rotate(45)"/>
          <rect x="18" y="-26" width="8" height="8" transform="rotate(45)"/>
        </g>
        <circle r="8" fill="#7a5a1f"/>
      </g>
      <!-- small gear -->
      <g transform="translate(76,72)">
        <circle r="16" fill="#d33" stroke="#5a1414" stroke-width="3"/>
        <g stroke="#5a1414" stroke-width="3" fill="#d33">
          <rect x="-2" y="-22" width="4" height="8"/>
          <rect x="-2" y="14" width="4" height="8"/>
          <rect x="-22" y="-2" width="8" height="4"/>
          <rect x="14" y="-2" width="8" height="4"/>
        </g>
        <circle r="5" fill="#5a1414"/>
      </g>
    </svg>
  `;
}
function marbleIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- ramp -->
      <path d="M 10 30 L 90 70 L 90 80 L 10 40 Z" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <!-- marble -->
      <circle cx="28" cy="32" r="9" fill="url(#mGrad)" stroke="#3a4756" stroke-width="2"/>
      <defs>
        <radialGradient id="mGrad" cx="35%" cy="30%">
          <stop offset="0%" stop-color="#fff"/>
          <stop offset="100%" stop-color="#3aa3ff"/>
        </radialGradient>
      </defs>
      <!-- bucket -->
      <path d="M 76 78 L 96 78 L 92 95 L 80 95 Z" fill="#7a5a1f" stroke="#3a2018" stroke-width="3"/>
    </svg>
  `;
}
function cablesIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- left wall -->
      <rect x="6" y="14" width="10" height="72" rx="3" fill="#3a4756"/>
      <!-- right wall -->
      <rect x="84" y="14" width="10" height="72" rx="3" fill="#3a4756"/>
      <!-- cables crossing -->
      <path d="M 16 30 C 50 30, 50 70, 84 70" stroke="#d33" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M 16 70 C 50 70, 50 30, 84 30" stroke="#3aa3ff" stroke-width="6" fill="none" stroke-linecap="round"/>
      <!-- nodes -->
      <circle cx="16" cy="30" r="6" fill="#d33" stroke="#5a1414" stroke-width="2"/>
      <circle cx="16" cy="70" r="6" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
      <circle cx="84" cy="30" r="6" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2"/>
      <circle cx="84" cy="70" r="6" fill="#d33" stroke="#5a1414" stroke-width="2"/>
    </svg>
  `;
}
function legoIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- lego brick 2x4 -->
      <rect x="14" y="36" width="72" height="42" rx="3" fill="#d33" stroke="#5a1414" stroke-width="3"/>
      <!-- highlight -->
      <rect x="14" y="36" width="72" height="6" fill="#ff6b6b"/>
      <!-- studs -->
      <circle cx="26" cy="32" r="8" fill="#d33" stroke="#5a1414" stroke-width="3"/>
      <circle cx="44" cy="32" r="8" fill="#d33" stroke="#5a1414" stroke-width="3"/>
      <circle cx="62" cy="32" r="8" fill="#d33" stroke="#5a1414" stroke-width="3"/>
      <circle cx="80" cy="32" r="8" fill="#d33" stroke="#5a1414" stroke-width="3"/>
      <circle cx="26" cy="29" r="6" fill="#ff6b6b"/>
      <circle cx="44" cy="29" r="6" fill="#ff6b6b"/>
      <circle cx="62" cy="29" r="6" fill="#ff6b6b"/>
      <circle cx="80" cy="29" r="6" fill="#ff6b6b"/>
    </svg>
  `;
}
function toolboxIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- toolbox body -->
      <rect x="12" y="40" width="76" height="46" rx="4" fill="#d33" stroke="#5a1414" stroke-width="3"/>
      <!-- toolbox handle -->
      <path d="M 30 40 L 30 26 Q 30 20 36 20 L 64 20 Q 70 20 70 26 L 70 40"
            stroke="#5a1414" stroke-width="5" fill="none" stroke-linecap="round"/>
      <!-- latch -->
      <rect x="44" y="48" width="12" height="6" rx="1" fill="#ffd966" stroke="#7a5a1f" stroke-width="2"/>
      <!-- wrench sticking out -->
      <rect x="20" y="60" width="40" height="6" rx="2" fill="#bbc4d0" stroke="#3a4756" stroke-width="2" transform="rotate(-15 40 63)"/>
      <circle cx="22" cy="68" r="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="2"/>
      <!-- screwdriver handle -->
      <rect x="64" y="62" width="18" height="8" rx="2" fill="#3aa3ff" stroke="#1f5d99" stroke-width="2" transform="rotate(15 73 66)"/>
    </svg>
  `;
}
function pitfallIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- jungle canopy -->
      <ellipse cx="20" cy="18" rx="18" ry="12" fill="#2d6b3a" stroke="#143018" stroke-width="2"/>
      <ellipse cx="50" cy="14" rx="20" ry="12" fill="#2d6b3a" stroke="#143018" stroke-width="2"/>
      <ellipse cx="82" cy="18" rx="18" ry="12" fill="#2d6b3a" stroke="#143018" stroke-width="2"/>
      <!-- vine -->
      <path d="M 50 22 Q 52 40 50 56" stroke="#5a3a1f" stroke-width="3" fill="none"/>
      <ellipse cx="48" cy="48" rx="4" ry="2" fill="#3e9c3e"/>
      <!-- ground -->
      <rect x="0" y="74" width="100" height="26" fill="#7a5a30"/>
      <rect x="0" y="74" width="100" height="4" fill="#3e9c3e"/>
      <!-- pit -->
      <rect x="55" y="78" width="20" height="22" fill="#1a1208"/>
      <!-- character mid-jump -->
      <circle cx="38" cy="58" r="6" fill="#ffd966" stroke="#3a2e0f" stroke-width="2"/>
      <rect x="33" y="62" width="10" height="12" fill="#a04a2a" stroke="#3a2008" stroke-width="2"/>
      <rect x="33" y="72" width="4" height="6" fill="#5a3a1f" stroke="#3a2008" stroke-width="2"/>
      <rect x="39" y="72" width="4" height="6" fill="#5a3a1f" stroke="#3a2008" stroke-width="2"/>
    </svg>
  `;
}
function bridgeIcon() {
  return `
    <svg viewBox="0 0 100 100" width="96" height="96">
      <!-- left cliff -->
      <rect x="2" y="58" width="22" height="36" fill="#7a5a1f" stroke="#3a2018" stroke-width="2"/>
      <!-- right cliff -->
      <rect x="76" y="58" width="22" height="36" fill="#7a5a1f" stroke="#3a2018" stroke-width="2"/>
      <!-- water/gap -->
      <rect x="24" y="78" width="52" height="14" fill="#3aa3ff"/>
      <!-- planks -->
      <rect x="22" y="54" width="58" height="8" rx="1" fill="#a0784a" stroke="#3a2018" stroke-width="2"/>
      <line x1="36" y1="54" x2="36" y2="62" stroke="#3a2018" stroke-width="1.5"/>
      <line x1="50" y1="54" x2="50" y2="62" stroke="#3a2018" stroke-width="1.5"/>
      <line x1="64" y1="54" x2="64" y2="62" stroke="#3a2018" stroke-width="1.5"/>
      <!-- pillars -->
      <rect x="36" y="62" width="6" height="20" fill="#888" stroke="#3a4756" stroke-width="1.5"/>
      <rect x="58" y="62" width="6" height="20" fill="#888" stroke="#3a4756" stroke-width="1.5"/>
    </svg>
  `;
}

// ---- Level Select (shared across mechanics) ----
function renderLevelSelect(mechanicKey) {
  sweepDragOrphans();
  const m = MECHANICS[mechanicKey];
  const cards = m.levels.map((lvl, i) => {
    const completed = isComplete(mechanicKey, i);
    const unlocked = isUnlocked(mechanicKey, i);
    if (!unlocked) return `<div class="level-card locked">🔒</div>`;
    return `
      <button class="level-card ${completed ? 'completed' : ''}" data-level="${i}">
        ${i + 1}
        ${completed ? '<div class="level-star">⭐</div>' : ''}
      </button>
    `;
  }).join('');
  app.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${m.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="level-select">
      <p class="hub-sub">Choose a job to fix</p>
      <div class="level-grid">${cards}</div>
    </div>
  `;
  app.querySelector('[data-act="back"]').addEventListener('click', renderHub);
  app.querySelectorAll('.level-card[data-level]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.level, 10);
      renderGame(mechanicKey, idx);
    });
  });
}

// ---- Game (delegates to the mechanic's renderer) ----
function renderGame(mechanicKey, levelIdx) {
  sweepDragOrphans();
  const m = MECHANICS[mechanicKey];
  m.render(app, levelIdx, {
    onBack: () => renderLevelSelect(mechanicKey),
    onComplete: (i) => markComplete(mechanicKey, i),
    onNext: (nextIdx) => {
      if (nextIdx < m.levels.length) renderGame(mechanicKey, nextIdx);
      else renderLevelSelect(mechanicKey);
    },
  });
}

// ---- Boot ----
renderHub();
