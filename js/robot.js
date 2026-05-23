// Robot mechanic: drag parts from the tray onto matching slots on the robot.
//
// Each part has a `type` (head/body/arms/legs/antenna/eyes plus mech upgrades).
// Slots accept a part only if its type matches. Wrong drops snap the part back
// to its tray spot.
//
// Levels 1-5 are the friendly "wake up" intro. Levels 6-25 progressively
// transform the friendly robot into a giant anime-style mech.

import { sfx } from './sound.js';

// ----- Shared part definitions (SVG + intrinsic size in px) -----
const PART_DEFS = {
  // ===== Original friendly-robot parts (L1-L5) =====
  head: {
    w: 100, h: 80,
    svg: `
      <rect x="5" y="5" width="90" height="70" rx="10" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="18" y="22" width="64" height="22" rx="3" fill="#1a2230"/>
      <rect x="34" y="56" width="32" height="6" rx="2" fill="#3a4756"/>
      <rect x="20" y="68" width="6" height="6" fill="#3a4756"/>
      <rect x="74" y="68" width="6" height="6" fill="#3a4756"/>
    `,
  },
  body: {
    w: 130, h: 120,
    svg: `
      <rect x="5" y="5" width="120" height="110" rx="10" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <circle cx="65" cy="55" r="22" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
      <circle cx="65" cy="55" r="11" fill="#ff8855"/>
      <rect x="28" y="92" width="22" height="10" rx="2" fill="#3a4756"/>
      <rect x="80" y="92" width="22" height="10" rx="2" fill="#3a4756"/>
    `,
  },
  arms: {
    w: 220, h: 70,
    svg: `
      <!-- left arm -->
      <rect x="5" y="22" width="60" height="24" rx="10" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="3" y="14" width="22" height="40" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <!-- right arm -->
      <rect x="155" y="22" width="60" height="24" rx="10" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="195" y="14" width="22" height="40" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
    `,
  },
  legs: {
    w: 130, h: 110,
    svg: `
      <rect x="28" y="5" width="22" height="80" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="80" y="5" width="22" height="80" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="18" y="80" width="42" height="22" rx="4" fill="#3a4756"/>
      <rect x="70" y="80" width="42" height="22" rx="4" fill="#3a4756"/>
    `,
  },
  antenna: {
    w: 30, h: 50,
    svg: `
      <rect x="13" y="18" width="4" height="32" fill="#3a4756"/>
      <circle cx="15" cy="12" r="10" fill="#d33" stroke="#3a4756" stroke-width="3"/>
      <circle cx="12" cy="9" r="3" fill="#ff8a8a"/>
    `,
  },
  eyes: {
    w: 70, h: 28,
    svg: `
      <circle cx="15" cy="14" r="10" fill="#fff" stroke="#3a4756" stroke-width="3"/>
      <circle cx="55" cy="14" r="10" fill="#fff" stroke="#3a4756" stroke-width="3"/>
      <circle cx="16" cy="14" r="4" fill="#1a2230"/>
      <circle cx="56" cy="14" r="4" fill="#1a2230"/>
    `,
  },

  // ===== L6-L10 Armor phase =====
  shoulderPads: {
    w: 200, h: 50,
    svg: `
      <!-- left pad -->
      <path d="M5 40 Q5 8 40 8 L70 8 Q80 8 80 20 L80 40 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="20" y="20" width="40" height="6" rx="2" fill="#3a4756"/>
      <!-- right pad -->
      <path d="M195 40 Q195 8 160 8 L130 8 Q120 8 120 20 L120 40 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="140" y="20" width="40" height="6" rx="2" fill="#3a4756"/>
    `,
  },
  chestPlate: {
    w: 110, h: 80,
    svg: `
      <path d="M10 5 L100 5 L95 70 Q55 78 15 70 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <line x1="55" y1="10" x2="55" y2="68" stroke="#3a4756" stroke-width="3"/>
      <rect x="25" y="20" width="20" height="8" rx="2" fill="#3aa3ff"/>
      <rect x="65" y="20" width="20" height="8" rx="2" fill="#3aa3ff"/>
      <rect x="25" y="40" width="20" height="6" rx="2" fill="#3a4756"/>
      <rect x="65" y="40" width="20" height="6" rx="2" fill="#3a4756"/>
    `,
  },
  visor: {
    w: 90, h: 24,
    svg: `
      <path d="M5 18 L8 5 L82 5 L85 18 Z"
            fill="#3aa3ff" stroke="#3a4756" stroke-width="4"/>
      <rect x="12" y="9" width="22" height="4" rx="1" fill="#ffffff" opacity="0.7"/>
      <rect x="56" y="9" width="22" height="4" rx="1" fill="#ffffff" opacity="0.7"/>
    `,
  },
  kneepads: {
    w: 130, h: 40,
    svg: `
      <!-- left knee -->
      <path d="M20 35 Q20 5 38 5 Q56 5 56 35 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <circle cx="38" cy="22" r="5" fill="#3a4756"/>
      <!-- right knee -->
      <path d="M74 35 Q74 5 92 5 Q110 5 110 35 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <circle cx="92" cy="22" r="5" fill="#3a4756"/>
    `,
  },
  gauntlets: {
    w: 220, h: 50,
    svg: `
      <!-- left gauntlet -->
      <rect x="3" y="6" width="34" height="40" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="8" y="14" width="24" height="4" rx="1" fill="#3a4756"/>
      <rect x="8" y="24" width="24" height="4" rx="1" fill="#3a4756"/>
      <rect x="8" y="34" width="24" height="4" rx="1" fill="#3a4756"/>
      <!-- right gauntlet -->
      <rect x="183" y="6" width="34" height="40" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="188" y="14" width="24" height="4" rx="1" fill="#3a4756"/>
      <rect x="188" y="24" width="24" height="4" rx="1" fill="#3a4756"/>
      <rect x="188" y="34" width="24" height="4" rx="1" fill="#3a4756"/>
    `,
  },

  // ===== L11-L15 Weapons & gadgets =====
  jetThrusters: {
    w: 140, h: 80,
    svg: `
      <!-- left thruster -->
      <rect x="5" y="10" width="40" height="55" rx="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="12" y="18" width="26" height="6" rx="2" fill="#3a4756"/>
      <circle cx="25" cy="50" r="8" fill="#ff8855" stroke="#3a4756" stroke-width="3"/>
      <circle cx="25" cy="50" r="4" fill="#ffd966"/>
      <!-- right thruster -->
      <rect x="95" y="10" width="40" height="55" rx="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="102" y="18" width="26" height="6" rx="2" fill="#3a4756"/>
      <circle cx="115" cy="50" r="8" fill="#ff8855" stroke="#3a4756" stroke-width="3"/>
      <circle cx="115" cy="50" r="4" fill="#ffd966"/>
    `,
  },
  handCannon: {
    w: 70, h: 50,
    svg: `
      <rect x="5" y="14" width="50" height="22" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="48" y="10" width="18" height="30" rx="3" fill="#3a4756" stroke="#3a4756" stroke-width="2"/>
      <circle cx="57" cy="25" r="6" fill="#d33" stroke="#3a4756" stroke-width="2"/>
      <rect x="14" y="20" width="20" height="4" rx="1" fill="#3a4756"/>
      <rect x="14" y="28" width="20" height="3" rx="1" fill="#3a4756"/>
    `,
  },
  shoulderCannon: {
    w: 60, h: 60,
    svg: `
      <rect x="8" y="20" width="32" height="30" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="20" y="5" width="22" height="30" rx="4" fill="#3a4756" stroke="#3a4756" stroke-width="2"/>
      <circle cx="31" cy="12" r="5" fill="#d33" stroke="#1a2230" stroke-width="2"/>
      <rect x="12" y="30" width="22" height="5" rx="1" fill="#3a4756"/>
      <rect x="12" y="40" width="22" height="5" rx="1" fill="#3a4756"/>
    `,
  },
  tallAntenna: {
    w: 60, h: 90,
    svg: `
      <rect x="27" y="40" width="6" height="48" fill="#3a4756"/>
      <path d="M30 5 L18 32 L42 32 Z" fill="#d33" stroke="#3a4756" stroke-width="3"/>
      <rect x="14" y="32" width="32" height="8" rx="2" fill="#3a4756"/>
      <circle cx="30" cy="18" r="3" fill="#ffd966"/>
    `,
  },
  chestCore: {
    w: 60, h: 60,
    svg: `
      <circle cx="30" cy="30" r="26" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="30" cy="30" r="20" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
      <circle cx="30" cy="30" r="12" fill="#ff8855"/>
      <circle cx="30" cy="30" r="5" fill="#ffffff"/>
    `,
  },

  // ===== L16-L20 Scale up =====
  bigTorso: {
    w: 180, h: 160,
    svg: `
      <path d="M10 10 L170 10 L160 140 Q90 156 20 140 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <line x1="90" y1="14" x2="90" y2="148" stroke="#3a4756" stroke-width="3"/>
      <rect x="20" y="20" width="50" height="10" rx="2" fill="#3a4756"/>
      <rect x="110" y="20" width="50" height="10" rx="2" fill="#3a4756"/>
      <circle cx="90" cy="78" r="28" fill="#ffd966" stroke="#7a5a1f" stroke-width="4"/>
      <circle cx="90" cy="78" r="15" fill="#ff8855"/>
      <circle cx="90" cy="78" r="6" fill="#ffffff"/>
      <rect x="22" y="118" width="40" height="14" rx="3" fill="#3a4756"/>
      <rect x="118" y="118" width="40" height="14" rx="3" fill="#3a4756"/>
    `,
  },
  bigLegs: {
    w: 170, h: 170,
    svg: `
      <!-- left leg -->
      <rect x="22" y="5" width="38" height="120" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <rect x="18" y="60" width="46" height="14" rx="3" fill="#3a4756"/>
      <circle cx="41" cy="100" r="10" fill="#3a4756"/>
      <!-- right leg -->
      <rect x="110" y="5" width="38" height="120" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <rect x="106" y="60" width="46" height="14" rx="3" fill="#3a4756"/>
      <circle cx="129" cy="100" r="10" fill="#3a4756"/>
    `,
  },
  mechFeet: {
    w: 180, h: 50,
    svg: `
      <!-- left foot -->
      <path d="M5 40 L5 18 Q5 8 18 8 L60 8 Q72 8 78 20 L78 40 Z"
            fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <rect x="14" y="20" width="56" height="6" rx="2" fill="#bbc4d0"/>
      <rect x="18" y="32" width="14" height="6" rx="1" fill="#bbc4d0"/>
      <rect x="50" y="32" width="14" height="6" rx="1" fill="#bbc4d0"/>
      <!-- right foot -->
      <path d="M102 40 L102 20 Q108 8 120 8 L162 8 Q175 8 175 18 L175 40 Z"
            fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <rect x="110" y="20" width="56" height="6" rx="2" fill="#bbc4d0"/>
      <rect x="116" y="32" width="14" height="6" rx="1" fill="#bbc4d0"/>
      <rect x="148" y="32" width="14" height="6" rx="1" fill="#bbc4d0"/>
    `,
  },
  bulkyShoulders: {
    w: 260, h: 80,
    svg: `
      <!-- left bulky shoulder -->
      <path d="M5 70 L5 30 Q5 5 40 5 L80 5 Q92 5 92 22 L92 70 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <rect x="18" y="22" width="60" height="8" rx="2" fill="#3a4756"/>
      <rect x="18" y="38" width="60" height="6" rx="2" fill="#3a4756"/>
      <circle cx="48" cy="56" r="6" fill="#d33" stroke="#3a4756" stroke-width="2"/>
      <!-- right bulky shoulder -->
      <path d="M255 70 L255 30 Q255 5 220 5 L180 5 Q168 5 168 22 L168 70 Z"
            fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <rect x="182" y="22" width="60" height="8" rx="2" fill="#3a4756"/>
      <rect x="182" y="38" width="60" height="6" rx="2" fill="#3a4756"/>
      <circle cx="212" cy="56" r="6" fill="#d33" stroke="#3a4756" stroke-width="2"/>
    `,
  },

  // ===== L21-L25 Mech finale =====
  dualCannons: {
    w: 300, h: 70,
    svg: `
      <!-- left dual cannon -->
      <rect x="5" y="18" width="80" height="18" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="5" y="38" width="80" height="18" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="82" cy="27" r="7" fill="#d33" stroke="#1a2230" stroke-width="2"/>
      <circle cx="82" cy="47" r="7" fill="#d33" stroke="#1a2230" stroke-width="2"/>
      <rect x="10" y="10" width="20" height="50" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <!-- right dual cannon -->
      <rect x="215" y="18" width="80" height="18" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="215" y="38" width="80" height="18" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="218" cy="27" r="7" fill="#d33" stroke="#1a2230" stroke-width="2"/>
      <circle cx="218" cy="47" r="7" fill="#d33" stroke="#1a2230" stroke-width="2"/>
      <rect x="270" y="10" width="20" height="50" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
    `,
  },
  energySword: {
    w: 60, h: 180,
    svg: `
      <rect x="22" y="130" width="16" height="42" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="14" y="120" width="32" height="14" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <path d="M24 120 L30 8 L36 120 Z" fill="#3aa3ff" stroke="#ffffff" stroke-width="3"/>
      <path d="M28 115 L30 20 L32 115 Z" fill="#ffffff" opacity="0.8"/>
    `,
  },
  energyWings: {
    w: 320, h: 200,
    svg: `
      <!-- left wing -->
      <path d="M150 30 Q60 20 10 90 Q40 110 90 100 Q120 95 150 80 Z"
            fill="#3aa3ff" stroke="#ffffff" stroke-width="4" opacity="0.85"/>
      <path d="M150 80 Q70 90 20 150 Q60 160 100 140 Q130 130 150 110 Z"
            fill="#3aa3ff" stroke="#ffffff" stroke-width="4" opacity="0.85"/>
      <!-- jetpack core -->
      <rect x="140" y="40" width="40" height="120" rx="8" fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <circle cx="160" cy="80" r="10" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
      <circle cx="160" cy="80" r="5" fill="#ff8855"/>
      <rect x="148" y="115" width="24" height="40" rx="3" fill="#3a4756"/>
      <!-- right wing -->
      <path d="M170 30 Q260 20 310 90 Q280 110 230 100 Q200 95 170 80 Z"
            fill="#3aa3ff" stroke="#ffffff" stroke-width="4" opacity="0.85"/>
      <path d="M170 80 Q250 90 300 150 Q260 160 220 140 Q190 130 170 110 Z"
            fill="#3aa3ff" stroke="#ffffff" stroke-width="4" opacity="0.85"/>
    `,
  },
  headCrest: {
    w: 140, h: 70,
    svg: `
      <path d="M70 65 L20 5 L34 30 L52 12 L60 38 L70 8 L80 38 L88 12 L106 30 L120 5 Z"
            fill="#ffd966" stroke="#3a4756" stroke-width="4"/>
      <path d="M55 50 L70 20 L85 50 Z" fill="#d33" stroke="#3a4756" stroke-width="3"/>
    `,
  },
  ultraCore: {
    w: 90, h: 90,
    svg: `
      <circle cx="45" cy="45" r="42" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <circle cx="45" cy="45" r="34" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
      <circle cx="45" cy="45" r="24" fill="#ff8855"/>
      <circle cx="45" cy="45" r="14" fill="#ffffff"/>
      <path d="M45 8 L48 38 L78 45 L48 52 L45 82 L42 52 L12 45 L42 38 Z"
            fill="#ffffff" opacity="0.7"/>
    `,
  },

  // ===== L26-L30 Heavy industrial =====
  hydraulicPistons: {
    w: 180, h: 160,
    svg: `
      <!-- left piston -->
      <rect x="14" y="10" width="22" height="80" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <rect x="10" y="90" width="30" height="14" rx="2" fill="#3a4756"/>
      <rect x="18" y="104" width="14" height="46" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <circle cx="25" cy="22" r="4" fill="#ff8855"/>
      <circle cx="25" cy="50" r="4" fill="#ff8855"/>
      <circle cx="25" cy="78" r="4" fill="#ff8855"/>
      <!-- right piston -->
      <rect x="144" y="10" width="22" height="80" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <rect x="140" y="90" width="30" height="14" rx="2" fill="#3a4756"/>
      <rect x="148" y="104" width="14" height="46" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <circle cx="155" cy="22" r="4" fill="#ff8855"/>
      <circle cx="155" cy="50" r="4" fill="#ff8855"/>
      <circle cx="155" cy="78" r="4" fill="#ff8855"/>
    `,
  },
  smokeStacks: {
    w: 240, h: 120,
    svg: `
      <!-- left stack -->
      <rect x="14" y="40" width="32" height="70" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <rect x="8" y="34" width="44" height="12" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="30" cy="22" r="14" fill="#aaa" opacity="0.6"/>
      <circle cx="22" cy="10" r="10" fill="#aaa" opacity="0.5"/>
      <circle cx="38" cy="6" r="8" fill="#aaa" opacity="0.4"/>
      <!-- right stack -->
      <rect x="194" y="40" width="32" height="70" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <rect x="188" y="34" width="44" height="12" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="210" cy="22" r="14" fill="#aaa" opacity="0.6"/>
      <circle cx="202" cy="10" r="10" fill="#aaa" opacity="0.5"/>
      <circle cx="218" cy="6" r="8" fill="#aaa" opacity="0.4"/>
      <!-- center connector -->
      <rect x="70" y="80" width="100" height="20" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="90" cy="90" r="4" fill="#3a4756"/>
      <circle cx="120" cy="90" r="4" fill="#3a4756"/>
      <circle cx="150" cy="90" r="4" fill="#3a4756"/>
    `,
  },
  treads: {
    w: 260, h: 90,
    svg: `
      <!-- left tread -->
      <rect x="5" y="20" width="110" height="60" rx="28" fill="#3a4756" stroke="#1a2230" stroke-width="5"/>
      <rect x="14" y="28" width="92" height="44" rx="20" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="30" cy="50" r="14" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="60" cy="50" r="14" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="90" cy="50" r="14" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="30" cy="50" r="4" fill="#aaa"/>
      <circle cx="60" cy="50" r="4" fill="#aaa"/>
      <circle cx="90" cy="50" r="4" fill="#aaa"/>
      <!-- right tread -->
      <rect x="145" y="20" width="110" height="60" rx="28" fill="#3a4756" stroke="#1a2230" stroke-width="5"/>
      <rect x="154" y="28" width="92" height="44" rx="20" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="170" cy="50" r="14" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="200" cy="50" r="14" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="230" cy="50" r="14" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="170" cy="50" r="4" fill="#aaa"/>
      <circle cx="200" cy="50" r="4" fill="#aaa"/>
      <circle cx="230" cy="50" r="4" fill="#aaa"/>
    `,
  },
  wiringPanel: {
    w: 120, h: 90,
    svg: `
      <rect x="5" y="5" width="110" height="80" rx="4" fill="#1a2230" stroke="#3a4756" stroke-width="4"/>
      <path d="M15 20 Q30 30 15 50 Q30 70 50 60" stroke="#ff8855" stroke-width="3" fill="none"/>
      <path d="M30 15 Q50 25 40 50 Q30 75 60 70" stroke="#3aa3ff" stroke-width="3" fill="none"/>
      <path d="M70 18 Q90 30 75 55 Q65 75 100 70" stroke="#ffd966" stroke-width="3" fill="none"/>
      <path d="M85 15 Q105 30 90 50 Q70 70 105 78" stroke="#d33" stroke-width="3" fill="none"/>
      <circle cx="20" cy="22" r="3" fill="#ff8855"/>
      <circle cx="50" cy="62" r="3" fill="#3aa3ff"/>
      <circle cx="100" cy="72" r="3" fill="#ffd966"/>
      <circle cx="90" cy="20" r="3" fill="#d33"/>
    `,
  },
  drillArm: {
    w: 110, h: 220,
    svg: `
      <rect x="35" y="5" width="40" height="40" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="30" y="40" width="50" height="30" rx="4" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <circle cx="55" cy="20" r="6" fill="#ffd966"/>
      <rect x="38" y="68" width="34" height="18" rx="3" fill="#3a4756"/>
      <!-- drill body -->
      <path d="M30 86 L80 86 L70 200 L40 200 Z" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <path d="M36 100 L74 100" stroke="#3a4756" stroke-width="3"/>
      <path d="M38 120 L72 120" stroke="#3a4756" stroke-width="3"/>
      <path d="M40 140 L70 140" stroke="#3a4756" stroke-width="3"/>
      <path d="M42 160 L68 160" stroke="#3a4756" stroke-width="3"/>
      <path d="M44 180 L66 180" stroke="#3a4756" stroke-width="3"/>
      <!-- drill tip -->
      <path d="M40 200 L55 218 L70 200 Z" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
    `,
  },

  // ===== L31-L35 Big guns =====
  gatlingGun: {
    w: 130, h: 90,
    svg: `
      <rect x="5" y="22" width="40" height="46" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="40" y="14" width="20" height="62" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <!-- barrels -->
      <circle cx="80" cy="30" r="8" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="80" cy="46" r="8" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="80" cy="62" r="8" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="80" y="22" width="44" height="16" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="80" y="38" width="44" height="16" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <rect x="80" y="54" width="44" height="16" rx="2" fill="#3a4756" stroke="#1a2230" stroke-width="2"/>
      <circle cx="118" cy="30" r="4" fill="#d33"/>
      <circle cx="118" cy="46" r="4" fill="#d33"/>
      <circle cx="118" cy="62" r="4" fill="#d33"/>
    `,
  },
  missilePods: {
    w: 280, h: 80,
    svg: `
      <!-- left pod -->
      <rect x="5" y="10" width="80" height="60" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="14" y="18" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="38" y="18" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="62" y="18" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="14" y="44" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="38" y="44" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="62" y="44" width="20" height="20" rx="3" fill="#3a4756"/>
      <path d="M20 22 L28 38 L16 38 Z" fill="#d33"/>
      <path d="M44 22 L52 38 L40 38 Z" fill="#d33"/>
      <path d="M68 22 L76 38 L64 38 Z" fill="#d33"/>
      <path d="M20 48 L28 64 L16 64 Z" fill="#d33"/>
      <path d="M44 48 L52 64 L40 64 Z" fill="#d33"/>
      <path d="M68 48 L76 64 L64 64 Z" fill="#d33"/>
      <!-- right pod -->
      <rect x="195" y="10" width="80" height="60" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="204" y="18" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="228" y="18" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="252" y="18" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="204" y="44" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="228" y="44" width="20" height="20" rx="3" fill="#3a4756"/>
      <rect x="252" y="44" width="20" height="20" rx="3" fill="#3a4756"/>
      <path d="M210 22 L218 38 L206 38 Z" fill="#d33"/>
      <path d="M234 22 L242 38 L222 38 Z" fill="#d33"/>
      <path d="M258 22 L266 38 L254 38 Z" fill="#d33"/>
      <path d="M210 48 L218 64 L206 64 Z" fill="#d33"/>
      <path d="M234 48 L242 64 L230 64 Z" fill="#d33"/>
      <path d="M258 48 L266 64 L254 64 Z" fill="#d33"/>
    `,
  },
  beamRifle: {
    w: 220, h: 70,
    svg: `
      <rect x="5" y="22" width="40" height="30" rx="5" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="40" y="14" width="120" height="42" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="50" y="22" width="100" height="8" rx="2" fill="#aaa"/>
      <rect x="50" y="38" width="100" height="6" rx="2" fill="#3aa3ff"/>
      <rect x="160" y="20" width="50" height="30" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="200" cy="35" r="8" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <circle cx="200" cy="35" r="3" fill="#ffffff"/>
      <rect x="80" y="48" width="14" height="18" rx="2" fill="#3a4756"/>
    `,
  },
  plasmaSword: {
    w: 70, h: 220,
    svg: `
      <rect x="22" y="170" width="22" height="46" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="14" y="158" width="38" height="16" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="33" cy="166" r="4" fill="#ff8855"/>
      <path d="M22 158 L33 6 L44 158 Z" fill="#ff8855" stroke="#ffd966" stroke-width="3"/>
      <path d="M28 152 L33 20 L38 152 Z" fill="#ffffff" opacity="0.8"/>
      <path d="M20 100 Q33 110 46 100" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.6"/>
    `,
  },
  railguns: {
    w: 220, h: 90,
    svg: `
      <!-- left railgun -->
      <rect x="5" y="35" width="100" height="20" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <rect x="5" y="25" width="14" height="40" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="22" y="20" width="76" height="6" rx="2" fill="#3aa3ff"/>
      <rect x="22" y="64" width="76" height="6" rx="2" fill="#3aa3ff"/>
      <circle cx="100" cy="45" r="6" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <!-- right railgun -->
      <rect x="115" y="35" width="100" height="20" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <rect x="201" y="25" width="14" height="40" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="3"/>
      <rect x="122" y="20" width="76" height="6" rx="2" fill="#3aa3ff"/>
      <rect x="122" y="64" width="76" height="6" rx="2" fill="#3aa3ff"/>
      <circle cx="120" cy="45" r="6" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
    `,
  },

  // ===== L36-L40 Energy / power =====
  reactorCore: {
    w: 160, h: 200,
    svg: `
      <rect x="20" y="10" width="120" height="180" rx="10" fill="#3a4756" stroke="#1a2230" stroke-width="5"/>
      <rect x="30" y="20" width="100" height="160" rx="6" fill="#1a2230"/>
      <!-- fins -->
      <rect x="5" y="30" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="5" y="60" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="5" y="90" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="5" y="120" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="5" y="150" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="137" y="30" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="137" y="60" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="137" y="90" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="137" y="120" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="137" y="150" width="18" height="14" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <!-- core -->
      <circle cx="80" cy="100" r="50" fill="#ffd966" stroke="#7a5a1f" stroke-width="4"/>
      <circle cx="80" cy="100" r="34" fill="#ff8855"/>
      <circle cx="80" cy="100" r="18" fill="#ffffff"/>
      <rect x="40" y="160" width="80" height="14" rx="3" fill="#3aa3ff"/>
    `,
  },
  energyShield: {
    w: 360, h: 480,
    svg: `
      <ellipse cx="180" cy="240" rx="170" ry="230" fill="#3aa3ff" opacity="0.18"
               stroke="#3aa3ff" stroke-width="6" stroke-dasharray="14 8"/>
      <ellipse cx="180" cy="240" rx="155" ry="215" fill="none"
               stroke="#ffffff" stroke-width="3" opacity="0.5"/>
      <path d="M180 30 Q40 90 30 240" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.4"/>
      <path d="M180 30 Q320 90 330 240" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.4"/>
    `,
  },
  capacitorBanks: {
    w: 260, h: 60,
    svg: `
      <rect x="5" y="14" width="40" height="40" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="25" cy="34" r="9" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="55" y="14" width="40" height="40" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="75" cy="34" r="9" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="105" y="14" width="40" height="40" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="125" cy="34" r="9" fill="#ffd966" stroke="#ffffff" stroke-width="2"/>
      <rect x="155" y="14" width="40" height="40" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="175" cy="34" r="9" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="205" y="14" width="40" height="40" rx="3" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="225" cy="34" r="9" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="5" y="6" width="240" height="6" rx="2" fill="#aaa"/>
    `,
  },
  plasmaWings: {
    w: 420, h: 260,
    svg: `
      <!-- left plasma wing -->
      <path d="M210 30 Q90 0 10 100 Q60 120 130 110 Q170 100 210 90 Z"
            fill="#ff8855" stroke="#ffd966" stroke-width="4" opacity="0.85"/>
      <path d="M210 90 Q80 110 20 200 Q90 220 150 180 Q190 160 210 140 Z"
            fill="#ff8855" stroke="#ffd966" stroke-width="4" opacity="0.85"/>
      <path d="M210 140 Q110 180 50 250 Q120 250 180 220 Q200 200 210 180 Z"
            fill="#ffd966" stroke="#ffffff" stroke-width="3" opacity="0.85"/>
      <!-- right plasma wing -->
      <path d="M210 30 Q330 0 410 100 Q360 120 290 110 Q250 100 210 90 Z"
            fill="#ff8855" stroke="#ffd966" stroke-width="4" opacity="0.85"/>
      <path d="M210 90 Q340 110 400 200 Q330 220 270 180 Q230 160 210 140 Z"
            fill="#ff8855" stroke="#ffd966" stroke-width="4" opacity="0.85"/>
      <path d="M210 140 Q310 180 370 250 Q300 250 240 220 Q220 200 210 180 Z"
            fill="#ffd966" stroke="#ffffff" stroke-width="3" opacity="0.85"/>
      <!-- center spine -->
      <rect x="200" y="40" width="20" height="200" rx="6" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
    `,
  },
  antiGravRings: {
    w: 320, h: 120,
    svg: `
      <ellipse cx="160" cy="60" rx="150" ry="40" fill="none"
               stroke="#3aa3ff" stroke-width="6" opacity="0.85"/>
      <ellipse cx="160" cy="60" rx="120" ry="32" fill="none"
               stroke="#ffd966" stroke-width="5" opacity="0.85"/>
      <ellipse cx="160" cy="60" rx="90" ry="24" fill="none"
               stroke="#ff8855" stroke-width="4" opacity="0.85"/>
      <circle cx="10" cy="60" r="7" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <circle cx="310" cy="60" r="7" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <circle cx="40" cy="60" r="6" fill="#ffd966" stroke="#ffffff" stroke-width="2"/>
      <circle cx="280" cy="60" r="6" fill="#ffd966" stroke="#ffffff" stroke-width="2"/>
    `,
  },

  // ===== L41-L45 Sensor / command tower =====
  radarDish: {
    w: 140, h: 130,
    svg: `
      <rect x="60" y="80" width="20" height="46" fill="#3a4756"/>
      <path d="M10 70 Q70 -10 130 70 L120 80 Q70 20 20 80 Z"
            fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <path d="M22 76 Q70 18 118 76" stroke="#3a4756" stroke-width="2" fill="none"/>
      <path d="M35 80 Q70 34 105 80" stroke="#3a4756" stroke-width="2" fill="none"/>
      <rect x="66" y="44" width="6" height="36" fill="#3a4756"/>
      <circle cx="69" cy="40" r="6" fill="#d33" stroke="#1a2230" stroke-width="2"/>
    `,
  },
  multiEyeVisor: {
    w: 130, h: 36,
    svg: `
      <path d="M5 30 L10 5 L120 5 L125 30 Z"
            fill="#1a2230" stroke="#3a4756" stroke-width="4"/>
      <circle cx="22" cy="18" r="6" fill="#d33" stroke="#ffffff" stroke-width="2"/>
      <circle cx="42" cy="18" r="6" fill="#ffd966" stroke="#ffffff" stroke-width="2"/>
      <circle cx="62" cy="18" r="6" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <circle cx="82" cy="18" r="6" fill="#ffd966" stroke="#ffffff" stroke-width="2"/>
      <circle cx="102" cy="18" r="6" fill="#d33" stroke="#ffffff" stroke-width="2"/>
    `,
  },
  commandTower: {
    w: 140, h: 180,
    svg: `
      <rect x="40" y="120" width="60" height="56" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="30" y="80" width="80" height="44" rx="3" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="40" y="90" width="60" height="20" rx="2" fill="#3aa3ff"/>
      <rect x="48" y="130" width="14" height="14" rx="2" fill="#ffd966"/>
      <rect x="68" y="130" width="14" height="14" rx="2" fill="#ffd966"/>
      <rect x="48" y="152" width="34" height="6" rx="2" fill="#3a4756"/>
      <!-- antenna spire -->
      <rect x="66" y="20" width="8" height="60" fill="#aaa" stroke="#3a4756" stroke-width="2"/>
      <path d="M70 5 L60 30 L80 30 Z" fill="#d33" stroke="#3a4756" stroke-width="3"/>
      <circle cx="70" cy="14" r="3" fill="#ffd966"/>
    `,
  },
  cockpitHatch: {
    w: 100, h: 90,
    svg: `
      <path d="M10 80 Q10 10 50 10 Q90 10 90 80 Z"
            fill="#3aa3ff" stroke="#3a4756" stroke-width="4"/>
      <path d="M50 14 L50 78" stroke="#3a4756" stroke-width="3"/>
      <path d="M16 70 Q16 20 50 18" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.7"/>
      <rect x="22" y="80" width="56" height="8" rx="2" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <circle cx="34" cy="84" r="2" fill="#3a4756"/>
      <circle cx="66" cy="84" r="2" fill="#3a4756"/>
    `,
  },
  megaAntenna: {
    w: 110, h: 200,
    svg: `
      <rect x="50" y="80" width="10" height="118" fill="#aaa" stroke="#3a4756" stroke-width="3"/>
      <rect x="36" y="180" width="38" height="14" rx="2" fill="#3a4756"/>
      <!-- crossbars -->
      <rect x="20" y="100" width="70" height="6" rx="1" fill="#3a4756"/>
      <rect x="14" y="60" width="82" height="6" rx="1" fill="#3a4756"/>
      <rect x="8" y="30" width="94" height="6" rx="1" fill="#3a4756"/>
      <!-- bulb cluster top -->
      <circle cx="55" cy="14" r="11" fill="#d33" stroke="#3a4756" stroke-width="3"/>
      <circle cx="30" cy="22" r="6" fill="#ffd966" stroke="#3a4756" stroke-width="2"/>
      <circle cx="80" cy="22" r="6" fill="#ffd966" stroke="#3a4756" stroke-width="2"/>
      <circle cx="52" cy="10" r="3" fill="#ffffff"/>
    `,
  },

  // ===== L46-L50 Ultimate forms =====
  battlePack: {
    w: 360, h: 260,
    svg: `
      <!-- center backpack -->
      <rect x="130" y="40" width="100" height="180" rx="10" fill="#bbc4d0" stroke="#3a4756" stroke-width="5"/>
      <rect x="145" y="60" width="70" height="40" rx="4" fill="#3a4756"/>
      <rect x="145" y="110" width="70" height="6" rx="2" fill="#aaa"/>
      <rect x="145" y="125" width="70" height="6" rx="2" fill="#aaa"/>
      <circle cx="180" cy="160" r="22" fill="#ffd966" stroke="#7a5a1f" stroke-width="3"/>
      <circle cx="180" cy="160" r="11" fill="#ff8855"/>
      <!-- left missile rack -->
      <rect x="20" y="30" width="100" height="80" rx="6" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <rect x="30" y="40" width="20" height="20" rx="2" fill="#aaa"/>
      <rect x="58" y="40" width="20" height="20" rx="2" fill="#aaa"/>
      <rect x="86" y="40" width="20" height="20" rx="2" fill="#aaa"/>
      <rect x="30" y="70" width="20" height="20" rx="2" fill="#aaa"/>
      <rect x="58" y="70" width="20" height="20" rx="2" fill="#aaa"/>
      <rect x="86" y="70" width="20" height="20" rx="2" fill="#aaa"/>
      <path d="M40 42 L46 56 L34 56 Z" fill="#d33"/>
      <path d="M68 42 L74 56 L62 56 Z" fill="#d33"/>
      <path d="M96 42 L102 56 L90 56 Z" fill="#d33"/>
      <path d="M40 72 L46 86 L34 86 Z" fill="#d33"/>
      <path d="M68 72 L74 86 L62 86 Z" fill="#d33"/>
      <path d="M96 72 L102 86 L90 86 Z" fill="#d33"/>
      <!-- right dual cannons -->
      <rect x="240" y="40" width="100" height="20" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="240" y="68" width="100" height="20" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="336" cy="50" r="6" fill="#d33"/>
      <circle cx="336" cy="78" r="6" fill="#d33"/>
      <!-- thrusters bottom -->
      <rect x="140" y="220" width="22" height="36" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <rect x="200" y="220" width="22" height="36" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="3"/>
      <circle cx="151" cy="252" r="6" fill="#ff8855"/>
      <circle cx="211" cy="252" r="6" fill="#ff8855"/>
    `,
  },
  superCrown: {
    w: 220, h: 110,
    svg: `
      <path d="M110 100 L20 10 L40 60 L60 20 L80 70 L110 14 L140 70 L160 20 L180 60 L200 10 Z"
            fill="#ffd966" stroke="#3a4756" stroke-width="5"/>
      <circle cx="40" cy="46" r="6" fill="#d33" stroke="#3a4756" stroke-width="2"/>
      <circle cx="80" cy="56" r="6" fill="#3aa3ff" stroke="#3a4756" stroke-width="2"/>
      <circle cx="110" cy="34" r="8" fill="#d33" stroke="#3a4756" stroke-width="3"/>
      <circle cx="140" cy="56" r="6" fill="#3aa3ff" stroke="#3a4756" stroke-width="2"/>
      <circle cx="180" cy="46" r="6" fill="#d33" stroke="#3a4756" stroke-width="2"/>
      <path d="M90 80 L110 40 L130 80 Z" fill="#ff8855" stroke="#3a4756" stroke-width="3"/>
    `,
  },
  megaCannon: {
    w: 420, h: 130,
    svg: `
      <rect x="5" y="50" width="60" height="30" rx="6" fill="#bbc4d0" stroke="#3a4756" stroke-width="4"/>
      <rect x="60" y="35" width="280" height="60" rx="6" fill="#3a4756" stroke="#1a2230" stroke-width="5"/>
      <rect x="75" y="50" width="250" height="10" rx="2" fill="#aaa"/>
      <rect x="75" y="70" width="250" height="10" rx="2" fill="#aaa"/>
      <rect x="340" y="20" width="74" height="90" rx="6" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <circle cx="395" cy="65" r="14" fill="#d33" stroke="#1a2230" stroke-width="3"/>
      <circle cx="395" cy="65" r="6" fill="#ffffff"/>
      <!-- power coils -->
      <rect x="80" y="20" width="14" height="14" rx="2" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="120" y="20" width="14" height="14" rx="2" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="160" y="20" width="14" height="14" rx="2" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="200" y="20" width="14" height="14" rx="2" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="240" y="20" width="14" height="14" rx="2" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="280" y="20" width="14" height="14" rx="2" fill="#3aa3ff" stroke="#ffffff" stroke-width="2"/>
      <rect x="80" y="96" width="14" height="14" rx="2" fill="#ffd966" stroke="#3a4756" stroke-width="2"/>
      <rect x="160" y="96" width="14" height="14" rx="2" fill="#ffd966" stroke="#3a4756" stroke-width="2"/>
      <rect x="240" y="96" width="14" height="14" rx="2" fill="#ffd966" stroke="#3a4756" stroke-width="2"/>
    `,
  },
  giantSword: {
    w: 110, h: 360,
    svg: `
      <rect x="38" y="290" width="34" height="64" rx="4" fill="#3a4756" stroke="#1a2230" stroke-width="4"/>
      <rect x="24" y="276" width="62" height="20" rx="4" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <rect x="5" y="262" width="100" height="20" rx="3" fill="#aaa" stroke="#3a4756" stroke-width="4"/>
      <path d="M30 262 L55 8 L80 262 Z" fill="#3aa3ff" stroke="#ffffff" stroke-width="4"/>
      <path d="M38 256 L55 30 L72 256 Z" fill="#ffffff" opacity="0.7"/>
      <circle cx="55" cy="288" r="6" fill="#ffd966" stroke="#3a4756" stroke-width="2"/>
      <path d="M18 150 Q55 160 92 150" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.5"/>
    `,
  },
  ultimateHalo: {
    w: 480, h: 200,
    svg: `
      <ellipse cx="240" cy="100" rx="230" ry="60" fill="none"
               stroke="#ffd966" stroke-width="8" opacity="0.9"/>
      <ellipse cx="240" cy="100" rx="230" ry="60" fill="none"
               stroke="#ffffff" stroke-width="3"/>
      <!-- radiating spokes -->
      <path d="M240 100 L20 60" stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <path d="M240 100 L60 30" stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <path d="M240 100 L130 10" stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <path d="M240 100 L240 0"  stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <path d="M240 100 L350 10" stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <path d="M240 100 L420 30" stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <path d="M240 100 L460 60" stroke="#ffd966" stroke-width="3" opacity="0.7"/>
      <circle cx="240" cy="100" r="14" fill="#ffffff"/>
      <circle cx="240" cy="100" r="8"  fill="#ffd966"/>
      <circle cx="60"  cy="80"  r="5" fill="#ffffff"/>
      <circle cx="420" cy="80"  r="5" fill="#ffffff"/>
      <circle cx="160" cy="40"  r="4" fill="#ffffff"/>
      <circle cx="320" cy="40"  r="4" fill="#ffffff"/>
    `,
  },
};

