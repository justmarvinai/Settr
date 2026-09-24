import { expect, quickAdd, test } from './fixtures';

// The service worker fetches pictures itself, past the fixture's stubs: the picture host points
// at a closed local port instead, so the journey never leaves the machine (pictures stay empty).
test.skip(({ browserName }) => browserName !== 'chromium', 'service workers in Chromium');
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--host-resolver-rules=MAP assets.tcgdex.net 127.0.0.1:9'],
  },
});

test('journey 9: offline, Settr still navigates, adds a lot and reloads (QUALITY.md §2.1)', async ({
  page,
  context,
  problems,
}) => {
  await quickAdd(page, ['150']);
  // Installed means precached; after a reload the service worker answers every request.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await expect(
    page.getByRole('link', { name: /^150\/128, Pikachu-ex, .*1 im Besitz/ }),
  ).toBeVisible();

  await page.waitForLoadState('networkidle'); // everything the page loads is cached first
  await context.setOffline(true);
  await expect(page.getByText('Offline · alles funktioniert')).toBeVisible();
  await page.getByRole('link', { name: 'Sammlung', exact: true }).first().click();
  await expect(page).toHaveURL(/\/collection\/cards/);
  await expect(page.getByRole('link', { name: /Pikachu-ex/ }).first()).toBeVisible();
  await page.goBack();
  await page.getByRole('button', { name: '025/128 Pikachu hinzufügen' }).click();
  await expect(page.getByText(/^Hinzugefügt: 025\/128 Pikachu/)).toBeVisible();

  // A reload without a network: the service worker serves the app, the catalog and the lots
  await page.reload();
  await expect(page.getByRole('link', { name: /^025\/128, Pikachu, .*1 im Besitz/ })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Offline · alles funktioniert')).toBeHidden();

  // Pictures that can't load and requests that had to fail offline aren't app errors
  const expected = /assets\.tcgdex\.net|ERR_INTERNET_DISCONNECTED/;
  const errors = problems.filter((problem) => !expected.test(problem));
  problems.splice(0, problems.length, ...errors);
});
