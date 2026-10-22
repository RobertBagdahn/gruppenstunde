import { describe, expect, it } from 'vitest';
import { isPreviewWriteBlocked } from './preview';

describe('isPreviewWriteBlocked', () => {
  it('never blocks anything outside preview builds', () => {
    expect(isPreviewWriteBlocked('/api/recipes/', 'POST', false)).toBe(false);
  });

  it('lets reads pass in preview builds', () => {
    expect(isPreviewWriteBlocked('/api/recipes/', 'GET', true)).toBe(false);
    expect(isPreviewWriteBlocked('/api/recipes/', 'head', true)).toBe(false);
  });

  it('blocks every write except sign-in and sign-out', () => {
    expect(isPreviewWriteBlocked('/api/recipes/', 'POST', true)).toBe(true);
    expect(isPreviewWriteBlocked('/api/recipes/1/', 'delete', true)).toBe(true);
    expect(isPreviewWriteBlocked('/api/shopping-lists/3/items/', 'PATCH', true)).toBe(true);
    expect(isPreviewWriteBlocked('/api/auth/login/', 'POST', true)).toBe(false);
  });
});
