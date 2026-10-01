#!/usr/bin/env node
/**
 * Codemod: migrate Tailwind palette colours, font sizes and radii to the
 * food design tokens (OpenSpec change `meal-plan-integrity-and-number-formatting`,
 * task group 11).
 *
 * Usage: node scripts/migrate-tokens.mjs [--dry] [paths…]   (default: src)
 *
 * The mapping tables below are the single source for the migration; anything
 * the script cannot map is reported and must be migrated by hand. Test files
 * are skipped. Lines containing Material Symbols keep their font sizes — the
 * icon migration (task group 12) replaces those spans entirely.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const roots = args.filter((a) => !a.startsWith('--'));
if (roots.length === 0) roots.push('src');

// ---------------------------------------------------------------------------
// Mapping tables
// ---------------------------------------------------------------------------

/** Palette hue → status token. */
const HUE_TO_STATUS = {
  amber: 'warning',
  yellow: 'warning',
  orange: 'warning',
  red: 'danger',
  rose: 'danger',
  pink: 'danger',
  fuchsia: 'danger',
  emerald: 'success',
  green: 'success',
  lime: 'success',
  teal: 'success',
  sky: 'info',
  blue: 'info',
  cyan: 'info',
  indigo: 'info',
  purple: 'info',
  violet: 'info',
};
const NEUTRAL_HUES = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const ALL_HUES = [...Object.keys(HUE_TO_STATUS), ...NEUTRAL_HUES];

/** chart-N outside charts → status token (by hue of the chart colour). */
const CHART_TO_STATUS = { 1: 'success', 2: 'warning', 3: 'info', 4: 'warning', 5: 'danger' };

