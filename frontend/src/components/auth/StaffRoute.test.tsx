/**
 * Tests for <StaffRoute>, the guard around all /admin/* routes.
 *
 * Renders with `renderToStaticMarkup` (no jsdom dependency). `<Navigate>` only
 * fires inside an effect, so it is replaced by a marker element that exposes
 * the redirect target.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import type { User } from '@/schemas/auth';
import StaffRoute from './StaffRoute';

vi.mock('@/api/auth', () => ({ useCurrentUser: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <span data-testid="navigate" data-to={to} />,
  };
});

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
    if (typeof msg === 'string' && msg.includes('useLayoutEffect does nothing on the server')) {
      return;
    }
    process.stderr.write(String(msg) + '\n');
  });
});
afterAll(() => {
  errorSpy.mockRestore();
});

type CurrentUserQuery = ReturnType<typeof useCurrentUser>;

function mockCurrentUser(state: Partial<CurrentUserQuery>) {
  vi.mocked(useCurrentUser).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...state,
  } as CurrentUserQuery);
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'user@user.de',
    first_name: 'Uta',
    last_name: 'User',
    display_name: 'Uta User',
    is_staff: false,
    is_superuser: false,
    needs_onboarding: false,
    providers: [],
    ...overrides,
  };
}

function renderAt(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<StaffRoute />}>
          <Route path="/admin/:section" element={<p>Admin-Inhalt</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('<StaffRoute>', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReset();
  });

  it('shows a loading state while the session is resolving', () => {
    mockCurrentUser({ isLoading: true });
    const html = renderAt('/admin/dashboard');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('Admin-Inhalt');
  });

  it('redirects anonymous visitors to the login page with a next parameter', () => {
    mockCurrentUser({ data: null });
    const html = renderAt('/admin/users?page=2');
    expect(html).toContain(`data-to="/login?next=${encodeURIComponent('/admin/users?page=2')}"`);
    expect(html).not.toContain('Admin-Inhalt');
  });

  it('shows "Keine Berechtigung" for logged-in non-staff users', () => {
    mockCurrentUser({ data: makeUser({ is_staff: false }) });
    const html = renderAt('/admin/dashboard');
    expect(html).toContain('Keine Berechtigung');
    expect(html).not.toContain('Admin-Inhalt');
    expect(html).not.toContain('data-testid="navigate"');
  });

  it('renders the admin route for staff users', () => {
    mockCurrentUser({ data: makeUser({ is_staff: true }) });
    const html = renderAt('/admin/dashboard');
    expect(html).toContain('Admin-Inhalt');
  });

  it('shows a retryable error when the session request fails', () => {
    mockCurrentUser({ isError: true, error: new Error('Failed to fetch') });
    const html = renderAt('/admin/dashboard');
    expect(html).toContain('Erneut versuchen');
    expect(html).not.toContain('Admin-Inhalt');
  });
});
