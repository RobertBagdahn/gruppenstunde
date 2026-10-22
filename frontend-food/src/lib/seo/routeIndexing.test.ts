// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROUTE_RULES, findRouteRule, getIndexPolicy, getRouteMeta } from './routeIndexing';

const appSource = readFileSync(resolve(__dirname, '../../App.tsx'), 'utf8');
const appPaths = [...appSource.matchAll(/path="([^"]+)"/g)].map((match) => match[1]);
const rulePatterns = new Set(ROUTE_RULES.map((rule) => rule.pattern));

describe('route classification (food-seo-markup)', () => {
  it('classifies every route declared in App.tsx', () => {
    expect(appPaths.length).toBeGreaterThan(40);
    const unclassified = appPaths.filter((path) => !rulePatterns.has(path));
    expect(unclassified).toEqual([]);
  });

  it('gives every route a title and a description, except the start page title', () => {
    for (const rule of ROUTE_RULES) {
      expect(rule.description, rule.pattern).toBeTruthy();
      if (rule.pattern !== '/') expect(rule.title, rule.pattern).toBeTruthy();
    }
  });

  it('keeps the start page and the public pages indexable', () => {
    for (const path of ['/', '/recipes', '/recipes/chili-sin-carne', '/ingredients', '/ingredients/zwiebel', '/privacy', '/imprint']) {
      expect(getIndexPolicy(path, '').robots, path).toMatch(/^index,follow$/);
    }
  });

  it('marks private, time-bound and creation routes noindex,nofollow', () => {
    for (const path of [
      '/meal-plans/3',
      '/shopping-lists/7',
      '/profile',
      '/login',
      '/recipes/new',
      '/recipes/my-recipes',
      '/recipes/chili/edit',
      '/admin/data-quality',
      '/gibt-es-nicht',
    ]) {
      expect(getIndexPolicy(path, '').robots, path).toBe('noindex,nofollow');
    }
  });

  it('keeps public detail routes separate from the static private routes with the same shape', () => {
    expect(findRouteRule('/recipes/my-recipes').pattern).toBe('/recipes/my-recipes');
    expect(findRouteRule('/recipes/chili-sin-carne').pattern).toBe('/recipes/:slug');
    expect(findRouteRule('/admin/data-quality').pattern).toBe('/admin/data-quality');
  });

  it('gives filtered lists noindex,follow and a canonical without the filters', () => {
    expect(getIndexPolicy('/recipes', 'q=chili&sort=newest')).toEqual({
      robots: 'noindex,follow',
      canonicalPath: '/recipes',
    });
  });

  it('keeps the page number in the canonical URL of an unfiltered list', () => {
    expect(getIndexPolicy('/recipes', 'page=2')).toEqual({ robots: 'index,follow', canonicalPath: '/recipes?page=2' });
  });

  it('reports the default title and description for a route', () => {
    expect(getRouteMeta('/meal-plans/app', '')).toMatchObject({ kind: 'private', title: 'Essenspläne' });
    expect(getRouteMeta('/', '').title).toBeUndefined();
  });
});
