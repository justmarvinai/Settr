/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const isTest = process.env.VITEST === 'true';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};
// Vercel and GitHub Actions expose the commit; locally the version alone is enough.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? '').slice(0, 7);
const appVersion = commit ? `${pkg.version} (${commit})` : pkg.version;

// `vite preview` sends the production security headers (CSP etc.), so e2e tests catch CSP breakage.
interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[];
}
const vercel = JSON.parse(
  readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'),
) as VercelConfig;
const securityHeaders = Object.fromEntries(
  (vercel.headers.find((rule) => rule.source === '/(.*)')?.headers ?? []).map((h) => [
    h.key,
    h.value,
  ]),
);

const tcgplayerProxy = {
  target: 'https://tcgplayer-cdn.tcgplayer.com',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/img\/tcgp/, ''),
};

export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: './src/i18n/project.inlang',
      outdir: './src/i18n/paraglide',
      emitTsDeclarations: true,
      strategy: ['baseLocale'],
    }),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    !isTest &&
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['robots.txt', 'icons/favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Settr',
          short_name: 'Settr',
          description: 'Jede Karte zählt.',
          lang: 'de',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#F4F4F7',
          theme_color: '#F4F4F7',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: [
            '**/*.{js,css,html,svg,png,webmanifest}',
            'assets/*latin-standard-normal*.woff2',
            'assets/geist-mono-latin-wght-normal*.woff2',
          ],
          // Noto CJK @font-face rules load on demand (DESIGN_SYSTEM.md §4); precaching them would make
          // every install download ~450 KB for languages it may never show.
          globIgnores: ['**/assets/ja-*.css', '**/assets/zh-cn-*.css', '**/assets/zh-tw-*.css'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/catalog\/v1\//, /^\/img\//],
          cleanupOutdatedCaches: true,
          // Catalog and pictures at runtime (ARCHITECTURE.md §8.1). Hashed catalog files carry
          // their hash in the query, so CacheFirst never serves an outdated chunk.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname === '/catalog/v1/manifest.json',
              handler: 'NetworkFirst',
              options: { cacheName: 'catalog-manifest', networkTimeoutSeconds: 3 },
            },
            {
              // The price guide changes daily (PRC-09): shown from the cache, refreshed behind.
              urlPattern: ({ url }) => url.pathname === '/catalog/v1/cm-prices.json',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'price-guide', cacheableResponse: { statuses: [200] } },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/catalog/v1/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'catalog-files',
                expiration: { maxEntries: 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // CJK font rules and slices load on demand, so they're cached when first used.
              urlPattern: ({ url }) =>
                url.origin === self.location.origin &&
                url.pathname.startsWith('/assets/') &&
                (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.css')),
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: { maxEntries: 400 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // CORS mode only (crossorigin="anonymous"): opaque responses cost ~7 MB of quota each.
              urlPattern: ({ url }) =>
                url.origin === 'https://assets.tcgdex.net' || url.pathname.startsWith('/img/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 3000, maxAgeSeconds: 180 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [200] },
              },
            },
          ],
        },
      }),
  ],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2023',
    // Fonts stay files: the CSP allows font-src 'self' only, not data: URIs (small CJK slices).
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
  // Same-origin proxy for TCGplayer's sealed pictures, like the rewrite in vercel.json.
  server: { proxy: { '/img/tcgp': tcgplayerProxy } },
  preview: {
    headers: securityHeaders,
    proxy: { '/img/tcgp': tcgplayerProxy },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts', 'tests/unit/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['./tests/setup.ts'],
        },
      },
      {
        // Components in a real browser (QUALITY.md §2). CHROMIUM_PATH: the sandbox's own Chromium.
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./tests/setup-browser.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: process.env.CHROMIUM_PATH
                ? { executablePath: process.env.CHROMIUM_PATH }
                : {},
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
