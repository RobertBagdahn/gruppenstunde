import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AreaTabs, { type AreaTab } from './AreaTabs';

const tabs: AreaTab[] = [
  { label: 'Zutaten', to: '/ingredients', activePrefixes: ['/ingredients'] },
  { label: 'Material', to: '/material', activePrefixes: ['/material', '/material-list'] },
];

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AreaTabs tabs={tabs} label="Zutaten und Material" />
    </MemoryRouter>,
  );
}

describe('AreaTabs', () => {
  it('marks Material as the current tab on the material pages', () => {
    renderAt('/material/schneebesen');
    expect(screen.getByRole('link', { name: 'Material' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Zutaten' })).not.toHaveAttribute('aria-current');
  });

  it('marks Zutaten on the ingredient pages', () => {
    renderAt('/ingredients/zwiebel');
    expect(screen.getByRole('link', { name: 'Zutaten' })).toHaveAttribute('aria-current', 'page');
  });
});
