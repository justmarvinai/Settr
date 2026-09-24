import { readFileSync } from 'node:fs';
import { expect, pageTitle, test } from './fixtures';

/** The catalog the build ships; counts come from it, so a new set doesn't break these tests. */
const sealed = JSON.parse(readFileSync('public/catalog/v1/sealed.json', 'utf8')) as {
  products: { type: string }[];
};
const count = (type: string) => sealed.products.filter((p) => p.type === type).length;

test('sets overview lists both prints and filters by print', async ({ page }) => {
  await page.goto('/catalog');
  await expect(pageTitle(page)).toHaveText('Katalog');
  await expect(page.getByRole('link', { name: /30 Jahre/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /30th CELEBRATION/ })).toBeVisible();
  await page.getByRole('radio', { name: 'Asien' }).click();
  await expect(page).toHaveURL(/print=asia/);
  await expect(page.getByRole('link', { name: /30 Jahre/ })).toBeHidden();
});

test('set page: sections, filters and search live in the URL', async ({ page }) => {
  await page.goto('/catalog/sets/intl:30th');
  await expect(page.getByRole('heading', { name: '30 Jahre', level: 2 })).toBeVisible();
  await expect(page).toHaveTitle('30 Jahre · Settr');
  for (const section of ['Hauptset', 'Secret Rares', 'Klassische Sammlung', 'Energien'])
    await expect(page.getByRole('heading', { name: new RegExp(section), level: 3 })).toBeVisible();

  await page
    .getByRole('combobox', { name: 'Seltenheit', exact: true })
    .selectOption({ label: 'Special Illustration Rare' });
  await expect(page).toHaveURL(/rarity=special-illustration-rare/);
  await expect(page.getByText(/^\d+ von 199 Karten$/)).toBeVisible();

  await page.getByRole('searchbox', { name: 'In diesem Set suchen' }).fill('pikachu');
  await expect(page).toHaveURL(/q=pikachu/);
  await expect(page.getByRole('link', { name: /^150\/128, Pikachu-ex/ })).toBeVisible();

  await page.getByRole('button', { name: 'Tabellenansicht' }).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.getByRole('table')).toBeVisible();
});

test('a subset opens as a section of its main set', async ({ page }) => {
  await page.goto('/catalog/sets/intl:30th-c');
  await expect(page).toHaveURL(/\/catalog\/sets\/intl:30th\?section=subset$/);
  await expect(page.getByText('30 von 199 Karten')).toBeVisible();
});

test('card page: names, Cardmarket link per language, prev/next', async ({ page }) => {
  await page.goto('/catalog/sets/intl:30th/cards/intl:30th:150');
  await expect(page.getByRole('heading', { name: 'Pikachu-ex', level: 2 })).toBeVisible();
  await expect(page).toHaveTitle('Pikachu-ex · 150/128 · Settr');
  const cardmarket = page.getByRole('link', { name: /Auf Cardmarket öffnen/ });
  await expect(cardmarket).toHaveAttribute(
    'href',
    /idProduct=\d+&language=3&sellerCountry=7&minCondition=2$/,
  );
  await page.getByRole('radio', { name: 'EN' }).click();
  await expect(cardmarket).toHaveAttribute('href', /&language=1&/);

  // Arrows inside the language switch pick a language; elsewhere they step through the set.
  const title = page.getByRole('heading', { name: 'Pikachu ex', level: 2 });
  await expect(title).toBeVisible();
  await title.click();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/cards\/intl:30th:151/);
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/cards\/intl:30th:150/);

  await page.getByRole('link', { name: 'Im Set 30th CELEBRATION ansehen' }).click();
  await expect(page).toHaveURL(/\/catalog\/sets\/asia:M6a\/cards\/asia:M6a:127/);
  await expect(page.getByRole('heading', { name: 'ピカチュウex', level: 2 })).toBeVisible();
});