/** Files that are real charts and may keep chart-* colours. */
const CHART_FILES = [/components\/charts\//, /statistics\/components\//, /RecipeHistogram\.tsx$/];

const FONT_SIZE = {
  xs: 'caption',
  sm: 'body',
  base: 'emphasis',
  xl: 'section',
  '2xl': 'title',
  '3xl': 'title',
  '4xl': 'title',
  '5xl': 'title',
  '6xl': 'title',
};
function arbitraryFontSize(px) {
  if (px <= 12) return 'caption';
  if (px <= 14) return 'body';
  if (px <= 17) return 'emphasis';
  if (px <= 22) return 'section';
  return 'title';
}

const RADIUS = { '': 'lg', sm: 'lg', md: 'lg', lg: 'lg', xl: 'xl', '2xl': 'xl', '3xl': 'xl', full: 'full', none: 'none' };

// ---------------------------------------------------------------------------
// Transformations
// ---------------------------------------------------------------------------

const B = String.raw`(?<![\w\-\[/])`; // token start (not inside another word/arbitrary value)
const E = String.raw`(?![\w\-\[])`; // token end
const VARIANTS = String.raw`((?:[a-z0-9\-\[\]&:.>*_@]+:)*)`;
const COLOR_UTIL = String.raw`(bg|text|border(?:-[trblxy])?|ring|ring-offset|from|via|to|fill|stroke|outline|divide|placeholder|decoration|accent|caret|shadow)`;
const SHADE = String.raw`(50|[1-9]00|950)`;
const OPACITY = String.raw`(\/\d+)?`;

function statusColor(util, status, shade) {
  const n = Number(shade);
  const base = util.startsWith('border') || util === 'divide' || util === 'ring' || util === 'outline' ? 'edge' : util;
  if (base === 'bg' || ['from', 'via', 'to', 'fill', 'shadow'].includes(base)) {
    return n <= 200 ? `${util}-${status}-soft` : `${util}-${status}`;
  }
  if (base === 'edge') return n <= 300 ? `${util}-${status}-border` : `${util}-${status}`;
  // text-like utilities
  return n <= 200 ? `${util}-${status}-foreground` : `${util}-${status}`;
}

function neutralColor(util, shade) {
  const n = Number(shade);
  const isEdge = util.startsWith('border') || util === 'divide' || util === 'ring' || util === 'outline';
  if (isEdge) return n <= 400 ? `${util}-border` : `${util}-foreground`;
  if (util === 'bg' || ['from', 'via', 'to', 'fill', 'shadow'].includes(util)) {
    if (n <= 200) return `${util}-muted`;
    if (n <= 400) return `${util}-border`;
    if (n <= 600) return `${util}-muted-foreground`;
    return `${util}-foreground`;
  }
  if (n <= 200) return `${util}-muted`;
  if (n <= 600) return `${util}-muted-foreground`;
  return `${util}-foreground`;
}

function migrateColors(text, stats) {
  // Dark-mode palette variants are dead code (no dark theme) — drop them.
  const darkRe = new RegExp(
    String.raw`[ \t]?${B}(?:[a-z0-9\-]+:)*dark:(?:[a-z0-9\-]+:)*${COLOR_UTIL}-(${ALL_HUES.join('|')})-${SHADE}${OPACITY}${E}`,
    'g'
  );
  text = text.replace(darkRe, () => {
    stats.darkRemoved++;
    return '';
  });

  const re = new RegExp(String.raw`${B}${VARIANTS}${COLOR_UTIL}-(${ALL_HUES.join('|')})-${SHADE}${OPACITY}${E}`, 'g');
  return text.replace(re, (_m, variants, util, hue, shade, opacity = '') => {
    stats.colors++;
    const mapped = HUE_TO_STATUS[hue] ? statusColor(util, HUE_TO_STATUS[hue], shade) : neutralColor(util, shade);
    return `${variants}${mapped}${opacity}`;
  });
}

function migrateChartColors(text, file, stats) {
  if (CHART_FILES.some((re) => re.test(file))) return text;
  // bg-[hsl(var(--chart-4))]/10, text-[hsl(var(--chart-4))]
  text = text.replace(
    new RegExp(String.raw`${B}${VARIANTS}${COLOR_UTIL}-\[hsl\(var\(--chart-([1-5])\)\)\]${OPACITY}`, 'g'),
    (_m, variants, util, n, opacity = '') => {
      stats.charts++;
      return `${variants}${util}-${CHART_TO_STATUS[n]}${opacity}`;
    }
  );
  // bg-chart-4/10, text-chart-2
  return text.replace(
    new RegExp(String.raw`${B}${VARIANTS}${COLOR_UTIL}-chart-([1-5])${OPACITY}${E}`, 'g'),
    (_m, variants, util, n, opacity = '') => {
      stats.charts++;
      return `${variants}${util}-${CHART_TO_STATUS[n]}${opacity}`;
    }
  );
}

/**
 * Status DEFAULT colours are dark (text contrast), so low-opacity tints of
 * them look muddy. Tinted surfaces and borders use the -soft/-border tokens.
 */
function normalizeStatusTints(text, stats) {
  return text
    .replace(
      new RegExp(String.raw`${B}${VARIANTS}(bg|from|via|to)-(success|warning|danger|info)\/(?:[1-9]|1\d|2\d|30)${E}`, 'g'),
      (_m, variants, util, status) => {
        stats.tints++;
        return `${variants}${util}-${status}-soft`;
      }
    )
    .replace(
      new RegExp(String.raw`${B}${VARIANTS}(border(?:-[trblxy])?|divide|ring)-(success|warning|danger|info)\/\d+${E}`, 'g'),
      (_m, variants, util, status) => {
        stats.tints++;
        return `${variants}${util}-${status}-border`;
      }
    );
}

const HEADING_HINT = /font-(display|bold|semibold|extrabold)|<h[1-6]/;

function migrateFontSizes(text, stats, line) {
  if (line.includes('material-symbols')) return text;
  {
    {
      text = text.replace(
        new RegExp(String.raw`${B}${VARIANTS}text-(xs|sm|base|lg|xl|[2-6]xl)${E}`, 'g'),
        (_m, variants, size) => {
          stats.fonts++;
          let token = FONT_SIZE[size];
          if (size === 'lg') token = HEADING_HINT.test(line) ? 'section' : 'emphasis';
          return `${variants}text-${token}`;
        }
      );
      return text.replace(
        new RegExp(String.raw`${B}${VARIANTS}text-\[(\d+(?:\.\d+)?)px\]`, 'g'),
        (_m, variants, px) => {
          stats.fonts++;
          return `${variants}text-${arbitraryFontSize(Number(px))}`;
        }
      );
    }
  }
}

function migrateRadii(text, stats) {
  text = text.replace(
    new RegExp(String.raw`${B}${VARIANTS}rounded(-(?:t|b|l|r|tl|tr|bl|br|s|e|ss|se|es|ee))?(?:-(none|sm|md|lg|xl|2xl|3xl|full))?${E}`, 'g'),
    (m, variants, side = '', size = '') => {
      const mapped = RADIUS[size];
      const out = `${variants}rounded${side}${mapped === 'lg' && !side && !size ? '-lg' : `-${mapped}`}`;
      if (out !== m) stats.radii++;
      return out;
    }
  );
  // Surfaces (cards, panels) get the 12 px card radius.
  if (!/(^|\s)bg-card(\s|$|\/)/.test(text) || !/(^|\s)rounded-lg(\s|$)/.test(text)) return text;
  stats.cards++;
  return text.replace(/(^|\s)rounded-lg(?=\s|$)/g, '$1rounded-xl');
}

/**
 * Apply `fn` to the contents of every string literal on the line. Class names
 * only ever live in strings (JSX attributes, cn()/clsx() arguments, maps), so
 * identifiers such as `const rounded = …` are never touched.
 */
const STRING_RE = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
function inStrings(line, fn) {
  const migrated = inClosedStrings(line, fn);
  // Opening line of a multi-line template literal: className={`px-2 text-xs ${
  // — the static part after the last backtick is class text as well.
  if ((migrated.split('`').length - 1) % 2 === 1) {
    const open = migrated.lastIndexOf('`');
    const rest = migrated.slice(open + 1);
    const exprAt = rest.indexOf('${');
    const staticPart = exprAt === -1 ? rest : rest.slice(0, exprAt);
    if (/[a-z]/.test(staticPart) && !/['"]/.test(staticPart)) {
      return migrated.slice(0, open + 1) + fn(staticPart) + (exprAt === -1 ? '' : rest.slice(exprAt));
    }
  }
  return migrated;
}

function inClosedStrings(line, fn) {
  return line.replace(STRING_RE, (_m, quote, content) => {
    // Template literals: in `${…}` expressions (JS code) only nested string literals are migrated.
    const migrated =
      quote === '`'
        ? content
            .split(/(\$\{[^}]*\})/)
            .map((part) => (/^\$\{[^}]*\}$/.test(part) ? `\${${inStrings(part.slice(2, -1), fn)}}` : fn(part)))
            .join('')
        : fn(content);
    return `${quote}${migrated}${quote}`;
  });
}

