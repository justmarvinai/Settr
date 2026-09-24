import { expect, test } from './fixtures';

test('manifest is valid and installable', async ({ page, request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    lang: string;
    display: string;
    icons: { src: string; purpose?: string }[];
  };
  expect(manifest).toMatchObject({ name: 'Settr', lang: 'de', display: 'standalone' });
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'Playwright cannot emulate offline service workers in WebKit',
  );
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  // What the page still loads (the catalog manifest, lazy chunks) must land in the cache first
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Übersicht');
  await page.goto('/settings/data'); // client-side routes fall back to the cached app shell
  await expect(page.getByRole('heading', { name: 'Speicher' })).toBeVisible();
  await context.setOffline(false);
});

test('storage section reports persistence', async ({ page }) => {
  await page.goto('/settings/data');
  await expect(page.getByTestId('storage-status')).toHaveText(/dauerhaft gespeichert/i);
});
