import { AxeBuilder } from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

/** 1×1 transparent GIF: stands in for card and product pictures. */
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Every test fails on console errors, uncaught exceptions and CSP violations (reported or not): the
 * preview server sends the production CSP (vite.config.ts), so a blocked script or style shows up
 * here first.
 * Pictures from TCGdex and the TCGplayer proxy are stubbed, so tests never depend on other hosts.
 */
export const test = base.extend<{ problems: string[]; pictures: void }>({
  pictures: [
    async ({ context }, use) => {
      const stub = { status: 200, contentType: 'image/gif', body: PIXEL };
      await context.route('https://assets.tcgdex.net/**', (route) =>
        route.fulfill({ ...stub, headers: { 'access-control-allow-origin': '*' } }),
      );
      await context.route('**/img/tcgp/**', (route) => route.fulfill(stub));
      await use();
    },
    { auto: true },
  ],
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        // A failed load names no URL in its text; the location does.
        if (msg.type() === 'error') problems.push(`console: ${msg.text()} (${msg.location().url})`);
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
      // A violation the page catches itself (e.g. an eval probe) never reaches the console in
      // Chromium or WebKit; the event does, in every browser.
      await page.exposeBinding('settrCspViolation', (_source, text: string) => {
        problems.push(`csp: ${text}`);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (window as unknown as { settrCspViolation: (text: string) => void })
            .settrCspViolation;
          report(
            `${event.violatedDirective} ${event.blockedURI} (${event.sourceFile}:${event.lineNumber})`,
          );
        });
      });
      await use(problems);
      expect(problems, 'console errors, exceptions or CSP violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Waits for fonts and running (finite) animations, e.g. the toast that appears once the service
 * worker has cached the app. Axe measures contrast mid-fade otherwise.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const finite = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity);
    await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
  });
}

/** WCAG 2.2 A/AA checks with axe; returns violations as readable strings. */
export async function axeViolations(page: Page): Promise<string[]> {
  await settle(page);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return result.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

/** The toolbar's page title (h1). */
export const pageTitle = (page: Page) => page.getByRole('heading', { level: 1 });

/** Adds lots to 30 Jahre through Schnellerfassung (COL-06): `25`, `25x3`, `25 4,50`. */
export async function quickAdd(page: Page, entries: readonly string[], language?: 'EN') {
  await page.goto('/catalog/sets/intl:30th');
  await page.getByRole('button', { name: 'Schnellerfassung' }).click();
  const sheet = page.getByRole('dialog', { name: 'Schnellerfassung' });
  if (language) await sheet.getByRole('radio', { name: language }).click();
  const input = sheet.getByLabel('Kartennummer');
  for (const entry of entries) {
    await input.fill(entry);
    await expect(sheet.getByText(/^⏎ fügt hinzu:/)).toBeVisible();
    await input.press('Enter');
    await expect(input).toHaveValue('');
  }
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
}
