/** schema.org `BreadcrumbList` mirroring the visible breadcrumbs (food-seo-markup). */
import { toAbsoluteUrl, type JsonLdObject } from './jsonLd';

export interface BreadcrumbJsonLdItem {
  name: string;
  /** Path of the crumb; omitted for the current page. */
  path?: string;
}

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbJsonLdItem[], origin: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: toAbsoluteUrl(origin, item.path) } : {}),
    })),
  };
}
