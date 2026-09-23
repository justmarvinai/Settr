import { AxeBuilder } from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

/**
 * Every test fails on console errors, uncaught exceptions and CSP violations: the preview server
 * sends the production CSP (vite.config.ts), so a blocked script or style shows up here first.
 */
export const test = base.extend<{ problems: string[] }>({
  problems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
      });
      page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
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
