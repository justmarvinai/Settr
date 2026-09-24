import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Third-party notices (APP-08): the license texts of everything the app ships to the browser, so
 * MIT, Apache-2.0 and OFL notices travel with the code as they require. Built from the runtime
 * dependency tree of package.json (workers included, which the main bundle doesn't see) plus the
 * packages that inject code at build time: Tailwind's base styles, Paraglide's runtime and
 * Workbox in the service worker. Emitted as `licenses.txt`, linked from *Einstellungen › Über*.
 */

interface Manifest {
  name: string;
  version: string;
  license?: string | { type: string };
  author?: string | { name: string };
  homepage?: string;
  dependencies?: Record<string, string>;
}

/**
 * Packages that don't show up in `dependencies` but put code into the build. Tailwind and Paraglide
 * inject only their own code (base styles, the message runtime), so their dependencies (the
 * compilers) stay out; Workbox's service-worker modules bring theirs.
 */
const INJECTED = ['tailwindcss', '@inlang/paraglide-js'];
const SERVICE_WORKER = [
  'workbox-core',
  'workbox-precaching',
  'workbox-routing',
  'workbox-strategies',
  'workbox-expiration',
  'workbox-cacheable-response',
];

function manifestDir(name: string, from: string): string | undefined {
  try {
    const require = createRequire(join(from, 'package.json'));
    return dirname(realpathSync(require.resolve(`${name}/package.json`)));
  } catch {
    // Not resolvable from here (e.g. an optional or exports-hidden package.json)
  }
  // pnpm: a package's own dependencies sit next to it in node_modules
  for (let dir = from; dir !== dirname(dir); dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name, 'package.json');
    if (existsSync(candidate)) return dirname(realpathSync(candidate));
  }
  return undefined;
}

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as Manifest;
}

function licenseText(dir: string): string | undefined {
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
  return file ? readFileSync(join(dir, file), 'utf8').trim() : undefined;
}

function licenseId(manifest: Manifest): string {
  const license = manifest.license;
  if (!license) return 'UNKNOWN';
  return typeof license === 'string' ? license : license.type;
}

/** Walks the runtime dependency tree from the project root; one entry per package and version. */
export function thirdPartyPackages(root: string): { dir: string; manifest: Manifest }[] {
  const project = readManifest(root);
  const found = new Map<string, { dir: string; manifest: Manifest }>();
  const pending: { name: string; from: string; leaf?: boolean }[] = [
    ...Object.keys(project.dependencies ?? {}).map((name) => ({ name, from: root })),
    ...SERVICE_WORKER.map((name) => ({ name, from: root })),
    ...INJECTED.map((name) => ({ name, from: root, leaf: true })),
  ];
  // Workbox comes in through vite-plugin-pwa's workbox-build
  const pwa = manifestDir('vite-plugin-pwa', root);
  const workboxBuild = pwa ? manifestDir('workbox-build', pwa) : undefined;
  for (const item of pending) {
    const dir =
      manifestDir(item.name, item.from) ??
      (workboxBuild ? manifestDir(item.name, workboxBuild) : undefined);
    if (!dir) continue;
    const manifest = readManifest(dir);
    const key = `${manifest.name}@${manifest.version}`;
    if (found.has(key)) continue;
    found.set(key, { dir, manifest });
    if (item.leaf) continue;
    for (const name of Object.keys(manifest.dependencies ?? {})) pending.push({ name, from: dir });
  }
  return [...found.values()].toSorted((a, b) => a.manifest.name.localeCompare(b.manifest.name));
}

const RULE = '='.repeat(78);
/** Written as a code point: the formatter would turn an escape into the invisible character. */
const BOM = String.fromCodePoint(0xfeff);

export function thirdPartyNotices(root: string): string {
  const packages = thirdPartyPackages(root);
  const header = [
    'Settr – Lizenzen der verwendeten Open-Source-Software',
    'Third-party software notices',
    '',
    ...packages.map(
      ({ manifest }) => `- ${manifest.name} ${manifest.version} (${licenseId(manifest)})`,
    ),
  ].join('\n');
  const texts = packages.map(({ dir, manifest }) => {
    const text =
      licenseText(dir) ?? `License: ${licenseId(manifest)} (no license file in the package)`;
    return [RULE, `${manifest.name} ${manifest.version}`, RULE, '', text].join('\n');
  });
  // The BOM makes browsers read the file as UTF-8 even when the server names no charset.
  return `${BOM}${[header, ...texts].join('\n\n')}\n`;
}

/** Vite: writes `licenses.txt` next to index.html in production builds. */
export function licensesPlugin(root: string): Plugin {
  return {
    name: 'settr:licenses',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'licenses.txt', source: thirdPartyNotices(root) });
    },
  };
}
