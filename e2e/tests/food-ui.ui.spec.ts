import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/food';
import { mockUiApi, UI_NOW, type UiMock } from '../fixtures/ui-mocks';
import { UI_PAGES, type UiPage } from './ui-pages';

/** Opens a registered page with mocked data, a fixed clock and loaded fonts. */
async function openUiPage(page: Page, ui: UiPage): Promise<{ mock: UiMock; errors: string[] }> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text());
  });
  await page.clock.setFixedTime(UI_NOW);
  // Entrance animations change opacity while axe measures; reduced motion switches them off (index.css).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mock = await mockUiApi(page, { staff: ui.staff });
  await page.goto(ui.path);
  await expect(page.locator('h1').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Settle the page: stop running transitions so colors are measured at rest (food-ui-quality-gates).
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' });
  if (ui.prepare) await ui.prepare(page);
  return { mock, errors };
}

for (const ui of UI_PAGES) {
  test.describe(ui.title, () => {
    test('loads with exactly one H1 and no errors', async ({ foodPage }) => {
      const { mock, errors } = await openUiPage(foodPage, ui);
      const headings = foodPage.locator('h1');
      await expect(headings).toHaveCount(1);
      await expect(headings).toHaveText(ui.h1);
      expect(errors).toEqual([]);
      console.log(`UNMOCKED ${ui.id}: ${[...new Set(mock.unmocked)].join(', ') || '-'}`);
    });
  });
}

for (const ui of UI_PAGES) {
  test.describe(`${ui.title} – Prüfungen`, () => {
    test('axe finds no serious or critical WCAG violations', async ({ foodPage }) => {
      await openUiPage(foodPage, ui);
      const results = await new AxeBuilder({ page: foodPage })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const exceptions = new Set(ui.axeExceptions?.map((e) => e.rule) ?? []);
      const blocking = results.violations.filter(
        (v) => (v.impact === 'serious' || v.impact === 'critical') && !exceptions.has(v.id),
      );
      expect(
        blocking.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}×`),
      ).toEqual([]);
    });

    test('interactive elements are at least 44 px on phones', async ({ foodPage }, testInfo) => {
      test.skip(testInfo.project.name !== 'ui-mobile', 'tap targets are a phone rule');
      await openUiPage(foodPage, ui);
      const small = await foodPage.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [role="button"]')]
          // A checkbox or radio is tapped through its label, which is what must reach 44 px.
          .filter((el) => !(el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && el.closest('label')))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const visible = r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
            return visible && (r.width < 44 || r.height < 44) && !el.closest('[aria-hidden="true"]');
          })
          .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`),
      );
      expect(small, 'elements below 44 px').toEqual([]);
    });

    test('no horizontal scrolling at 320, 390 and 1440 px', async ({ foodPage }) => {
      await openUiPage(foodPage, ui);
      for (const width of [320, 390, 1440]) {
        await foodPage.setViewportSize({ width, height: 844 });
        const overflow = await foodPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `overflow at ${width} px`).toBeLessThanOrEqual(1);
      }
    });

    if (ui.screenshot) {
      test('matches the phone and desktop baseline', async ({ foodPage }, testInfo) => {
        await openUiPage(foodPage, ui);
        await expect(foodPage).toHaveScreenshot(`${ui.id}.png`, { fullPage: true });
      });
    }
  });
}

/** Head tags and JSON-LD of representative pages (food-seo-markup, task 10.6). */
const HEAD_CASES: { id: string; path: string; title: string; robots: string; canonicalPath: string; jsonLdTypes: string[] }[] = [
  { id: 'startseite', path: '/', title: 'Inspi Food – Rezepte & Essensplanung', robots: 'index,follow', canonicalPath: '/', jsonLdTypes: [] },
  // The list starts with the verified filter, so its title names it.
  { id: 'rezeptuebersicht', path: '/recipes', title: 'Verifizierte Rezepte | Inspi Food', robots: 'index,follow', canonicalPath: '/recipes', jsonLdTypes: [] },
  {
    id: 'rezeptdetail',
    path: '/recipes/chili-sin-carne',
    title: 'Chili sin Carne | Inspi Food',
    robots: 'index,follow',
    canonicalPath: '/recipes/chili-sin-carne',
    jsonLdTypes: ['Recipe', 'BreadcrumbList'],
  },
  // `/meal-plans/1` redirects to the plan view; the canonical is the page that is shown.
  { id: 'essensplan', path: '/meal-plans/1', title: 'Essensplan | Inspi Food', robots: 'noindex,nofollow', canonicalPath: '/meal-plans/1/plan', jsonLdTypes: [] },
];

test.describe('Kopfdaten (food-seo-markup)', () => {
  for (const head of HEAD_CASES) {
    test(`${head.id}: title, robots, canonical and JSON-LD`, async ({ foodPage }, testInfo) => {
      test.skip(testInfo.project.name !== 'ui-desktop', 'head tags do not depend on the viewport');
      const ui: UiPage = { id: head.id, title: head.id, route: head.path, path: head.path, h1: /.+/, screenshot: false };
      await openUiPage(foodPage, ui);
      const actual = await foodPage.evaluate(() => ({
        title: document.title,
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
        jsonLdTypes: [...document.querySelectorAll('script[type="application/ld+json"]')].map(
          (script) => (JSON.parse(script.textContent ?? '{}') as { '@type'?: string })['@type'],
        ),
      }));
      expect(actual.title).toBe(head.title);
      expect(actual.robots).toBe(head.robots);
      expect(actual.canonical).toBe(new URL(head.canonicalPath, foodPage.url()).href);
      expect(actual.ogUrl).toBe(actual.canonical);
      expect(actual.jsonLdTypes).toEqual(head.jsonLdTypes);
    });
  }
});

/** Print view of recipes and shopping lists (food-ui-quality-gates, task 11.2). */
test.describe('Druckansicht', () => {
  for (const id of ['rezeptdetail', 'einkaufsliste']) {
    test(`${id}: navigation, sticker and buttons are hidden and the baseline matches`, async ({ foodPage }, testInfo) => {
      test.skip(testInfo.project.name !== 'ui-desktop', 'the print baseline is taken once, on desktop');
      const ui = UI_PAGES.find((candidate) => candidate.id === id);
      if (!ui) throw new Error(`UI page ${id} is not registered`);
      await openUiPage(foodPage, ui);
      await foodPage.emulateMedia({ media: 'print' });
      const visibleChrome = await foodPage.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-print-hide], nav, footer')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => el.tagName.toLowerCase()),
      );
      expect(visibleChrome, 'visible chrome in print').toEqual([]);
      await expect(foodPage).toHaveScreenshot(`print-${ui.id}.png`, { fullPage: true });
    });
  }
});
