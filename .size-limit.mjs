// Performance budgets (docs/QUALITY.md §4, ADR-030). Run after `pnpm build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';

const html = readFileSync('dist/index.html', 'utf8');
// Entry script + its modulepreloads: the JS every first visit downloads before the first render.
const initial = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(
  (match) => `dist/${match[1]}`,
);
const lazy = readdirSync('dist/assets')
  .map((file) => `dist/assets/${file}`)
  .filter(
    (file) => file.endsWith('.js') && !initial.includes(file) && statSync(file).size > 10_000,
  );

export default [
  { name: 'Initial JS (entry + modulepreloads)', path: initial, gzip: true, limit: '220 kB' },
  ...lazy.map((file) => ({
    name: `Lazy chunk ${file.slice(12)}`,
    path: file,
    gzip: true,
    limit: '80 kB',
  })),
  { name: 'CSS', path: 'dist/assets/*.css', gzip: true, limit: '35 kB' },
  {
    name: 'Fonts on first render (Mona Sans + Geist Mono, latin)',
    path: [
      'dist/assets/mona-sans-latin-standard-normal-*.woff2',
      'dist/assets/geist-mono-latin-wght-normal-*.woff2',
    ],
    brotli: false,
    limit: '125 kB',
  },
];
