// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOL_MEAL_PLAN } from '@/lib/toolColors';
import ToolLandingPage from './ToolLandingPage';

const useCurrentUser = vi.fn();
vi.mock('@/api/auth', () => ({ useCurrentUser: () => useCurrentUser() }));

function renderLanding() {
  return render(
    <MemoryRouter>
      <ToolLandingPage
        tool={TOOL_MEAL_PLAN}
        subtitle="Untertitel"
        longDescription="Beschreibung"
        features={[]}
        examples={[]}
        faq={[]}
        ctaLabel="Zu den Essensplänen"
        ctaRoute="/meal-plans/app"
      />
    </MemoryRouter>,
  );
}

describe('ToolLandingPage sign-in prompt', () => {
  beforeEach(() => useCurrentUser.mockReset());

  it('offers "Kostenlos anmelden" to visitors', () => {
    useCurrentUser.mockReturnValue({ data: null });
    renderLanding();

    expect(screen.getByRole('link', { name: /Kostenlos anmelden/ })).toBeTruthy();
    expect(screen.getByText(/Erstelle ein kostenloses Konto/)).toBeTruthy();
  });

  it('hides the sign-in prompt for logged-in users', () => {
    useCurrentUser.mockReturnValue({ data: { id: 1, username: 'admin' } });
    renderLanding();

    expect(screen.queryByRole('link', { name: /Kostenlos anmelden/ })).toBeNull();
    expect(screen.queryByText(/kostenloses Konto/)).toBeNull();
    expect(screen.getAllByRole('link', { name: /Zu den Essensplänen/ }).length).toBeGreaterThan(0);
  });
});
