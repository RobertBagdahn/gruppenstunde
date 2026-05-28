/**
 * EntityLinkContext — scope marker that controls the default `newTab` behaviour
 * of `<EntityLink>` instances inside a subtree.
 *
 * Usage pattern (see `frontend/AGENTS.md` → "Entity-Links & NewTab-Policy"):
 *
 *   // Listen-Page: children open in a new tab so the list is preserved.
 *   <EntityLinkContext.Provider value="list">…</EntityLinkContext.Provider>
 *
 *   // Detail-Page: inline links navigate in the same tab.
 *   <EntityLinkContext.Provider value="detail">…</EntityLinkContext.Provider>
 *
 * The default (no provider) is `"detail"` — conservative, same tab.
 * Individual `<EntityLink>` instances may still override via the `newTab` prop.
 */
import { createContext, useContext } from 'react';

export type EntityLinkScope = 'list' | 'detail';

export const EntityLinkContext = createContext<EntityLinkScope>('detail');

export function useEntityLinkScope(): EntityLinkScope {
  return useContext(EntityLinkContext);
}
