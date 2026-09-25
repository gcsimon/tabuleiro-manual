import { renderBoard, PTS } from './board.js';

// 0 = vazio, 1 = peça clara, 2 = peça escura
const EMPTY = 0;
const STATES = 3;

const container  = document.getElementById('board-container');
const countLight = document.getElementById('count-light');
const countDark  = document.getElementById('count-dark');
const btnClear   = document.getElementById('btn-clear');
const btnUndo    = document.getElementById('btn-undo');

let board   = PTS.map(() => EMPTY);
let history = [];

function pushHistory() {
  history.push(board.slice());
  if (history.length > 100) history.shift();
}

function cycle(idx, step) {
  pushHistory();
  board[idx] = (board[idx] + step + STATES) % STATES;
  render(idx);
}

function undo() {
  if (!history.length) return;
  board = history.pop();
  render();
}

function clear() {
  if (board.every((v) => v === EMPTY)) return;
  pushHistory();
  board = PTS.map(() => EMPTY);
  render();
}

function render(focusIdx = null) {
  // Read this before the rebuild: replacing the SVG drops the focused element.
  const hadKeyboardFocus = document.activeElement?.classList.contains('point-hit');

  container.replaceChildren(renderBoard(board, {
    onCycle:     (i) => cycle(i, +1),
    onCycleBack: (i) => cycle(i, -1),
  }));

  countLight.textContent = board.filter((v) => v === 1).length;
  countDark.textContent  = board.filter((v) => v === 2).length;
  btnUndo.disabled = history.length === 0;

  // The SVG is rebuilt on every render, so keyboard focus has to be restored.
  if (focusIdx !== null && hadKeyboardFocus) {
    container.querySelectorAll('.point-hit')[focusIdx]?.focus();
  }
}

btnClear.addEventListener('click', clear);
btnUndo.addEventListener('click', undo);

// Right-clicking the board area should never open the browser menu.
container.addEventListener('contextmenu', (e) => e.preventDefault());

render();
