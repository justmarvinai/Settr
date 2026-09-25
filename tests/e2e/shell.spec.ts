import { expect, pageTitle, test } from './fixtures';

test('loads the overview, noindex and German', async ({ page }) => {
  await page.goto('/');
  await expect(pageTitle(page)).toHaveText('Übersicht');
  await expect(page).toHaveTitle('Übersicht · Settr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', { name: 'Willkommen bei Settr' })).toBeVisible();
});

test('navigates between areas', async ({ page, isMobile }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' }).locator('visible=true');
  await nav.getByRole('link', { name: 'Sammlung' }).click();
  await expect(page).toHaveURL(/\/collection\/cards$/);
  await expect(pageTitle(page)).toHaveText('Sammlung');
  await page.getByRole('link', { name: 'Sealed' }).click();
  await expect(page).toHaveURL(/\/collection\/sealed$/);
  await nav.getByRole('link', { name: 'Katalog' }).click();
  await expect(pageTitle(page)).toHaveText('Katalog');
  await nav.getByRole('link', { name: 'Preise' }).click();
  await expect(pageTitle(page)).toHaveText('Preise');
  if (isMobile) {
    // Phones reach Portfolio and Einstellungen through "Mehr" (UX_SPEC.md §3.3).
    await page.getByRole('button', { name: 'Mehr' }).click();
    await page
      .getByRole('dialog', { name: 'Mehr' })
      .getByRole('link', { name: 'Portfolio' })
      .click();
    await expect(pageTitle(page)).toHaveText('Portfolio');
    await page.getByRole('button', { name: 'Mehr' }).click();
    await page
      .getByRole('dialog', { name: 'Mehr' })
      .getByRole('link', { name: 'Einstellungen' })
      .click();
  } else {
    await nav.getByRole('link', { name: 'Portfolio' }).click();
    await expect(pageTitle(page)).toHaveText('Portfolio');
    await nav.getByRole('link', { name: 'Einstellungen' }).click();
  }
  await expect(pageTitle(page)).toHaveText('Einstellungen');
  await expect(page.getByRole('dialog', { name: 'Mehr' })).toHaveCount(0); // the sheet closes on navigation
});

test('deep links and unknown routes', async ({ page }) => {
  await page.goto('/settings/about');
  await expect(page.getByRole('heading', { name: 'Settr', level: 2 })).toBeVisible();
  await page.goto('/gibt-es-nicht');
  await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
  await page.getByRole('link', { name: 'Zur Übersicht', exact: true }).click();
  await expect(pageTitle(page)).toHaveText('Übersicht');
});

test('theme toggle applies instantly and survives a reload without flashing', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'phones switch the theme in Einstellungen › Darstellung');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Dunkles Design' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  // Stored: the label follows the stored settings. A reload before the write commits would lose it.
  await expect(page.getByRole('button', { name: 'Helles Design' })).toBeVisible();
  // The inline script must apply the stored theme before the app boots.
  await page.reload({ waitUntil: 'commit' });
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark');
  await expect(page.getByRole('button', { name: 'Helles Design' })).toBeVisible();
});

test('appearance settings: theme, transparency and motion', async ({ page }) => {
  await page.goto('/settings/appearance');
  const html = page.locator('html');
  await page.getByRole('radio', { name: 'Dunkel' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('switch', { name: 'Transparenz reduzieren' }).click();
  await expect(html).toHaveAttribute('data-transparency', 'reduced');
  await page.getByRole('radio', { name: 'Aus' }).click();
  await expect(html).toHaveAttribute('data-motion', 'off');
  // Stored: the controls follow the stored settings. A reload before the write commits would lose it.
  await expect(page.getByRole('radio', { name: 'Aus' })).toBeChecked();
  await page.reload();
  await expect(html).toHaveAttribute('data-transparency', 'reduced');
  await expect(page.getByRole('radio', { name: 'Aus' })).toBeChecked();
});

test('privacy mode hides amounts and is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Beträge verbergen' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-privacy', 'on');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-privacy', 'on');
  await page.getByRole('button', { name: 'Beträge anzeigen' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-privacy', 'on');
});

test('card languages keep at least one language', async ({ page }) => {
  await page.goto('/settings');
  const group = page.getByRole('group', { name: 'Kartensprachen' });
  for (const name of [
    'Englisch',
    'Japanisch',
    'Chinesisch (vereinfacht)',
    'Chinesisch (traditionell)',
  ]) {
    await group.getByRole('button', { name }).click();
  }
  await expect(group.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await group.getByRole('button', { name: 'Deutsch' }).click(); // the last one can't be removed
  await expect(group.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('search opens with Ctrl+K and closes with Escape', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard shortcut is a desktop feature');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Übersicht'); // app is interactive
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Suche' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
