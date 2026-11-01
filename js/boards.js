// Board layouts, one per slide of "tabuleiros Giovani Ext.pptx", in its order.
// Each builder works in its own units; fit() then scales and centres the board
// into the SIZE × SIZE square, keeping its proportions.
//   points: [x, y] of each spot a piece can stand on
//   lines:  each entry is drawn as a path through those points, in order
//   curves: circles and arcs, drawn like the lines: { c: [x, y], r, from, to },
//           angles in degrees, clockwise from the right; 0 to 360 is a whole circle
//   marked: points drawn apart, as on the original drawing (a centre, or the
//           rows where pieces start)
export const SIZE = 300;

const PIECE_R = 22;
const HIT_R   = 36;
const MARGIN  = 26;
const EPS     = 1e-6;

const rad = (deg) => (deg * Math.PI) / 180;
const polar = (r, deg, [cx, cy] = [0, 0]) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];

/** Every (col, row) of a cols × rows lattice, row by row. */
function cellsOf(cols, rows) {
  return Array.from({ length: cols * rows }, (_, i) => [i % cols, Math.floor(i / cols)]);
}

/**
 * Points on a square lattice, joined by the lattice lines that run through
 * them. Each family of lines can be kept whole ('all') or only for its lines
 * with an even or odd key: the row or column number for straight lines,
 * col ± row for diagonals ('even' diagonals give the Alquerque pattern).
 */
function grid(cols, rows, { cells = cellsOf(cols, rows), straight = 'all', diagonals = null } = {}) {
  const families = [];
  if (straight)  families.push([straight, ([, r]) => r, ([c]) => c], [straight, ([c]) => c, ([, r]) => r]);
  if (diagonals) families.push([diagonals, ([c, r]) => c - r, ([c]) => c], [diagonals, ([c, r]) => c + r, ([c]) => c]);

  const lines = [];
  for (const [which, key, order] of families) {
    const groups = new Map();
    cells.forEach((cell, i) => {
      const k = key(cell);
      if (which !== 'all' && Math.abs(k % 2) !== (which === 'odd' ? 1 : 0)) return;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    });
    for (const group of groups.values()) {
      if (group.length > 1) lines.push(group.sort((i, j) => order(cells[i]) - order(cells[j])));
    }
  }
  return { points: cells, lines };
}

