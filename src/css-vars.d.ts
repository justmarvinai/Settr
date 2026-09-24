// oxlint-disable-next-line unicorn/require-module-specifiers -- makes this file a module, so the block below augments React's types instead of replacing them
export {};

declare module 'react' {
  interface CSSProperties {
    /** CSS custom properties, e.g. a component's `--ring-value` (tokens stay in tokens.css). */
    [key: `--${string}`]: string | number | undefined;
  }
}
