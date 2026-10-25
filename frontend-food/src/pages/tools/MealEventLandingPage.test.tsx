// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MealEventLandingPage from './MealEventLandingPage';

const useCurrentUser = vi.fn();
vi.mock('@/api/auth', () => ({ useCurrentUser: () => useCurrentUser() }));

function renderPage() {
  return render(
    <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
      <MealEventLandingPage />
    </MemoryRouter>,
  );
}

describe('MealEventLandingPage', () => {
  beforeEach(() => useCurrentUser.mockReset());

  it('renders exactly one H1 and links the CTA to the plan list', () => {
    useCurrentUser.mockReturnValue({ data: null });
    renderPage();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('link', { name: /Zu den Essensplänen/ })[0].getAttribute('href')).toBe('/meal-plans/app');
  });

  it('offers "Kostenlos anmelden" to visitors only', () => {
    useCurrentUser.mockReturnValue({ data: null });
    renderPage();
    expect(screen.getByRole('link', { name: /Kostenlos anmelden/ })).toBeTruthy();
    expect(screen.getByText(/Erstelle ein kostenloses Konto/)).toBeTruthy();
  });

  it('hides the sign-in prompt for logged-in users', () => {
    useCurrentUser.mockReturnValue({ data: { id: 1, username: 'admin' } });
    renderPage();
    expect(screen.queryByRole('link', { name: /Kostenlos anmelden/ })).toBeNull();
    expect(screen.getByText(/Leg direkt los/)).toBeTruthy();
  });
});
