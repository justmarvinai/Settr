import type { CDPSession, Page } from '@playwright/test';
import { expect, test } from './fixtures';

// The service worker would fetch card pictures itself once it controls the page, past the
// fixtures' picture stubs; the PWA spec covers it.
test.use({ serviceWorkers: 'block' });

/** Records how each view transition ends (DSN-02). */
async function watchTransitions(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate(() => {
    const log: string[] = [];
    (window as unknown as { transitions: string[] }).transitions = log;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((update: Parameters<typeof start>[0]) => {
      const transition = start(update);
      transition.ready.catch((error: unknown) => log.push(`skipped: ${String(error)}`));
      transition.finished.then(
        () => log.push('finished'),
        () => undefined,
      );
      return transition;
    }) as typeof document.startViewTransition;
  });
  return () => page.evaluate(() => (window as unknown as { transitions: string[] }).transitions);
}

/** A finger on the screen, through the DevTools protocol (Chromium only). */
function finger(cdp: CDPSession) {
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }],
    });
  return {
    async hold(x: number, y: number, ms: number) {
      await send('touchStart', x, y);
      await new Promise((resolve) => setTimeout(resolve, ms));
      await send('touchEnd');
    },
    async swipe(fromX: number, toX: number, y: number) {
      await send('touchStart', fromX, y);
      for (let i = 1; i <= 8; i++) await send('touchMove', fromX + ((toX - fromX) * i) / 8, y);
      await send('touchEnd');
    },
  };
}

test('progress rings follow the collection on the set, the Sets page and the sidebar (DSN-03)', async ({
  page,
  isMobile,
}) => {
  await page.goto('/catalog/sets/intl:30th');
  await page.getByRole('button', { name: '025/128 Pikachu hinzufügen' }).click();
  // 1 of the 128 Basis cards
  await expect(page.getByRole('main').locator('.progress-ring').first()).toHaveAttribute(
    'style',
    /--ring-value: 0\.0078/,
  );
  await page.goto('/catalog');
  await expect(page.getByText('1 von 128 Karten')).toBeVisible();
  if (!isMobile) {
    const sidebarSet = page.getByRole('link', { name: /^30 Jahre, Deutsch, Basis/ });
    await expect(sidebarSet).toBeVisible();
    await sidebarSet.click();
    await expect(page).toHaveURL(/\/catalog\/sets\/intl:30th\?lang=de$/);
  }
});

test('a tile morphs into the card page and back, and the card leans (DSN-01, DSN-02)', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(browserName !== 'chromium' || isMobile, 'one engine with view-transition types');
  await page.goto('/catalog/sets/intl:30th');
  const transitions = await watchTransitions(page);
  await page.getByRole('link', { name: /^150\/128, Pikachu-ex/ }).click();
  await expect(page.getByRole('heading', { name: 'Pikachu-ex', level: 2 })).toBeVisible();
  await expect.poll(transitions).toEqual(['finished']);

  // The picture leans towards the pointer and opens fullscreen
  const open = page.getByRole('button', { name: 'Pikachu-ex im Vollbild anzeigen' });
  const box = await open.boundingBox();
  if (!box) throw new Error('no card picture');
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.2, { steps: 6 });
  await expect(page.locator('.holo-card')).toHaveAttribute('style', /rotateX/);
  await open.click();
  const fullscreen = page.getByRole('dialog', { name: 'Pikachu-ex, 150/128' });
  await expect(fullscreen).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(fullscreen).toBeHidden();
  await expect(open).toBeFocused();

  // Back to the grid morphs as well (a back navigation, typed as a card morph)
  await page.goBack();
  await expect(page.getByRole('heading', { name: '30 Jahre', level: 2 })).toBeVisible();
  await expect.poll(transitions).toEqual(['finished', 'finished']);
});

test('phone: a long press opens the tile menu, a swipe turns the card (UX §4.3, §4.4)', async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(!isMobile || browserName !== 'chromium', 'touch through the DevTools protocol');
  const touch = finger(await context.newCDPSession(page));
  await page.goto('/catalog/sets/intl:30th');
  const tile = page.getByRole('link', { name: /^025\/128, Pikachu/ });
  await tile.scrollIntoViewIfNeeded();
  const box = await tile.boundingBox();
  if (!box) throw new Error('no tile');
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 3];

  // A tap still opens the card; a long press opens the menu instead
  await touch.hold(x, y, 750);
  const menu = page.getByRole('dialog', { name: '025/128 Pikachu' });
  await expect(menu).toBeVisible();
  await expect(page).toHaveURL(/\/catalog\/sets\/intl:30th$/);
  await menu.getByRole('button', { name: 'Hinzufügen …' }).click();
  const addSheet = page.getByRole('dialog', { name: 'Karte hinzufügen' });
  await expect(addSheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(addSheet).toBeHidden();

  await touch.hold(x, y, 750);
  await menu.getByRole('link', { name: 'Details' }).click();
  await expect(page).toHaveURL(/\/cards\/intl:30th:025\?lang=de$/);

  // Swipes on the picture turn the card; the lift opens nothing
  const stage = page.locator('.holo-stage').first();
  const art = await stage.boundingBox();
  if (!art) throw new Error('no card picture');
  const middle = art.y + Math.min(art.height / 2, 300);
  await touch.swipe(art.x + art.width * 0.85, art.x + art.width * 0.15, middle);
  await expect(page).toHaveURL(/\/cards\/intl:30th:026\?lang=de$/);
  await touch.swipe(art.x + art.width * 0.15, art.x + art.width * 0.85, middle);
  await expect(page).toHaveURL(/\/cards\/intl:30th:025\?lang=de$/);
  await expect(page.getByRole('dialog', { name: /im Vollbild|Pikachu, 025/ })).toHaveCount(0);
});
