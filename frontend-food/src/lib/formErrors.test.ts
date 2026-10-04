import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { applyApiFieldErrors } from './formErrors';

describe('applyApiFieldErrors', () => {
  it('maps 422 validation items onto known form fields in German', () => {
    const error = new ApiError(422, '', {
      detail: [
        { loc: ['body', 'payload', 'name'], msg: 'Field required' },
        { loc: ['body', 'payload', 'unknown'], msg: 'Field required' },
      ],
    });
    const setError = vi.fn();
    expect(applyApiFieldErrors(error, setError, ['name', 'icon'])).toBe(1);
    expect(setError).toHaveBeenCalledWith('name', { type: 'server', message: 'Pflichtfeld fehlt' });
    expect(error.message).toBe('name: Pflichtfeld fehlt, unknown: Pflichtfeld fehlt');
  });

  it('uses the detail text for explicit backend fields', () => {
    const error = new ApiError(400, '', { detail: 'Fett ist größer als die Summe.', fields: ['fat_g'] });
    const setError = vi.fn();
    expect(applyApiFieldErrors(error, setError, ['fat_g'])).toBe(1);
    expect(setError).toHaveBeenCalledWith('fat_g', { type: 'server', message: 'Fett ist größer als die Summe.' });
  });

  it('ignores errors without fields', () => {
    expect(applyApiFieldErrors(new Error('x'), vi.fn(), ['name'])).toBe(0);
  });
});
