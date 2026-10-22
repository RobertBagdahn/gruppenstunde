/**
 * Writes the document head for one page: title, description, robots, canonical,
 * Open Graph and Twitter tags, and JSON-LD blocks. Every call replaces the previous
 * page's values, so navigating between pages never leaves stale tags behind.
 */
import type { JsonLdObject } from './jsonLd';

export const SITE_NAME = 'Inspi Food';
export const DEFAULT_TITLE = 'Inspi Food – Rezepte & Essensplanung';
export const DEFAULT_DESCRIPTION = 'Rezepte, Zutaten und Essensplanung für Pfadfinder-Gruppen und Lager.';
const JSON_LD_ATTRIBUTE = 'data-page-meta';

export interface PageMeta {
  /** Page part of the title; the site name is appended. */
  title?: string;
  description?: string;
  /** Absolute or site-relative image URL for previews. */
  image?: string | null;
  type?: 'website' | 'article';
  jsonLd?: JsonLdObject | readonly JsonLdObject[] | null;
  robots: string;
  /** Site-relative path including the query for lists (e.g. `/recipes?page=2`). */
  canonicalPath: string;
}

export function formatTitle(title?: string): string {
  return title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string | null): void {
  const selector = `meta[${attribute}="${key}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (content === null) {
    existing?.remove();
    return;
  }
  const element = existing ?? document.createElement('meta');
  if (!existing) {
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function replaceJsonLd(blocks: readonly JsonLdObject[]): void {
  document.head.querySelectorAll(`script[type="application/ld+json"][${JSON_LD_ATTRIBUTE}]`).forEach((node) => node.remove());
  for (const block of blocks) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(JSON_LD_ATTRIBUTE, 'jsonld');
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  }
}

export function applyPageMeta(meta: PageMeta, origin: string): void {
  const title = formatTitle(meta.title);
  const description = meta.description ?? DEFAULT_DESCRIPTION;
  const url = `${origin}${meta.canonicalPath}`;

  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', meta.robots);
  upsertCanonical(url);

  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', meta.type ?? 'website');
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:image', meta.image ?? null);

  upsertMeta('name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', meta.image ?? null);

  const blocks = meta.jsonLd ? (Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd]) : [];
  replaceJsonLd(blocks as readonly JsonLdObject[]);
}
