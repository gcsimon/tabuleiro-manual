import { SIZE } from './boards.js';

const NS = 'http://www.w3.org/2000/svg';

const PIECE_R = 22;

// 0 = vazio, 1 = Batman, 2 = Homem-Aranha
export const FIGURES = [
  { name: 'vazio' },
  { name: 'Batman',       color: '#ffe14d', viewBox: '-20 -13 40 20' },
  { name: 'Homem-Aranha', color: '#ff2e5b', viewBox: '-19 -12 38 27' },
];

// One colour per bucket; `ink` is the text colour that reads on top of it.
// The number of colours caps how many buckets a player can have.
export const BUCKET_COLORS = {
  1: [
    { name: 'amarelo',  color: '#ffe14d', ink: '#08090d' },
    { name: 'roxo',     color: '#b46bff', ink: '#08090d' },
    { name: 'azul',     color: '#3d7bff', ink: '#ffffff' },
  ],
  2: [
    { name: 'vermelho', color: '#ff2e5b', ink: '#08090d' },
    { name: 'verde',    color: '#4ade6b', ink: '#08090d' },
    { name: 'laranja',  color: '#ff8a2b', ink: '#08090d' },
  ],
};

const glowId = (color) => `tmGlow${color.slice(1)}`;

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function glowFilter(id, color, blur) {
  const f = el('filter', { id, x: '-80%', y: '-80%', width: '260%', height: '260%' });
  const b = el('feDropShadow', { dx: '0', dy: '0', stdDeviation: blur });
  b.setAttribute('flood-color', color);
  b.setAttribute('flood-opacity', '0.9');
  f.appendChild(b);
  return f;
}

/** Stylised bat, drawn around (0,0), 36 wide. */
function batIcon(color) {
  const g = el('g', { fill: color, class: 'icon' });
  g.appendChild(el('path', {
    d: 'M 0,-7 L -3,-11 L -4,-5 C -8,-9 -13,-10 -18,-8 C -15,-5 -14,-1 -16,3 '
     + 'C -12,1 -8,2 -5,5 C -4,2 -2,1 0,4 C 2,1 4,2 5,5 C 8,2 12,1 16,3 '
     + 'C 14,-1 15,-5 18,-8 C 13,-10 8,-9 4,-5 L 3,-11 Z',
  }));
  return g;
}

// Left-hand legs; each is mirrored to build the right-hand side.
const SPIDER_LEGS = [
  'M -3.5,-3   C -7,-8   -11,-10 -13.5,-8 C -15,-6.5 -15.5,-5   -16,-3',
  'M -4,-0.5   C -8,-4   -12,-6  -15,-4.5 C -16.5,-3 -17,-1.5   -17.5,0.5',
  'M -4,2.5    C -8,1    -12,1   -15,3    C -16.5,4.5 -17,6     -17,7.5',
  'M -3,5.5    C -6.5,6  -10,7.5 -12,10   C -13,11.5  -13.5,12.5 -13.5,13.5',
];

/** Stylised spider, drawn around (0,0), 35 wide. */
function spiderIcon(color) {
  const g = el('g', { class: 'icon' });

  for (const d of SPIDER_LEGS) {
    for (const transform of ['', 'scale(-1,1)']) {
      const leg = el('path', {
        d, fill: 'none', stroke: color,
        'stroke-width': '1.9', 'stroke-linecap': 'round',
      });
      if (transform) leg.setAttribute('transform', transform);
      g.appendChild(leg);
    }
  }

  g.appendChild(el('ellipse', { cx: '0', cy: '3.5',  rx: '4.5', ry: '6', fill: color }));
  g.appendChild(el('ellipse', { cx: '0', cy: '-3.5', rx: '3.2', ry: '3', fill: color }));

  return g;
}

function figureIcon(value, color) {
  return value === 1 ? batIcon(color) : spiderIcon(color);
}

/** A round piece with its figure, drawn around (0,0). */
function pieceShape(value, color) {
  const g = el('g', { class: 'piece' });
  g.appendChild(el('circle', {
    cx: 0, cy: 0, r: PIECE_R,
    fill: '#0b0d14',
    stroke: color,
    'stroke-width': '2',
  }));
  g.appendChild(figureIcon(value, color));
  return g;
}

/**
 * Standalone SVG of one figure, for the legend swatches.
 *
 * @param {number} value - 1 Batman, 2 Homem-Aranha
 * @returns {SVGSVGElement}
 */
export function renderFigureIcon(value) {
  const figure = FIGURES[value];
  const svg = el('svg', { viewBox: figure.viewBox, xmlns: NS, 'aria-hidden': 'true' });
  svg.appendChild(figureIcon(value, figure.color));
  return svg;
}

