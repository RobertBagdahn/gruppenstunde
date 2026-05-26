/**
 * Tests for entityUrls.ts — getEntityUrl resolver for in-app links.
 *
 * Covers all 11 supported entity types with valid inputs, and the
 * missing-identifier behaviour (throws in dev, falls back to "#" in prod).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEntityUrl, type EntityType } from './entityUrls';

// ---------------------------------------------------------------------------
// Valid inputs — one assertion per entity type
// ---------------------------------------------------------------------------

describe('getEntityUrl — slug-based types', () => {
  it('resolves recipe to /recipes/:slug', () => {
    expect(getEntityUrl('recipe', { slug: 'apfelmus' })).toBe('/recipes/apfelmus');
  });

  it('resolves ingredient to /ingredients/:slug', () => {
    expect(getEntityUrl('ingredient', { slug: 'kartoffel' })).toBe('/ingredients/kartoffel');
  });

  it('resolves material to /materials/:slug', () => {
    expect(getEntityUrl('material', { slug: 'zelt' })).toBe('/materials/zelt');
  });

  it('resolves event to /events/:slug', () => {
    expect(getEntityUrl('event', { slug: 'sommerlager-2026' })).toBe('/events/sommerlager-2026');
  });

  it('resolves session to /sessions/:slug', () => {
    expect(getEntityUrl('session', { slug: 'knoten-lernen' })).toBe('/sessions/knoten-lernen');
  });

  it('resolves game to /games/:slug', () => {
    expect(getEntityUrl('game', { slug: 'raeuber-und-gendarm' })).toBe(
      '/games/raeuber-und-gendarm',
    );
  });

  it('resolves blog to /blogs/:slug', () => {
    expect(getEntityUrl('blog', { slug: 'welcome' })).toBe('/blogs/welcome');
  });

  it('resolves group to /groups/:slug', () => {
    expect(getEntityUrl('group', { slug: 'wuppertal-mitte' })).toBe('/groups/wuppertal-mitte');
  });

  it('resolves tag to /search?tag_slugs=:slug', () => {
    expect(getEntityUrl('tag', { slug: 'outdoor' })).toBe('/search?tag_slugs=outdoor');
  });

  it('prefers slug over id when both are provided', () => {
    expect(getEntityUrl('recipe', { id: 42, slug: 'apfelmus' })).toBe('/recipes/apfelmus');
  });

  it('percent-encodes unsafe characters in slug', () => {
    expect(getEntityUrl('recipe', { slug: 'pfann küchen' })).toBe('/recipes/pfann%20k%C3%BCchen');
  });
});

describe('getEntityUrl — id-based types', () => {
  it('resolves location to /events?event_location_id=:id', () => {
    expect(getEntityUrl('location', { id: 7 })).toBe('/events?event_location_id=7');
  });

  it('resolves user to /profile/name/:id', () => {
    expect(getEntityUrl('user', { id: 'abc-123' })).toBe('/profile/name/abc-123');
  });

  it('accepts numeric id 0 as valid for location', () => {
    // 0 is a valid id; only undefined/null/'' are treated as missing
    expect(getEntityUrl('location', { id: 0 })).toBe('/events?event_location_id=0');
  });

  it('percent-encodes unsafe characters in id', () => {
    expect(getEntityUrl('user', { id: 'foo bar' })).toBe('/profile/name/foo%20bar');
  });
});

// ---------------------------------------------------------------------------
// Missing identifier — dev throws, prod returns '#'
// ---------------------------------------------------------------------------

describe('getEntityUrl — missing identifier (dev mode)', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const slugTypes: EntityType[] = [
    'recipe',
    'ingredient',
    'material',
    'event',
    'session',
    'game',
    'blog',
    'group',
    'tag',
  ];

  slugTypes.forEach((type) => {
    it(`throws when slug is missing for ${type}`, () => {
      expect(() => getEntityUrl(type, {})).toThrow(/requires "slug"/);
    });
  });

  it('throws when id is missing for location', () => {
    expect(() => getEntityUrl('location', {})).toThrow(/requires "id"/);
  });

  it('throws when id is missing for user', () => {
    expect(() => getEntityUrl('user', {})).toThrow(/requires "id"/);
  });

  it('throws when id is empty string for location', () => {
    expect(() => getEntityUrl('location', { id: '' })).toThrow(/requires "id"/);
  });

  it('throws when slug is empty string for recipe', () => {
    // '' is falsy, triggers the missing-identifier branch
    expect(() => getEntityUrl('recipe', { slug: '' })).toThrow(/requires "slug"/);
  });
});

describe('getEntityUrl — missing identifier (prod fallback)', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns "#" in prod when slug is missing', () => {
    expect(getEntityUrl('recipe', {})).toBe('#');
  });

  it('returns "#" in prod when id is missing', () => {
    expect(getEntityUrl('user', {})).toBe('#');
  });
});
