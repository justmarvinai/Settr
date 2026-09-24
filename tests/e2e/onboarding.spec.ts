import { axeViolations, expect, quickAdd, test } from './fixtures';

// A new device: no onboarding done yet (APP-06, QUALITY.md §2.1 journey 1).
test.use({ onboarded: false, serviceWorkers: 'block' });

const eur = (amount: string) => new RegExp(`${amount}\\s€`);

test('first run: onboarding, open the set, add a card with a price, Übersicht shows it', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByRole('heading', { name: 'Willkommen bei Settr' })).toBeVisible();
  await expect(page.getByText('Schritt 1 von 3')).toBeVisible();

  // Step 1: German and English only.
  const languages = page.getByRole('group', { name: 'Welche Kartensprachen sammelst du?' });
  for (const name of ['Japanisch', 'Chinesisch (vereinfacht)', 'Chinesisch (traditionell)']) {
    await languages.getByRole('button', { name }).click();
  }
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Step 2: the data stays here; its heading takes focus.
  await expect(page.getByRole('heading', { name: 'Deine Daten bleiben bei dir' })).toBeFocused();
  await page.getByRole('button', { name: 'Dauerhaft speichern' }).click();
  await expect(
    page.getByText(/^Dauerhaft gespeichert$|^Der Browser hat noch nicht zugestimmt/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Step 3: German first, then into the set.
  await expect(page.getByRole('heading', { name: 'Los geht’s' })).toBeFocused();
  await expect(page.getByRole('radio', { name: 'Deutsch' })).toBeChecked();
  await page.getByRole('button', { name: '„30 Jahre“ öffnen' }).click();
  await expect(page).toHaveURL(/\/catalog\/sets\/intl:30th\?lang=de$/);

  // N on a tile opens the add sheet; a purchase price and Enter.
  const tile = page.getByRole('link', { name: /^150\/128, Pikachu-ex,/ });
  await tile.focus();
  await page.keyboard.press('n');
  const add = page.getByRole('dialog', { name: 'Karte hinzufügen' });
  await expect(add.getByLabel('Kaufpreis')).toBeFocused();
  await page.keyboard.type('26');
  await page.keyboard.press('Enter');
  await expect(add).toBeHidden();

  // P on the same tile: today's price.
  await tile.focus();
  await page.keyboard.press('p');
  const price = page.getByRole('dialog', { name: 'Preis eintragen' });
  await price.getByLabel('Neuer Preis').fill('34,9');
  await price.getByLabel('Neuer Preis').press('Enter');
  await expect(price).toBeHidden();

  // Übersicht: 34,90 € worth, 26,00 € paid, +8,90 €; the welcome doesn't come back.
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  const hero = page.getByRole('region', { name: /^Gesamtwert/ });
  await expect(hero).toContainText(eur('34,90'));
  await expect(hero).toContainText(eur('\\+8,90'));
});

test('Überspringen goes to Übersicht for good', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await expect(page.getByRole('heading', { name: 'Willkommen bei Settr', level: 2 })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});

test('a device that already has lots never sees the welcome', async ({ page }) => {
  await quickAdd(page, ['25']);
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('region', { name: /^Gesamtwert/ })).toBeVisible();
});

test('a backup instead: the last step leads to Backup einspielen', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Ich habe schon ein Backup' }).click();
  await expect(page).toHaveURL(/\/settings\/data#settings-import$/);
  await expect(page.getByRole('heading', { name: 'Backup einspielen' })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`onboarding has no WCAG A/AA violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/onboarding');
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Weiter' }).click();
    expect(await axeViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Weiter' }).click();
    expect(await axeViolations(page)).toEqual([]);
  });
}
