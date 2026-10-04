// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const useCurrentUser = vi.fn();
vi.mock('@/api/auth', () => ({ useCurrentUser: () => useCurrentUser() }));
vi.mock('@/components/auth/LoginPanel', () => ({ default: () => <div>Anmeldeformular</div> }));

function renderLogin(entry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Startseite</div>} />
        <Route path="/meal-plans/app" element={<div>Essenspläne</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => useCurrentUser.mockReset());

  it('shows the form to visitors', () => {
    useCurrentUser.mockReturnValue({ data: null });
    renderLogin();
    expect(screen.getByText('Anmeldeformular')).toBeTruthy();
  });

  it('sends a logged-in user to the start page', () => {
    useCurrentUser.mockReturnValue({ data: { id: 1 } });
    renderLogin();
    expect(screen.getByText('Startseite')).toBeTruthy();
  });

  it('honours a safe next target for a logged-in user', () => {
    useCurrentUser.mockReturnValue({ data: { id: 1 } });
    renderLogin('/login?next=/meal-plans/app');
    expect(screen.getByText('Essenspläne')).toBeTruthy();
  });
});
