import type { Locator, Page } from '@playwright/test';
import { expect, pageTitle, test } from './fixtures';

/** Money as Settr writes it, `34,90 €` with a no-break space; `amount` is a regex source. */
const eur = (amount: string) => new RegExp(`${amount}\\s€`);
const stat = (page: Page, label: string) => page.locator(`dt:text-is("${label}") + dd`);
const holdings = (page: Page) => page.getByRole('region', { name: /In deiner Sammlung/ });

/** Tab until `target` has focus (at most 40 steps), as a keyboard user would. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test.describe('without the service worker', () => {
  // The service worker would fetch the price guide and pictures itself, past the fixture's stubs.
  test.use({ serviceWorkers: 'block' });

  test('journey 5: a sealed product with its price shows the P/L (QUALITY.md §2.1)', async ({
    page,
  }) => {
    await page.goto('/catalog/sealed/intl:30th-etb');
    await holdings(page).getByRole('button', { name: 'Hinzufügen' }).click();
    const add = page.getByRole('dialog', { name: 'Sealed hinzufügen' });
    await expect(add.getByLabel('Kaufpreis')).toBeFocused();
    await page.keyboard.type('55');
    await page.keyboard.press('Enter');
    await expect(add).toBeHidden();

    await page.getByLabel('Neuer Preis').fill('69,9');
    await page.getByLabel('Neuer Preis').press('Enter');
    await expect(page.getByRole('region', { name: 'Aktueller Preis' })).toContainText(eur('69,90'));
    // 69,90 € against 55,00 € paid
    await expect(holdings(page)).toContainText(eur('\\+14,90'));

    await page.goto('/collection/sealed');
    await expect(stat(page, 'Wert')).toHaveText(eur('69,90'));
    await expect(stat(page, 'Investiert')).toContainText(eur('55,00'));
    await expect(stat(page, 'Gewinn/Verlust')).toContainText(eur('\\+14,90'));
    await page.goto('/');
    await expect(page.getByRole('region', { name: /^Gesamtwert/ })).toContainText(eur('69,90'));
  });

  test('journey 10: keyboard only, a card with a price, then the price session (UX §7)', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'a keyboard journey');
    await page.goto('/');
    await expect(pageTitle(page)).toHaveText('Übersicht'); // the shortcuts are listening

    // N: the add palette; a name, Enter picks the first card and opens its sheet
    await page.keyboard.press('n');
    await expect(page.getByRole('dialog', { name: 'Hinzufügen' })).toBeVisible();
    await expect(page.getByRole('combobox')).toBeFocused();
    await page.keyboard.type('pikachu ex 150');
    await expect(page.getByRole('option').first()).toContainText('Pikachu-ex');
    await page.keyboard.press('Enter');
    const add = page.getByRole('dialog', { name: 'Karte hinzufügen' });
    await expect(add.getByLabel('Kaufpreis')).toBeFocused();
    await page.keyboard.type('26');
    await page.keyboard.press('Enter');
    await expect(add).toBeHidden();

    // / finds the card again, Enter opens it, P records today's price
    await page.keyboard.press('/');
    await expect(page.getByRole('combobox', { name: 'Suche' })).toBeFocused();
    await page.keyboard.type('pikachu ex 150');
    await expect(page.getByRole('option').first()).toContainText('Pikachu-ex');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cards\/intl:30th:150/);
    await expect(page.getByRole('heading', { name: 'Pikachu-ex', level: 2 })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Suche' })).toBeHidden();
    await page.keyboard.press('p');
    await expect(page.getByLabel('Neuer Preis')).toBeFocused();
    await page.keyboard.type('34,9');
    await page.keyboard.press('Enter');
    await expect(holdings(page)).toContainText(eur('\\+8,90'));

    // Strg K works from inside a field; N on a card page adds that card
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('combobox', { name: 'Suche' })).toBeFocused();
    await page.keyboard.type('pikachu 25');
    await expect(page.getByRole('option').first()).toContainText('025/128');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/cards\/intl:30th:025/);
    await expect(
      page.getByRole('heading', { name: 'Pikachu', exact: true, level: 2 }),
    ).toBeVisible();
    // The palette hands focus to the new page (not back to the old field) once it has closed
    await expect
      .poll(() =>
        page.evaluate(() => document.getElementById('main')?.contains(document.activeElement)),
      )
      .toBe(true);
    await page.keyboard.press('n');
    const second = page.getByRole('dialog', { name: 'Karte hinzufügen' });
    await expect(second.getByLabel('Kaufpreis')).toBeFocused();
    await page.keyboard.type('1');
    await page.keyboard.press('Enter');
    await expect(second).toBeHidden();

    // G P: Preise; Tab to the session, which starts with the card that has no price
    await page.keyboard.press('g');
    await page.keyboard.press('p');
    await expect(pageTitle(page)).toHaveText('Preise');
    await tabTo(page, page.getByRole('button', { name: 'Preis-Session starten' }));
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Neuer Preis')).toBeFocused();
    await page.keyboard.type('1,5');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Geschafft' })).toBeVisible();
    await expect(page.getByText('1 Preis eingetragen')).toBeVisible();
    await tabTo(page, page.getByRole('button', { name: 'Fertig' }));
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/prices$/);
  });
});
