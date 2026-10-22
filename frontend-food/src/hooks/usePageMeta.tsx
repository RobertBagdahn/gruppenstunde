/**
 * Page metadata for the food app (food-seo-markup).
 *
 * `PageMetaProvider` (mounted in `FoodLayout`) writes the route defaults from
 * `ROUTE_RULES`. A page calls `usePageMeta({ title, jsonLd, … })` to replace the
 * defaults it needs; when it unmounts, the defaults come back. Pages outside the
 * layout (login, registration) write their values directly.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { applyPageMeta, type PageMeta } from '@/lib/seo/applyPageMeta';
import { getRouteMeta } from '@/lib/seo/routeIndexing';
import type { JsonLdObject } from '@/lib/seo/jsonLd';

export interface PageMetaOverride {
  title?: string;
  description?: string;
  image?: string | null;
  type?: 'website' | 'article';
  jsonLd?: JsonLdObject | readonly JsonLdObject[] | null;
}

type OverrideSetter = (override: PageMetaOverride | null) => void;

const PageMetaSetterContext = createContext<OverrideSetter | null>(null);

function currentOrigin(): string {
  return window.location.origin;
}

/** Writes the route defaults, with the override of the current page on top. */
function resolvePageMeta(pathname: string, search: string, override: PageMetaOverride | null): PageMeta {
  const route = getRouteMeta(pathname, search);
  return {
    title: override?.title ?? route.title,
    description: override?.description ?? route.description,
    image: override?.image,
    type: override?.type,
    jsonLd: override?.jsonLd,
    robots: route.robots,
    canonicalPath: route.canonicalPath,
  };
}

export function PageMetaProvider({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const [override, setOverride] = useState<PageMetaOverride | null>(null);

  useEffect(() => {
    applyPageMeta(resolvePageMeta(pathname, search, override), currentOrigin());
  }, [pathname, search, override]);

  return <PageMetaSetterContext.Provider value={setOverride}>{children}</PageMetaSetterContext.Provider>;
}

/**
 * Sets the metadata of the current page. Changes of the options (for example a loaded
 * recipe) are applied again; the values are restored when the page unmounts.
 */
export function usePageMeta(options: PageMetaOverride = {}): void {
  const setOverride = useContext(PageMetaSetterContext);
  const { pathname, search } = useLocation();
  const key = JSON.stringify(options);

  const writeDirect = useCallback(
    (override: PageMetaOverride | null) => applyPageMeta(resolvePageMeta(pathname, search, override), currentOrigin()),
    [pathname, search],
  );

  useEffect(() => {
    const parsed = JSON.parse(key) as PageMetaOverride;
    if (setOverride) {
      setOverride(parsed);
      return () => setOverride(null);
    }
    writeDirect(parsed);
    return undefined;
  }, [key, setOverride, writeDirect]);
}
