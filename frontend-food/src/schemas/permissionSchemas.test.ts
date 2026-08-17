import { describe, expect, it } from 'vitest';
import { permissionBaseSchema } from './base';

describe('permission schemas', () => {
  it('requires both server-provided permission fields', () => {
    expect(permissionBaseSchema.safeParse({ can_edit: true, can_delete: false }).success).toBe(true);
    expect(permissionBaseSchema.safeParse({ can_edit: true }).success).toBe(false);
    expect(permissionBaseSchema.safeParse({ can_delete: false }).success).toBe(false);
  });
});
