const NS = 'http://www.w3.org/2000/svg';

const SIZE   = 300;
const MARGIN = 45;
const STEP   = (SIZE - 2 * MARGIN) / 2; // 105

// The 9 points of the board, row-major.
export const PTS = [];
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 3; c++) {
    PTS.push([MARGIN + c * STEP, MARGIN + r * STEP]);
  }
}

// Each entry is a straight line drawn from the first to the last point.
const BOARD_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const PIECE_R = 22;
const HIT_R   = 36;

// 0 = vazio, 1 = Batman, 2 = Homem-Aranha
export const FIGURES = [
  { name: 'vazio' },
  { name: 'Batman',       color: '#ffe14d', filter: 'tmGlowBat',    viewBox: '-20 -13 40 20' },
  { name: 'Homem-Aranha', color: '#ff2e5b', filter: 'tmGlowSpider', viewBox: '-19 -12 38 27' },
];

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
 * Renders the board as an inline SVG element.
 *
 * @param {number[]} state    - one value per point: 0 vazio, 1 Batman, 2 Homem-Aranha
 * @param {object}   handlers - { onCycle(idx), onCycleBack(idx) }
 * @returns {SVGSVGElement}
 */
export function renderBoard(state, handlers = {}) {
  const { onCycle = null, onCycleBack = null } = handlers;

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'board', xmlns: NS });

  // ── Defs ──────────────────────────────────────────────────────
  const defs = document.createElementNS(NS, 'defs');
  defs.appendChild(glowFilter('tmGlowLine',   '#2de2e6', '2.5'));
  defs.appendChild(glowFilter('tmGlowBat',    FIGURES[1].color, '4'));
  defs.appendChild(glowFilter('tmGlowSpider', FIGURES[2].color, '4'));
  svg.appendChild(defs);

  // ── Panel ─────────────────────────────────────────────────────
  svg.appendChild(el('rect', {
    x: '2', y: '2', width: SIZE - 4, height: SIZE - 4, rx: '18',
    fill: '#0b0d14', stroke: 'rgba(45,226,230,0.28)', 'stroke-width': '1.5',
  }));

  // ── Board lines ───────────────────────────────────────────────
  const lines = el('g', { filter: 'url(#tmGlowLine)' });
  for (const line of BOARD_LINES) {
    const [a] = line;
    const c = line[line.length - 1];
    const [x1, y1] = PTS[a];
    const [x2, y2] = PTS[c];
    lines.appendChild(el('line', {
      x1, y1, x2, y2,
      stroke: '#2de2e6', 'stroke-width': '1.6', 'stroke-linecap': 'round', opacity: '0.75',
    }));
  }
  svg.appendChild(lines);

  // ── Points and pieces ─────────────────────────────────────────
  PTS.forEach(([cx, cy], idx) => {
    const value = state[idx];
    const figure = FIGURES[value];

    if (value === 0) {
      // Empty point marker, so the clickable spots stay visible.
      svg.appendChild(el('circle', {
        cx, cy, r: 4.5,
        fill: '#2de2e6',
        filter: 'url(#tmGlowLine)',
        class: 'point-empty',
      }));
    } else {
      const piece = el('g', { class: 'piece', filter: `url(#${figure.filter})` });
      piece.appendChild(el('circle', {
        cx, cy, r: PIECE_R,
        fill: '#0b0d14',
        stroke: figure.color,
        'stroke-width': '2',
      }));

      const icon = figureIcon(value, figure.color);
      icon.setAttribute('transform', `translate(${cx} ${cy})`);
      piece.appendChild(icon);

      svg.appendChild(piece);
    }

    // Transparent hit target on top, one per point.
    const hit = el('circle', {
      cx, cy, r: HIT_R,
      fill: 'transparent',
      class: 'point-hit',
      tabindex: '0',
      role: 'button',
      'aria-label': `Ponto ${idx + 1}: ${figure.name}`,
    });

    hit.addEventListener('click', () => onCycle && onCycle(idx));
    hit.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      onCycleBack && onCycleBack(idx);
    });
    hit.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onCycle && onCycle(idx);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onCycleBack && onCycleBack(idx);
      }
    });

    svg.appendChild(hit);
  });

  return svg;
}
