/**
 * Tests for <EntityLink>.
 *
 * Renders with `renderToStaticMarkup` (no jsdom dependency) and asserts on
 * the resulting HTML: URL resolution, target/rel attributes for newTab,
 * context-driven default, prop override, variant classes, and a11y attrs.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { EntityLink } from './EntityLink';
import { EntityLinkContext } from './EntityLinkContext';

// Silence react-router's SSR warning about useLayoutEffect — it's expected
// when running components server-side for assertion-only tests.
let errorSpy: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: unknown) => {
    if (typeof msg === 'string' && msg.includes('useLayoutEffect does nothing on the server')) {
      return;
    }
    // Re-emit any other error so genuine issues are not hidden.
    // eslint-disable-next-line no-console
    process.stderr.write(String(msg) + '\n');
  });
});
afterAll(() => {
  errorSpy.mockRestore();
});

function render(node: React.ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

// ---------------------------------------------------------------------------
// URL resolution per type
// ---------------------------------------------------------------------------

describe('<EntityLink> — URL resolution per type', () => {
  it('renders recipe link with slug', () => {
    const html = render(<EntityLink type="session" slug="apfelmus" name="Apfelmus" />);
    expect(html).toContain('href="/sessions/apfelmus"');
    expect(html).toContain('Apfelmus');
  });

  it('renders ingredient link with slug', () => {
    const html = render(<EntityLink type="material" slug="kartoffel" name="Kartoffel" />);
    expect(html).toContain('href="/materials/kartoffel"');
  });

  it('renders material link with slug', () => {
    const html = render(<EntityLink type="material" slug="zelt" name="Zelt" />);
    expect(html).toContain('href="/materials/zelt"');
  });

  it('renders event link with slug', () => {
    const html = render(<EntityLink type="event" slug="sola-26" name="SoLa 26" />);
    expect(html).toContain('href="/events/sola-26"');
  });

  it('renders session link with slug', () => {
    const html = render(<EntityLink type="session" slug="knoten" name="Knoten" />);
    expect(html).toContain('href="/sessions/knoten"');
  });

  it('renders game link with slug', () => {
    const html = render(<EntityLink type="game" slug="fangen" name="Fangen" />);
    expect(html).toContain('href="/games/fangen"');
  });

  it('renders blog link with slug', () => {
    const html = render(<EntityLink type="blog" slug="welcome" name="Welcome" />);
    expect(html).toContain('href="/blogs/welcome"');
  });

  it('renders group link with slug', () => {
    const html = render(<EntityLink type="group" slug="wuppertal" name="Wuppertal" />);
    expect(html).toContain('href="/groups/wuppertal"');
  });

  it('renders tag link as search query', () => {
    const html = render(<EntityLink type="tag" slug="outdoor" name="Outdoor" />);
    // Query param may be HTML-encoded (&amp;); plain path up to ? is stable
    expect(html).toMatch(/href="\/search\?tag_slugs=outdoor"/);
  });

  it('renders location link with id', () => {
    const html = render(<EntityLink type="location" id={7} name="Lagerplatz" />);
    expect(html).toMatch(/href="\/events\?event_location_id=7"/);
  });

  it('renders user link with id', () => {
    const html = render(<EntityLink type="user" id="abc" name="Alice" />);
    expect(html).toContain('href="/profile/name/abc"');
  });
});

// ---------------------------------------------------------------------------
// newTab behaviour
// ---------------------------------------------------------------------------

describe('<EntityLink> — newTab behaviour', () => {
  it('defaults to same tab when no context and no prop', () => {
    const html = render(<EntityLink type="session" slug="x" name="X" />);
    expect(html).not.toContain('target="_blank"');
  });

  it('defaults to new tab inside a "list" context', () => {
    const html = render(
      <EntityLinkContext.Provider value="list">
        <EntityLink type="session" slug="x" name="X" />
      </EntityLinkContext.Provider>,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('stays same tab inside a "detail" context', () => {
    const html = render(
      <EntityLinkContext.Provider value="detail">
        <EntityLink type="session" slug="x" name="X" />
      </EntityLinkContext.Provider>,
    );
    expect(html).not.toContain('target="_blank"');
  });

  it('explicit newTab prop overrides list context to same tab', () => {
    const html = render(
      <EntityLinkContext.Provider value="list">
        <EntityLink type="session" slug="x" name="X" newTab={false} />
      </EntityLinkContext.Provider>,
    );
    expect(html).not.toContain('target="_blank"');
  });

  it('explicit newTab prop overrides detail context to new tab', () => {
    const html = render(
      <EntityLinkContext.Provider value="detail">
        <EntityLink type="session" slug="x" name="X" newTab />
      </EntityLinkContext.Provider>,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});

// ---------------------------------------------------------------------------
// Variants + visual
// ---------------------------------------------------------------------------

describe('<EntityLink> — variants', () => {
  it('applies default variant class', () => {
    const html = render(<EntityLink type="session" slug="x" name="X" />);
    expect(html).toContain('text-primary');
  });

  it('applies muted variant class', () => {
    const html = render(<EntityLink type="session" slug="x" name="X" variant="muted" />);
    expect(html).toContain('text-muted-foreground');
  });

  it('applies chip variant class', () => {
    const html = render(<EntityLink type="tag" slug="x" name="X" variant="chip" />);
    expect(html).toContain('rounded-full');
  });

  it('merges custom className', () => {
    const html = render(
      <EntityLink type="session" slug="x" name="X" className="my-custom" />,
    );
    expect(html).toContain('my-custom');
  });
});

// ---------------------------------------------------------------------------
// Children + a11y
// ---------------------------------------------------------------------------

describe('<EntityLink> — children and accessibility', () => {
  it('renders children instead of name when provided', () => {
    const html = render(
      <EntityLink type="session" slug="x" name="Fallback">
        <span>custom-content</span>
      </EntityLink>,
    );
    expect(html).toContain('custom-content');
    // name is still used as the default aria-label, but must not appear as
    // visible text inside the link body.
    const bodyMatch = html.match(/<a[^>]*>(.*)<\/a>/s);
    expect(bodyMatch).not.toBeNull();
    expect(bodyMatch![1]).not.toContain('Fallback');
  });

  it('uses name as default aria-label', () => {
    const html = render(<EntityLink type="session" slug="x" name="Apfelmus" />);
    expect(html).toContain('aria-label="Apfelmus"');
  });

  it('respects aria-label override', () => {
    const html = render(
      <EntityLink type="session" slug="x" name="Apfelmus" aria-label="Rezept Apfelmus öffnen" />,
    );
    expect(html).toContain('aria-label="Rezept Apfelmus öffnen"');
  });

  it('includes focus-visible ring class for keyboard users', () => {
    const html = render(<EntityLink type="session" slug="x" name="X" />);
    expect(html).toContain('focus-visible:ring-2');
  });
});
