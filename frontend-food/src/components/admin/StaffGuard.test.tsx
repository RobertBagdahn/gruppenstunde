// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StaffGuard from './StaffGuard';

let currentUser: { is_staff: boolean } | null = null;
vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: currentUser, error: null, isLoading: false }),
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin/data-quality']}>
      <Routes>
        <Route path="/admin/data-quality" element={<StaffGuard><p>Buffet-Vorschläge</p></StaffGuard>} />
        <Route path="/recipes" element={<p>Rezeptliste</p>} />
        <Route path="/login" element={<p>Login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StaffGuard (data quality area incl. Buffet-Vorschläge)', () => {
  it('shows the area to staff', () => {
    currentUser = { is_staff: true };
    renderGuard();
    expect(screen.getByText('Buffet-Vorschläge')).toBeInTheDocument();
  });

  it('sends regular users to the recipe list', () => {
    currentUser = { is_staff: false };
    renderGuard();
    expect(screen.getByText('Rezeptliste')).toBeInTheDocument();
    expect(screen.queryByText('Buffet-Vorschläge')).not.toBeInTheDocument();
  });

  it('sends anonymous visitors to the login', () => {
    currentUser = null;
    renderGuard();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
