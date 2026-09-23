/** Typing in a field (or a composed key) never triggers the single-key shortcuts (UX_SPEC.md §7). */
export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}
