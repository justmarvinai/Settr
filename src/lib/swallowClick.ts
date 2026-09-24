/**
 * Swallows the click a finger gesture leaves behind: some browsers still send one when a long
 * press or a swipe lifts, and it would open the tile's link or the card's fullscreen view as
 * well. The guard ends with that click, or with the next press or key when none comes.
 */
let armed = false;

function swallow(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  disarm();
}

function disarm(): void {
  armed = false;
  window.removeEventListener('click', swallow, true);
  window.removeEventListener('pointerdown', disarm, true);
  window.removeEventListener('keydown', disarm, true);
}

export function swallowNextClick(): void {
  if (armed) return;
  armed = true;
  window.addEventListener('click', swallow, true);
  window.addEventListener('pointerdown', disarm, true);
  window.addEventListener('keydown', disarm, true);
}
