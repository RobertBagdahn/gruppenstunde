// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IngredientEditPage from './IngredientEditPage';

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: { id: 2, username: 'user', is_staff: false, is_authenticated: true }, isLoading: false }),
}));

// Real `useUpdateIngredient` (and its fetch helper); only the reads are mocked.
vi.mock('@/api/supplies', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/supplies')>()),
  useIngredient: vi.fn(),
  useRetailSections: () => ({ data: [] }),
  useNutritionalTags: () => ({ data: [] }),
  useSimilarIngredients: () => ({ data: [], isLoading: false }),
  useIngredientSearch: () => ({ data: { items: [] }, isLoading: false }),
}));

vi.mock('@/api/tags', () => ({ useTags: () => ({ data: [] }) }));

vi.mock('@/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { useIngredient } from '@/api/supplies';
import { notify } from '@/lib/notify';

// Legacy data: sugar greater than carbohydrates (hard rule), stored before validation existed.
const legacyIngredient = {
  id: 1,
  slug: 'antipasti-zwiebeln',
  name: 'Antipasti Zwiebeln',
  status: 'draft',
  description: '',
  can_edit: true,
  can_verify: false,
  energy_kcal: 120,
  protein_g: 1,
  fat_g: 8,
  fat_sat_g: 1,
  carbohydrate_g: 5,
  sugar_g: 20,
  fibre_g: 1,
  salt_g: 1,
  sodium_mg: 400,
  price_per_kg: 2.75,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/ingredients/antipasti-zwiebeln/edit']}>
        <Routes>
          <Route path="/ingredients/:slug/edit" element={<IngredientEditPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fieldContainer(label: string): HTMLElement {
  return screen.getByText(label, { selector: 'label' }).parentElement as HTMLElement;
}

function inputFor(label: string): HTMLInputElement {
  return fieldContainer(label).querySelector('input') as HTMLInputElement;
}

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('IngredientEditPage nutrition validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIngredient).mockReturnValue({
      data: legacyIngredient,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIngredient>);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves a price change of an ingredient with implausible stored nutrition and shows the issue as a hint', async () => {
    const fetchMock = stubFetch(200, {});
    renderPage();

    expect(screen.getByText(/Die gespeicherten Nährwerte sind unplausibel/)).toBeInTheDocument();
    expect(within(fieldContainer('Zucker (g)')).getByText(/Zucker darf nicht größer/)).toBeInTheDocument();
    expect(within(fieldContainer('Zucker (g)')).queryByRole('alert')).toBeNull();

    fireEvent.change(inputFor('Preis pro kg (EUR)'), { target: { value: '3.10' } });
    fireEvent.click(screen.getByRole('button', { name: /Zutat speichern/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/ingredients/antipasti-zwiebeln/');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body)).price_per_kg).toBe(3.1);
    expect(notify.error).not.toHaveBeenCalledWith('Bitte korrigiere die markierten Nährwerte');
  });

  it('blocks saving once a nutrition value changes and the profile is still implausible', () => {
    const fetchMock = stubFetch(200, {});
    renderPage();

    fireEvent.change(inputFor('Salz (g)'), { target: { value: '1.5' } });

    expect(within(fieldContainer('Zucker (g)')).getByRole('alert').textContent).toMatch(/Zucker darf nicht größer/);
    fireEvent.click(screen.getByRole('button', { name: /Zutat speichern/ }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('Bitte korrigiere die markierten Nährwerte');
  });

  it('maps the fields of a 422 nutrition_implausible response to the inputs', async () => {
    vi.mocked(useIngredient).mockReturnValue({
      data: { ...legacyIngredient, sugar_g: 2 },
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useIngredient>);
    stubFetch(422, {
      detail: 'Nährwerte unplausibel: Eiweiß über 100 g',
      code: 'nutrition_implausible',
      fields: ['protein_g'],
    });
    renderPage();

    fireEvent.change(inputFor('Protein (g)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Zutat speichern/ }));

    await waitFor(() =>
      expect(within(fieldContainer('Protein (g)')).getByRole('alert').textContent).toBe(
        'Nährwerte unplausibel: Eiweiß über 100 g',
      ),
    );
    expect(within(fieldContainer('Fett (g)')).queryByRole('alert')).toBeNull();
  });
});
