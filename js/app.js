import { renderBoard, renderBoardThumb, renderFigureIcon, renderPiece, BUCKET_COLORS, FIGURES } from './board.js';
import { BOARDS, DEFAULT_BOARD } from './boards.js';
import { startDrag } from './drag.js';

// 1 = Batman, 2 = Homem-Aranha
const PLAYERS = [1, 2];
const opponent = (fig) => 3 - fig;

const container   = document.getElementById('board-container');
const countBat    = document.getElementById('count-bat');
const countSpider = document.getElementById('count-spider');
const btnClear    = document.getElementById('btn-clear');
const btnUndo     = document.getElementById('btn-undo');
const btnNew      = document.getElementById('btn-new');
const setup       = document.getElementById('setup');
const setupForm   = document.getElementById('setup-form');
const setupCancel = document.getElementById('setup-cancel');
const bucketCols  = {
  1: document.getElementById('buckets-bat'),
  2: document.getElementById('buckets-spider'),
};

// Legend swatches are drawn by the same code that draws the pieces.
document.getElementById('legend-icon-bat').appendChild(renderFigureIcon(1));
document.getElementById('legend-icon-spider').appendChild(renderFigureIcon(2));

let started = false;

// The chosen board layout: its points and lines.
let layout = BOARDS[DEFAULT_BOARD];

// One entry per point: null, or the piece standing on it:
//   { fig, tone, home: { fig, bucket } }
// `tone` picks its colour from BUCKET_COLORS[fig]; `home` is the bucket it was
// taken from, so clearing can send it back there.
let board = [];

// Per player, one entry per bucket: { own, captured }.
//   own:      how many of the player's own pieces are left
//   captured: opponent pieces kept there as trophies, counted per tone
let buckets = {};

let history = [];

function emptyBoard() {
  return layout.points.map(() => null);
}

function newGame(boardId, bucketCount, perBucket) {
  layout  = BOARDS[boardId];
  board   = emptyBoard();
  buckets = {};
  for (const fig of PLAYERS) {
    buckets[fig] = Array.from({ length: bucketCount }, () => ({
      own: perBucket,
      captured: BUCKET_COLORS[opponent(fig)].map(() => 0),
    }));
  }
  history = [];
  started = true;
  render();
}

function pushHistory() {
  history.push(structuredClone({ board, buckets }));
  if (history.length > 100) history.shift();
}

function undo() {
  if (!history.length) return;
  ({ board, buckets } = history.pop());
  render();
}

/** Puts a piece into a bucket: as one of its own, or as a trophy. */
function store(piece, fig, b) {
  if (piece.fig === fig) buckets[fig][b].own++;
  else buckets[fig][b].captured[piece.tone]++;
}

function clear() {
  if (board.every((p) => p === null)) return;
  pushHistory();
  for (const piece of board) {
    if (piece) store(piece, piece.home.fig, piece.home.bucket);
  }
  board = emptyBoard();
  render();
}

// ── Drag and drop ──────────────────────────────────────────────

/** What a drag would land on, given the element under the pointer. */
function dropTarget(el) {
  const point = el?.closest('.point-hit');
  if (point) return { type: 'point', idx: Number(point.dataset.idx), el: point };

  const row = el?.closest('.bucket-row');
  if (row) {
    return {
      type: 'bucket',
      fig: Number(row.dataset.fig),
      bucket: Number(row.dataset.bucket),
      el: row.querySelector('.bucket'),
    };
  }
  return null;
}

function canDrop(source, target) {
  if (!target) return false;
  if (target.type === 'point') return board[target.idx] === null;
  // A piece on the board can go to any bucket: its own player's to give it
  // back, the opponent's to capture it. A piece taken from a bucket can go
  // straight across to the other player's buckets.
  return source.from === 'point' || target.fig !== source.fig;
}

/** Removes the dragged piece from where it was. */
function take(source) {
  if (source.from === 'bucket') buckets[source.fig][source.bucket].own--;
  else if (source.from === 'trophy') buckets[source.fig][source.bucket].captured[source.piece.tone]--;
  else board[source.idx] = null;
}

function drop(source, target) {
  const ok = canDrop(source, target);
  if (ok) {
    pushHistory();
    take(source);
    if (target.type === 'point') board[target.idx] = source.piece;
    else store(source.piece, target.fig, target.bucket);
  }

  // Also runs on a refused drop, to put back the piece that was lifted.
  render(ok && target.type === 'point' ? target.idx : null);
}

/**
 * @param {object}       source - where the piece comes from, and the piece itself:
 *   { from: 'bucket' | 'trophy', fig, bucket, piece } or { from: 'point', idx, piece }
 * @param {PointerEvent} event
 */
