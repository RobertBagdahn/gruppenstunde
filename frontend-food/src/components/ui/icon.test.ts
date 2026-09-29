// @vitest-environment node
/**
 * Every icon name used in the source must have a Lucide mapping in `ICONS`,
 * otherwise `Icon` silently renders the neutral fallback circle.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Circle } from 'lucide-react';
import { ICONS, resolveIcon } from './icon';

const SRC = fileURLToPath(new URL('../..', import.meta.url));

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* sourceFiles(path);
    else if (/\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path)) yield path;
  }
}

/** Static icon names: <Icon name="x">, icon="x" props and { icon: 'x' } entries (incl. *Icon/*Icons maps). */
const PATTERNS = [
  /<Icon\s+name="([a-z_0-9]+)"/g,
  /\b(?:icon|iconName|typeIcon|sectionIcon)="([a-z_0-9]+)"/g,
  /\b(?:icon|iconName|typeIcon|sectionIcon):\s*['"]([a-z_0-9]+)['"]/g,
];
const ICON_MAPS = /(?:ICONS|Icons)\b[^=]*=\s*\{([^}]*)\}/g;

function collectIconNames(): Map<string, string> {
  const names = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    if (file.endsWith(join('components', 'ui', 'icon.tsx'))) continue;
    const source = readFileSync(file, 'utf8');
    for (const pattern of PATTERNS) {
      for (const match of source.matchAll(pattern)) names.set(match[1], file.slice(SRC.length));
    }
    // name={cond ? 'expand_less' : 'expand_more'}
    for (const expr of source.matchAll(/<Icon\s+name=\{([^}]*)\}/g)) {
      for (const value of expr[1].matchAll(/['"]([a-z_0-9]+)['"]/g)) names.set(value[1], file.slice(SRC.length));
    }
    for (const map of source.matchAll(ICON_MAPS)) {
      for (const value of map[1].matchAll(/:\s*['"]([a-z_0-9]+)['"]/g)) names.set(value[1], file.slice(SRC.length));
    }
  }
  return names;
}

describe('Icon mapping', () => {
  it('maps every icon name used in the source to Lucide', () => {
    const missing = [...collectIconNames()].filter(([name]) => !ICONS[name]).map(([name, file]) => `${name} (${file})`);
    expect(missing).toEqual([]);
  });

  it('finds the icon names in the source (guards the scanner itself)', () => {
    expect(collectIconNames().size).toBeGreaterThan(50);
  });

  it('falls back to a neutral circle for unknown names', () => {
    expect(resolveIcon('does_not_exist')).toBe(Circle);
    expect(resolveIcon(undefined)).toBe(Circle);
  });
});
