import { describe, expect, it } from 'vitest';
import { PortionMagicApplySchema, PortionMagicPreviewSchema } from './supply';

describe('portion magic-wand contracts', () => {
  const replacement = {
    operation_id: 'operation-0',
    operation: 'replace' as const,
    source_portion_id: 12,
    name: 'Stück',
    quantity: 1,
    measuring_unit_name: 'Gramm',
    rank: 1,
    proposed_weight_g: 150,
    confidence: 0.92,
    rationale: 'Typisches Stückgewicht',
    selected: true,
    requires_manual_weight: false,
    delete_without_replacement: false,
  };

  it('keeps weighted rows and replacement rows distinguishable', () => {
    const parsed = PortionMagicPreviewSchema.parse({
      preview_token: 'preview-token',
      ai_interaction_id: null,
      operations: [
        { ...replacement, operation: 'unchanged', selected: false, rationale: 'Bereits vollständig' },
        replacement,
      ],
    });

    expect(parsed.operations.find((operation) => operation.operation === 'unchanged')?.selected).toBe(false);
    expect(parsed.operations.find((operation) => operation.operation === 'replace')?.selected).toBe(true);
  });

  it('accepts explicit deletion without replacement', () => {
    const parsed = PortionMagicPreviewSchema.parse({
      preview_token: 'preview-token',
      operations: [{ ...replacement, selected: false, proposed_weight_g: null, delete_without_replacement: true }],
    });

    expect(parsed.operations[0].delete_without_replacement).toBe(true);
    expect(parsed.operations[0].proposed_weight_g).toBeNull();
  });

  it('preserves validation metadata for incomplete suggestions', () => {
    const parsed = PortionMagicPreviewSchema.parse({
      preview_token: 'preview-token',
      operations: [{
        ...replacement,
        proposed_weight_g: null,
        selected: true,
        requires_manual_weight: true,
        validation_message: 'Bitte ein positives Gewicht eintragen.',
      }],
    });

    expect(parsed.operations[0].validation_message).toBe('Bitte ein positives Gewicht eintragen.');
    expect(parsed.operations[0].requires_manual_weight).toBe(true);
  });

  it('parses an apply result with created and deleted portion ids', () => {
    const parsed = PortionMagicApplySchema.parse({
      portions: [],
      replaced_portion_ids: [12],
      created_portion_ids: [20],
      deleted_portion_ids: [12],
      created_package_ids: [21],
    });

    expect(parsed.created_portion_ids).toEqual([20]);
    expect(parsed.deleted_portion_ids).toEqual([12]);
    expect(parsed.created_package_ids).toEqual([21]);
  });
});
