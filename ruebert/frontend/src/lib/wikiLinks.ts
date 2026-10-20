// Resolves links inside wiki pages. Pure functions: the page path is relative to knowledge/ (e.g. "plan/frontend.md").

export type WikiLink =
  | { kind: 'internal'; to: string }
  | { kind: 'anchor'; hash: string }
  | { kind: 'external'; href: string }
  | { kind: 'outside' };

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Joins a relative href onto the folder of `fromPath`, collapsing "." and ".."; null if it leaves the root. */
export function joinWikiPath(fromPath: string, relative: string): string | null {
  const parts = fromPath.split('/').slice(0, -1);
  for (const segment of relative.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join('/');
}

/** Turns one link of a wiki page into an in-app target. Anchors stay on the same page or move to the target page. */
export function resolveWikiLink(fromPath: string, href: string): WikiLink {
  if (href.startsWith('#')) return { kind: 'anchor', hash: href };
  if (SCHEME.test(href) || href.startsWith('//')) return { kind: 'external', href };

  const [pathPart, hashPart] = splitHash(href);
  const target = joinWikiPath(fromPath, pathPart);
  if (target === null) return { kind: 'outside' };
  // A folder link ("business/", "" or ".") opens the folder's index page; a page link gets its .md back.
  const folder = pathPart === '' || pathPart.endsWith('/') || pathPart === '.' || pathPart === '..';
  const file = folder ? `${target}/index.md`.replace(/^\/+/, '') : target.endsWith('.md') ? target : `${target}.md`;
  const hash = hashPart ? `#${hashPart}` : '';
  return { kind: 'internal', to: `/wiki/${file}${hash}` };
}

function splitHash(href: string): [string, string] {
  const index = href.indexOf('#');
  return index === -1 ? [href, ''] : [href.slice(0, index), href.slice(index + 1)];
}

/** Heading slug as rehype-slug makes it, used to find an anchor from the link. */
export function slugOf(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}
