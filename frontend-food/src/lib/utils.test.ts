import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('keeps a design-system font size when a text colour follows', () => {
    expect(cn('text-body', 'text-foreground')).toBe('text-body text-foreground');
    expect(cn('text-caption font-bold', 'text-muted-foreground')).toBe('text-caption font-bold text-muted-foreground');
    expect(cn('text-emphasis font-semibold', 'text-foreground')).toBe('text-emphasis font-semibold text-foreground');
  });

  it('keeps project colours separate from font sizes', () => {
    expect(cn('text-body', 'text-primary-dark')).toBe('text-body text-primary-dark');
    expect(cn('text-section', 'text-spice-foreground')).toBe('text-section text-spice-foreground');
  });

  it('lets the later font size win', () => {
    expect(cn('text-body', 'text-title')).toBe('text-title');
    expect(cn('text-caption', 'text-emphasis')).toBe('text-emphasis');
  });

  it('still resolves Tailwind sizes and conditional classes', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    const state = { hidden: false };
    expect(cn('text-body', state.hidden && 'hidden', null, 'font-bold')).toBe('text-body font-bold');
  });
});
