#!/usr/bin/env node
/**
 * Codemod: replace Material Symbols spans with the shared Lucide `Icon`
 * component (OpenSpec change `meal-plan-integrity-and-number-formatting`,
 * task group 12).
 *
 *   <span className="material-symbols-outlined text-[18px] text-primary">restaurant</span>
 *   → <Icon name="restaurant" size={20} className="text-primary" />
 *
 * The icon name → Lucide mapping lives in `src/components/ui/icon.tsx` (ICONS).
 * Sizes are derived from the span's font size (16/20/24/48 px).
 *
 * Usage: node scripts/migrate-icons.mjs [--dry] [paths…]   (default: src)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const roots = args.filter((a) => !a.startsWith('--'));
if (roots.length === 0) roots.push('src');

const MATERIAL_CLASS = /\bmaterial-symbols-(?:outlined|rounded|sharp)\b\s*/g;
const NAMED_SIZES = {
  xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48, '6xl': 60,
  caption: 12, body: 14, emphasis: 16, section: 20, title: 28,
};
const FONT_SIZE_CLASS = /(?<![\w-])(?:[a-z0-9-]+:)*text-(?:\[(\d+(?:\.\d+)?)px\]|(xs|sm|base|lg|xl|[2-6]xl|caption|body|emphasis|section|title))(?![\w-])\s*/g;

function iconSize(px) {
  if (px <= 17) return 16;
  if (px <= 21) return 20;
  if (px <= 36) return 24;
  return 48;
}

/** Remove the Material class and font-size classes from class text; return the detected size. */
function cleanClasses(text, found) {
  return text
    .replace(MATERIAL_CLASS, '')
    .replace(FONT_SIZE_CLASS, (_m, px, named) => {
      found.px ??= px ? Number(px) : NAMED_SIZES[named];
      return '';
    })
    .replace(/\s{2,}/g, ' ');
}

/**
 * Rewrite the className attribute value (a string, template literal or cn()/clsx() call).
 * Returns the new JSX attribute (or '' when no classes remain) and the detected px size.
 */
function rewriteClassAttr(value) {
  const found = {};
  if (value.startsWith('"')) {
    const classes = cleanClasses(value.slice(1, -1), found).trim();
    return { attr: classes ? `className="${classes}"` : '', px: found.px };
  }
  // {`…`} or {cn(…)}: only touch static string parts
  let expr = value.slice(1, -1).trim();
  expr = expr.replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, (_m, quote, content) => {
    const parts = quote === '`' ? content.split(/(\$\{[^}]*\})/) : [content];
    const cleaned = parts.map((part) => (part.startsWith('${') ? part : cleanClasses(part, found))).join('');
    return `${quote}${quote === '`' ? cleaned.replace(/^\s+/, '') : cleaned.trim()}${quote}`;
  });
  expr = expr.replace(/^(cn|clsx)\(\s*(['"])\2\s*,\s*/, '$1(');
  if (/^`\s*`$/.test(expr) || /^(['"])\1$/.test(expr)) return { attr: '', px: found.px };
  return { attr: `className={${expr}}`, px: found.px };
}

// <span …className=(…)…>content</span>, possibly spanning lines.
const CLASS_VALUE = String.raw`("[^"]*"|\{\`(?:[^\`\\]|\\.)*\`\}|\{(?:cn|clsx)\((?:[^()]|\([^()]*\))*\)\})`;
const SPAN_RE = new RegExp(
  String.raw`<span((?:\s+(?!className=)[\w-]+=(?:"[^"]*"|\{\{[^}]*\}\}|\{[^{}]*\}))*)\s+className=${CLASS_VALUE}((?:\s+[\w-]+=(?:"[^"]*"|\{\{[^}]*\}\}|\{[^{}]*\}))*)\s*>\s*([a-z_0-9]+|\{[^{}]*\})\s*</span>`,
  'g'
);

function migrateFile(source, file, report) {
  let count = 0;
  const out = source.replace(SPAN_RE, (match, attrsBefore, classValue, attrsAfter, content) => {
    if (!/material-symbols/.test(classValue)) return match;
    const { attr, px } = rewriteClassAttr(classValue);
    const size = iconSize(px ?? 24);
    const name = content.startsWith('{') ? `name=${content}` : `name="${content}"`;
    const extra = `${attrsBefore}${attrsAfter}`
      .replace(/\s+aria-hidden(?:="true"|=\{true\})?/g, '')
      .replace(/\s+title=/g, ' label=')
      .trim();
    count++;
    return `<Icon ${[name, `size={${size}}`, attr, extra].filter(Boolean).join(' ')} />`;
  });
  const left = (out.match(/material-symbols/g) || []).length;
  if (left) report.leftovers.push(`${file}: ${left}`);
  if (count === 0) return source;
  report.replaced += count;
  report.files++;
  return addImport(out);
}

function addImport(source) {
  if (/import\s+\{[^}]*\bIcon\b[^}]*\}\s+from\s+'@\/components\/ui\/icon'/.test(source)) return source;
  const importLine = "import { Icon } from '@/components/ui/icon';\n";
  const imports = [...source.matchAll(/^import[\s\S]*?from\s+['"][^'"]+['"];?\n/gm)];
  if (imports.length === 0) return importLine + source;
  const last = imports[imports.length - 1];
  const at = last.index + last[0].length;
  return source.slice(0, at) + importLine + source.slice(at);
}

function* walk(path) {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) yield* walk(join(path, entry));
  } else if (/\.tsx$/.test(path) && !/\.test\.tsx$/.test(path)) {
    yield path;
  }
}

const report = { files: 0, replaced: 0, leftovers: [] };
for (const root of roots) {
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const migrated = migrateFile(source, file, report);
    if (migrated !== source && !dryRun) writeFileSync(file, migrated);
  }
}
console.log(`${dryRun ? '[dry] ' : ''}replaced ${report.replaced} icons in ${report.files} files`);
if (report.leftovers.length) {
  console.log(`\nMaterial Symbols left (migrate by hand):\n${report.leftovers.join('\n')}`);
}
