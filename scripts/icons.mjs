// Renders the PWA icons from SVG with Playwright's Chromium: `node scripts/icons.mjs`.
// Mark: two offset cards (63:88) on ink; the front card is glass and catches an accent edge light
// (DESIGN_SYSTEM.md §2). No Pokémon symbols. Output goes to public/icons/ and is committed.
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const INK_TOP = '#1B1D2C';
const INK_BOTTOM = '#07080C';
const ACCENT_LIGHT = '#7B86FF';
const ACCENT = '#3A47D5';

/** The two cards, centered on a 512 canvas, scaled around the center. */
function mark(scale) {
  return `
  <defs>
    <linearGradient id="back" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ACCENT_LIGHT}"/><stop offset="1" stop-color="${ACCENT}"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.42"/><stop offset="0.38" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0.04"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.6" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#AEB5FF" stop-opacity="1"/>
    </linearGradient>
    <clipPath id="front"><rect x="102" y="144" width="196" height="272" rx="40"/></clipPath>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.45"/></filter>
  </defs>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="214" y="96" width="196" height="272" rx="40" fill="url(#back)" filter="url(#shadow)"/>
    <g clip-path="url(#front)" filter="url(#shadow)">
      <rect x="102" y="144" width="196" height="272" fill="#23263A" fill-opacity="0.55"/>
      <rect x="214" y="96" width="196" height="272" rx="40" fill="url(#back)" filter="url(#blur)" opacity="0.9"/>
      <rect x="102" y="144" width="196" height="272" fill="url(#sheen)"/>
    </g>
    <rect x="103.5" y="145.5" width="193" height="269" rx="38.5" fill="none" stroke="url(#edge)" stroke-width="3"/>
  </g>`;
}

const background = (rx) => `
  <defs><linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${INK_TOP}"/><stop offset="1" stop-color="${INK_BOTTOM}"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="${rx}" fill="url(#ink)"/>`;

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${body}</svg>`;

const icons = [
  // "any": rounded square with transparent corners (desktop taskbar, start menu).
  { file: 'icon-512.png', size: 512, body: background(112) + mark(1) },
  { file: 'icon-192.png', size: 192, body: background(112) + mark(1) },
  // "maskable": full bleed, mark inside the 80 % safe circle.
  { file: 'icon-maskable-512.png', size: 512, body: background(0) + mark(0.84) },
  // iOS masks the corners itself and needs an opaque square.
  { file: 'apple-touch-icon.png', size: 180, body: background(0) + mark(0.92) },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const icon of icons) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(icon.body).replace('width="512" height="512"', `width="${icon.size}" height="${icon.size}"`)}</body></html>`,
  );
  await page.screenshot({
    path: `public/icons/${icon.file}`,
    omitBackground: true,
    clip: { x: 0, y: 0, width: icon.size, height: icon.size },
  });
  console.log(`public/icons/${icon.file}`);
}
await browser.close();

// Favicon: flat mark that follows the browser's color scheme.
writeFileSync(
  'public/icons/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>.front{fill:#0A0B10;stroke:#F4F4F7}@media (prefers-color-scheme:dark){.front{fill:#F4F4F7;stroke:#0A0B10}}</style>
  <rect x="12" y="3" width="16" height="22" rx="4.5" fill="${ACCENT}"/>
  <rect class="front" x="4" y="7" width="16" height="22" rx="4.5" stroke-width="2"/>
</svg>
`,
);
console.log('public/icons/favicon.svg');
