import { describe, it, expect } from 'vitest';
import { parseRecipeSteps } from './parseRecipeSteps';

describe('parseRecipeSteps', () => {
  it('splits at ## headings', () => {
    const md = `## Teig vorbereiten
Mehl und Eier mischen.

## Backen
Bei 180°C 30 Minuten backen.

## Servieren
Mit Puderzucker bestreuen.`;
    const steps = parseRecipeSteps(md);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toContain('Teig vorbereiten');
    expect(steps[1]).toContain('Backen');
    expect(steps[2]).toContain('Servieren');
  });

  it('splits at ### headings', () => {
    const md = `### Schritt 1
Zwiebeln schneiden.

### Schritt 2
Anbraten.`;
    const steps = parseRecipeSteps(md);
    expect(steps).toHaveLength(2);
  });

  it('splits numbered list items', () => {
    const md = `1. Wasser kochen
2. Nudeln hinzufügen
3. 10 Minuten kochen lassen
4. Abgießen und servieren`;
    const steps = parseRecipeSteps(md);
    expect(steps).toHaveLength(4);
    expect(steps[0]).toContain('Wasser kochen');
    expect(steps[3]).toContain('Abgießen');
  });

  it('falls back to single step for plain text', () => {
    const md = 'Alles in einen Topf geben und umrühren.';
    const steps = parseRecipeSteps(md);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toBe(md);
  });

  it('returns empty array for empty string', () => {
    expect(parseRecipeSteps('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parseRecipeSteps('   \n  ')).toEqual([]);
  });

  it('handles very short text as single step', () => {
    const steps = parseRecipeSteps('Umrühren.');
    expect(steps).toHaveLength(1);
    expect(steps[0]).toBe('Umrühren.');
  });

  it('prefers headings over numbered lists when both present', () => {
    const md = `## Vorbereitung
1. Mehl sieben
2. Eier schlagen

## Zubereitung
1. Alles mischen
2. Backen`;
    const steps = parseRecipeSteps(md);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toContain('Vorbereitung');
  });
});
