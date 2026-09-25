import { renderBoard, renderFigureIcon, PTS } from './board.js';

// 0 = vazio, 1 = Batman, 2 = Homem-Aranha
const EMPTY = 0;
const STATES = 3;

const container   = document.getElementById('board-container');
const countBat    = document.getElementById('count-bat');
const countSpider = document.getElementById('count-spider');
const btnClear    = document.getElementById('btn-clear');
const btnUndo     = document.getElementById('btn-undo');

// Legend swatches are drawn by the same code that draws the pieces.
document.getElementById('legend-icon-bat').appendChild(renderFigureIcon(1));
document.getElementById('legend-icon-spider').appendChild(renderFigureIcon(2));

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

  countBat.textContent    = board.filter((v) => v === 1).length;
  countSpider.textContent = board.filter((v) => v === 2).length;
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
