import { describe, expect, it } from 'vitest';
import { tagDisplayName } from './tagLabels';

describe('tagDisplayName', () => {
  it('names buffet and breakfast roles in German', () => {
    expect(tagDisplayName('buffet-bread')).toBe('Brot & Gebäck');
    expect(tagDisplayName('breakfast-topping')).toBe('Frühstück: Belag');
  });

  it('makes other slugs presentable', () => {
    expect(tagDisplayName('vegan')).toBe('Vegan');
    expect(tagDisplayName('gluten-free')).toBe('Gluten free');
  });
});