/** Where p lies along the segment ab, from 0 to 1, or null if it is off it. */
function along([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  const t = ((px - ax) * dx + (py - ay) * dy) / (len * len);
  const off = Math.abs((px - ax) * dy - (py - ay) * dx) / len;
  return off < EPS && t > -EPS && t < 1 + EPS ? t : null;
}

/**
 * A board given by its points and by lines through them. Each line is a list
 * of corners, and takes in every point lying on the way between them.
 */
function figure(points, paths) {
  const lines = paths.map((path) => {
    const run = [];
    for (let k = 0; k + 1 < path.length; k++) {
      const onSegment = points
        .map((p, i) => ({ i, t: along(p, path[k], path[k + 1]) }))
        .filter(({ t }) => t !== null)
        .sort((p, q) => p.t - q.t)
        .map(({ i }) => i);
      run.push(...(k ? onSegment.slice(1) : onSegment));
    }
    return run;
  });
  return { points, lines };
}

/** A regular polygon with a centre point, spokes and an outline. */
function wheel(sides) {
  const points = Array.from({ length: sides }, (_, i) => polar(1, -90 + (360 * i) / sides));
  points.push([0, 0]);
  const lines = [[...points.keys()].slice(0, sides).concat(0)];
  for (let i = 0; i < sides / 2; i++) lines.push([i, sides, i + sides / 2]);
  return { points, lines };
}

/**
 * Concentric rings of one polygon, as in the morris games. Each ring has a
 * point on every corner and in the middle of every side, clockwise from the
 * top (from the top-left corner on squares). Side midpoints are joined across
 * all the rings, corners across the outer `corners` rings. `hole` is the inner
 * ring's size, in steps between rings; `centre` adds a point in the middle,
 * joined to the inner ring's 'sides' or 'corners'.
 */
function rings(sides, count, { corners = 0, hole = 1, centre = null } = {}) {
  const start = -90 - (sides % 2 ? 0 : 180 / sides);
  const per = 2 * sides;
  const points = [];
  const lines = [];
  for (let k = 0; k < count; k++) {
    const r = count - 1 - k + hole;
    for (let i = 0; i < sides; i++) {
      const [ax, ay] = polar(r, start + (360 * i) / sides);
      const [bx, by] = polar(r, start + (360 * (i + 1)) / sides);
      points.push([ax, ay], [(ax + bx) / 2, (ay + by) / 2]);
    }
    lines.push([...Array(per).keys(), 0].map((pos) => k * per + pos));
  }
  if (centre) points.push([0, 0]);

  // Corners are the even positions of each ring, side midpoints the odd ones.
  for (let pos = 0; pos < per; pos++) {
    const isSide = pos % 2 === 1;
    const reach = isSide ? count : corners;
    if (reach < 2) continue;
    const spoke = Array.from({ length: reach }, (_, k) => k * per + pos);
    if (centre === (isSide ? 'sides' : 'corners') && reach === count) spoke.push(count * per);
    lines.push(spoke);
  }
  return { points, lines };
}

/**
 * Concentric circles crossed by diameters, with a point wherever they meet and
 * one in the centre. The inner circle is a step and a half from the centre.
 */
function circles(count, diameters) {
  const radii = Array.from({ length: count }, (_, k) => count - k + 0.5);
  const points = [[0, 0]];
  for (let s = 0; s < 2 * diameters; s++) {
    for (const r of radii) points.push(polar(r, (180 * s) / diameters));
  }
  // Spoke s runs from the outer circle inwards; s + diameters is its other half.
  const spoke = (s) => radii.map((_, k) => 1 + s * count + k);
  const lines = Array.from({ length: diameters }, (_, d) => [...spoke(d), 0, ...spoke(d + diameters).reverse()]);
  return { points, lines, curves: radii.map((r) => ({ c: [0, 0], r })) };
}

/**
 * A triangle as tall as it is wide, with a line down the middle and `rows`
 * evenly spaced lines across it; each of those has a point at both ends and
 * in the middle.
 */
function pyramid(rows) {
  const apex = [0, 0];
  const points = [apex];
  const paths = [[apex, [-0.5, 1]], [apex, [0, 1]], [apex, [0.5, 1]]];
  for (let k = 1; k <= rows; k++) {
    const y = k / rows;
    points.push([-y / 2, y], [0, y], [y / 2, y]);
    paths.push([[-y / 2, y], [y / 2, y]]);
  }
  return figure(points, paths);
}

/**
 * Two triangles meeting at a centre point. Each side has a column of three
 * points at every distance in `columns` (outermost first), on the two
 * diagonals and on the middle line. `bars` adds lines across the whole board
 * at the height where the diagonals cross those distances.
 */
function bowtie(columns, { bars = [] } = {}) {
  const SLOPE = 0.8;
  const out = columns[0];
  const points = [[0, 0]];
  const paths = [
    [[-out, -SLOPE * out], [out, SLOPE * out]],
    [[-out, SLOPE * out], [out, -SLOPE * out]],
    [[-out, 0], [out, 0]],
  ];
  for (const d of columns) {
    for (const x of [-d, d]) {
      points.push([x, -SLOPE * d], [x, 0], [x, SLOPE * d]);
      paths.push([[x, -SLOPE * d], [x, SLOPE * d]]);
    }
  }
  for (const d of bars) {
    for (const y of [-SLOPE * d, SLOPE * d]) {
      points.push([-out, y], [out, y]);
      paths.push([[-out, y], [out, y]]);
    }
  }
  return { ...figure(points, paths), marked: [0] };
}

/** A row of diamonds along a line, each sharing a corner with the next. */
function diamonds(count) {
  const HALF_HEIGHT = 1.44;
  const points = Array.from({ length: count + 1 }, (_, i) => [i, 0]);
  const paths = [[[0, 0], [count, 0]]];
  for (let i = 0; i < count; i++) {
    const top = [i + 0.5, -HALF_HEIGHT];
    const bottom = [i + 0.5, HALF_HEIGHT];
    points.push(top, bottom);
    paths.push([[i, 0], top, [i + 1, 0], bottom, [i, 0]]);
  }
  return { ...figure(points, paths), marked: [count / 2] };
}

/** A five-pointed star: its tips and the five points where its lines cross. */
function star(tipAngle) {
  const inner = Math.cos(rad(72)) / Math.cos(rad(36));
  const tips = Array.from({ length: 5 }, (_, i) => polar(1, tipAngle + 72 * i));
  const crossings = Array.from({ length: 5 }, (_, i) => polar(inner, tipAngle + 36 + 72 * i));
  return figure([...tips, ...crossings], tips.map((tip, i) => [tip, tips[(i + 2) % 5]]));
}

/**
 * The dark squares of an n × n checkerboard, as points joined along the
 * diagonals. `marked` lists rows to draw apart.
 */
function checkers(n, { odd = false, marked = [] } = {}) {
  const cells = cellsOf(n, n).filter(([c, r]) => (c + r) % 2 === (odd ? 1 : 0));
  const board = grid(n, n, { cells, straight: null, diagonals: 'all' });
  board.marked = [...cells.keys()].filter((i) => marked.includes(cells[i][1]));
  return board;
}

/** A square grid whose corners are wrapped in loops, three quarters of a circle each. */
function loops(n) {
  const m = n - 1;
  const board = grid(n, n);
  // Each loop leaves the square at one neighbour of the corner and comes back at the other.
  board.curves = [[0, 0, 90], [m, 0, 180], [m, m, 270], [0, m, 0]]
    .map(([x, y, from]) => ({ c: [x, y], r: 1, from, to: from + 270 }));
  return board;
}

/**
 * A circle crossed by two diameters, with a small circle in the middle and a
 * half circle tucked inside each end of the diameters, its ends on the rim.
 */
function arcsCircle() {
  const R = 1;
  const r = 0.26;
  const d = Math.sqrt(R * R - r * r);
  const points = [[0, 0]];
  const curves = [{ c: [0, 0], r: R }, { c: [0, 0], r }];
  for (const a of [0, 90, 180, 270]) {
    const c = polar(d, a);
    points.push(polar(R, a), polar(d - r, a), polar(r, a), polar(r, a + 90, c), polar(r, a - 90, c));
    curves.push({ c, r, from: a + 90, to: a + 270 });
  }
  return { ...figure(points, [[[-R, 0], [R, 0]], [[0, -R], [0, R]]]), curves };
}

/**
 * A crown seen from above: four lines fan out from the top point, crossed by
 * four bands, with a fence of three points standing out on each side.
 */
function crown() {
  const top = [0, 0];
  const rays = [[-0.5, 0.433], [-0.187, 0.609], [0.187, 0.609], [0.5, 0.433]];
  const on = ([x, y], band) => [(x * band) / 4, (y * band) / 4];

  const points = [top];
  const paths = rays.map((end) => [top, end]);
  for (let band = 1; band <= 4; band++) {
    points.push(...rays.map((end) => on(end, band)));
    paths.push(rays.map((end) => on(end, band)));
  }
  for (const side of [-1, 1]) {
    const outer = rays[side < 0 ? 0 : 3];
    const fence = [[0.5, 0.09], [0.343, 0.061], [0.186, 0.032]].map(([x, y]) => [side * x, y]);
    points.push(...fence);
    paths.push([...fence, on(outer, 1)], [fence[0], on(outer, 3)], [fence[1], on(outer, 2)]);
  }
  return figure(points, paths);
}

/** Scales and centres a board into the SIZE × SIZE square. */
function fit({ points, lines, curves = [], marked = [] }) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  for (const { c, r, from = 0, to = 360 } of curves) {
    for (let a = from; a < to + 5; a += 5) {
      const [x, y] = polar(r, Math.min(a, to), c);
      xs.push(x);
      ys.push(y);
    }
  }
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = (SIZE - 2 * MARGIN) / Math.max(x1 - x0, y1 - y0);
  const round = (v) => Math.round(v * 100) / 100;
  const at = ([x, y]) => [
    round((SIZE - (x1 - x0) * scale) / 2 + (x - x0) * scale),
    round((SIZE - (y1 - y0) * scale) / 2 + (y - y0) * scale),
  ];
  return {
    points: points.map(at),
    lines,
    curves: curves.map(({ c, r, from = 0, to = 360 }) => ({ c: at(c), r: round(r * scale), from, to })),
    marked,
  };
}