// Stack order (higher number = drawn on top).
const Z_ORDER = {
  // base body
  legs: 1,
  bigLegs: 1,
  mechFeet: 2,
  arms: 2,
  gauntlets: 3,
  body: 3,
  bigTorso: 3,
  chestPlate: 4,
  chestCore: 5,
  ultraCore: 5,
  kneepads: 4,
  shoulderPads: 5,
  bulkyShoulders: 5,
  shoulderCannon: 6,
  handCannon: 6,
  head: 7,
  visor: 8,
  eyes: 9,
  antenna: 10,
  tallAntenna: 10,
  headCrest: 11,
  // back-mounted (drawn behind body via negative-ish, but our renderer just stacks
  // by z; we keep these high but their slot positions are mostly behind the torso
  // visually — use lower z so torso draws over them).
  jetThrusters: 0,
  energyWings: 0,
  dualCannons: 6,
  energySword: 12,

  // L26-L30 Heavy industrial
  hydraulicPistons: 0,    // behind legs
  smokeStacks: 0,         // behind shoulders
  treads: 2,              // replaces/over feet area
  wiringPanel: 2,         // on body, under chest plate
  drillArm: 6,            // right arm weapon

  // L31-L35 Big guns
  gatlingGun: 6,
  missilePods: 6,
  beamRifle: 7,           // held out front
  plasmaSword: 12,        // sword class
  railguns: 6,            // shoulder mount

  // L36-L40 Energy / power
  reactorCore: -1,        // big back-mounted, drawn behind everything
  energyShield: 13,       // translucent overlay on top
  capacitorBanks: 5,      // chest belt
  plasmaWings: -1,        // back, behind body
  antiGravRings: 0,       // ring around legs

  // L41-L45 Sensor / command tower
  radarDish: 11,          // top of head
  multiEyeVisor: 9,
  commandTower: 11,
  cockpitHatch: 5,        // chest
  megaAntenna: 11,

  // L46-L50 Ultimate forms
  battlePack: -1,         // huge back rig behind body
  superCrown: 12,
  megaCannon: 8,          // huge weapon in front
  giantSword: 13,
  ultimateHalo: 14,       // crowning glory above head
};

