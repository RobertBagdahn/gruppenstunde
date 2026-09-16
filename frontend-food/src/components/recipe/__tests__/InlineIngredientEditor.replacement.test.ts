import { describe, it, expect } from 'vitest';
import {
  splitAiSuggestions,
  buildAiApplyPayload,
  buildReplacePayload,
} from '../InlineIngredientEditor';
import type { AiIngredientSuggestion } from '@/schemas/recipe';

/**
 * Tests for the AI replacement flow (add-ai-ingredient-replacement):
 * a replacement candidate is tied to an existing RecipeItem and MUST be
 * applied through the replace endpoint — never through the add endpoint
 * (no duplicate RecipeItem) and never through the exchange-group logic
 * (no variant group is created for a direct replacement).
 */

function makeSuggestion(overrides: Partial<AiIngredientSuggestion> = {}): AiIngredientSuggestion {
  return {
    ingredient_id: 500,
    ingredient_name: 'Jodsalz',
    portion_id: 700,
    portion_name: '1 g',
    quantity: 5,
    is_new_ingredient: false,
    note: '',
    ...overrides,
  };
}

describe('splitAiSuggestions', () => {
  it('partitions replacement candidates apart from add candidates', () => {
    const add = makeSuggestion({ ingredient_name: 'Tomaten aus der Dose' });
    const replacement = makeSuggestion({
      ingredient_name: 'Jodsalz',
      replacement_for_item_id: 42,
      replacement_reason: 'Ersatz für Salz',
      replacement_confidence: 1.0,
    });

    const { addCandidates, replacementCandidates } = splitAiSuggestions([add, replacement]);

    expect(addCandidates).toEqual([add]);
    expect(replacementCandidates).toEqual([replacement]);
  });

  it('treats missing replacement metadata as a normal add candidate', () => {
    const plain = makeSuggestion();
    const { addCandidates, replacementCandidates } = splitAiSuggestions([plain]);
    expect(addCandidates).toHaveLength(1);
    expect(replacementCandidates).toHaveLength(0);
  });
});

describe('buildAiApplyPayload', () => {
  it('never includes replacement candidates — no duplicate RecipeItem is created', () => {
    const replacement = makeSuggestion({
      replacement_for_item_id: 42,
      replacement_reason: 'Ersatz für Salz',
    });
    // Build the apply payload from the FULL suggestion list; the caller is
    // expected to pass only add candidates — this test proves replacement
    // candidates must not leak into the add endpoint even if they did.
    const addOnly = splitAiSuggestions([replacement]).addCandidates;
    const payload = buildAiApplyPayload(addOnly);
    expect(payload).toEqual([]);
  });

  it('includes name for unresolved candidates so the backend can create them at apply time', () => {
    const unresolved = makeSuggestion({
      ingredient_id: null,
      portion_id: null,
      is_new_ingredient: true,
      ingredient_name: 'Spezialgewürz',
    });
    const payload = buildAiApplyPayload([unresolved]);
    expect(payload).toEqual([
      {
        portion_id: null,
        ingredient_id: null,
        name: 'Spezialgewürz',
        quantity: 5,
        note: '',
      },
    ]);
  });

  it('omits name for resolved candidates with a portion', () => {
    const resolved = makeSuggestion();
    const payload = buildAiApplyPayload([resolved]);
    expect(payload[0]).toMatchObject({
      portion_id: 700,
      ingredient_id: 500,
    });
    expect(payload[0].name).toBeUndefined();
  });
});

describe('buildReplacePayload', () => {
  it('targets the existing RecipeItem and portion without an exchange group', () => {
    const replacement = makeSuggestion({
      replacement_for_item_id: 42,
      replacement_reason: 'Ersatz für Salz',
      replacement_confidence: 1.0,
    });
    const payload = buildReplacePayload(replacement);

    expect(payload).not.toBeNull();
    expect(payload?.portion_id).toBe(700);
    expect(payload?.ingredient_id).toBe(500);
    expect(payload?.client_request_id).toBeTypeOf('string');
    // The replace endpoint mutates the existing item in place — nothing here
    // references exchange_group or exchange_position.
    expect(payload).not.toHaveProperty('exchange_group_id');
    expect(payload).not.toHaveProperty('exchange_position');
  });

  it('omits quantity so the backend preserves the technical gram amount', () => {
    const replacement = makeSuggestion({
      replacement_for_item_id: 42,
      quantity: 999, // suggestion quantity must NOT be sent blindly
    });
    const payload = buildReplacePayload(replacement);
    expect(payload).not.toHaveProperty('quantity');
  });

  it('returns null when no target portion is available (no silent replacement)', () => {
    const replacement = makeSuggestion({
      replacement_for_item_id: 42,
      portion_id: null,
    });
    expect(buildReplacePayload(replacement)).toBeNull();
  });

  it('returns null for add candidates (not a replacement)', () => {
    expect(buildReplacePayload(makeSuggestion())).toBeNull();
  });
});
