// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { formatSaveError } from './RecipeWizard';

describe('formatSaveError', () => {
  it('extracts a backend detail message', () => {
    expect(formatSaveError({ detail: 'Keine Berechtigung' })).toBe('Keine Berechtigung');
  });

  it('flattens structured validation errors', () => {
    expect(formatSaveError({ detail: [{ msg: 'Menge ist ungültig' }, { msg: 'Zutat fehlt' }] })).toBe(
      'Menge ist ungültig, Zutat fehlt',
    );
  });

  it('determines submitted status payload only for public visibility', () => {
    const getStatusPayload = (visibility: string) => {
      return visibility === 'public' ? { status: 'submitted' } : {};
    };
    expect(getStatusPayload('public')).toEqual({ status: 'submitted' });
    expect(getStatusPayload('private')).toEqual({});
    expect(getStatusPayload('group')).toEqual({});
  });
});