function grab(source, event) {
  if (event.button !== 0) return;

  if (source.from === 'point') {
    container.querySelector(`.piece[data-idx="${source.idx}"]`)?.classList.add('is-lifted');
  }

  let over = null;
  startDrag(event, {
    ghost: renderPiece(source.piece.fig, source.piece.tone),
    onOver(el) {
      over?.el.classList.remove('drop-ok');
      over = dropTarget(el);
      if (canDrop(source, over)) over.el.classList.add('drop-ok');
    },
    onDrop(el) {
      drop(source, dropTarget(el));
    },
  });
}

// ── Rendering ──────────────────────────────────────────────────

function badge(count) {
  const el = document.createElement('span');
  el.className = 'bucket-count';
  el.textContent = count;
  return el;
}

function setColor(el, fig, tone) {
  const { color, ink } = BUCKET_COLORS[fig][tone];
  el.style.setProperty('--c', color);
  el.style.setProperty('--ink', ink);
}

function bucketEl(fig, b, { own }) {
  const el = document.createElement('div');
  el.className = 'bucket';
  setColor(el, fig, b);
  el.title = `Bucket ${BUCKET_COLORS[fig][b].name} do ${FIGURES[fig].name}: `
           + `${own} ${own === 1 ? 'peça' : 'peças'}`;
  if (own === 0) el.classList.add('is-empty');

  // Only one piece is drawn; the badge says how many are left.
  el.append(renderPiece(fig, b), badge(own));

  if (own > 0) {
    const piece = { fig, tone: b, home: { fig, bucket: b } };
    el.addEventListener('pointerdown', (e) => grab({ from: 'bucket', fig, bucket: b, piece }, e));
  }
  return el;
}

/** One pile per colour of captured opponent pieces, so any of them can be picked. */
function trophiesEl(fig, b, { captured }) {
  const el = document.createElement('div');
  el.className = 'trophies';
  const other = opponent(fig);

  captured.forEach((count, tone) => {
    if (!count) return;

    const pile = document.createElement('div');
    pile.className = 'trophy';
    setColor(pile, other, tone);
    pile.title = `${count} ${count === 1 ? 'peça capturada' : 'peças capturadas'} `
               + `do ${FIGURES[other].name} (${BUCKET_COLORS[other][tone].name})`;
    pile.append(renderPiece(other, tone), badge(count));

    const piece = { fig: other, tone, home: { fig, bucket: b } };
    pile.addEventListener('pointerdown', (e) => grab({ from: 'trophy', fig, bucket: b, piece }, e));
    el.appendChild(pile);
  });
  return el;
}

function bucketRow(fig, b, contents) {
  const row = document.createElement('div');
  row.className = 'bucket-row';
  row.dataset.fig = fig;
  row.dataset.bucket = b;
  row.append(bucketEl(fig, b, contents), trophiesEl(fig, b, contents));
  return row;
}

function render(animateIdx = null) {
  container.replaceChildren(renderBoard(layout, board, {
    animateIdx,
    onGrab: (idx, e) => grab({ from: 'point', idx, piece: board[idx] }, e),
  }));

  for (const fig of PLAYERS) {
    bucketCols[fig].replaceChildren(...buckets[fig].map((c, b) => bucketRow(fig, b, c)));
  }

  countBat.textContent    = board.filter((p) => p?.fig === 1).length;
  countSpider.textContent = board.filter((p) => p?.fig === 2).length;
  btnUndo.disabled = history.length === 0;
}

// ── Setup ──────────────────────────────────────────────────────

// One radio card per board, each with a small picture of it.
const boardChoices = document.getElementById('board-choices');
for (const { id, name } of Object.values(BOARDS)) {
  const card = document.createElement('label');
  card.className = 'board-choice';

  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.name = 'board';
  radio.value = id;
  radio.checked = id === DEFAULT_BOARD;

  const caption = document.createElement('span');
  caption.textContent = name;

  card.append(radio, renderBoardThumb(BOARDS[id]), caption);
  boardChoices.appendChild(card);
}

function openSetup() {
  setupCancel.hidden = !started;
  setup.showModal();
}

setupForm.addEventListener('submit', () => {
  const data = new FormData(setupForm);
  newGame(data.get('board'), Number(data.get('buckets')), Number(data.get('pieces')));
});

setupCancel.addEventListener('click', () => setup.close());

// Before the first game there is nothing to go back to.
setup.addEventListener('cancel', (e) => {
  if (!started) e.preventDefault();
});

btnClear.addEventListener('click', clear);
btnUndo.addEventListener('click', undo);
btnNew.addEventListener('click', openSetup);

openSetup();
