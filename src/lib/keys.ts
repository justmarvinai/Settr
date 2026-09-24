/** Typing in a field (or a composed key) never triggers the single-key shortcuts (UX_SPEC.md §7). */
export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** No Ctrl, Cmd or Alt held. Shift is fine: `?` and `/` need it on German keyboards. */
export function isPlain(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey;
}

/** Focus is inside an open dialog or sheet, where page shortcuts stay quiet. */
export function inDialog(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest('[role="dialog"],[role="alertdialog"]') !== null
  );
}
