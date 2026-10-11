/**
 * Tests for the sign-in prompt in <ToolLandingPage>.
 * Renders with `renderToStaticMarkup` (no jsdom dependency).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { TOOL_PACKING_LISTS } from '@/lib/toolColors';
import type { User } from '@/schemas/auth';
import ToolLandingPage from './ToolLandingPage';

vi.mock('@/api/auth', () => ({ useCurrentUser: vi.fn() }));

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

function mockUser(user: User | null) {
  vi.mocked(useCurrentUser).mockReturnValue({ data: user } as CurrentUserQuery);
}

function renderLanding(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ToolLandingPage
        tool={TOOL_PACKING_LISTS}
        subtitle="Untertitel"
        longDescription="Beschreibung"
        features={[]}
        examples={[]}
        faq={[]}
        ctaLabel="Zu den Packlisten"
        ctaRoute="/packing-lists/app"
      />
    </MemoryRouter>,
  );
}

describe('<ToolLandingPage> sign-in prompt', () => {
  beforeEach(() => {
    vi.mocked(useCurrentUser).mockReset();
  });

  it('offers "Kostenlos anmelden" to visitors', () => {
    mockUser(null);
    const html = renderLanding();
    expect(html).toContain('Kostenlos anmelden');
    expect(html).toContain('Erstelle ein kostenloses Konto');
  });

  it('hides the sign-in prompt for logged-in users', () => {
    mockUser({
      id: 1,
      email: 'user@user.de',
      first_name: 'Uta',
      last_name: 'User',
      display_name: 'Uta User',
      is_staff: false,
      is_superuser: false,
      needs_onboarding: false,
      providers: [],
    });
    const html = renderLanding();
    expect(html).not.toContain('Kostenlos anmelden');
    expect(html).not.toContain('kostenloses Konto');
    expect(html).toContain('Zu den Packlisten');
  });
});
