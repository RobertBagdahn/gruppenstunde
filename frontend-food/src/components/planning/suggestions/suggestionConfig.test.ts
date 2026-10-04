import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_QUESTION_COUNT,
  EMPTY_FILTERS,
  buildAssistantQuestions,
  chipsForMealType,
} from './suggestionConfig';

describe('buildAssistantQuestions', () => {
  it.each(['breakfast', 'lunch', 'dinner', 'snack', 'drinks'])('always yields four questions for %s', (mealType) => {
    const none = buildAssistantQuestions(mealType, [], new Set());
    const all = buildAssistantQuestions(
      mealType,
      ['age_groups', 'cooking_sources', 'cooling', 'setting', 'season_hint'],
      new Set(),
    );
    expect(none).toHaveLength(ASSISTANT_QUESTION_COUNT);
    expect(all).toHaveLength(ASSISTANT_QUESTION_COUNT);
  });

  it('asks missing context first and replaces known context with filter questions', () => {
    const questions = buildAssistantQuestions('snack', ['cooling'], new Set());
    expect(questions.map((q) => q.id)).toEqual(['cooling', 'taste', 'prep', 'kids']);
  });

  it('does not ask context that was skipped with "Egal"', () => {
    const questions = buildAssistantQuestions('dinner', ['cooking_sources', 'age_groups'], new Set(['cooking_sources']));
    expect(questions[0].id).toBe('age_groups');
  });

  it('offers 2 to 4 options per question', () => {
    for (const mealType of ['breakfast', 'dinner', 'snack', 'drinks']) {
      const questions = buildAssistantQuestions(
        mealType,
        ['age_groups', 'cooking_sources', 'cooling', 'setting', 'season_hint'],
        new Set(),
      );
      for (const q of questions) expect(q.options.length).toBeLessThanOrEqual(4);
    }
  });
});

describe('chipsForMealType', () => {
  it('shows the dessert chip only for main meals', () => {
    expect(chipsForMealType('dinner').some((c) => c.id === 'dessert')).toBe(true);
    expect(chipsForMealType('snack').some((c) => c.id === 'dessert')).toBe(false);
  });

  it('toggles a chip on and off', () => {
    const sweet = chipsForMealType('snack').find((c) => c.id === 'sweet')!;
    const on = sweet.toggle(EMPTY_FILTERS);
    expect(sweet.isActive(on)).toBe(true);
    expect(sweet.isActive(sweet.toggle(on))).toBe(false);
  });
});
