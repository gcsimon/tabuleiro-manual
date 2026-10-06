/**
 * Drags a ghost element under the pointer until it is released.
 *
 * Uses pointer events, so the same code serves mouse, pen and touch.
 *
 * @param {PointerEvent} event   - the pointerdown that started the drag
 * @param {object}       options - { ghost, onOver(el), onDrop(el) }
 *   ghost:  element that follows the pointer
 *   onOver: called with the element under the pointer whenever it changes
 *   onDrop: called with the element under the pointer on release,
 *           or with null if the drag was cancelled
 */
export function startDrag(event, { ghost, onOver = null, onDrop }) {
  event.preventDefault();

  ghost.classList.add('drag-ghost');
  document.body.appendChild(ghost);
  document.body.classList.add('dragging');

  // The ghost ignores the pointer, so this finds what is underneath it.
  const under = (e) => document.elementFromPoint(e.clientX, e.clientY);

  let over;
  const move = (e) => {
    ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    const el = under(e);
    if (el !== over) {
      over = el;
      onOver && onOver(el);
    }
  };

  const finish = (target) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    ghost.remove();
    document.body.classList.remove('dragging');
    onDrop(target);
  };
  const up     = (e) => finish(under(e));
  const cancel = ()  => finish(null);

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);

  move(event);
}
