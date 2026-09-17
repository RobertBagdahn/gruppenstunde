import { describe, expect, it } from 'vitest';
import { mergeMagicOperations, reorderMagicOperations } from './IngredientDetailPage';
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
});
