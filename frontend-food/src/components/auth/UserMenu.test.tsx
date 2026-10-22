import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UserMenu from './UserMenu';

const current = vi.hoisted(() => ({ user: null as null | { is_staff: boolean; display_name: string; email: string } }));

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: current.user, isLoading: false }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/components/auth/AiQuotaBar', () => ({ default: () => null }));
vi.mock('@/store/loginPromptStore', () => ({
  useLoginPrompt: (selector: (state: { show: () => void }) => unknown) => selector({ show: () => undefined }),
}));

function renderMenu() {
  render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: /Benutzermenü öffnen/ }));
}

describe('profile menu (food-page-shell, food-frontend-app)', () => {
  beforeEach(() => {
    current.user = null;
  });

  it('offers sign-in to visitors', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /Anmelden/ })).toBeInTheDocument();
  });

  it('offers profile, account and sign-out to members', async () => {
    current.user = { is_staff: false, display_name: 'Lea', email: 'lea@example.test' };
    renderMenu();
    await openMenu();
    expect(screen.getByRole('menuitem', { name: /Mein Profil/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Konto/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Abmelden/ })).toBeInTheDocument();
  });

  it('shows Administration to staff only', async () => {
    current.user = { is_staff: false, display_name: 'Lea', email: 'lea@example.test' };
    const { unmount } = render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>,
    );
    await openMenu();
    expect(screen.queryByRole('menuitem', { name: /Administration/ })).toBeNull();
    unmount();

    current.user = { is_staff: true, display_name: 'Lea', email: 'lea@example.test' };
    renderMenu();
    await openMenu();
    expect(screen.getByRole('menuitem', { name: /Administration/ })).toBeInTheDocument();
  });

  it('keeps the legal pages reachable on phones through the menu', async () => {
    current.user = { is_staff: false, display_name: 'Lea', email: 'lea@example.test' };
    renderMenu();
    await openMenu();
    const imprint = screen.getByRole('menuitem', { name: /Impressum/ });
    const privacy = screen.getByRole('menuitem', { name: /Datenschutz/ });
    expect(imprint.className).toContain('md:hidden');
    expect(privacy.className).toContain('md:hidden');
  });
});