/**
 * Standalone SVG of a whole piece, for the buckets and the drag ghost.
 *
 * @param {number} value  - 1 Batman, 2 Homem-Aranha
 * @param {number} tone   - index into BUCKET_COLORS[value]
 * @returns {SVGSVGElement}
 */
export function renderPiece(value, tone) {
  const { color } = BUCKET_COLORS[value][tone];
  const r = PIECE_R + 2;
  const svg = el('svg', {
    viewBox: `${-r} ${-r} ${2 * r} ${2 * r}`,
    xmlns: NS,
    class: 'piece-icon',
    style: `--c: ${color}`,
    'aria-hidden': 'true',
  });
  svg.appendChild(pieceShape(value, color));
  return svg;
}

/** The board's lines, one path per entry of `layout.lines`. */
function boardLines(layout, attrs) {
  const g = el('g', attrs);
  for (const line of layout.lines) {
    g.appendChild(el('polyline', {
      points: line.map((i) => layout.points[i].join(',')).join(' '),
      fill: 'none',
    }));
  }
  return g;
}

/**
 * Small picture of a board, for picking one in the setup dialog.
 *
 * @param {object} layout - an entry of BOARDS
 * @returns {SVGSVGElement}
 */
export function renderBoardThumb(layout) {
  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, xmlns: NS, 'aria-hidden': 'true' });
  svg.appendChild(boardLines(layout, {
    stroke: 'currentColor', 'stroke-width': '7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  }));
  for (const [cx, cy] of layout.points) {
    svg.appendChild(el('circle', { cx, cy, r: 13 * layout.pieceScale, fill: 'currentColor' }));
  }
  return svg;
}

/**
 * Renders the board as an inline SVG element.
 *
 * @param {object} layout  - an entry of BOARDS: its points and lines
 * @param {Array}  state   - one entry per point: null, or the piece { fig, tone, home }
 * @param {object} options - { onGrab(idx, event), animateIdx }
 * @returns {SVGSVGElement}
 */
export function renderBoard(layout, state, options = {}) {
  const { onGrab = null, animateIdx = null } = options;

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'board', xmlns: NS });

  // ── Defs ──────────────────────────────────────────────────────
  const defs = document.createElementNS(NS, 'defs');
  defs.appendChild(glowFilter('tmGlowLine',   '#2de2e6', '2.5'));
  for (const colors of Object.values(BUCKET_COLORS)) {
    for (const { color } of colors) defs.appendChild(glowFilter(glowId(color), color, '4'));
  }
  svg.appendChild(defs);

  // ── Panel ─────────────────────────────────────────────────────
  svg.appendChild(el('rect', {
    x: '2', y: '2', width: SIZE - 4, height: SIZE - 4, rx: '18',
    fill: '#0b0d14', stroke: 'rgba(45,226,230,0.28)', 'stroke-width': '1.5',
  }));

  // ── Board lines ───────────────────────────────────────────────
  svg.appendChild(boardLines(layout, {
    filter: 'url(#tmGlowLine)',
    stroke: '#2de2e6', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    opacity: '0.75',
  }));

  // ── Points and pieces ─────────────────────────────────────────
  layout.points.forEach(([cx, cy], idx) => {
    const piece = state[idx];
    const figure = FIGURES[piece ? piece.fig : 0];

    if (!piece) {
      // Empty point marker, so the drop spots stay visible.
      svg.appendChild(el('circle', {
        cx, cy, r: 4.5,
        fill: '#2de2e6',
        filter: 'url(#tmGlowLine)',
        class: 'point-empty',
      }));
    } else {
      // The placement lives on the outer group: the inner one is animated by CSS.
      const { color } = BUCKET_COLORS[piece.fig][piece.tone];
      const holder = el('g', {
        transform: `translate(${cx} ${cy}) scale(${layout.pieceScale})`,
        filter: `url(#${glowId(color)})`,
      });
      const shape = pieceShape(piece.fig, color);
      shape.dataset.idx = idx;
      if (idx === animateIdx) shape.classList.add('is-new');
      holder.appendChild(shape);
      svg.appendChild(holder);
    }

    // Transparent hit target on top, one per point. Also the drop target.
    const hit = el('circle', {
      cx, cy, r: layout.hitR,
      fill: 'transparent',
      class: !piece ? 'point-hit' : 'point-hit has-piece',
      'data-idx': idx,
      'aria-label': `Ponto ${idx + 1}: ${figure.name}`,
    });

    if (piece) {
      hit.addEventListener('pointerdown', (e) => onGrab && onGrab(idx, e));
    }

    svg.appendChild(hit);
  });

  return svg;
}
