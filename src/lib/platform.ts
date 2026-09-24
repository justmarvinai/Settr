/** Apple keyboards say ⌘, Windows keyboards Strg (UX_SPEC.md §3.2). */
export const isApple =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
