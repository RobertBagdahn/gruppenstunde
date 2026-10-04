import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RecipeDeleteUsageNotice from './RecipeDeleteUsageNotice';

function renderNotice(usage: Parameters<typeof RecipeDeleteUsageNotice>[0]['usage']) {
  return render(
    <MemoryRouter>
      <RecipeDeleteUsageNotice usage={usage} />
    </MemoryRouter>,
  );
}

describe('RecipeDeleteUsageNotice', () => {
  it('renders nothing for an unused recipe', () => {
    renderNotice({ plan_count: 0, plans: [] });
    expect(screen.queryByTestId('recipe-delete-usage')).toBeNull();
  });

  it('lists visible plans with links', () => {
    renderNotice({ plan_count: 1, plans: [{ id: 7, name: 'Sommerlager' }] });
    expect(screen.getByText('Wird in 1 Essensplan verwendet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Sommerlager' }).getAttribute('href')).toBe('/meal-plans/7');
  });

  it('mentions plans of other users that are not listed', () => {
    renderNotice({ plan_count: 3, plans: [{ id: 1, name: 'Eigener Plan' }] });
    expect(screen.getByText('Wird in 3 Essensplänen verwendet')).toBeTruthy();
    expect(screen.getByText('und 2 weitere Pläne anderer Nutzer')).toBeTruthy();
  });
});
