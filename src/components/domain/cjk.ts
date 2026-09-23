import { useEffect } from 'react';

/**
 * The self-hosted Noto fallbacks for Japanese and Chinese text (DESIGN_SYSTEM.md §4). Each family's
 * @font-face rules are ~32 KB gzip, so a page loads only the ones for the languages it shows, once;
 * the glyph slices themselves download only when no system font has them (Brave, ADR-027).
 */
const FONT_RULES: Record<string, () => Promise<unknown>> = {
  ja: () => import('./fonts/ja.css'),
  'zh-tw': () => import('./fonts/zh-tw.css'),
  'zh-cn': () => import('./fonts/zh-cn.css'),
};

export function useCjkFonts(languages: readonly string[]): void {
  const needed = [...new Set(languages.filter((l) => l in FONT_RULES))].toSorted().join(' ');
  useEffect(() => {
    for (const lang of needed.split(' ')) void FONT_RULES[lang]?.();
  }, [needed]);
}