/**
 * Tokens whose count must not change — a changed count means a mis-parsed line.
 * (Parentheses/braces may legitimately disappear, e.g. `bg-[hsl(var(--chart-4))]` → `bg-warning`.)
 */
const STRUCTURE_CHARS = ['"', "'", '`', '${'];
function sameStructure(a, b) {
  return STRUCTURE_CHARS.every((ch) => a.split(ch).length === b.split(ch).length);
}

function migrateLine(line, file, stats) {
  const migrated = migrateLineUnchecked(line, file, stats);
  if (sameStructure(line, migrated)) return migrated;
  stats.skippedLines.push(`${file}: ${line.trim().slice(0, 120)}`);
  return line;
}

function migrateLineUnchecked(line, file, stats) {
  return inStrings(line, (content) => {
    let out = migrateColors(content, stats);
    out = migrateChartColors(out, file, stats);
    out = normalizeStatusTints(out, stats);
    out = migrateFontSizes(out, stats, line);
    return migrateRadii(out, stats);
  });
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function* walk(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) yield* walk(join(path, entry));
  } else if (/\.(tsx?|jsx?)$/.test(path) && !/\.test\.(tsx?|jsx?)$/.test(path)) {
    yield path;
  }
}

const total = { files: 0, colors: 0, darkRemoved: 0, charts: 0, tints: 0, fonts: 0, radii: 0, cards: 0 };
const leftovers = [];
const skippedLines = [];
const leftoverRe = new RegExp(
  String.raw`${B}(?:[a-z0-9\-]+:)*(?:${COLOR_UTIL}-(${ALL_HUES.join('|')})-\d+|text-\[\d+px\]|text-(?:xs|sm|base|lg|xl|[2-6]xl)|rounded(?:-(?:sm|md|2xl|3xl))?)${E}`,
  'g'
);

for (const root of roots) {
  for (const file of walk(root)) {
    const original = readFileSync(file, 'utf8');
    const stats = { colors: 0, darkRemoved: 0, charts: 0, tints: 0, fonts: 0, radii: 0, cards: 0, skippedLines: [] };
    const text = original
      .split('\n')
      .map((line) => migrateLine(line, file, stats))
      .join('\n');
    if (text !== original) {
      total.files++;
      for (const key of Object.keys(total)) if (key !== 'files') total[key] += stats[key];
      if (!dryRun) writeFileSync(file, text);
    }
    skippedLines.push(...stats.skippedLines);
    text.split('\n').forEach((line, index) => {
      if (line.includes('material-symbols')) return;
      const strings = [...line.matchAll(STRING_RE)].map((m) => m[2]).join(' ');
      const found = strings.match(leftoverRe);
      if (found) leftovers.push(`${relative('.', file)}:${index + 1}: ${[...new Set(found)].join(' ')}`);
    });
  }
}

console.log(`${dryRun ? '[dry] ' : ''}migrated ${total.files} files`, total);
if (skippedLines.length) {
  console.log(`\n${skippedLines.length} lines skipped (structure would change):`);
  console.log(skippedLines.join('\n'));
}
if (leftovers.length) {
  console.log(`\n${leftovers.length} lines need manual migration:`);
  console.log(leftovers.join('\n'));
}