// Slot positions per level frame. Coordinates are relative to top-left of the
// per-level frame. Most levels reuse the original 320x400 layout; scale-up
// levels (L16+) use a bigger frame and a recentered layout.
//
// Each slot lookup goes: level.slotPos?.[type] ?? SLOT_POS_DEFAULT[type]
const SLOT_POS_DEFAULT = {
  head:    { x: 110, y: 50 },
  body:    { x: 95,  y: 130 },
  arms:    { x: 50,  y: 170 },
  legs:    { x: 95,  y: 260 },
  antenna: { x: 145, y: 5   },
  eyes:    { x: 125, y: 70  },
  // armor + weapons (on standard 320x400 frame)
  shoulderPads:   { x: 60,  y: 150 },
  chestPlate:     { x: 105, y: 150 },
  visor:          { x: 115, y: 70  },
  kneepads:       { x: 95,  y: 270 },
  gauntlets:      { x: 50,  y: 195 },
  jetThrusters:   { x: 90,  y: 140 },
  handCannon:     { x: 215, y: 180 },
  shoulderCannon: { x: 35,  y: 130 },
  tallAntenna:    { x: 130, y: -30 },
  chestCore:      { x: 130, y: 165 },
};

// Slot positions for the bigger scale-up frames (L16-L25, frame 460x520).
const SLOT_POS_BIG = {
  head:           { x: 180, y: 30 },
  eyes:           { x: 195, y: 50 },
  antenna:        { x: 215, y: -10 },
  tallAntenna:    { x: 200, y: -50 },
  visor:          { x: 185, y: 50 },
  headCrest:      { x: 160, y: -30 },
  bigTorso:       { x: 140, y: 110 },
  body:           { x: 165, y: 130 },
  chestPlate:     { x: 175, y: 140 },
  chestCore:      { x: 200, y: 155 },
  ultraCore:      { x: 185, y: 140 },
  bulkyShoulders: { x: 100, y: 110 },
  shoulderPads:   { x: 130, y: 110 },
  shoulderCannon: { x: 90,  y: 90 },
  arms:           { x: 120, y: 170 },
  gauntlets:      { x: 120, y: 220 },
  handCannon:     { x: 305, y: 200 },
  bigLegs:        { x: 145, y: 280 },
  legs:           { x: 165, y: 290 },
  kneepads:       { x: 165, y: 320 },
  mechFeet:       { x: 140, y: 440 },
  jetThrusters:   { x: 160, y: 120 },
  energyWings:    { x: 70,  y: 100 },
  dualCannons:    { x: 80,  y: 100 },
  energySword:    { x: 380, y: 130 },

  // L26-L30 Heavy industrial
  hydraulicPistons: { x: 145, y: 290 },
  smokeStacks:      { x: 110, y: 50 },
  treads:           { x: 100, y: 420 },
  wiringPanel:      { x: 180, y: 160 },
  drillArm:         { x: 340, y: 200 },

  // L31-L35 Big guns
  gatlingGun:       { x: 320, y: 200 },
  missilePods:      { x: 90,  y: 100 },
  beamRifle:        { x: 130, y: 220 },
  plasmaSword:      { x: 380, y: 100 },
  railguns:         { x: 130, y: 80  },

  // L36-L40 Energy / power
  reactorCore:      { x: 150, y: 100 },
  energyShield:     { x: 50,  y: 30  },
  capacitorBanks:   { x: 100, y: 250 },
  plasmaWings:      { x: 30,  y: 70  },
  antiGravRings:    { x: 70,  y: 420 },

  // L41-L45 Sensor / command tower
  radarDish:        { x: 165, y: -90 },
  multiEyeVisor:    { x: 165, y: 50  },
  commandTower:     { x: 165, y: -130 },
  cockpitHatch:     { x: 185, y: 165 },
  megaAntenna:      { x: 180, y: -150 },

  // L46-L50 Ultimate forms
  battlePack:       { x: 60,  y: 80  },
  superCrown:       { x: 125, y: -90 },
  megaCannon:       { x: 30,  y: 220 },
  giantSword:       { x: 420, y: 30  },
  ultimateHalo:     { x: 0,   y: -100 },
};

