import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// Several sets and their prints (the Mega Evolution series, ADR-051–053).

// The service worker would fetch card pictures itself once it controls the page, past the
// fixtures' picture stubs; the PWA spec covers it.
test.use({ serviceWorkers: 'block' });

/** "In deiner Sammlung" on card pages. */
const holdings = (page: Page) => page.getByRole('region', { name: /In deiner Sammlung/ });
/** The current price with its series selectors and the Cardmarket link. */
const prices = (page: Page) => page.getByRole('region', { name: /Aktueller Preis/ });

test('an expansion with two Japanese prints, and counterparts in their own sets', async ({
  page,
}) => {
  await page.goto('/catalog/sets/intl:me01');
  await expect(page.getByRole('heading', { name: 'Mega-Entwicklung', level: 2 })).toBeVisible();
  const prints = page.getByRole('navigation', { name: 'Druck' });
  await expect(prints.getByRole('link')).toHaveText(['International', 'Asien M1L', 'Asien M1S']);
  await prints.getByRole('link', { name: 'Asien M1S' }).click();
  await expect(page).toHaveURL(/\/catalog\/sets\/asia:M1S$/);
  await expect(page.getByRole('heading', { name: 'Mega Symphonia', level: 2 })).toBeVisible();
  await expect(prints.getByRole('link', { name: 'Asien M1S' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  // A Japanese card links to the international card with the same artwork, in that card's set.
  await page.goto('/catalog/sets/asia:M1S/cards/asia:M1S:001');
  await page.getByRole('link', { name: 'Im Set Mega-Entwicklung ansehen' }).click();
  await expect(page).toHaveURL(/\/catalog\/sets\/intl:me01\/cards\/intl:me01:006$/);
  // Internationally, the Phantasmal Flames blister Pokémon are promos.
  await page.goto('/catalog/sets/asia:M2/cards/asia:M2:037');
  await expect(
    page.getByRole('link', { name: 'Im Set Mega-Entwicklung Promos ansehen' }),
  ).toBeVisible();
});

test('a card in several variants: add the reverse holo, Cardmarket shows reverse holos', async ({
  page,
}) => {
  await page.goto('/catalog/sets/intl:me01/cards/intl:me01:001');
  await holdings(page).getByRole('button', { name: 'Hinzufügen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Karte hinzufügen' });
  const variants = sheet.getByRole('radiogroup', { name: 'Variante' });
  await expect(variants.getByRole('radio')).toHaveText([
    'Normal',
    'Reverse-Holo',
    'Liga-Reverse-Holo · Pokémon Day (30 Jahre)',
  ]);
  await variants.getByRole('radio', { name: 'Reverse-Holo', exact: true }).click();
  await sheet.getByLabel('Kaufpreis').fill('0,50');
  await sheet.getByLabel('Kaufpreis').press('Enter');
  await expect(
    page.getByText(/^Hinzugefügt: 001\/132 Bisasam · Reverse-Holo · DE · NM$/),
  ).toBeVisible();
  await expect(holdings(page)).toContainText('Reverse-Holo');

  // The reverse holo is sold on the card's own product, filtered to reverse holos.
  const cardmarket = prices(page).getByRole('link', { name: /Auf Cardmarket öffnen/ });
  await expect(cardmarket).not.toHaveAttribute('href', /isReverseHolo/);
  await prices(page)
    .getByRole('radiogroup', { name: 'Variante' })
    .getByRole('radio', { name: 'Reverse-Holo', exact: true })
    .click();
  await expect(cardmarket).toHaveAttribute('href', /idProduct=851072&.*isReverseHolo=Y/);

  // The Sammlung names the variant, because the card has several.
  await page.goto('/collection/cards');
  await expect(page.getByRole('main')).toContainText('Reverse-Holo');
});

test('a Japanese reverse holo is a product of its own: no reverse-holo filter', async ({
  page,
}) => {
  await page.goto('/catalog/sets/asia:M2a/cards/asia:M2a:001?lang=ja');
  await holdings(page).getByRole('button', { name: 'Hinzufügen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Karte hinzufügen' });
  await sheet
    .getByRole('radiogroup', { name: 'Variante' })
    .getByRole('radio', { name: 'Reverse-Holo', exact: true })
    .click();
  await sheet.getByLabel('Kaufpreis').press('Enter');
  await expect(page.getByText(/^Hinzugefügt: 001\/193 .* · Reverse-Holo · JA · NM$/)).toBeVisible();
  await prices(page)
    .getByRole('radiogroup', { name: 'Variante' })
    .getByRole('radio', { name: 'Reverse-Holo', exact: true })
    .click();
  const cardmarket = prices(page).getByRole('link', { name: /Auf Cardmarket öffnen/ });
  await expect(cardmarket).toHaveAttribute('href', /idProduct=861527&language=7/);
  await expect(cardmarket).not.toHaveAttribute('href', /isReverseHolo/);
});
