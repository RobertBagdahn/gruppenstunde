import { describe, expect, it } from 'vitest';
import { buildBreadcrumbJsonLd } from './buildBreadcrumbJsonLd';

describe('buildBreadcrumbJsonLd', () => {
  it('numbers the crumbs and leaves the link off the current page', () => {
    expect(
      buildBreadcrumbJsonLd(
        [{ name: 'Startseite', path: '/' }, { name: 'Rezepte', path: '/recipes' }, { name: 'Chili sin Carne' }],
        'https://food.example',
      ),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Startseite', item: 'https://food.example/' },
        { '@type': 'ListItem', position: 2, name: 'Rezepte', item: 'https://food.example/recipes' },
        { '@type': 'ListItem', position: 3, name: 'Chili sin Carne' },
      ],
    });
  });
});
