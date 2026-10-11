import { describe, expect, it } from 'vitest';
import { CONTENT_TITLE_MAX_LENGTH, ContentTitleSchema } from './content';

describe('ContentTitleSchema (backend ContentCreateIn/ContentUpdateIn.title)', () => {
  it('trims the title', () => {
    expect(ContentTitleSchema.parse('  Lagerfeuer  ')).toBe('Lagerfeuer');
  });

  it('rejects blank and too long titles', () => {
    expect(ContentTitleSchema.safeParse('   ').success).toBe(false);
    expect(ContentTitleSchema.safeParse('x'.repeat(CONTENT_TITLE_MAX_LENGTH)).success).toBe(true);
    expect(ContentTitleSchema.safeParse('x'.repeat(CONTENT_TITLE_MAX_LENGTH + 1)).success).toBe(false);
  });
});