const withCentres = cellsOf(5, 5).filter(([c, r]) => c % 2 === r % 2);
const noCorners = cellsOf(5, 3).filter(([c, r]) => !((c === 0 || c === 4) && r !== 1));

const LAYOUTS = [
  { id: 'ponghauki',   name: "Pong Hau K'i",            ...figure(
    [[0, 0], [2, 0], [1, 0.5], [0, 1], [2, 1]],
    [[[0, 0], [0, 1], [2, 1], [2, 0]], [[0, 0], [2, 1]], [[2, 0], [0, 1]]],
  ) },
  { id: 'ponghauki7',  name: "Pong Hau K'i (7 pontos)", ...figure(
    [[0, 0], [2, 0], [0, 0.7], [1, 0.7], [2, 0.7], [0, 1.4], [2, 1.4]],
    [[[0, 0], [0, 1.4], [2, 1.4], [2, 0]], [[0, 0.7], [2, 0.7]], [[0, 0], [2, 1.4]], [[2, 0], [0, 1.4]]],
  ) },
  { id: 'x3',          name: '3×3 em X',                ...grid(3, 3, { diagonals: 'all' }) },
  { id: 'velha',       name: '3×3 com diagonais',       ...grid(3, 3, { diagonals: 'even' }) },
  { id: 'losango3',    name: '3×3 losango',             ...grid(3, 3, { diagonals: 'odd' }) },
  { id: 'shisima',     name: 'Shisima (octógono)',      ...wheel(8) },
  { id: 'centros3',    name: '3×3 com centros',         ...grid(5, 5, { cells: withCentres, straight: 'even', diagonals: 'all' }) },
  { id: 'centros3q',   name: '3×3 com centros ligados', ...grid(5, 5, { cells: withCentres, diagonals: 'all' }) },
  { id: 'grade3',      name: '3×3 simples',             ...grid(3, 3) },
  { id: 'trilha6',     name: 'Trilha pequena',          ...rings(4, 2) },
  { id: 'trilha',      name: 'Trilha',                  ...rings(4, 3) },
  { id: 'morabaraba',  name: 'Morabaraba',              ...rings(4, 3, { corners: 3 }) },
  { id: 'trilhacruz',  name: 'Trilha com cruz',         ...rings(4, 3, { corners: 2, centre: 'sides' }) },
  { id: 'trilhax',     name: 'Trilha com X',            ...rings(4, 3, { corners: 3, centre: 'corners' }) },
  { id: 'pentagonos',  name: 'Pentágonos',              ...rings(5, 3, { corners: 3, hole: 2 }) },
  { id: 'tsoro',       name: 'Tsoro Yematatu',          ...pyramid(2) },
  { id: 'triangulo',   name: 'Triângulo',               ...pyramid(3) },
  { id: 'coroa',       name: 'Coroa',                   ...crown() },
  { id: 'grade4',      name: 'Grade 4×4',               ...grid(4, 4) },
  { id: 'grade5',      name: 'Grade 5×5',               ...grid(5, 5) },
  { id: 'grade54',     name: 'Grade 5×4',               ...grid(5, 4) },
  { id: 'x4',          name: '4×4 em X',                ...grid(4, 4, { diagonals: 'all' }) },
  { id: 'alquerque',   name: 'Alquerque',               ...grid(5, 5, { diagonals: 'even' }), marked: [12] },
  { id: 'gravata',     name: 'Gravata',                 ...bowtie([7, 4]) },
  { id: 'gravata2',    name: 'Gravata grande',          ...bowtie([10, 7, 4], { bars: [7] }) },
  { id: 'losangos',    name: 'Losangos',                ...diamonds(6) },
  { id: 'circulos2',   name: 'Dois círculos',           ...circles(2, 3), marked: [0] },
  { id: 'circulos3',   name: 'Três círculos',           ...circles(3, 3) },
  { id: 'hexagono',    name: 'Hexágono',                ...grid(5, 3, { cells: noCorners, diagonals: 'odd' }) },
  { id: 'estrela',     name: 'Estrela',                 ...star(180) },
  { id: 'damas4',      name: 'Damas 4×4',               ...checkers(4, { marked: [1, 2] }) },
  { id: 'damas6',      name: 'Damas 6×6',               ...checkers(6, { marked: [0, 5] }) },
  { id: 'damas8',      name: 'Damas 8×8',               ...checkers(8, { odd: true, marked: [3, 4] }) },
  { id: 'arcos',       name: 'Círculo com arcos',       ...arcsCircle() },
  { id: 'lacos',       name: 'Grade com laços',         ...loops(4) },
];

export const BOARDS = Object.fromEntries(LAYOUTS.map(({ id, name, ...shape }) => {
  const { points, lines, curves, marked } = fit(shape);

  // Pieces and drop areas shrink on boards whose points sit close together.
  let min = Infinity;
  points.forEach(([x1, y1], i) => {
    for (const [x2, y2] of points.slice(i + 1)) min = Math.min(min, Math.hypot(x2 - x1, y2 - y1));
  });
  const pieceScale = Math.min(1, (min * 0.42) / PIECE_R);
  const hitR = Math.min(HIT_R, min / 2 - 1);

  return [id, { id, name, points, lines, curves, marked, pieceScale, hitR }];
}));
export const DEFAULT_BOARD = LAYOUTS[0].id;
