/**
 * Entity URL resolution — pure functions that map an entity type + identifier
 * to the canonical in-app URL.
 *
 * Canonical routes (verified against `frontend/src/App.tsx`):
 *
 *   | type       | identifier | URL pattern                      |
 *   |------------|------------|----------------------------------|
 *   | material   | slug       | /materials/:slug                 |
 *   | event      | slug       | /events/:slug                    |
 *   | location   | id         | /events?event_location_id=:id    |  (no dedicated detail page)
 *   | session    | slug       | /sessions/:slug                  |
 *   | game       | slug       | /games/:slug                     |
 *   | blog       | slug       | /blogs/:slug                     |
 *   | user       | id         | /profile/name/:id                |
 *   | group      | slug       | /groups/:slug                    |
 *   | tag        | slug       | /search?tag_slugs=:slug          |
 *
 * See also: `frontend/AGENTS.md` → "Entity-Links & NewTab-Policy".
 */

export type EntityType =
  | 'material'
  | 'event'
  | 'location'
  | 'session'
  | 'game'
  | 'blog'
  | 'user'
  | 'group'
  | 'tag';

export interface EntityRef {
  id?: string | number;
  slug?: string;
}

const PREFERS_SLUG: readonly EntityType[] = [
  'material',
  'event',
  'session',
  'game',
  'blog',
  'group',
  'tag',
];

const PREFERS_ID: readonly EntityType[] = ['location', 'user'];

/**
 * Resolve an in-app URL for a given entity.
 *
 * Throws in development when the required identifier is missing so bugs are
 * caught early; in production falls back to `#` so a broken link never crashes
 * the app.
 */
export function getEntityUrl(type: EntityType, ref: EntityRef): string {
  const { id, slug } = ref;
  const prefersSlug = PREFERS_SLUG.includes(type);
  const prefersId = PREFERS_ID.includes(type);

  if (prefersSlug && !slug) {
    return handleMissing(type, 'slug', ref);
  }
  if (prefersId && (id === undefined || id === null || id === '')) {
    return handleMissing(type, 'id', ref);
  }

  switch (type) {
    case 'material':
      return `/materials/${encodeURIComponent(slug!)}`;
    case 'event':
      return `/events/${encodeURIComponent(slug!)}`;
    case 'session':
      return `/sessions/${encodeURIComponent(slug!)}`;
    case 'game':
      return `/games/${encodeURIComponent(slug!)}`;
    case 'blog':
      return `/blogs/${encodeURIComponent(slug!)}`;
    case 'group':
      return `/groups/${encodeURIComponent(slug!)}`;
    case 'tag':
      return `/search?tag_slugs=${encodeURIComponent(slug!)}`;
    case 'location':
      return `/events?event_location_id=${encodeURIComponent(String(id))}`;
    case 'user':
      return `/profile/name/${encodeURIComponent(String(id))}`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function handleMissing(type: EntityType, required: 'id' | 'slug', ref: EntityRef): string {
  const msg = `getEntityUrl(${type}) requires "${required}" but received: ${JSON.stringify(ref)}`;
  if (import.meta.env?.DEV) {
    throw new Error(msg);
  }
  return '#';
}