// XL frame slot positions for ultimate-form levels (L46-L50, frame 640x720).
// Built off SLOT_POS_BIG but shifted to recenter on the larger canvas (+70px x, +80px y).
const SLOT_POS_XL = (() => {
  const m = {};
  for (const k of Object.keys(SLOT_POS_BIG)) {
    const p = SLOT_POS_BIG[k];
    m[k] = { x: p.x + 70, y: p.y + 80 };
  }
  // A few specific re-tweaks for parts that need to sit at the edges of the new
  // larger frame.
  m.ultimateHalo  = { x: 80,  y: -30 };
  m.giantSword    = { x: 500, y: 100 };
  m.megaCannon    = { x: 100, y: 300 };
  m.battlePack    = { x: 100, y: 140 };
  m.superCrown    = { x: 195, y: -20 };
  m.commandTower  = { x: 235, y: -60 };
  m.megaAntenna   = { x: 250, y: -80 };
  m.radarDish     = { x: 235, y: -20 };
  m.energyShield  = { x: 130, y: 110 };
  m.plasmaWings   = { x: 100, y: 150 };
  m.reactorCore   = { x: 220, y: 180 };
  m.energyWings   = { x: 140, y: 180 };
  return m;
})();

export const ROBOT_LEVELS = [
  // L1-L5 originals (default 320x400 frame)
  { name: 'Wake Up',    parts: ['head', 'body'] },
  { name: 'Stand Tall', parts: ['head', 'body', 'legs'] },
  { name: 'Arm Up',     parts: ['head', 'body', 'arms', 'legs'] },
  { name: 'Eye See You',parts: ['head', 'body', 'arms', 'legs', 'eyes'] },
  { name: 'Full Build', parts: ['head', 'body', 'arms', 'legs', 'eyes', 'antenna'] },

  // L6-L10 Armor phase (same frame size, friendly robot gets armored)
  { name: 'Shoulder Pads',
    parts: ['head', 'body', 'arms', 'legs', 'eyes', 'antenna', 'shoulderPads'] },
  { name: 'Chest Plate',
    parts: ['head', 'body', 'arms', 'legs', 'eyes', 'antenna', 'shoulderPads', 'chestPlate'] },
  { name: 'Visor Up',
    parts: ['head', 'body', 'arms', 'legs', 'antenna', 'shoulderPads', 'chestPlate', 'visor'] },
  { name: 'Knee Guards',
    parts: ['head', 'body', 'arms', 'legs', 'antenna', 'shoulderPads', 'chestPlate', 'visor', 'kneepads'] },
  { name: 'Power Gauntlets',
    parts: ['head', 'body', 'arms', 'legs', 'antenna', 'shoulderPads', 'chestPlate', 'visor', 'kneepads', 'gauntlets'] },

  // L11-L15 Weapons & gadgets (still standard frame)
  { name: 'Jet Pack',
    parts: ['head', 'body', 'arms', 'legs', 'antenna', 'shoulderPads', 'chestPlate', 'visor', 'gauntlets', 'jetThrusters'] },
  { name: 'Hand Cannon',
    parts: ['head', 'body', 'arms', 'legs', 'antenna', 'shoulderPads', 'chestPlate', 'visor', 'gauntlets', 'jetThrusters', 'handCannon'] },
  { name: 'Shoulder Cannon',
    parts: ['head', 'body', 'arms', 'legs', 'shoulderPads', 'chestPlate', 'visor', 'gauntlets', 'jetThrusters', 'handCannon', 'shoulderCannon'] },
  { name: 'Tall Crest',
    parts: ['head', 'body', 'arms', 'legs', 'shoulderPads', 'chestPlate', 'visor', 'gauntlets', 'jetThrusters', 'handCannon', 'shoulderCannon', 'tallAntenna'] },
  { name: 'Glowing Core',
    parts: ['head', 'body', 'arms', 'legs', 'shoulderPads', 'visor', 'gauntlets', 'jetThrusters', 'handCannon', 'shoulderCannon', 'tallAntenna', 'chestCore'] },

  // L16-L20 Scale up (bigger frame!)
  { name: 'Giant Mode', frameW: 460, frameH: 520, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'legs', 'visor', 'shoulderPads', 'gauntlets', 'jetThrusters', 'handCannon', 'tallAntenna', 'chestCore'] },
  { name: 'Mech Legs', frameW: 460, frameH: 520, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'shoulderPads', 'gauntlets', 'jetThrusters', 'handCannon', 'tallAntenna', 'chestCore'] },
  { name: 'Mech Feet', frameW: 460, frameH: 520, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'shoulderPads', 'gauntlets', 'jetThrusters', 'handCannon', 'tallAntenna', 'chestCore'] },
  { name: 'Big Shoulders', frameW: 460, frameH: 520, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'jetThrusters', 'handCannon', 'tallAntenna', 'chestCore'] },
  { name: 'Power Up', frameW: 460, frameH: 520, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'jetThrusters', 'handCannon', 'shoulderCannon', 'tallAntenna', 'chestCore'] },

  // L21-L25 Mech finale
  { name: 'Twin Cannons', frameW: 480, frameH: 540, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'jetThrusters', 'tallAntenna', 'chestCore', 'dualCannons'] },
  { name: 'Energy Sword', frameW: 480, frameH: 540, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'jetThrusters', 'tallAntenna', 'chestCore', 'dualCannons', 'energySword'] },
  { name: 'Wings of Light', frameW: 500, frameH: 560, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'tallAntenna', 'chestCore', 'dualCannons', 'energySword', 'energyWings'] },
  { name: 'Samurai Crest', frameW: 500, frameH: 560, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'chestCore', 'dualCannons', 'energySword', 'energyWings', 'headCrest'] },
  { name: 'MECH READY', frameW: 500, frameH: 560, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'dualCannons', 'energySword', 'energyWings', 'headCrest', 'ultraCore'] },

  // ===== L26-L30 Heavy industrial =====
  { name: 'Hydraulic Legs', frameW: 520, frameH: 600, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'bulkyShoulders', 'gauntlets', 'dualCannons', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons'] },
  { name: 'Smoke Stacks', frameW: 520, frameH: 600, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'mechFeet', 'visor', 'gauntlets', 'dualCannons', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'smokeStacks'] },
  { name: 'Tank Treads', frameW: 540, frameH: 620, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'dualCannons', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'smokeStacks', 'treads'] },
  { name: 'Wired Up', frameW: 540, frameH: 620, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'dualCannons', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'smokeStacks', 'treads', 'wiringPanel'] },
  { name: 'Drill Arm', frameW: 560, frameH: 640, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'smokeStacks', 'treads', 'wiringPanel', 'drillArm'] },

  // ===== L31-L35 Big guns =====
  { name: 'Gatling Gun', frameW: 560, frameH: 640, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'smokeStacks', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun'] },
  { name: 'Missile Pods', frameW: 560, frameH: 640, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods'] },
  { name: 'Beam Rifle', frameW: 580, frameH: 640, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle'] },
  { name: 'Plasma Sword', frameW: 580, frameH: 660, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'energyWings', 'headCrest', 'ultraCore', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword'] },
  { name: 'Railguns Up', frameW: 580, frameH: 660, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'headCrest', 'ultraCore', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns'] },

  // ===== L36-L40 Energy / power =====
  { name: 'Reactor Core', frameW: 600, frameH: 680, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore'] },
  { name: 'Capacitor Banks', frameW: 600, frameH: 680, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks'] },
  { name: 'Plasma Wings', frameW: 600, frameH: 680, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings'] },
  { name: 'Anti-Grav Rings', frameW: 600, frameH: 680, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings'] },
  { name: 'Energy Shield', frameW: 620, frameH: 700, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'visor', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings', 'energyShield'] },

  // ===== L41-L45 Sensor / command tower =====
  { name: 'Multi-Eye Visor', frameW: 620, frameH: 700, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings', 'multiEyeVisor'] },
  { name: 'Cockpit Hatch', frameW: 620, frameH: 700, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'headCrest', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch'] },
  { name: 'Radar Dish', frameW: 620, frameH: 720, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'radarDish'] },
  { name: 'Mega Antenna', frameW: 620, frameH: 740, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'megaAntenna'] },
  { name: 'Command Tower', frameW: 640, frameH: 760, slotPos: SLOT_POS_BIG,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'missilePods', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'plasmaWings', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'commandTower'] },

  // ===== L46-L50 Ultimate forms =====
  { name: 'Battle Pack', frameW: 640, frameH: 760, slotPos: SLOT_POS_XL,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'commandTower', 'battlePack'] },
  { name: 'Super Crown', frameW: 640, frameH: 760, slotPos: SLOT_POS_XL,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'gatlingGun', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'battlePack', 'superCrown'] },
  { name: 'Mega Cannon', frameW: 640, frameH: 760, slotPos: SLOT_POS_XL,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'beamRifle', 'plasmaSword', 'railguns', 'reactorCore', 'capacitorBanks', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'battlePack', 'superCrown', 'megaCannon'] },
  { name: 'Giant Sword', frameW: 660, frameH: 780, slotPos: SLOT_POS_XL,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'beamRifle', 'railguns', 'reactorCore', 'capacitorBanks', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'battlePack', 'superCrown', 'megaCannon', 'giantSword'] },
  { name: 'ULTIMATE MECH', frameW: 660, frameH: 800, slotPos: SLOT_POS_XL,
    parts: ['head', 'bigTorso', 'arms', 'bigLegs', 'gauntlets', 'hydraulicPistons', 'treads', 'wiringPanel', 'drillArm', 'beamRifle', 'railguns', 'reactorCore', 'capacitorBanks', 'antiGravRings', 'multiEyeVisor', 'cockpitHatch', 'battlePack', 'superCrown', 'megaCannon', 'giantSword', 'ultimateHalo'] },
];

// Backward-compatible defaults (kept as module-level constants for the original
// 320x400 layout; per-level overrides are read off the level object).
const FRAME_W = 320, FRAME_H = 400;

function getFrameSize(level) {
  return {
    w: level.frameW ?? FRAME_W,
    h: level.frameH ?? FRAME_H,
  };
}

function getSlotPos(level, type) {
  const map = level.slotPos ?? SLOT_POS_DEFAULT;
  return map[type] ?? SLOT_POS_DEFAULT[type];
}

function partSvgEl(type, opts = {}) {
  const def = PART_DEFS[type];
  const isOutline = !!opts.outline;
  const inner = isOutline
    ? def.svg.replace(/fill="[^"]*"/g, 'fill="none"')
             .replace(/stroke="[^"]*"/g, 'stroke="#5a6878"')
             .replace(/stroke-width="\d+"/g, 'stroke-width="3" stroke-dasharray="6 4"')
    : def.svg;
  return `
    <svg viewBox="0 0 ${def.w} ${def.h}" width="${def.w}" height="${def.h}"
         style="display:block;pointer-events:none;">
      ${inner}
    </svg>
  `;
}

// Shuffle helper (Fisher-Yates)
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderRobotLevel(container, levelIndex, opts) {
  const level = ROBOT_LEVELS[levelIndex];
  if (!level) return;
  const partTypes = level.parts;
  const { w: frameW, h: frameH } = getFrameSize(level);

  container.innerHTML = `
    <div class="topbar">
      <button class="back-btn" data-act="back">‹</button>
      <h1>${level.name}</h1>
      <div class="spacer"></div>
    </div>
    <div class="robot-stage">
      <div class="robot-frame" id="robot-frame"
           style="width:${frameW}px;height:${frameH}px;"></div>
      <p class="hint">Drag the parts onto the robot</p>
      <div class="parts-tray" id="parts-tray"></div>
    </div>
  `;

  const frame = container.querySelector('#robot-frame');
  const tray = container.querySelector('#parts-tray');

  // ----- Slots (dashed outlines on the frame) -----
  const slotEls = {};
  for (const type of partTypes) {
    const def = PART_DEFS[type];
    const pos = getSlotPos(level, type);
    const slot = document.createElement('div');
    slot.className = 'robot-slot';
    slot.dataset.type = type;
    slot.style.left = pos.x + 'px';
    slot.style.top  = pos.y + 'px';
    slot.style.width = def.w + 'px';
    slot.style.height = def.h + 'px';
    slot.style.zIndex = Z_ORDER[type] ?? 5;
    slot.innerHTML = partSvgEl(type, { outline: true });
    frame.appendChild(slot);
    slotEls[type] = slot;
  }

  // ----- Parts (in tray, draggable) -----
  const partEls = [];
  const trayPartTypes = shuffled(partTypes);
  trayPartTypes.forEach((type) => {
    const def = PART_DEFS[type];
    const part = document.createElement('div');
    part.className = 'robot-part';
    part.dataset.type = type;
    part.style.width = def.w + 'px';
    part.style.height = def.h + 'px';
    part.innerHTML = partSvgEl(type);
    tray.appendChild(part);
    partEls.push(part);
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
      part.setPointerCapture(e.pointerId);
      const rect = part.getBoundingClientRect();
      homeRect = rect;
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      // Lift the part into a fixed-position layer
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
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      part.releasePointerCapture(pointerId);
      part.classList.remove('dragging');
      const cx = e.clientX, cy = e.clientY;
      // Check if dropped on the matching slot
      const slot = slotEls[part.dataset.type];
      let snapped = false;
      if (slot && !slot.classList.contains('filled')) {
        const sr = slot.getBoundingClientRect();
        // Allow some slack — treat the slot as filled if pointer is within an expanded rect
        const pad = 30;
        if (cx >= sr.left - pad && cx <= sr.right + pad &&
            cy >= sr.top  - pad && cy <= sr.bottom + pad) {
          // Animate to slot position in viewport coords first…
          part.style.transition = 'left 0.18s ease, top 0.18s ease';
          part.style.left = sr.left + 'px';
          part.style.top  = sr.top + 'px';
          slot.classList.add('filled');
          part.classList.add('placed');
          snapped = true;
          sfx.snap();
          placedCount++;
          // …then re-parent into the frame so the bob animation carries the parts.
          setTimeout(() => {
            const pos = getSlotPos(level, part.dataset.type);
            frame.appendChild(part);
            part.style.position = 'absolute';
            part.style.left = pos.x + 'px';
            part.style.top  = pos.y + 'px';
            part.style.zIndex = (Z_ORDER[part.dataset.type] ?? 5) + 10;
            part.style.transition = '';
          }, 200);
          if (placedCount === partTypes.length) {
            won = true;
            setTimeout(onWin, 450);
          }
        }
      }
      if (!snapped) {
        // Snap back to tray home position
        part.style.transition = 'left 0.22s ease, top 0.22s ease';
        part.style.left = homeRect.left + 'px';
        part.style.top  = homeRect.top + 'px';
        sfx.reject();
        // After transition, re-parent back into tray
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
    // Animate the robot
    frame.classList.add('robot-alive');
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
    const hasNext = levelIndex + 1 < ROBOT_LEVELS.length;
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
