import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

import { routeApi } from './apiRoutes';

const FIXTURE_DIR = fileURLToPath(new URL('../src/test/fixtures/api/', import.meta.url));
const tree = JSON.parse(readFileSync(`${FIXTURE_DIR}wiki_tree.json`, 'utf8'));

// A long target page, so the anchor jump has to scroll.
const filler = Array.from({ length: 80 }, (_, i) => `Absatz ${i + 1} füllt die Seite, damit der Sprung wirklich scrollt.`).join('\n\n');
const PAGES: Record<string, { path: string; title: string; description: string; type: string; status: string; visibility: string; body: string }> = {
  'requirements/index.md': {
    path: 'requirements/index.md',
    title: 'Anforderungen',
    description: 'Einstieg',
    type: 'index',
    status: 'stable',
    visibility: 'public',
    body: '# Anforderungen\n\nSiehe [Design-Tokens](../plan/frontend.md#design-tokens) und [Extern](https://example.org).\n\n<script>document.title = "gehackt"</script>\n',
  },
  'plan/frontend.md': {
    path: 'plan/frontend.md',
    title: 'Frontend',
    description: 'Plan des Frontends',
    type: 'plan',
    status: 'stable',
    visibility: 'public',
    body: `# Frontend\n\n${filler}\n\n## Design-Tokens\n\nFarben nur über Tokens.\n`,
  },
};

async function routeWiki(page: Page) {
  await page.route((url) => url.pathname === '/api/wiki', (route) => route.fulfill({ json: tree }));
  await page.route((url) => url.pathname === '/api/wiki/page', (route) => {
    const path = new URL(route.request().url()).searchParams.get('path') ?? '';
    const found = PAGES[path];
    return found ? route.fulfill({ json: found }) : route.fulfill({ status: 404, json: { detail: 'Seite nicht gefunden.' } });
  });
}

test.describe('Wissen (10.2): Link mit Anker', () => {
  test('a relative link with anchor stays in the wiki and scrolls to the heading', async ({ page }) => {
    await routeApi(page);
    await routeWiki(page);
    await page.goto('/wiki/requirements/index.md');
    await page.getByRole('link', { name: 'Design-Tokens' }).click();
    await expect(page).toHaveURL(/\/wiki\/plan\/frontend\.md#design-tokens$/);
    const heading = page.getByRole('heading', { name: 'Design-Tokens' });
    await expect(heading).toBeInViewport();
  });

  test('scripts in a page are neither rendered nor executed', async ({ page }) => {
    await routeApi(page);
    await routeWiki(page);
    await page.goto('/wiki/requirements/index.md');
    await expect(page.getByRole('heading', { name: 'Anforderungen' }).first()).toBeVisible();
    // The app's own dev scripts stay; the page's script must be absent.
    await expect(page.locator('script', { hasText: 'gehackt' })).toHaveCount(0);
    await expect(page).not.toHaveTitle('gehackt');
  });
});
