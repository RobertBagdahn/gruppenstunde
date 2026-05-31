/**
 * Entity URL resolution — pure functions that map an entity type + identifier
 * to the canonical in-app URL.
 *
 * Reduced to entity types relevant to the Food frontend.
 */

export type EntityType = 'recipe' | 'ingredient' | 'user' | 'tag';

export interface EntityRef {
  id?: string | number;
  slug?: string;
}

/**
 * Resolve an in-app URL for a given entity.
 */
export function getEntityUrl(type: EntityType, ref: EntityRef): string {
  const { id, slug } = ref;

  if ((type === 'recipe' || type === 'ingredient' || type === 'tag') && !slug) {
    return handleMissing(type, 'slug', ref);
  }
  if (type === 'user' && (id === undefined || id === null || id === '')) {
    return handleMissing(type, 'id', ref);
  }

  switch (type) {
    case 'recipe':
      return `/recipes/${encodeURIComponent(slug!)}`;
    case 'ingredient':
      return `/ingredients/${encodeURIComponent(slug!)}`;
    case 'tag':
      return `/search?tag_slugs=${encodeURIComponent(slug!)}`;
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
