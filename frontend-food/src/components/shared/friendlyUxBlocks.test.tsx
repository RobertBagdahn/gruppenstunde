// @vitest-environment jsdom
/**
 * Building blocks of food-frontend-friendly-ux: Nutri-Score, loading,
 * sections, error boundaries and toasts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import NutriScoreBadge, { nutriLetter, nutriScoreFill } from './NutriScoreBadge';
import SlowLoadingHint, { SLOW_LOADING_TEXT } from './SlowLoadingHint';
import QuerySection from './QuerySection';
import CollapsibleSection from './CollapsibleSection';
import SectionBoundary from './SectionBoundary';
import PageHeader from './PageHeader';
import MissingValuesHint from './MissingValuesHint';
import { MemoryRouter } from 'react-router-dom';
import { ApiError, NETWORK_ERROR_MESSAGE, SCHEMA_ERROR_MESSAGE, getApiErrorMessage } from '@/lib/api';

const sonner = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(() => 'loading-id'),
    dismiss: vi.fn(),
  });
  return { toast };
});
vi.mock('sonner', () => sonner);

import { notify, normalizeTitle, UNDO_DURATION_MS } from '@/lib/notify';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('NutriScoreBadge', () => {
  it('uses the official colours for every class and letter', () => {
    expect(nutriLetter(1)).toBe('A');
    expect(nutriLetter('d')).toBe('D');
    expect(nutriLetter(9)).toBeNull();
    expect(nutriScoreFill(4)).toBe('#EE8100');
    expect(nutriScoreFill(null)).toBe('#9CA3AF');
  });

  it('renders a labelled badge and nothing for unknown values', () => {
    const { container } = render(<NutriScoreBadge value={null} />);
    expect(container.textContent).toBe('');
    render(<NutriScoreBadge value={5} size="md" />);
    expect(screen.getByRole('img', { name: 'Nutri-Score E' }).className).toContain('bg-nutri-e');
  });

  it('highlights the current class on the scale', () => {
    render(<NutriScoreBadge value="B" size="scale" />);
    expect(screen.getByRole('img', { name: 'Nutri-Score B: Gut' })).toBeTruthy();
  });
});

describe('SlowLoadingHint', () => {
  it('appears only after three seconds', () => {
    vi.useFakeTimers();
    render(<SlowLoadingHint />);
    expect(screen.queryByText(SLOW_LOADING_TEXT)).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText(SLOW_LOADING_TEXT)).toBeTruthy();
  });
});

describe('QuerySection', () => {
  const base = { data: undefined, error: null, isPending: false, isError: false, refetch: vi.fn() };

  it('shows the skeleton while loading', () => {
    render(
      <QuerySection query={{ ...base, isPending: true }} skeleton={<p>Skelett</p>} errorTitle="x">
        {() => <p>Inhalt</p>}
      </QuerySection>,
    );
    expect(screen.getByText('Skelett')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows an inline error with retry instead of an empty state', () => {
    const refetch = vi.fn();
    render(
      <QuerySection
        query={{ ...base, isError: true, error: new ApiError(500, '', { detail: 'Kaputt' }), refetch }}
        skeleton={null}
        errorTitle="Rezepte konnten nicht geladen werden"
        isEmpty={() => true}
        empty={<p>Leer</p>}
      >
        {() => <p>Inhalt</p>}
      </QuerySection>,
    );
    expect(screen.getByText('Rezepte konnten nicht geladen werden')).toBeTruthy();
    expect(screen.queryByText('Leer')).toBeNull();
    fireEvent.click(screen.getByText('Erneut versuchen'));
    expect(refetch).toHaveBeenCalled();
  });

  it('separates empty data from content', () => {
    render(
      <QuerySection query={{ ...base, data: [] as number[] }} skeleton={null} errorTitle="x" isEmpty={(items) => items.length === 0} empty={<p>Leer</p>}>
        {() => <p>Inhalt</p>}
      </QuerySection>,
    );
    expect(screen.getByText('Leer')).toBeTruthy();
  });
});

describe('CollapsibleSection', () => {
  beforeEach(() => window.localStorage.clear());

  it('mounts content only when opened and remembers the state', () => {
    const first = render(
      <CollapsibleSection title="Alle Nährwerte" summary="pro 100 g" storageKey="test-nutrition">
        <p>Fett 3 g</p>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('Fett 3 g')).toBeNull();
    expect(screen.getByText('pro 100 g')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Alle Nährwerte/ }));
    expect(screen.getByText('Fett 3 g')).toBeTruthy();
    first.unmount();

    render(
      <CollapsibleSection title="Alle Nährwerte" storageKey="test-nutrition">
        <p>Fett 3 g</p>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Fett 3 g')).toBeTruthy();
  });
});

describe('SectionBoundary', () => {
  it('replaces only the crashed section', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Crash(): never {
      throw new Error('boom');
    }
    render(
      <div>
        <p>Rest der Seite</p>
        <SectionBoundary>
          <Crash />
        </SectionBoundary>
      </div>,
    );
    expect(screen.getByText('Rest der Seite')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Dieser Bereich konnte nicht angezeigt werden');
    spy.mockRestore();
  });
});

describe('PageHeader', () => {
  it('shows a skeleton badge while the count loads and the count afterwards', () => {
    const { rerender } = render(<PageHeader title="Rezepte" icon="menu_book" area="recipes" countLoading />);
    expect(screen.queryByText(/Rezepte$/, { selector: 'span' })).toBeNull();
    rerender(<PageHeader title="Rezepte" icon="menu_book" area="recipes" count={211} countLabel={{ one: 'Rezept', other: 'Rezepte' }} />);
    expect(screen.getByText('211 Rezepte')).toBeTruthy();
  });
});

describe('MissingValuesHint', () => {
  it('links editors to the edit page', () => {
    render(
      <MemoryRouter>
        <MissingValuesHint count={5} canEdit editHref="/ingredients/salz/edit" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: '5 Werte fehlen – ergänzen' }).getAttribute('href')).toBe('/ingredients/salz/edit');
  });

  it('shows a plain hint for readers and nothing without gaps', () => {
    const { container, rerender } = render(<MissingValuesHint count={1} />);
    expect(container.textContent).toBe('1 Wert fehlt');
    rerender(<MissingValuesHint count={0} />);
    expect(container.textContent).toBe('');
  });
});

describe('notify', () => {
  it('normalises titles', () => {
    expect(normalizeTitle('Zutat erstellt ✓')).toBe('Zutat erstellt');
    expect(normalizeTitle('Du bist abgemeldet.')).toBe('Du bist abgemeldet');
    expect(normalizeTitle('Rezept fertiggestellt!')).toBe('Rezept fertiggestellt');
  });

  it('builds the standard texts', () => {
    notify.saved('Zutat');
    expect(sonner.toast.success).toHaveBeenCalledWith('Zutat gespeichert', undefined);
    notify.failed('Rezept', 'gespeichert', new TypeError('Failed to fetch'));
    expect(sonner.toast.error).toHaveBeenCalledWith('Rezept konnte nicht gespeichert werden', {
      description: NETWORK_ERROR_MESSAGE,
    });
  });

  it('offers undo for removals', () => {
    const undo = vi.fn();
    notify.removed('Eintrag', undo);
    expect(sonner.toast.success).toHaveBeenCalledWith('Eintrag entfernt', {
      duration: UNDO_DURATION_MS,
      action: { label: 'Rückgängig', onClick: undo },
    });
  });

  it('switches a promise toast from loading to the result', async () => {
    await notify.promise(Promise.resolve(3), { loading: 'Wird ergänzt …', success: (n) => `${n} ergänzt`, error: 'x' });
    expect(sonner.toast.loading).toHaveBeenCalledWith('Wird ergänzt …');
    expect(sonner.toast.success).toHaveBeenCalledWith('3 ergänzt', { id: 'loading-id' });
  });
});

describe('getApiErrorMessage', () => {
  it('never shows English system texts', () => {
    expect(getApiErrorMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_ERROR_MESSAGE);
    const zod = Object.assign(new Error('[{"code":"invalid_type"}]'), { name: 'ZodError' });
    expect(getApiErrorMessage(zod)).toBe(SCHEMA_ERROR_MESSAGE);
    expect(getApiErrorMessage(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(
      'Ein unerwarteter Fehler ist aufgetreten.',
    );
    expect(getApiErrorMessage(new Error('Name ist erforderlich'))).toBe('Name ist erforderlich');
  });
});
