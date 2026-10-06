// Board layouts. Every board lives in a SIZE × SIZE square.
//   points: [x, y] of each spot a piece can stand on
//   lines:  each entry is drawn as a path through those points, in order
export const SIZE = 300;

const PIECE_R = 22;
const HIT_R   = 36;

const C = SIZE / 2;
const SQRT3_2 = Math.sqrt(3) / 2;

/**
 * Maps (col, row) of a cols × rows lattice to board coordinates. The lattice
 * is square (same step both ways) and centred, fitting inside `margin`.
 */
function lattice(cols, rows, margin) {
  const step = (SIZE - 2 * margin) / (Math.max(cols, rows) - 1);
  const x0 = (SIZE - (cols - 1) * step) / 2;
  const y0 = (SIZE - (rows - 1) * step) / 2;
  return (c, r) => [x0 + c * step, y0 + r * step];
}

/**
 * A board made of some cells of a lattice. Lines join neighbouring cells along
 * rows and columns; with `diagonals`, also along the diagonals that run
 * through cells whose col + row is even (the Alquerque pattern).
 */
function cellBoard({ cols, rows, margin, cells = null, diagonals = false }) {
  const at = lattice(cols, rows, margin);
  cells ??= Array.from({ length: cols * rows }, (_, i) => [i % cols, Math.floor(i / cols)]);

  const index = new Map(cells.map(([c, r], i) => [`${c},${r}`, i]));
  const idx = (c, r) => index.get(`${c},${r}`);

  const dirs = [[1, 0], [0, 1]];
  if (diagonals) dirs.push([1, 1], [-1, 1]);

  const lines = [];
  for (const [dc, dr] of dirs) {
    const diagonal = dc !== 0 && dr !== 0;
    for (const [c, r] of cells) {
      if (diagonal && (c + r) % 2) continue;
      // Start only where the run starts, then walk along it.
      if (idx(c - dc, r - dr) !== undefined) continue;
      const run = [];
      for (let cc = c, rr = r; idx(cc, rr) !== undefined; cc += dc, rr += dr) run.push(idx(cc, rr));
      if (run.length > 1) lines.push(run);
    }
  }

  return { points: cells.map(([c, r]) => at(c, r)), lines, at, idx };
}

/**
 * Concentric square rings, as in the morris games. Each ring has 8 points,
 * clockwise from its top-left corner. Side midpoints are always joined across
 * the rings; with `corners`, the corners are too (as in Morabaraba).
 */
function rings(count, margin, { corners = false } = {}) {
  const n = 2 * count + 1;
  const at = lattice(n, n, margin);
  const points = [];
  const lines = [];
  for (let k = 0; k < count; k++) {
    const lo = k, mid = count, hi = n - 1 - k;
    const spots = [[lo, lo], [mid, lo], [hi, lo], [hi, mid], [hi, hi], [mid, hi], [lo, hi], [lo, mid]];
    const first = points.length;
    for (const [c, r] of spots) points.push(at(c, r));
    lines.push([0, 1, 2, 3, 4, 5, 6, 7, 0].map((i) => first + i));
  }
  // Midpoints are the odd positions of each ring, corners the even ones.
  const across = corners ? [0, 1, 2, 3, 4, 5, 6, 7] : [1, 3, 5, 7];
  for (const pos of across) {
    lines.push(Array.from({ length: count }, (_, k) => k * 8 + pos));
  }
  return { points, lines };
}

/** A regular polygon with a centre point, spokes and an outline. */
function wheel(sides, radius) {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides;
    points.push([C + radius * Math.cos(a), C + radius * Math.sin(a)]);
  }
  points.push([C, C]);
  const centre = sides;
  const lines = [[...points.keys()].slice(0, sides).concat(0)];
  for (let i = 0; i < sides / 2; i++) lines.push([i, centre, i + sides / 2]);
  return { points, lines };
}

/**
 * Joins points that line up along given directions. `key` gives, for each
 * point, one value per direction that is shared by the points on the same
 * line, and `order` sorts the points along it.
 */
function axisLines(count, key, order) {
  const lines = [];
  const axes = key(0).length;
  for (let a = 0; a < axes; a++) {
    const groups = new Map();
    for (let i = 0; i < count; i++) {
      const k = key(i)[a];
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(i);
    }
    for (const group of groups.values()) {
      if (group.length > 1) lines.push(group.sort((i, j) => order(i, a) - order(j, a)));
    }
  }
  return lines;
}

/** A hexagon of hexagonally packed points, `radius` rings around the centre. */
function hexagon(radius, margin) {
  const step = (SIZE - 2 * margin) / (2 * radius);
  const cells = [];
  for (let r = -radius; r <= radius; r++) {
    for (let q = -radius; q <= radius; q++) {
      if (Math.abs(q + r) <= radius) cells.push([q, r]);
    }
  }
  const points = cells.map(([q, r]) => [C + step * (q + r / 2), C + step * r * SQRT3_2]);
  // The three directions: constant r, constant q, constant q + r.
  const lines = axisLines(
    cells.length,
    (i) => [cells[i][1], cells[i][0], cells[i][0] + cells[i][1]],
    (i, a) => (a === 0 ? cells[i][0] : cells[i][1]),
  );
  return { points, lines };
}

