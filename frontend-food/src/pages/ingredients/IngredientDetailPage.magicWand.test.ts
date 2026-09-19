import { describe, expect, it } from 'vitest';
import { formatMagicWeight, isMagicOperationInvalid, mergeMagicOperations, reorderMagicOperations } from './IngredientDetailPage';
import type { PortionMagicOperation } from '@/schemas/supply';

function operation(id: string, name: string, operationType: PortionMagicOperation['operation'], rank: number): PortionMagicOperation {
  return {
    operation_id: id,
    operation: operationType,
    source_portion_id: operationType === 'unchanged' ? 1 : null,
    name,
    quantity: 1,
    measuring_unit_name: 'Gramm',
    rank,
    proposed_weight_g: 55,
    confidence: 0.8,
    rationale: '',
    suggestion_provenance: operationType === 'unchanged' ? 'existing' : 'ai_estimate',
    selected: false,
    requires_manual_weight: false,
    delete_without_replacement: false,
  };
}

describe('portion magic-wand ordering', () => {
  it('assigns rank one to the first selectable operation and protects existing rows', () => {
    const result = reorderMagicOperations([
      operation('existing', '100 g', 'unchanged', 1),
      operation('piece', 'Stück', 'create', 2),
      operation('package', 'Packung', 'create', 3),
    ], 'package', 'piece');

    expect(result.map((item) => item.operation_id)).toEqual(['existing', 'package', 'piece']);
    expect(result[1].rank).toBe(1);
    expect(result[2].rank).toBe(2);
    expect(result[0].rank).toBe(1);
  });

  it('merges only new suggestions and keeps ranks deterministic', () => {
    const result = mergeMagicOperations(
      [operation('piece', 'Stück', 'create', 1)],
      [operation('duplicate', 'Stück', 'create', 1), operation('package', 'Packung', 'create', 1)],
    );

    expect(result.map((item) => item.name)).toEqual(['Stück', 'Packung']);
    expect(result[1].rank).toBe(2);
  });

  it('keeps incomplete suggestions available for manual weight entry', () => {
    const incomplete = {
      ...operation('manual', 'Große Portion', 'create', 1),
      proposed_weight_g: null,
      requires_manual_weight: true,
      selected: true,
      validation_message: 'Bitte ein positives Gewicht eintragen.',
    };

    expect(incomplete.requires_manual_weight).toBe(true);
    expect(incomplete.proposed_weight_g).toBeNull();
    expect(incomplete.validation_message).toContain('positives Gewicht');
  });

  it('formats the newly proposed gram value for the dialog', () => {
    expect(formatMagicWeight(150)).toBe('Neue Grammzahl: 150 g');
    expect(formatMagicWeight(62.5)).toBe('Neue Grammzahl: 62,5 g');
    expect(formatMagicWeight(null)).toBe('Gewicht noch offen');
  });

  it('only blocks operations that would actually be applied without a weight', () => {
    expect(isMagicOperationInvalid({ ...operation('create', 'Stück', 'create', 1), selected: false })).toBe(false);
    expect(isMagicOperationInvalid({ ...operation('create', 'Stück', 'create', 1), selected: true, proposed_weight_g: null })).toBe(true);
    expect(isMagicOperationInvalid({ ...operation('replace', 'Stück', 'replace', 1), selected: false, proposed_weight_g: null })).toBe(true);
    expect(isMagicOperationInvalid({ ...operation('replace', 'Stück', 'replace', 1), selected: false, proposed_weight_g: null, delete_without_replacement: true })).toBe(false);
    expect(isMagicOperationInvalid(operation('existing', '100 g', 'unchanged', 1))).toBe(false);
  });

  it('keeps package suggestions distinct from portion suggestions', () => {
    const packageOperation = { ...operation('package', 'Packung', 'create', 1), operation: 'package' as const };
    expect(packageOperation.operation).toBe('package');
    expect(packageOperation.name).toBe('Packung');
  });
});
