// Computes the CSP hashes of the inline scripts in index.html and checks (or, with --write, updates)
// the script-src directive in vercel.json. The inline script applies the theme before first paint.
// After a build it also checks dist/index.html, so a transform can't silently break the hash.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const inlineHashes = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`,
  );

const source = new URL('../index.html', import.meta.url);
const built = new URL('../dist/index.html', import.meta.url);
export const hashes = inlineHashes(source);

const vercelUrl = new URL('../vercel.json', import.meta.url);
const vercel = JSON.parse(readFileSync(vercelUrl, 'utf8'));
const cspHeader = vercel.headers
  .flatMap((h) => h.headers)
  .find((h) => h.key === 'Content-Security-Policy');
const expected = `script-src 'self' ${hashes.join(' ')}`;
const current = cspHeader.value
  .split(';')
  .map((d) => d.trim())
  .find((d) => d.startsWith('script-src'));

if (process.argv.includes('--write')) {
  cspHeader.value = cspHeader.value.replace(current, expected);
  writeFileSync(vercelUrl, `${JSON.stringify(vercel, null, 2)}\n`);
  console.log(`vercel.json updated: ${expected}`);
} else if (current !== expected) {
  console.error(
    `CSP mismatch.\n  vercel.json: ${current}\n  expected:    ${expected}\nRun: node scripts/csp-hash.mjs --write`,
  );
  process.exit(1);
} else if (existsSync(built) && inlineHashes(built).join(' ') !== hashes.join(' ')) {
  console.error('CSP mismatch: the inline scripts in dist/index.html differ from index.html.');
  process.exit(1);
} else {
  console.log(
    'CSP script hashes match index.html' + (existsSync(built) ? ' and dist/index.html' : ''),
  );
}
