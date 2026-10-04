// @vitest-environment node
/**
 * WCAG contrast of the design tokens in `src/index.css` (food-design-system spec).
 * Reads the CSS variables of `:root`, resolves aliases and checks every
 * text/background and control/background pair the components use.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrastRatio, parseHsl, type Hsl } from './contrast';

// Read the stylesheet as plain text (CSS imports are not processed in Vitest).
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8');

function parseRootTokens(source: string): Map<string, string> {
  const root = source.match(/:root\s*\{([\s\S]*?)\n\s*\}/);
  if (!root) throw new Error(':root block not found in index.css');
  const tokens = new Map<string, string>();
  for (const match of root[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens.set(match[1], match[2].trim());
  return tokens;
}

const tokens = parseRootTokens(css);

function resolveHsl(name: string, depth = 0): Hsl {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`Token --${name} is not defined`);
  const alias = value.match(/^var\(--([\w-]+)\)$/);
  if (alias) {
    if (depth > 5) throw new Error(`Alias loop at --${name}`);
    return resolveHsl(alias[1], depth + 1);
  }
  const hsl = parseHsl(value);
  if (!hsl) throw new Error(`--${name} is not an HSL triplet: ${value}`);
  return hsl;
}

function contrast(foreground: string, background: string): number {
  return contrastRatio(resolveHsl(foreground), resolveHsl(background));
}

/** Normal text: WCAG AA 4.5:1. */
const TEXT_PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'muted'],
  ['muted-foreground', 'card'],
  ['primary-foreground', 'primary'],
  ['primary', 'background'],
  ['primary', 'card'],
  ['destructive-foreground', 'destructive'],
  ['primary', 'primary-soft'],
  ['accent-foreground', 'background'],
  ...(['success', 'warning', 'danger', 'info'] as const).flatMap((status): [string, string][] => [
    [`${status}-foreground`, status],
    [status, 'background'],
    [status, 'card'],
    [status, `${status}-soft`],
  ]),
];

/** Form-control borders and focus rings: WCAG AA 3:1 (non-text contrast). */
const CONTROL_PAIRS: [string, string][] = [
  ['primary-bright', 'background'],
  ['input', 'background'],
  ['input', 'card'],
  ['ring', 'background'],
];

describe('design token contrast (WCAG AA)', () => {
  it.each(TEXT_PAIRS)('text --%s on --%s is at least 4.5:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(CONTROL_PAIRS)('control --%s on --%s is at least 3:1', (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });

  it('keeps --border clearly visible on background and card', () => {
    expect(contrast('border', 'background')).toBeGreaterThanOrEqual(1.3);
    expect(contrast('border', 'card')).toBeGreaterThanOrEqual(1.3);
  });

  it('keeps --warning a light-enough amber instead of dark brown', () => {
    expect(resolveHsl('warning')[2]).toBeGreaterThanOrEqual(0.3);
    expect(resolveHsl('warning-soft')[2]).toBeGreaterThanOrEqual(0.9);
  });

  it('defines every area colour as tone + tint', () => {
    for (const area of ['recipes', 'ingredients', 'planner', 'shopping']) {
      expect(() => resolveHsl(`area-${area}`)).not.toThrow();
      expect(resolveHsl(`area-${area}-soft`)[2]).toBeGreaterThanOrEqual(0.95);
    }
  });

  it('keeps the shadcn --destructive alias on --danger', () => {
    expect(tokens.get('destructive')).toBe('var(--danger)');
  });

  it('defines every status token triple', () => {
    for (const status of ['success', 'warning', 'danger', 'info']) {
      for (const suffix of ['', '-foreground', '-soft', '-border']) {
        expect(() => resolveHsl(`${status}${suffix}`)).not.toThrow();
      }
    }
  });
});