/** A triangle of points, `size` on each side. */
function triangle(size, margin) {
  const step = (SIZE - 2 * margin) / (size - 1);
  const height = (size - 1) * step * SQRT3_2;
  const top = (SIZE - height) / 2;
  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let k = 0; k <= row; k++) cells.push([row, k]);
  }
  const points = cells.map(([row, k]) => [C + step * (k - row / 2), top + row * step * SQRT3_2]);
  // Rows, and the two slanted directions: constant k, constant row − k.
  const lines = axisLines(
    cells.length,
    (i) => [cells[i][0], cells[i][1], cells[i][0] - cells[i][1]],
    (i, a) => (a === 0 ? cells[i][1] : cells[i][0]),
  );
  return { points, lines };
}

/** A five-pointed star: its tips and the five points where its lines cross. */
function star(radius) {
  const polar = (r, deg) => [C + r * Math.cos((deg * Math.PI) / 180), C + 10 + r * Math.sin((deg * Math.PI) / 180)];
  const inner = radius * Math.cos((72 * Math.PI) / 180) / Math.cos((36 * Math.PI) / 180);

  const tips = Array.from({ length: 5 }, (_, i) => polar(radius, -90 + 72 * i));
  const crossings = Array.from({ length: 5 }, (_, i) => polar(inner, -90 + 36 + 72 * i));
  const points = [...tips, ...crossings];

  // Each line goes from tip i to tip i + 2, crossing two inner points.
  const lines = [];
  for (let i = 0; i < 5; i++) {
    const [ax, ay] = tips[i];
    const [bx, by] = tips[(i + 2) % 5];
    const len = Math.hypot(bx - ax, by - ay);
    const onLine = crossings
      .map((p, j) => ({ j: 5 + j, d: Math.hypot(p[0] - ax, p[1] - ay) }))
      .filter(({ j }) => {
        const [px, py] = points[j];
        return Math.abs((bx - ax) * (py - ay) - (by - ay) * (px - ax)) / len < 0.5;
      })
      .sort((p, q) => p.d - q.d)
      .map(({ j }) => j);
    lines.push([i, ...onLine, (i + 2) % 5]);
  }
  return { points, lines };
}

/** Jogo da Onça (Adugo): an Alquerque board with a triangular den below it. */
function onca() {
  const top = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) top.push([c, r]);
  const board = cellBoard({ cols: 5, rows: 7, margin: 22, cells: top, diagonals: true });

  const { points, lines, at, idx } = board;
  const den = [[1, 5], [2, 5], [3, 5], [0, 6], [2, 6], [4, 6]];
  const first = points.length;
  den.forEach(([c, r]) => points.push(at(c, r)));
  const d = (c, r) => first + den.findIndex(([dc, dr]) => dc === c && dr === r);

  const apex = idx(2, 4);
  lines.push(
    [apex, d(1, 5), d(0, 6)],
    [apex, d(2, 5), d(2, 6)],
    [apex, d(3, 5), d(4, 6)],
    [d(1, 5), d(2, 5), d(3, 5)],
    [d(0, 6), d(2, 6), d(4, 6)],
  );
  return { points, lines };
}

/** The cross of Resta Um: a 7 × 7 grid without its 2 × 2 corners. */
function cross() {
  const cells = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if ((c >= 2 && c <= 4) || (r >= 2 && r <= 4)) cells.push([c, r]);
    }
  }
  return cellBoard({ cols: 7, rows: 7, margin: 26, cells });
}

const LAYOUTS = [
  { id: 'velha',      name: '3×3 com diagonais',  ...cellBoard({ cols: 3, rows: 3, margin: 45, diagonals: true }) },
  { id: 'grade3',     name: '3×3 simples',        ...cellBoard({ cols: 3, rows: 3, margin: 45 }) },
  { id: 'grade4',     name: 'Grade 4×4',          ...cellBoard({ cols: 4, rows: 4, margin: 38 }) },
  { id: 'shisima',    name: 'Shisima (octógono)', ...wheel(8, 115) },
  { id: 'alquerque',  name: 'Alquerque 5×5',      ...cellBoard({ cols: 5, rows: 5, margin: 30, diagonals: true }) },
  { id: 'fanorona',   name: 'Fanorona 9×5',       ...cellBoard({ cols: 9, rows: 5, margin: 20, diagonals: true }) },
  { id: 'onca',       name: 'Jogo da Onça',       ...onca() },
  { id: 'trilha6',    name: 'Trilha pequena',     ...rings(2, 32) },
  { id: 'trilha',     name: 'Trilha',             ...rings(3, 26) },
  { id: 'morabaraba', name: 'Morabaraba',         ...rings(3, 26, { corners: true }) },
  { id: 'restaum',    name: 'Resta Um (cruz)',    ...cross() },
  { id: 'hexagono',   name: 'Hexágono',           ...hexagon(2, 35) },
  { id: 'triangulo',  name: 'Triângulo',          ...triangle(5, 30) },
  { id: 'estrela',    name: 'Estrela',            ...star(130) },
];

// Pieces and drop areas shrink on boards whose points sit close together.
for (const layout of LAYOUTS) {
  let min = Infinity;
  layout.points.forEach(([x1, y1], i) => {
    for (const [x2, y2] of layout.points.slice(i + 1)) min = Math.min(min, Math.hypot(x2 - x1, y2 - y1));
  });
  layout.pieceScale = Math.min(1, (min * 0.42) / PIECE_R);
  layout.hitR = Math.min(HIT_R, min / 2 - 1);
}

export const BOARDS = Object.fromEntries(LAYOUTS.map(({ id, name, points, lines, pieceScale, hitR }) => [
  id, { id, name, points, lines, pieceScale, hitR },
]));
export const DEFAULT_BOARD = 'velha';
