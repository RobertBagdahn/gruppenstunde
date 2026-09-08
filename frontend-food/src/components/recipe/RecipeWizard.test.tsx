// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { buildMetadataPatch, formatSaveError } from './RecipeWizard';

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

describe('buildMetadataPatch', () => {
  const loaded = {
    summary: 'KI Kurzfassung',
    description: '## KI Zubereitung',
    difficulty: 'easy',
    executionTime: '30_60',
    preparationTime: 'less_15',
    visibility: 'private',
    selectedTagSlugs: ['058e7081-bb7d-4412-a67c-a828052c3910'],
  };

  it('sends nothing before the metadata step reported its state', () => {
    // Clicking through the step used to send uninitialised defaults, which
    // wiped the AI-generated description and hid the preparation editor.
    expect(buildMetadataPatch(null)).toBeNull();
  });

  it('keeps loaded values when the user changed nothing', () => {
    expect(buildMetadataPatch(loaded)).toEqual({
      summary: 'KI Kurzfassung',
      description: '## KI Zubereitung',
      tag_ids: ['058e7081-bb7d-4412-a67c-a828052c3910'],
      visibility: 'private',
      difficulty: 'easy',
      execution_time: '30_60',
      preparation_time: 'less_15',
    });
  });

  it('omits empty choice fields because the backend rejects them', () => {
    const body = buildMetadataPatch({
      ...loaded,
      difficulty: '',
      executionTime: '',
      preparationTime: '',
    });
    expect(body).not.toHaveProperty('difficulty');
    expect(body).not.toHaveProperty('execution_time');
    expect(body).not.toHaveProperty('preparation_time');
  });

  it('still allows clearing free-text fields', () => {
    const body = buildMetadataPatch({ ...loaded, summary: '', description: '' });
    expect(body).toMatchObject({ summary: '', description: '' });
  });
});
