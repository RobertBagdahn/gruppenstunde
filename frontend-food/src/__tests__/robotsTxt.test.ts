// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const robots = readFileSync(resolve(__dirname, '../../public/robots.txt'), 'utf8');
const disallowed = [...robots.matchAll(/^Disallow: (.+)$/gm)].map((match) => match[1].trim());
const allowed = [...robots.matchAll(/^Allow: (.+)$/gm)].map((match) => match[1].trim());

describe('public/robots.txt (food-seo-markup)', () => {
  it('blocks the private and time-bound paths', () => {
    for (const path of ['/meal-plans', '/shopping-lists', '/profile', '/admin', '/login', '/register', '/api']) {
      expect(disallowed, path).toContain(path);
    }
  });

  it('allows the public recipe and ingredient paths', () => {
    expect(allowed).toEqual(expect.arrayContaining(['/recipes', '/ingredients']));
    expect(disallowed).not.toContain('/recipes');
    expect(disallowed).not.toContain('/ingredients');
  });
});
