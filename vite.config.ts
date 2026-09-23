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
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/catalog\//, /^\/img\//],
          cleanupOutdatedCaches: true,
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
  },
  preview: {
    headers: securityHeaders,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
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
