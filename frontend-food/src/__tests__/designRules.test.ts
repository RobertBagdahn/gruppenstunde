// @vitest-environment node
/**
 * Source-level rules of the food-frontend-friendly-ux change that ESLint does
 * not cover (semantic-colors, food-feedback-toasts, food-design-system specs).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const FILES = sourceFiles(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8'),
}));

function offenders(pattern: RegExp, allowed: string[]): string[] {
  return FILES.filter((file) => !allowed.includes(file.path) && pattern.test(file.text)).map((file) => file.path);
}

describe('design rules', () => {
  it('renders Nutri-Score colours only through NutriScoreBadge', () => {
    const allowed = ['components/shared/NutriScoreBadge.tsx', 'schemas/supply.ts', 'pages/StyleguidePage.tsx'];
    expect(offenders(/\bnutri-[a-e]\b|NUTRI_SCORE_COLORS/, allowed)).toEqual([]);
    expect(offenders(/#(038141|85BB2F|FECB02|EE8100|E63E11|F0861E)\b/i, allowed)).toEqual([]);
  });

  it('creates toasts only through lib/notify', () => {
    expect(offenders(/from ['"]sonner['"]/, ['lib/notify.ts', 'main.tsx'])).toEqual([]);
  });

  it('uses the app dialog instead of browser dialogs', () => {
    expect(offenders(/(^|[^\w.])(window\.)?(confirm|alert|prompt)\(/m, [])).toEqual([]);
  });

  it('does not use the removed gradient utilities', () => {
    expect(offenders(/\bgradient-(hero|primary|warm|fun|sunset|rainbow)\b/, [])).toEqual([]);
  });

  it('does not use status colours as solid action surfaces', () => {
    expect(offenders(/\bbg-warning(?![-/\w])/, ['pages/StyleguidePage.tsx'])).toEqual([]);
  });
});
