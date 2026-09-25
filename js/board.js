const NS = 'http://www.w3.org/2000/svg';

const SIZE   = 300;
const MARGIN = 45;
const STEP   = (SIZE - 2 * MARGIN) / 2; // 105

// The 9 points of the board (row-major), same geometry as the book's board.
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

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function gradient(id, from, to) {
  const g = el('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  const s1 = el('stop', { offset: '0%'   }); s1.setAttribute('stop-color', from);
  const s2 = el('stop', { offset: '100%' }); s2.setAttribute('stop-color', to);
  g.appendChild(s1); g.appendChild(s2);
  return g;
}

/**
 * Renders the board as an inline SVG element.
 *
 * @param {number[]} state    - one value per point: 0 empty, 1 light, 2 dark
 * @param {object}   handlers - { onCycle(idx), onCycleBack(idx) }
 * @returns {SVGSVGElement}
 */
export function renderBoard(state, handlers = {}) {
  const { onCycle = null, onCycleBack = null } = handlers;

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, class: 'board', xmlns: NS });

  // ── Defs ──────────────────────────────────────────────────────
  const defs = document.createElementNS(NS, 'defs');
  defs.appendChild(gradient('tmWood',  '#d4a568', '#b8843c'));
  defs.appendChild(gradient('tmLight', '#f8f8f8', '#c8c8c8'));
  defs.appendChild(gradient('tmDark',  '#484848', '#141414'));

  const shadow = el('filter', { id: 'tmShadow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
  const fds = el('feDropShadow', { dx: '0', dy: '2', stdDeviation: '3' });
  fds.setAttribute('flood-color', 'rgba(0,0,0,0.5)');
  shadow.appendChild(fds);
  defs.appendChild(shadow);

  svg.appendChild(defs);

  // ── Background ────────────────────────────────────────────────
  svg.appendChild(el('rect', { width: SIZE, height: SIZE, fill: 'url(#tmWood)', rx: '16' }));

  // ── Board lines ───────────────────────────────────────────────
  for (const line of BOARD_LINES) {
    const [a] = line;
    const c = line[line.length - 1];
    const [x1, y1] = PTS[a];
    const [x2, y2] = PTS[c];
    svg.appendChild(el('line', { x1, y1, x2, y2, stroke: '#5c3217', 'stroke-width': '4', 'stroke-linecap': 'round' }));
  }

  // ── Points and pieces ─────────────────────────────────────────
  PTS.forEach(([cx, cy], idx) => {
    const value = state[idx];

    if (value === 0) {
      // Empty point marker, so the clickable spots stay visible.
      svg.appendChild(el('circle', {
        cx, cy, r: 7,
        fill: 'rgba(92,50,23,0.55)',
        class: 'point-empty',
      }));
    } else {
      svg.appendChild(el('circle', {
        cx, cy, r: PIECE_R,
        fill: value === 1 ? 'url(#tmLight)' : 'url(#tmDark)',
        stroke: value === 1 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.14)',
        'stroke-width': '1.5',
        filter: 'url(#tmShadow)',
        class: 'piece',
      }));
    }

    // Transparent hit target on top, one per point.
    const hit = el('circle', {
      cx, cy, r: HIT_R,
      fill: 'transparent',
      class: 'point-hit',
      tabindex: '0',
      role: 'button',
      'aria-label': `Ponto ${idx + 1}: ${['vazio', 'peça clara', 'peça escura'][value]}`,
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
