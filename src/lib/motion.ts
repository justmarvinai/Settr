/**
 * Motion is wanted unless the OS or *Darstellung › Animationen* asks for less (UX_SPEC.md §4.13,
 * DESIGN_SYSTEM.md §6): the app setting sets `html[data-motion]` to `reduced` or `off`.
 */
export function motionWanted(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    document.documentElement.dataset.motion === undefined
  );
}
