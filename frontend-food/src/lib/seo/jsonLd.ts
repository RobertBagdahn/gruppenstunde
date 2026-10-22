/** Shared helpers for schema.org JSON-LD (food-seo-markup). */

export interface JsonLdObject {
  '@context': 'https://schema.org';
  '@type': string;
  [key: string]: unknown;
}

/** Joins a site-relative path to the site origin; absolute URLs stay unchanged. */
export function toAbsoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** Drops keys whose value is missing so that no field is invented (food-seo-markup). */
export function withoutEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''),
  ) as T;
}
