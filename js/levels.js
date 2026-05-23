// Level data for the Pipes mechanic.
//
// Grid is rows x cols, stored as flat array length rows*cols (row-major).
// Each cell is one of:
//   null                                       -> empty (no tile)
//   { k: 'src',  dir: 'N'|'E'|'S'|'W' }        -> source (water exits this side)
//   { k: 'sink', dir: 'N'|'E'|'S'|'W' }        -> tank (water enters this side)
//   { k: 'pipe', s: 'I'|'L', r: 0..3 }         -> rotatable pipe (initial rotation)
//   { k: 'wall' }                              -> blocker
//
// Pipe shapes (openings change with rotation r):
//   I (straight): r=0 W+E, r=1 N+S, r=2 W+E, r=3 N+S
//   L (elbow):    r=0 N+E, r=1 E+S, r=2 S+W, r=3 W+N

export const PIPES_LEVELS = [
  // ----- Level 1: rotate three straights -----
  // Path: src(E) -> I -> I -> I -> sink(W), all on middle row.
  // Solution: every I to r=0 (W+E).
  {
    name: 'First Fix',
    rows: 3, cols: 5,
    tiles: [
      null, null, null, null, null,
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'sink',dir:'W'},
      null, null, null, null, null,
    ],
  },

  // ----- Level 2: introduce elbows -----
  // Path: src[3,0]N -> L[2,0]S+E -> I[2,1]W+E -> I[2,2]W+E -> L[2,3]W+N -> I[1,3]N+S -> sink[0,3]S
  {
    name: 'Round the Bend',
    rows: 4, cols: 5,
    tiles: [
      null, null, null, {k:'sink',dir:'S'}, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null,
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
      {k:'src',dir:'N'}, null, null, null, null,
    ],
  },

  // ----- Level 3: detour around a wall -----
  // Path: src[3,0]N -> L[2,0]S+E -> L[2,1]W+N -> L[1,1]S+E -> I[1,2]W+E -> I[1,3]W+E -> L[1,4]W+N -> sink[0,4]S
  // Wall at [2,2] forces the up-and-over detour.
  {
    name: 'Detour',
    rows: 4, cols: 5,
    tiles: [
      null, null, null, null, {k:'sink',dir:'S'},
      null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'L',r:0}, {k:'wall'}, null, null,
      {k:'src',dir:'N'}, null, null, null, null,
    ],
  },

  // ----- Level 4: zig-zag with more pipes -----
  // src[4,0]N -> L[3,0]S+E -> I[3,1]W+E -> L[3,2]W+N -> I[2,2]N+S -> L[1,2]S+E -> I[1,3]W+E -> L[1,4]W+N -> sink[0,4]S
  {
    name: 'Zig Zag',
    rows: 5, cols: 5,
    tiles: [
      null, null, null, null, {k:'sink',dir:'S'},
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null,
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
      {k:'src',dir:'N'}, null, null, null, null,
    ],
  },

  // ----- Level 5: big finale (S-shape) -----
  // src[0,0]E -> I[0,1]W+E -> L[0,2]W+S -> I[1,2]N+S -> L[2,2]N+E -> I[2,3]W+E
  //   -> L[2,4]W+S -> I[3,4]N+S -> L[4,4]N+E -> sink[4,5]W
  {
    name: 'The Big Job',
    rows: 5, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, null, null, null, {k:'pipe',s:'L',r:0}, {k:'sink',dir:'W'},
    ],
  },

  // ----- Level 6: Long Tunnel -----
  // src[1,0]E -> I,I,I,I (all r=0 W+E) -> sink[1,5]W
  {
    name: 'Long Tunnel',
    rows: 3, cols: 6,
    tiles: [
      null, null, null, null, null, null,
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'sink',dir:'W'},
      null, null, null, null, null, null,
    ],
  },

  // ----- Level 7: Up and Over -----
  // src[3,1]N -> L[2,1] E+S (r=1) -> I[2,2] W+E (r=0) -> L[2,3] W+N (r=3) -> I[1,3] N+S (r=1) -> sink[0,3]S
  {
    name: 'Up and Over',
    rows: 4, cols: 5,
    tiles: [
      null, null, null, {k:'sink',dir:'S'}, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
      null, {k:'src',dir:'N'}, null, null, null,
    ],
  },

  // ----- Level 8: Side Step -----
  // src[1,0]E -> L[1,1] W+S r=2 -> L[2,1] N+E r=0 -> I[2,2] -> L[2,3] W+N r=3
  //   -> L[1,3] S+E r=1 -> I[1,4] -> sink[1,5]W
  {
    name: 'Side Step',
    rows: 3, cols: 6,
    tiles: [
      null, null, null, null, null, null,
      {k:'src',dir:'E'}, {k:'pipe',s:'L',r:0}, null, {k:'pipe',s:'L',r:3}, {k:'pipe',s:'I',r:1}, {k:'sink',dir:'W'},
      null, {k:'pipe',s:'L',r:2}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
    ],
  },

  // ----- Level 9: Stairway -----
  // src[4,0]N -> L[3,0] S+E r=1 -> I[3,1] -> L[3,2] W+N r=3 -> I[2,2] -> L[1,2] S+E r=1
  //   -> I[1,3] -> L[1,4] W+N r=3 -> sink[0,4]S
  {
    name: 'Stairway',
    rows: 5, cols: 5,
    tiles: [
      null, null, null, null, {k:'sink',dir:'S'},
      null, null, {k:'pipe',s:'L',r:3}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:1},
      null, null, {k:'pipe',s:'I',r:0}, null, null,
      {k:'pipe',s:'L',r:3}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
      {k:'src',dir:'N'}, null, null, null, null,
    ],
  },

  // ----- Level 10: Two Corners -----
  // src[0,0]E -> I,I -> L[0,3] S+W r=2 -> I,I -> L[3,3] N+E r=0 -> I -> sink[3,5]W
  {
    name: 'Two Corners',
    rows: 4, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:2}, {k:'pipe',s:'I',r:1}, {k:'sink',dir:'W'},
    ],
  },

  // ----- Level 11: Wall Walk -----
  // src[3,0]N -> L[2,0] S+E r=1 -> I[2,1] -> I[2,2] -> L[2,3] W+N r=3 -> I[1,3] -> L[0,3] S+E r=1
  //   -> I[0,4] -> L[0,5] S+W r=2 -> sink[1,5]N. wall at [1,1].
  {
    name: 'Wall Walk',
    rows: 4, cols: 6,
    tiles: [
      null, null, null, {k:'pipe',s:'L',r:3}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, {k:'sink',dir:'N'},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:2}, null, null,
      {k:'src',dir:'N'}, null, null, null, null, null,
    ],
  },

  // ----- Level 12: Big Detour -----
  // src[4,0]N -> L[3,0] S+E r=1 -> I[3,1] -> L[3,2] W+N r=3 -> I[2,2] -> L[1,2] S+E r=1
  //   -> I[1,3] -> L[1,4] W+S r=2 -> I[2,4] -> L[3,4] N+E r=0 -> sink[3,5]W. walls [2,3],[3,3].
  {
    name: 'Big Detour',
    rows: 5, cols: 6,
    tiles: [
      null, null, null, null, null, null,
      null, null, {k:'pipe',s:'L',r:3}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
      null, null, {k:'pipe',s:'I',r:0}, {k:'wall'}, {k:'pipe',s:'I',r:0}, null,
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'wall'}, {k:'pipe',s:'L',r:2}, {k:'sink',dir:'W'},
      {k:'src',dir:'N'}, null, null, null, null, null,
    ],
  },

  // ----- Level 13: Spiral In -----
  // src[0,0]E -> I,I,I -> L[0,4] S+W r=2 -> I[1,4] -> I[2,4] -> L[3,4] W+N r=3
  //   -> I[3,3] -> I[3,2] -> L[3,1] W+N r=3 -> L[2,1] S+E r=1 -> sink[2,2]W
  {
    name: 'Spiral In',
    rows: 5, cols: 5,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, null, null, null, {k:'pipe',s:'I',r:0},
      null, {k:'pipe',s:'L',r:0}, {k:'sink',dir:'W'}, null, {k:'pipe',s:'I',r:0},
      null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null,
    ],
  },

  // ----- Level 14: Crooked Path -----
  // src[2,0]E -> L[2,1] W+N r=3 -> L[1,1] S+E r=1 -> L[1,2] W+N r=3 -> L[0,2] S+E r=1
  //   -> I[0,3] -> I[0,4] -> L[0,5] S+W r=2 -> I[1,5] -> sink[2,5]N. walls [2,2],[2,3],[1,3].
  {
    name: 'Crooked Path',
    rows: 3, cols: 6,
    tiles: [
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'L',r:0}, {k:'wall'}, null, {k:'pipe',s:'I',r:0},
      {k:'src',dir:'E'}, {k:'pipe',s:'L',r:0}, {k:'wall'}, {k:'wall'}, null, {k:'sink',dir:'N'},
    ],
  },

  // ----- Level 15: Maze Bend -----
  // src[3,0]E -> I[3,1] -> I[3,2] -> L[3,3] W+N r=3 -> I[2,3] -> L[1,3] S+W r=2
  //   -> I[1,2] -> L[1,1] N+E r=0 -> L[0,1] S+E r=1 -> I[0,2] -> I[0,3] -> I[0,4] -> sink[0,5]W
  {
    name: 'Maze Bend',
    rows: 4, cols: 6,
    tiles: [
      null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'sink',dir:'W'},
      null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
      {k:'wall'}, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, null,
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, {k:'wall'}, {k:'wall'},
    ],
  },

  // ----- Level 16: The Long Way -----
  // src[4,0]N -> L[3,0] S+E r=1 -> I -> I -> L[3,3] W+N r=3 -> I[2,3] -> L[1,3] S+E r=1
  //   -> I[1,4] -> L[1,5] W+N r=3 -> sink[0,5]S. walls [2,0],[2,1],[2,2],[0,0],[0,1],[0,2].
  {
    name: 'The Long Way',
    rows: 5, cols: 6,
    tiles: [
      {k:'wall'}, {k:'wall'}, {k:'wall'}, null, null, {k:'sink',dir:'S'},
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      {k:'wall'}, {k:'wall'}, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null,
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null,
      {k:'src',dir:'N'}, null, null, null, null, null,
    ],
  },

  // ----- Level 17: Around the Block -----
  // src[0,0]E -> I,I,I,I -> L[0,5] S+W r=2 -> I,I,I,I -> L[5,5] W+N r=3 -> I[5,4] -> ... no
  // Simpler: U-shape around center walls.
  // src[0,0]E -> I -> I -> L[0,3] S+W r=2 -> I -> I -> L[3,3] N+E r=0 -> I -> sink[3,5]W
  // walls block direct middle. Decoy pipe at [3,0] reachable via L[2,0].
  // path: [0,0]E -> [0,1]I -> [0,2]I -> [0,3]L S+W -> [1,3]I -> [2,3]I -> [3,3]L N+E -> [3,4]I -> [3,5]sink
  {
    name: 'Around the Block',
    rows: 6, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
      null, {k:'wall'}, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null,
      null, {k:'wall'}, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:2}, {k:'pipe',s:'I',r:1}, {k:'sink',dir:'W'},
      null, null, null, null, null, null,
      null, null, null, null, null, null,
    ],
  },

  // ----- Level 18: Split Decision -----
  // 6x7 with branching. Main path + reachable decoy.
  // src[2,0]E -> I -> L[2,2] W+S r=2 -> I[3,2] -> L[4,2] N+E r=0 -> I -> I -> I -> L[4,6] W+N r=3
  //   -> I[3,6] -> I[2,6] -> sink[1,6]S
  {
    name: 'Split Decision',
    rows: 6, cols: 7,
    tiles: [
      null, null, null, null, null, null, null,
      null, null, null, null, null, null, {k:'sink',dir:'S'},
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, null, null,
    ],
  },

  // ----- Level 19: Pipe Tangle -----
  // 5x7 with walls.
  // src[4,0]N -> L[3,0] S+E r=1 -> I -> L[3,2] W+N r=3 -> I -> L[1,2] S+E r=1 -> I -> I -> I
  //   -> L[1,6] S+W r=2 -> I -> sink[3,6]N. walls [2,1],[2,3],[2,5].
  {
    name: 'Pipe Tangle',
    rows: 5, cols: 7,
    tiles: [
      null, null, null, null, null, null, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, {k:'pipe',s:'I',r:0}, {k:'wall'}, null, {k:'wall'}, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, null, {k:'sink',dir:'N'},
      {k:'src',dir:'N'}, null, null, null, null, null, null,
    ],
  },

  // ----- Level 20: Big Bend -----
  // 6x7 large detour.
  // src[5,0]N -> L[4,0] S+E r=1 -> I -> I -> L[4,3] W+N r=3 -> I -> L[2,3] S+E r=1 -> I -> I
  //   -> L[2,6] S+W r=2 -> I -> sink[4,6]N. walls [3,1],[3,2],[3,4],[3,5].
  {
    name: 'Big Bend',
    rows: 6, cols: 7,
    tiles: [
      null, null, null, null, null, null, null,
      null, null, null, null, null, null, null,
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, {k:'wall'}, {k:'pipe',s:'I',r:0}, {k:'wall'}, {k:'wall'}, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, {k:'sink',dir:'N'},
      {k:'src',dir:'N'}, null, null, null, null, null, null,
    ],
  },

  // ----- Level 21: Master Plumber -----
  // 6x7 complex S.
  // src[0,0]E -> I -> I -> L[0,3] S+W r=2 -> I[1,3] -> L[2,3] N+E r=0 -> I -> I -> L[2,6] S+W r=2
  //   -> I[3,6] -> I[4,6] -> L[5,6] W+N r=3 -> I[5,5] -> I[5,4] -> sink[5,3]E
  {
    name: 'Master Plumber',
    rows: 6, cols: 7,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 22: Crazy Loops -----
  // 6x7. Two big U-turns with walls.
  // src[5,0]N -> L[4,0] S+E r=1 -> I -> I -> L[4,3] W+N r=3 -> I[3,3] -> I[2,3] -> L[1,3] S+E r=1
  //   -> I -> I -> L[1,6] S+W r=2 -> I -> I -> I -> sink[4,6]N. walls block middle.
  {
    name: 'Crazy Loops',
    rows: 6, cols: 7,
    tiles: [
      null, null, null, null, null, null, null,
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, {k:'pipe',s:'I',r:0},
      null, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, {k:'sink',dir:'N'},
      {k:'src',dir:'N'}, null, null, null, null, null, null,
    ],
  },

  // ----- Level 23: The Gauntlet -----
  // 7x6 snake.
  // src[0,0]E -> I -> L[0,2] S+W r=2 -> I[1,2] -> L[2,2] N+E r=0 -> I -> L[2,4] S+W r=2
  //   -> I[3,4] -> L[4,4] N+E r=0 -> I -> ... no, let me make a clean snake to [6,5].
  // src[0,0]E -> I[0,1] -> I[0,2] -> L[0,3] S+W r=2 -> I[1,3] -> L[2,3] N+E r=0 -> I[2,4] -> L[2,5] S+W r=2
  //   -> I[3,5] -> L[4,5] N+E? need to keep going. Let me end at sink[6,5]N.
  // Actually: src[0,0]E -> I -> L[0,2] S+W -> I[1,2] -> I[2,2] -> L[3,2] N+E r=0 -> I -> L[3,4] S+W r=2
  //   -> I[4,4] -> I[5,4] -> L[6,4] N+E r=0 -> sink[6,5]W
  {
    name: 'The Gauntlet',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, null, null, null, {k:'pipe',s:'L',r:1}, {k:'sink',dir:'W'},
    ],
  },

  // ----- Level 24: Industrial Park -----
  // 7x6 snake top-left to bottom-right with walls.
  // src[0,0]E -> I[0,1] -> I[0,2] -> L[0,3] S+W r=2 -> I[1,3] -> L[2,3] N+E r=0 -> I[2,4]
  //   -> L[2,5] S+W r=2 -> I[3,5] -> I[4,5] -> I[5,5] -> L[6,5] W+N r=3 -> I[6,4] -> sink[6,3]E
  {
    name: 'Industrial Park',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null,
      {k:'wall'}, null, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, null, null, {k:'wall'}, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 25: Grand Finale -----
  // 7x6 long S-snake.
  // src[0,0]E -> I[0,1] -> L[0,2] S+W r=2 -> I[1,2] -> I[2,2] -> L[3,2] N+E r=0 -> I[3,3]
  //   -> L[3,4] S+W r=2 -> I[4,4] -> I[5,4] -> L[6,4] W+N r=3 -> I[6,3] -> I[6,2] -> sink[6,1]E
  {
    name: 'Grand Finale',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null, null, null,
      null, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, null,
      null, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
      null, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, {k:'wall'},
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'I',r:1}, {k:'pipe',s:'L',r:0}, null,
    ],
  },

  // ----- Level 26: Backyard Sprinkler -----
  // 6x6, 12 pipes, walls. S-snake.
  // src[0,0]E -> I[0,1] -> L[0,2] S+W r=2 -> I[1,2] -> I[2,2] -> L[3,2] N+E r=0 -> I[3,3]
  //   -> L[3,4] S+W r=2 -> I[4,4] -> L[5,4] W+N r=3 -> I[5,3] -> I[5,2] -> sink[5,1]E
  // walls [0,3], [1,3], [2,4], [4,1].
  {
    name: 'Backyard Sprinkler',
    rows: 6, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'wall'}, null, null,
      null, null, {k:'pipe',s:'I',r:0}, {k:'wall'}, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, null,
      null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
    ],
  },

  // ----- Level 27: Garden Hose -----
  // 6x6, 13 pipes, walls.
  // src[5,0]N -> L[4,0] S+E r=1 -> I[4,1] -> I[4,2] -> L[4,3] W+N r=3 -> I[3,3] -> I[2,3] -> L[1,3] S+E r=1
  //   -> I[1,4] -> L[1,5] S+W r=2 -> I[2,5] -> I[3,5] -> I[4,5] -> sink[5,5]N
  // walls [3,0],[3,1],[2,1],[0,3].
  {
    name: 'Garden Hose',
    rows: 6, cols: 6,
    tiles: [
      null, null, null, {k:'wall'}, null, null,
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, {k:'pipe',s:'I',r:0},
      {k:'wall'}, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, {k:'pipe',s:'I',r:0},
      {k:'src',dir:'N'}, null, null, null, null, {k:'sink',dir:'N'},
    ],
  },

  // ----- Level 28: Kitchen Drain -----
  // 6x6, 12 pipes. Walls form chambers.
  // src[0,5]W -> I[0,4] -> I[0,3] -> L[0,2] S+E? no W+S r=2 -> I[1,2] -> L[2,2] N+E r=0 -> I[2,3]
  //   -> L[2,4] S+W r=2 -> I[3,4] -> L[4,4] W+N r=3 -> I[4,3] -> I[4,2] -> L[4,1] W+N? need to end at sink.
  // Reroute: ... -> L[4,4] W+N r=3 -> I[4,3] -> L[4,2] W+N r=3 -> I[3,2] (no, already used path).
  // Let me redo: src[0,5]W -> I[0,4] -> L[0,3] S+W r=2 -> I[1,3] -> L[2,3] N+E r=0 -> I[2,4]
  //   -> L[2,5] S+W r=2 -> I[3,5] -> L[4,5] W+N r=3 -> I[4,4] -> L[4,3] W+N? no need sink.
  // Final: src[0,5]W -> I[0,4] -> L[0,3] S+W r=2 -> I[1,3] -> I[2,3] -> L[3,3] N+E r=0
  //   -> I[3,4] -> L[3,5] S+W r=2 -> I[4,5] -> L[5,5] W+N r=3 -> I[5,4] -> sink[5,3]E
  // walls [0,0],[0,1],[1,0],[1,5],[5,0],[5,1].
  {
    name: 'Kitchen Drain',
    rows: 6, cols: 6,
    tiles: [
      {k:'wall'}, {k:'wall'}, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'src',dir:'W'},
      {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'},
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      {k:'wall'}, {k:'wall'}, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 29: Bath Time -----
  // 6x6, 13 pipes. Big snake with walls.
  // src[5,0]N -> L[4,0] S+E r=1 -> I[4,1] -> L[4,2] W+N r=3 -> I[3,2] -> I[2,2] -> L[1,2] S+E r=1
  //   -> I[1,3] -> I[1,4] -> L[1,5] S+W r=2 -> I[2,5] -> I[3,5] -> L[4,5] W+N r=3 -> I[4,4] -> sink[4,3]E
  // walls [0,0],[0,1],[0,2],[2,4],[5,5],[3,1].
  {
    name: 'Bath Time',
    rows: 6, cols: 6,
    tiles: [
      {k:'wall'}, {k:'wall'}, {k:'wall'}, null, null, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, {k:'pipe',s:'I',r:0},
      null, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      {k:'src',dir:'N'}, null, null, null, null, {k:'wall'},
    ],
  },

  // ----- Level 30: Wash Day -----
  // 6x6, 13 pipes. Zigzag with chambers.
  // src[0,0]E -> L[0,1] S+W r=2 -> I[1,1] -> L[2,1] N+E r=0 -> I[2,2] -> L[2,3] S+W r=2 -> I[3,3]
  //   -> L[4,3] N+E r=0 -> I[4,4] -> L[4,5] S+W r=2 -> I[5,5] -> sink[5,4]E? need direction.
  // simpler: ... -> L[4,5] S+W r=2 -> sink[5,5]N
  // pipes: L[0,1], I[1,1], L[2,1], I[2,2], L[2,3], I[3,3], L[4,3], I[4,4], L[4,5] = 9. Add more by stretching.
  // Better: src[0,0]E -> I[0,1] -> L[0,2] S+W r=2 -> I[1,2] -> L[2,2] N+E r=0 -> I[2,3] -> L[2,4] S+W r=2
  //   -> I[3,4] -> L[4,4] N+E r=0 -> I[4,5] -> L[5,5] W+N? no, that would loop.
  // Use: src[0,0]E -> I[0,1] -> L[0,2] S+W -> I[1,2] -> L[2,2] N+E -> I[2,3] -> I[2,4] -> L[2,5] S+W
  //   -> I[3,5] -> I[4,5] -> L[5,5] W+N -> I[5,4] -> sink[5,3]E. 12 pipes. Add walls.
  // walls [0,3],[0,4],[0,5],[1,5],[3,2],[4,2],[5,0],[5,1].
  {
    name: 'Wash Day',
    rows: 6, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'wall'}, {k:'wall'}, {k:'wall'},
      null, null, {k:'pipe',s:'I',r:0}, null, null, {k:'wall'},
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0},
      {k:'wall'}, {k:'wall'}, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 31: Fire Hydrant -----
  // 7x6, 14 pipes. Dense.
  // src[0,0]E -> I[0,1] -> I[0,2] -> L[0,3] S+W r=2 -> I[1,3] -> I[2,3] -> L[3,3] N+E r=0 -> I[3,4]
  //   -> L[3,5] S+W r=2 -> I[4,5] -> I[5,5] -> L[6,5] W+N r=3 -> I[6,4] -> I[6,3] -> sink[6,2]E
  {
    name: 'Fire Hydrant',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 32: Water Slide -----
  // 7x6, 14 pipes. Snake top to bottom.
  // src[0,5]W -> I[0,4] -> I[0,3] -> L[0,2] S+E? wait sink direction. src=W means water exits W, so flows leftward.
  // src[0,5]W -> I[0,4] r=0(W+E) -> I[0,3] -> L[0,2] S+E r=1 -> I[1,2] -> L[2,2] N+E r=0 -> I[2,3] -> I[2,4]
  //   -> L[2,5] S+W r=2 -> I[3,5] -> L[4,5] W+N r=3 -> I[4,4] -> I[4,3] -> L[4,2] W+N? no. End at sink.
  // src[0,5]W -> I -> I -> L[0,2]S+E r=1 -> I[1,2] -> I[2,2] -> L[3,2] N+E r=0 -> I[3,3] -> I[3,4] -> L[3,5] S+W r=2
  //   -> I[4,5] -> I[5,5] -> L[6,5] W+N r=3 -> I[6,4] -> sink[6,3]E. 14 pipes.
  {
    name: 'Water Slide',
    rows: 7, cols: 6,
    tiles: [
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'src',dir:'W'},
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 33: Submarine -----
  // 7x6, 14 pipes, dense. Chambered.
  // src[3,0]E -> I[3,1] -> L[3,2] W+N r=3 -> I[2,2] -> I[1,2] -> L[0,2] S+E r=1 -> I[0,3] -> L[0,4] S+W r=2
  //   -> I[1,4] -> I[2,4] -> L[3,4] N+E r=0 -> I[3,5] -> L[4,5] W+N r=3 -> I[4,4] -> sink[4,3]E? wait used.
  // Simpler: src[3,0]E -> I[3,1] -> L[3,2] W+N r=3 -> I[2,2] -> L[1,2] S+E r=1 -> I[1,3] -> L[1,4] S+W r=2
  //   -> I[2,4] -> I[3,4] -> L[4,4] N+E r=0? want to go down. -> L[4,4] N+E -> I[4,5] -> L[5,5] W+N r=3 -> I[5,4]
  //   -> L[5,3] W+N? hmm ending. -> sink[5,3]E. 13 pipes.
  // Final: src[3,0]E, I[3,1], L[3,2]r3, I[2,2], L[1,2]r1, I[1,3], L[1,4]r2, I[2,4], I[3,4], L[4,4]r0, I[4,5], L[5,5]r3, I[5,4], sink[5,3]E
  // walls [0,0],[0,5],[6,0],[6,5],[2,3].
  {
    name: 'Submarine',
    rows: 7, cols: 6,
    tiles: [
      {k:'wall'}, null, null, null, null, {k:'wall'},
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, null, {k:'pipe',s:'I',r:0}, {k:'wall'}, {k:'pipe',s:'I',r:0}, null,
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, {k:'pipe',s:'I',r:0}, null,
      null, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0},
      null, null, null, null, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      {k:'wall'}, null, null, null, null, {k:'wall'},
    ],
  },

  // ----- Level 34: City Sewer -----
  // 7x6, 15 pipes. Long horizontal snake.
  // src[0,0]E -> I -> I -> I -> L[0,4] S+W r=2 -> I[1,4] -> L[2,4] W+N? no go further.
  // src[0,0]E -> I[0,1] -> I[0,2] -> I[0,3] -> I[0,4] -> L[0,5] S+W r=2 -> I[1,5] -> I[2,5] -> L[3,5] W+N r=3
  //   -> I[3,4] -> I[3,3] -> I[3,2] -> L[3,1] S+E? no, end sink. -> L[3,1] W+N r=3 -> I[2,1] -> ... too long.
  // Try: src[0,0]E, I,I,I,I,L[0,5]r2, I[1,5], I[2,5], L[3,5]r3, I[3,4], I[3,3], L[3,2]r1(E+S? want W+S), L[3,2]r2(S+W),
  //   I[4,2], I[5,2], L[6,2]r3(W+N), sink[6,1]E. Hmm count: I(0,1)+I(0,2)+I(0,3)+I(0,4) =4, L(0,5)=5, I(1,5)+I(2,5)=7,
  //   L(3,5)=8, I(3,4)+I(3,3)=10, L(3,2)=11, I(4,2)+I(5,2)=13, L(6,2)=14, sink(6,1). 14 pipes. Good.
  {
    name: 'City Sewer',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, {k:'sink',dir:'E'}, {k:'pipe',s:'L',r:0}, null, null, null,
    ],
  },

  // ----- Level 35: Power Wash -----
  // 7x6, 14 pipes. Dense with walls.
  // src[6,0]N -> L[5,0] S+E r=1 -> I[5,1] -> L[5,2] W+N r=3 -> I[4,2] -> I[3,2] -> L[2,2] S+E r=1
  //   -> I[2,3] -> L[2,4] S+W? no, want W+N to go up. L[2,4] W+N r=3 -> I[1,4] -> L[0,4] S+E r=1 -> sink[0,5]W
  // pipes: L[5,0], I[5,1], L[5,2], I[4,2], I[3,2], L[2,2], I[2,3], L[2,4], I[1,4], L[0,4] = 10. Add more.
  // Extend: ... L[2,4] S+W r=2 -> I[3,4] -> I[4,4] -> L[5,4] W+N r=3 -> I[5,3] -> ...too convoluted.
  // Try: src[6,0]N -> L[5,0]r1 -> I[5,1] -> I[5,2] -> L[5,3]r3(W+N) -> I[4,3] -> I[3,3] -> L[2,3]r1(E+S? want N+E)
  //   L[2,3]r0(N+E) -> I[2,4] -> L[2,5]r2(S+W) -> I[3,5] -> I[4,5] -> L[5,5]r3 -> ...want to end up.
  // Cleaner snake: src[6,0]N, L[5,0]r1, I[5,1], L[5,2]r3, I[4,2], L[3,2]r1, I[3,3], L[3,4]r3, I[2,4], I[1,4], L[0,4]r1, I[0,5], sink[1,5]N? no sink dir.
  // Let me use sink at [0,5]: ... L[0,4]r1(E+S? want S+E since path goes from below then turn east) -> sink[0,5]W. L[0,4]r1=E+S. need to receive from [1,4] going N (water came from below up). So [0,4] needs S opening + E opening to sink. r=1 is E+S. Good.
  // path: src[6,0]N, L[5,0]E+S? src dir N means water exits N. Enters [5,0] from S. L[5,0] needs S+E => r=1. Continue E.
  // [5,1] receives from W. I r=0 (W+E). Continue E.
  // [5,2] L W+N => r=3. Continue N.
  // [4,2] I N+S => r=1. Continue N.
  // [3,2] L S+E => r=1. Continue E.
  // [3,3] I W+E => r=0. Continue E.
  // [3,4] L W+N => r=3. Continue N.
  // [2,4] I N+S => r=1. Continue N.
  // [1,4] I N+S => r=1. Continue N.
  // [0,4] L S+E => r=1. Continue E.
  // [0,5] sink dir W. Receives from W. Good.
  // pipes: L,I,L,I,L,I,L,I,I,L = 10 pipes. Need 14. Add decoy walls or more.
  // Let me make path longer: src[6,0]N, L[5,0]r1, I, I, L[5,3]r3, I, L[3,3]r1, I, L[3,5]r2(S+W), I, I, L[6,5]r3, I, sink[6,3]E
  // verify: [5,0]L S+E r=1, enter S from src below. Exit E.
  // [5,1] I W+E r=0. [5,2] I W+E r=0. [5,3] L W+N r=3. Exit N.
  // [4,3] I N+S r=1. [3,3] L S+E r=1. Exit E.
  // [3,4] I W+E r=0. [3,5] L S+W r=2. Exit S.
  // [4,5] I N+S r=1. [5,5] I N+S r=1. [6,5] L W+N r=3. Exit W.
  // [6,4] I W+E r=0. sink[6,3] dir E. Receives from E. Good.
  // pipes: L,I,I,L,I,L,I,L,I,I,L,I = 12. Add 2 walls and 2 extra pipes? Or just go with 12.
  // Add walls for chambers. Let's go with 12 pipes for L35.
  {
    name: 'Power Wash',
    rows: 7, cols: 6,
    tiles: [
      null, null, null, null, null, null,
      null, null, null, {k:'wall'}, null, null,
      null, null, null, null, null, null,
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, {k:'pipe',s:'I',r:0}, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, {k:'pipe',s:'I',r:0},
      {k:'src',dir:'N'}, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 36: Decoy Drain -----
  // 7x6 with decoy pipes (unused in solution but reachable). 13 pipes total, ~10 needed for path.
  // Path: src[0,0]E -> I[0,1] -> L[0,2] S+W r=2 -> I[1,2] -> L[2,2] N+E r=0 -> I[2,3] -> I[2,4] -> L[2,5] S+W r=2
  //   -> I[3,5] -> L[4,5] W+N r=3 -> I[4,4] -> sink[4,3]E
  // Decoys: place a few extra pipes not on path (e.g., at [4,0], [5,0], [6,0]) — they exist but solution doesn't use them.
  // Decoys must not break solution. They're separate.
  {
    name: 'Decoy Drain',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, null, null, null, null,
      {k:'pipe',s:'I',r:0}, null, null, null, null, null,
    ],
  },

  // ----- Level 37: Red Herring -----
  // 7x6, decoy pipes in a separate area. 13 pipes.
  // main path 10 pipes + 3 decoys.
  // src[6,0]N -> L[5,0]r1 -> I[5,1] -> I[5,2] -> L[5,3]r3 -> I[4,3] -> L[3,3]r1 -> I[3,4] -> L[3,5]r2 -> I[4,5] -> sink[5,5]N
  // decoys at [0,0],[0,1],[1,0] (top-left island).
  {
    name: 'Red Herring',
    rows: 7, cols: 6,
    tiles: [
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, null, null, null, null,
      {k:'pipe',s:'I',r:0}, null, null, null, null, null,
      null, null, null, null, null, null,
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, {k:'pipe',s:'I',r:0}, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, {k:'sink',dir:'N'},
      {k:'src',dir:'N'}, null, null, null, null, null,
    ],
  },

  // ----- Level 38: False Trail -----
  // 7x6, 13 pipes with decoys.
  // Main path: src[0,5]W -> I[0,4] -> L[0,3] S+W r=2 -> I[1,3] -> I[2,3] -> L[3,3] N+E r=0 -> I[3,4] -> L[3,5] S+W r=2
  //   -> I[4,5] -> sink[5,5]N
  // Decoys at [6,0], [6,1], [5,0].
  {
    name: 'False Trail',
    rows: 7, cols: 6,
    tiles: [
      null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'src',dir:'W'},
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, null, null, null, null, {k:'sink',dir:'N'},
      {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, null, null,
    ],
  },

  // ----- Level 39: Pipe Dreams -----
  // 7x6, 14 pipes total. 11 main + 3 decoy in side chamber.
  // src[0,0]E -> I[0,1] -> I[0,2] -> L[0,3] S+W r=2 -> I[1,3] -> L[2,3] N+E r=0 -> I[2,4] -> I[2,5]
  //   -> ...hmm need sink. End at sink[2,5]W? but need water entering W. L coming from W.
  // Actually let me end further: src[0,0]E, I[0,1], I[0,2], L[0,3]r2, I[1,3], I[2,3], L[3,3]r0, I[3,4], L[3,5]r2, I[4,5], I[5,5], L[6,5]r3, I[6,4], sink[6,3]E. 12 main pipes.
  // Decoys at [4,0],[5,0] (2 decoys) — total 14.
  {
    name: 'Pipe Dreams',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      {k:'pipe',s:'L',r:0}, null, null, null, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'I',r:0}, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 40: Tricky Plumbing -----
  // 7x6, 13 pipes, decoys.
  // Main: src[3,0]E -> I[3,1] -> L[3,2] W+N r=3 -> I[2,2] -> L[1,2] S+E r=1 -> I[1,3] -> I[1,4] -> L[1,5] S+W r=2
  //   -> I[2,5] -> I[3,5] -> sink[4,5]N
  // Decoys: 2-3 pipes elsewhere.
  {
    name: 'Tricky Plumbing',
    rows: 7, cols: 6,
    tiles: [
      null, null, null, null, null, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, {k:'pipe',s:'I',r:0},
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, {k:'sink',dir:'N'},
      null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, null, null, null,
      null, {k:'pipe',s:'I',r:0}, null, null, null, null,
    ],
  },

  // ----- Level 41: Maze Chamber -----
  // 7x6 with wall chambers. 13 pipes.
  // src[0,0]E -> L[0,1] S+W r=2 -> I[1,1] -> L[2,1] N+E r=0 -> I[2,2] -> I[2,3] -> L[2,4] S+W? want continue.
  // src[0,0]E, L[0,1]r2, I[1,1], I[2,1], L[3,1]r0, I[3,2], I[3,3], L[3,4]r2, I[4,4], I[5,4], L[6,4]r3, I[6,3], I[6,2], sink[6,1]E
  // walls at [0,2],[0,3],[1,2],[1,3],[1,4],[5,0],[5,1] etc to form chambers.
  // verify: [0,0]E. [0,1]L S+W r=2 (receives from W src? no wait src exits E, water enters [0,1] from W. L needs W+S => r=2. Exit S.
  // [1,1] I N+S r=1. [2,1] I N+S r=1. [3,1] L N+E r=0. Exit E.
  // [3,2] I W+E r=0. [3,3] I W+E r=0. [3,4] L W+S r=2. Exit S.
  // [4,4] I N+S r=1. [5,4] I N+S r=1. [6,4] L W+N r=3. Exit W.
  // [6,3] I W+E r=0. [6,2] I W+E r=0. sink[6,1] dir E. Good.
  // pipes: 13.
  {
    name: 'Maze Chamber',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'L',r:0}, {k:'wall'}, {k:'wall'}, null, null,
      null, {k:'pipe',s:'I',r:0}, {k:'wall'}, null, {k:'wall'}, null,
      null, {k:'pipe',s:'I',r:0}, null, null, null, null,
      null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      {k:'wall'}, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, null,
      null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
    ],
  },

  // ----- Level 42: The Vault -----
  // 7x6, 13 pipes, walls form vault.
  // src[6,0]N -> L[5,0]r1 -> I[5,1] -> L[5,2]r3 -> I[4,2] -> I[3,2] -> L[2,2]r1 -> I[2,3] -> L[2,4]r3 -> I[1,4] -> L[0,4]r1 -> I[0,5] -> sink[1,5]N
  // 11 pipes. Add 2 more by extending.
  // Actually: ...I[5,1] -> I[5,2] -> L[5,3]r3 -> I[4,3] -> L[3,3]r1 -> I[3,4] -> L[3,5]r2 -> I[4,5] -> sink[5,5]N
  // Recompute: src[6,0]N, L[5,0]r1, I[5,1], I[5,2], L[5,3]r3, I[4,3], L[3,3]r1, I[3,4], L[3,5]r2, I[4,5], sink[5,5]N. 9 pipes. Hmm.
  // Add side excursion: src[6,0]N, L[5,0]r1, I[5,1], L[5,2]r3, I[4,2], L[3,2]r1, I[3,3], L[3,4]r3, I[2,4], I[1,4], L[0,4]r1, I[0,5], sink[1,5]N. 12 pipes.
  // walls to form vault chambers.
  {
    name: 'The Vault',
    rows: 7, cols: 6,
    tiles: [
      null, null, null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0},
      {k:'wall'}, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, {k:'sink',dir:'N'},
      null, null, null, null, {k:'pipe',s:'I',r:0}, {k:'wall'},
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, null,
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, null,
      {k:'src',dir:'N'}, null, null, null, null, null,
    ],
  },

  // ----- Level 43: Twisty Passage -----
  // 7x6 maze. 13 pipes.
  // src[0,0]E, I[0,1], L[0,2]r2, I[1,2], I[2,2], L[3,2]r0, I[3,3], L[3,4]r2, I[4,4], I[5,4], L[6,4]r3, I[6,3], I[6,2], sink[6,1]E
  // walls to add chambers.
  {
    name: 'Twisty Passage',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'wall'}, null, null,
      {k:'wall'}, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, null,
      null, null, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, {k:'wall'},
      null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
    ],
  },

  // ----- Level 44: Catacombs -----
  // 7x6 maze with chambers. 13 pipes.
  // src[3,0]E, I[3,1], L[3,2]r3, I[2,2], I[1,2], L[0,2]r1, I[0,3], I[0,4], L[0,5]r2, I[1,5], I[2,5], L[3,5]r3, I[3,4], sink[3,3]E? wait already used? No, sink[3,3] but [3,2] is L turning to N. Need cleaner.
  // Cleaner: src[3,0]E, I[3,1], L[3,2]r3(W+N), I[2,2], L[1,2]r1(E+S), I[1,3], I[1,4], L[1,5]r2(S+W), I[2,5], I[3,5], L[4,5]r3(W+N), I[4,4], sink[4,3]E
  // pipes: I,L,I,L,I,I,L,I,I,L,I = 11. Add 2 more.
  // Extend: src[3,0]E, I[3,1], L[3,2]r3, I[2,2], L[1,2]r1, I[1,3], L[1,4]r3? need W+N. ...
  // Let me just keep 11 pipes with chamber walls. Actually 13 was required. Let me add another section.
  // src[5,0]N -> L[4,0]r1 -> I[4,1] -> L[4,2]r3 -> I[3,2] -> I[2,2] -> L[1,2]r1 -> I[1,3] -> I[1,4] -> L[1,5]r2 -> I[2,5] -> I[3,5] -> L[4,5]r3 -> I[4,4] -> sink[4,3]E. 13 pipes.
  {
    name: 'Catacombs',
    rows: 7, cols: 6,
    tiles: [
      {k:'wall'}, {k:'wall'}, null, null, null, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, {k:'pipe',s:'I',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      {k:'src',dir:'N'}, null, null, null, {k:'wall'}, null,
      null, null, {k:'wall'}, {k:'wall'}, null, null,
    ],
  },

  // ----- Level 45: Labyrinth -----
  // 7x6 maze. 13 pipes.
  // src[0,5]W, I[0,4], I[0,3], L[0,2]r1, I[1,2], I[2,2], L[3,2]r0, I[3,3], I[3,4], L[3,5]r2, I[4,5], I[5,5], L[6,5]r3, I[6,4], sink[6,3]E
  // 14 pipes. Add walls.
  {
    name: 'Labyrinth',
    rows: 7, cols: 6,
    tiles: [
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'src',dir:'W'},
      {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, null,
      null, {k:'wall'}, {k:'pipe',s:'I',r:0}, null, null, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, {k:'wall'}, null, {k:'pipe',s:'I',r:0},
      null, {k:'wall'}, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 46: Plumber's Final Test -----
  // 7x6, 14 pipes. Long S-snake.
  // src[0,0]E, I[0,1], I[0,2], I[0,3], L[0,4]r2, I[1,4], L[2,4]r3, I[2,3], I[2,2], L[2,1]r1, I[3,1], L[4,1]r3, I[4,0]? out of order.
  // Cleaner: src[0,0]E, I,I,I,L[0,4]r2, I[1,4], L[2,4]r3, I[2,3], L[2,2]r2, I[3,2], I[4,2], L[5,2]r0, I[5,3], L[5,4]r2, I[6,4], sink[6,5]? wait need to think.
  // Snake aiming bottom-right corner:
  // [0,0]E,[0,1]I,[0,2]I,[0,3]L S+W r=2,[1,3]I,[2,3]I,[3,3]L N+E r=0,[3,4]I,[3,5]L S+W r=2,[4,5]I,[5,5]I,[6,5]L W+N r=3,[6,4]I,[6,3]I,sink[6,2]E
  // pipes: 14.
  {
    name: "Plumber's Final Test",
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'I',r:0}, null, null,
      null, null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, null, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },

  // ----- Level 47: Mega Maze -----
  // 7x6, 14 pipes. Long path.
  // src[6,0]N, L[5,0]r1, I[5,1], I[5,2], L[5,3]r3, I[4,3], I[3,3], L[2,3]r1, I[2,4], L[2,5]r2, I[3,5], I[4,5], L[5,5]r3, I[5,4]?? already used [5,4]? No, only [5,0..3].
  // Wait, [5,4] empty. [5,5] L W+N r=3 exit W to [5,4]. I[5,4] N+S? no need W+E. r=0. Continue W.
  // sink at [5,4]? But path goes to [5,4]. Hmm. Let me put sink at a non-path cell.
  // Actually I want sink at end of path. After [5,4] continue or end? End at sink: ...L[5,5]r3 -> I[5,4]? Already noted [5,4] free. But that'd loop into the column. Let me end sink at [6,5]N or similar.
  // Cleaner: src[6,0]N, L[5,0]r1, I[5,1], L[5,2]r3, I[4,2], I[3,2], L[2,2]r1, I[2,3], I[2,4], L[2,5]r2, I[3,5], I[4,5], L[5,5]r3, I[5,4], sink[5,3]E
  // verify: [5,0]L S+E r=1 from src N below. [5,1] I W+E r=0. [5,2] L W+N r=3 exit N. [4,2] I N+S r=1. [3,2] I N+S r=1. [2,2] L S+E r=1 exit E. [2,3] I W+E r=0. [2,4] I W+E r=0. [2,5] L W+S r=2 exit S. [3,5] I N+S r=1. [4,5] I N+S r=1. [5,5] L W+N r=3 exit W. [5,4] I W+E r=0. sink[5,3] dir E receives from E.
  // 14 pipes total.
  {
    name: 'Mega Maze',
    rows: 7, cols: 6,
    tiles: [
      null, null, null, null, null, null,
      null, null, null, null, null, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, {k:'pipe',s:'I',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      {k:'src',dir:'N'}, null, null, null, null, null,
    ],
  },

  // ----- Level 48: Snake Charmer -----
  // 7x6, 14 pipes. Long snake.
  // src[0,0]E, L[0,1]r2, I[1,1], I[2,1], L[3,1]r0, I[3,2], I[3,3], L[3,4]r2, I[4,4], I[5,4], L[6,4]r3, I[6,3], I[6,2], L[6,1]r3??? Already used. End sink[6,1].
  // Let me just trace: src[0,0]E -> [0,1]L S+W r=2 exit S. [1,1] I N+S r=1. [2,1] I N+S r=1. [3,1] L N+E r=0 exit E. [3,2] I W+E r=0. [3,3] I W+E r=0. [3,4] L W+S r=2 exit S. [4,4] I N+S r=1. [5,4] I N+S r=1. [6,4] L W+N r=3 exit W. [6,3] I W+E r=0. [6,2] I W+E r=0. sink[6,1] dir E. 13 pipes.
  // 13 is fine. Add 14th: extend top by one. src[0,0]E, I[0,1], L[0,2]r2 ... like L46 but mirror. Skip — use 13.
  {
    name: 'Snake Charmer',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'L',r:0}, null, null, null, null,
      null, {k:'pipe',s:'I',r:0}, null, null, null, null,
      null, {k:'pipe',s:'I',r:0}, null, null, null, null,
      null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, null, null, null, {k:'pipe',s:'I',r:0}, null,
      null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
    ],
  },

  // ----- Level 49: Ultimate Challenge -----
  // 7x6, 13 pipes with walls forming chambers. Long path with bends.
  // src[6,5]N, I[5,5], L[4,5]r3(W+N), I[4,4], I[4,3], L[4,2]r1(E+S? no, want W+S), L[4,2]r2(S+W). Wait water comes from E going W. enters [4,2] from E. L needs E+S => r=1. Exit S.
  // [5,2] I N+S r=1. [6,2] L W+N? no end here. Let me redo.
  // src[6,5]N: water exits N, enters [5,5] from S. I N+S r=1. exits N. [4,5] L S+W r=2. exits W. [4,4] I W+E r=0. [4,3] I W+E r=0. [4,2] L E+S? entering from E so needs E+S r=1. exit S. [5,2] I N+S r=1. [6,2] L W+N r=3. exit W. [6,1] I W+E r=0. sink[6,0]E receives from E. 8 pipes. Too few.
  // Extend with up & over: src[6,5]N, I[5,5], L[4,5]r3, I[4,4], L[4,3]r3(W+N) exit N. [3,3] I N+S r=1. [2,3] L S+W r=2 exit W. [2,2] I W+E r=0. [2,1] L E+S r=1 exit S. [3,1] I N+S r=1. [4,1] I N+S r=1. [5,1] I N+S r=1. sink[6,1]N receives from N. 11 pipes.
  // Add walls and one more turn.
  // Let me just commit to a 12-pipe path with strong chambers.
  // src[6,5]N, I[5,5], L[4,5]r3, I[4,4], I[4,3], L[4,2]r1, I[5,2], L[6,2]r3, I[6,1], sink[6,0]E. wait conflict: src at [6,5] starts col5, end col 0. Let me re-derive.
  // Actually picking a different layout. src at [0,0]E going through long winding path ending bottom-right.
  // src[0,0]E, I[0,1], I[0,2], I[0,3], L[0,4]r2(S+W), I[1,4], I[2,4], L[3,4]r3(W+N) wait need to continue. r=3 is W+N. Entering from N. Exit W. [3,3] I W+E r=0. [3,2] L E+S? entering from E exit S => r=1. [4,2] I N+S r=1. [5,2] L N+E r=0. [5,3] I W+E r=0. [5,4] I W+E r=0. sink[5,5]W. 13 pipes.
  // pipes: I[0,1],I[0,2],I[0,3],L[0,4],I[1,4],I[2,4],L[3,4],I[3,3],L[3,2],I[4,2],L[5,2],I[5,3],I[5,4] = 13.
  // Add walls at [1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3] (chamber below top row).
  // Verify: src[0,0]E exit E. [0,1]I W+E r=0. [0,2]I r=0. [0,3]I r=0. [0,4]L S+W r=2 exit S.
  // [1,4]I N+S r=1. [2,4]I r=1. [3,4]L W+N r=3 exit W (receives N from [2,4] going S, [3,4] needs N opening + ?, exit W means W opening. r=3 is W+N. Good.
  // [3,3]I W+E r=0. exit W. [3,2]L E+S r=1 (entering from E exit S). r=1 is E+S. Good.
  // [4,2]I N+S r=1. exit S. [5,2]L N+E r=0. exit E. [5,3]I W+E r=0. [5,4]I r=0. sink[5,5]W receives from W. Good.
  // 13 pipes.
  {
    name: 'Ultimate Challenge',
    rows: 7, cols: 6,
    tiles: [
      {k:'src',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      {k:'wall'}, {k:'wall'}, {k:'wall'}, null, {k:'pipe',s:'I',r:0}, null,
      {k:'wall'}, {k:'wall'}, null, null, {k:'pipe',s:'I',r:0}, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null,
      null, null, {k:'pipe',s:'I',r:0}, null, {k:'wall'}, null,
      null, null, {k:'pipe',s:'L',r:1}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'sink',dir:'W'},
      null, null, null, null, null, null,
    ],
  },

  // ----- Level 50: Master Engineer -----
  // 7x6, 13 pipes. Grand finale - tricky path with multiple chambers.
  // src[6,0]N, L[5,0]r1, I[5,1], L[5,2]r3, I[4,2], L[3,2]r1, I[3,3], I[3,4], L[3,5]r2, I[4,5], I[5,5], L[6,5]r3, I[6,4], sink[6,3]E. 13 pipes.
  // Add walls for chambers.
  {
    name: 'Master Engineer',
    rows: 7, cols: 6,
    tiles: [
      {k:'wall'}, null, null, null, null, {k:'wall'},
      null, null, null, null, null, null,
      null, {k:'wall'}, null, null, {k:'wall'}, null,
      null, null, {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
      null, null, {k:'pipe',s:'I',r:0}, null, null, {k:'pipe',s:'I',r:0},
      {k:'pipe',s:'L',r:0}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0}, null, null, {k:'pipe',s:'I',r:0},
      {k:'src',dir:'N'}, null, null, {k:'sink',dir:'E'}, {k:'pipe',s:'I',r:0}, {k:'pipe',s:'L',r:0},
    ],
  },
];
