/** Brand mark: an accent card behind an ink card (DESIGN_SYSTEM.md §2, simplified). */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="12" y="3" width="16" height="22" rx="4.5" fill="var(--accent)" />
      <rect
        x="4"
        y="7"
        width="16"
        height="22"
        rx="4.5"
        fill="var(--text)"
        stroke="var(--bg)"
        strokeWidth="2"
      />
    </svg>
  );
}
