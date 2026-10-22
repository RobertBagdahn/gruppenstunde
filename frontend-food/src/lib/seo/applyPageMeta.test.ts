import { afterEach, describe, expect, it } from 'vitest';
import { applyPageMeta, DEFAULT_TITLE } from './applyPageMeta';

const origin = 'https://food.example';

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('applyPageMeta', () => {
  it('writes title, description, robots, canonical and Open Graph tags', () => {
    applyPageMeta(
      { title: 'Chili sin Carne', description: 'Kräftiges Chili.', robots: 'index,follow', canonicalPath: '/recipes/chili' },
      origin,
    );
    expect(document.title).toBe('Chili sin Carne | Inspi Food');
    expect(metaContent('meta[name="description"]')).toBe('Kräftiges Chili.');
    expect(metaContent('meta[name="robots"]')).toBe('index,follow');
    expect(metaContent('meta[property="og:title"]')).toBe('Chili sin Carne | Inspi Food');
    expect(metaContent('meta[property="og:url"]')).toBe('https://food.example/recipes/chili');
    expect(metaContent('meta[name="twitter:card"]')).toBe('summary');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://food.example/recipes/chili');
  });

  it('uses the start title without a page title and removes the image tags when there is none', () => {
    applyPageMeta({ image: 'https://food.example/a.jpg', robots: 'index,follow', canonicalPath: '/' }, origin);
    expect(metaContent('meta[property="og:image"]')).toBe('https://food.example/a.jpg');
    expect(metaContent('meta[name="twitter:card"]')).toBe('summary_large_image');

    applyPageMeta({ robots: 'index,follow', canonicalPath: '/' }, origin);
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull();
  });

  it('replaces the JSON-LD blocks of the previous page', () => {
    applyPageMeta(
      { robots: 'index,follow', canonicalPath: '/recipes/a', jsonLd: { '@context': 'https://schema.org', '@type': 'Recipe' } },
      origin,
    );
    applyPageMeta(
      {
        robots: 'index,follow',
        canonicalPath: '/recipes/b',
        jsonLd: [
          { '@context': 'https://schema.org', '@type': 'Recipe' },
          { '@context': 'https://schema.org', '@type': 'BreadcrumbList' },
        ],
      },
      origin,
    );
    const blocks = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(blocks).toHaveLength(2);
    expect(JSON.parse(blocks[1].textContent ?? '{}')).toMatchObject({ '@type': 'BreadcrumbList' });

    applyPageMeta({ robots: 'noindex,nofollow', canonicalPath: '/meal-plans/1' }, origin);
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(0);
  });
});
