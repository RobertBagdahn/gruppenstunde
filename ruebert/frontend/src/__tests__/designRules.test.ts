// @vitest-environment node
/**
 * Source-level design rules of layout D (frontend-layout spec "Colours only from tokens", Design.md).
 * Scans every non-test .ts/.tsx file under src/. Each rule is first checked against known offenders so a
 * broken pattern cannot pass silently.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('..', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'test' ? [] : sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const FILES = sourceFiles(SRC).map((path) => ({
  path: relative(SRC, path).split(sep).join('/'),
  text: readFileSync(path, 'utf8'),
}));

const PALETTE_HUES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const COLOR_UTILITIES =
  'bg|text|border(?:-[trblxy])?|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|decoration|accent|caret|shadow';

const RULES = {
  // Short hex values need a letter, so run numbers like "Forecast #128" are not mistaken for colours.
  hexColour: /(?<![\w&/])#(?:[0-9a-f]{8}|[0-9a-f]{6}|(?=\d*[a-f])[0-9a-f]{3,4})\b/i,
  rgbColour: /\b(?:rgba?|hsla?)\(\s*\d/,
  paletteClass: new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:${COLOR_UTILITIES})-(?:${PALETTE_HUES})-(?:50|[1-9]00|950)\\b`),
  namedColourClass: /(?<![\w-])(?:bg|text|border|fill|stroke)-(?:white|black)\b/,
  arbitraryColour: new RegExp(`(?<![\\w-])(?:${COLOR_UTILITIES})-\\[(?:#|rgba?\\(|hsla?\\(\\d)`),
  fontSizeOffScale: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+(?:px|rem|em)\])(?![\w-])/,
  radiusOffScale: /(?<![\w-])rounded(?:-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?(?:-(?:xl|2xl|3xl|\[[^\]]*\]))?(?![\w-])/,
  trafficColour: /\btraffic-(?:red|yellow|green|blue)\b/,
  browserDialog: /(^|[^\w.])(?:window\.)?(?:confirm|alert|prompt)\(/m,
};

function offenders(pattern: RegExp, allowed: string[] = []): string[] {
  return FILES.filter((file) => !allowed.includes(file.path) && pattern.test(file.text)).map((file) => file.path);
}

describe('rule patterns catch known offenders', () => {
  it.each([
    ['hexColour', 'fill="#4ade80"'],
    ['hexColour', "color: '#fff'"],
    ['hexColour', "color: '#000000'"],
    ['rgbColour', 'stroke="rgb(20, 35, 27)"'],
    ['paletteClass', 'className="bg-amber-50"'],
    ['paletteClass', 'className="hover:text-gray-500"'],
    ['namedColourClass', 'className="text-white"'],
    ['arbitraryColour', 'className="bg-[#0a0f17]"'],
    ['fontSizeOffScale', 'className="text-xs"'],
    ['fontSizeOffScale', 'className="text-[11px]"'],
    ['radiusOffScale', 'className="rounded"'],
    ['radiusOffScale', 'className="rounded-xl"'],
    ['radiusOffScale', 'className="rounded-t-2xl"'],
    ['browserDialog', 'if (window.confirm("Sicher?"))'],
  ] as const)('%s matches %s', (rule, sample) => {
    expect(RULES[rule].test(sample)).toBe(true);
  });

  it.each([
    ['hexColour', 'href="#farb-tokens"'],
    ['hexColour', "'Forecast #25'"],
    ['hexColour', '"Forecast #128"'],
    ['rgbColour', 'hsl(var(--accent))'],
    ['paletteClass', 'className="bg-traffic-red text-accent-text"'],
    ['fontSizeOffScale', 'className="text-caption text-label text-dense"'],
    ['fontSizeOffScale', 'className="text-foreground-2"'],
    ['radiusOffScale', 'className="rounded-sm rounded-md rounded-lg rounded-full"'],
    ['radiusOffScale', 'className="rounded-t-md"'],
    ['browserDialog', 'onConfirm()'],
  ] as const)('%s does not match %s', (rule, sample) => {
    expect(RULES[rule].test(sample)).toBe(false);
  });
});

describe('design rules', () => {
  it('scans the source tree', () => {
    expect(FILES.map((file) => file.path)).toContain('components/layout/Sidebar.tsx');
  });

  it('uses no hex colours in components', () => {
    expect(offenders(RULES.hexColour)).toEqual([]);
  });

  it('uses no literal rgb/hsl colours (only hsl(var(--token)))', () => {
    expect(offenders(RULES.rgbColour)).toEqual([]);
  });

  it('uses no default Tailwind palette or named colour classes', () => {
    expect(offenders(RULES.paletteClass)).toEqual([]);
    expect(offenders(RULES.namedColourClass)).toEqual([]);
  });

  it('uses no arbitrary colour values', () => {
    expect(offenders(RULES.arbitraryColour)).toEqual([]);
  });

  it('uses only the type scale (label, caption, dense, body, emphasis, section, title)', () => {
    expect(offenders(RULES.fontSizeOffScale)).toEqual([]);
  });

  it('uses only the radii sm, md, lg and full', () => {
    expect(offenders(RULES.radiusOffScale)).toEqual([]);
  });

  it('uses traffic-light colours only for status dots, badges and charts', () => {
    const allowed = [
      'components/layout/Topbar.tsx', // pipeline status dots
      'components/layout/Sidebar.tsx', // counter of open decisions
      'components/layout/SidebarControls.tsx', // dots in the traffic-light checklist
      'components/shared/TrafficLightBadge.tsx',
      'pages/StyleguidePage.tsx',
    ];
    const charts = FILES.filter((file) => file.path.startsWith('components/charts/')).map((file) => file.path);
    expect(offenders(RULES.trafficColour, [...allowed, ...charts])).toEqual([]);
  });

  it('uses the app dialog instead of browser dialogs', () => {
    expect(offenders(RULES.browserDialog)).toEqual([]);
  });
});