test('Traditional Chinese copies link to the Japanese product with the T-Chinese filter', async ({
  page,
}) => {
  await page.goto('/catalog/sets/asia:M6a/cards/asia:M6a:127?lang=ja');
  const cardmarket = page.getByRole('link', { name: /Auf Cardmarket öffnen/ });
  const japanese = new URL((await cardmarket.getAttribute('href')) ?? '');
  expect(japanese.searchParams.get('language')).toBe('7');
  await page.getByRole('radio', { name: 'ZH-TW' }).click();
  await expect(cardmarket).toHaveAttribute('href', /&language=11&/);
  const traditional = new URL((await cardmarket.getAttribute('href')) ?? '');
  expect(traditional.searchParams.get('idProduct')).toBe(japanese.searchParams.get('idProduct'));
  await page.getByRole('radio', { name: 'ZH-CN' }).click();
  const simplified = new URL((await cardmarket.getAttribute('href')) ?? '');
  expect(simplified.searchParams.get('language')).toBe('6');
  expect(simplified.searchParams.get('idProduct')).not.toBe(japanese.searchParams.get('idProduct'));
  await expect(page.getByText('übersetzt', { exact: true })).toBeVisible();
});

test('sealed list filters and product page details', async ({ page }) => {
  await page.goto('/catalog/sealed');
  await page
    .getByRole('combobox', { name: 'Produkttyp', exact: true })
    .selectOption({ label: 'Mini-Tin' });
  await expect(
    page.getByText(`${count('mini-tin')} von ${sealed.products.length} Produkten`),
  ).toBeVisible();
  await page.getByRole('link', { name: /Psiana & Mauzi/ }).click();
  await expect(page.getByRole('heading', { name: /Psiana & Mauzi/, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Weitere Motive' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Auf Cardmarket öffnen/ })).toHaveAttribute(
    'href',
    /idProduct=895565&language=3&sellerCountry=7/,
  );
});

test('unknown ids show the not-found page', async ({ page }) => {
  await page.goto('/catalog/sets/intl:nope');
  await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
  await page.goto('/catalog/sets/intl:30th/cards/intl:30th:999');
  await expect(page.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeVisible();
});

test('command palette finds cards in any script and opens them', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(pageTitle(page)).toHaveText('Übersicht'); // the shortcut listener is attached
  if (isMobile) await page.getByRole('button', { name: 'Suchen' }).click();
  else await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Suche' });
  await input.fill('glurak');
  // The Classic Collection's Glurak and the Base Set's original share the number 4/102.
  await expect(page.getByRole('option', { name: /Glurak.*4\/102/ })).toHaveCount(2);
  await expect(page.getByRole('option', { name: /Glurak-Figuren-Geschenkbox/ })).toBeVisible();
  // A Japanese name finds the Japanese cards first (ADR-060); the list shows their German names.
  await input.fill('ピカチュウ');
  await expect(page.getByRole('option').first()).toContainText('Pikachu');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/catalog\/sets\/asia:[^/]+\/cards\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'ピカチュウ', level: 2 })).toBeVisible();
});

test('card search: numbers, power-user filters and the URL', async ({ page }) => {
  await page.goto('/catalog/cards');
  await page.getByRole('button', { name: '#150' }).click();
  await expect(page).toHaveURL(/q=%23150/);
  await expect(page.getByRole('link', { name: /^150\/128, Pikachu-ex/ })).toBeVisible();
  // Every set's number 150, and nothing else.
  const results = page.getByRole('main').getByRole('link', { name: /^\d+\/\d+, / });
  for (const label of await results.evaluateAll((links) =>
    links.map((link) => link.getAttribute('aria-label')),
  ))
    expect(label).toMatch(/^150\//);

  await page.getByRole('searchbox', { name: 'Karten suchen' }).fill('rarity:sir set:30c');
  await expect(page.getByText('10 Karten', { exact: true })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Karten suchen' }).fill('');
  await page
    .getByRole('combobox', { name: 'Sprache', exact: true })
    .selectOption({ label: 'Chinesisch (traditionell)' });
  await page.getByRole('searchbox', { name: 'Karten suchen' }).fill('夢幻');
  await expect(page).toHaveURL(/lang=zh-tw/);
  await expect(page.getByRole('link', { name: /Mew/ }).first()).toBeVisible();
});
