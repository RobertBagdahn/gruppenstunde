import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sticker from './Sticker';
import { StickerBoundary } from './StickerBoundary';

describe('sticker (food-design-system: höchstens ein Sticker pro Ansicht)', () => {
  it('renders a single sticker as a tilted yellow tag', () => {
    render(
      <StickerBoundary>
        <Sticker>Beliebt</Sticker>
      </StickerBoundary>,
    );
    expect(screen.getByText('Beliebt').className).toContain('bg-sticker');
  });

  it('turns every further sticker of the view into a flat tag', () => {
    render(
      <StickerBoundary>
        <Sticker>Beliebt</Sticker>
        <Sticker>Neu</Sticker>
      </StickerBoundary>,
    );
    expect(screen.getByText('Beliebt').className).toContain('bg-sticker');
    expect(screen.getByText('Neu').className).not.toContain('bg-sticker');
    expect(screen.getByText('Neu').className).toContain('bg-muted');
  });

  it('renders as sticker outside a boundary', () => {
    render(<Sticker>Grillen</Sticker>);
    expect(screen.getByText('Grillen').className).toContain('bg-sticker');
  });
});
