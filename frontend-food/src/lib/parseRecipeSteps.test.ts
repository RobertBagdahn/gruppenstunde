import { describe, expect, it } from 'vitest';
import { parsePreparationSteps } from './parseRecipeSteps';

describe('parsePreparationSteps', () => {
  it('extracts only the preparation heading and its numbered steps', () => {
    const description = [
      '## Beschreibung',
      'Ein einfacher Pfannkuchen.',
      '## Zubereitung',
      '1. Mehl und Milch verrühren.',
      '2. In einer Pfanne ausbacken.',
      '## Hinweise',
      'Mit Zucker servieren.',
    ].join('\n');

    expect(parsePreparationSteps(description)).toEqual([
      '1. Mehl und Milch verrühren.',
      '2. In einer Pfanne ausbacken.',
    ]);
  });

  it('supports numbered instructions without a preparation heading', () => {
    expect(parsePreparationSteps('1. Zutaten vermischen.\n2. Backen.')).toEqual([
      '1. Zutaten vermischen.',
      '2. Backen.',
    ]);
  });

  it('does not mistake a general description for preparation steps', () => {
    expect(parsePreparationSteps('Ein schnelles Rezept für unterwegs.')).toEqual([]);
  });
});
