// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { IngredientReviewRow } from '@/schemas/ingredientReview';
import type { Portion } from '@/schemas/supply';
import RecipeIngredientReviewStep from './RecipeIngredientReviewStep';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';
import { useIngredientPortions } from '@/api/supplies';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

vi.mock('@/api/supplies', () => ({
  useIngredientPortions: vi.fn(() => ({ data: [] })),
  useRetailSections: vi.fn(() => ({ data: [] })),
  useStandardMeasures: vi.fn(() => ({ data: [] })),
  useIngredientGroups: vi.fn(() => ({ data: [] })),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderReviewStep() {
  return render(
    <QueryClientProvider client={queryClient}>
      <RecipeIngredientReviewStep />
    </QueryClientProvider>,
  );
}

const portions: Portion[] = [
  {
    id: 1,
    name: 'Portion',
    quantity: 1,
    weight_g: 200,
    rank: 1,
    is_default: true,
    measuring_unit_id: 1,
    measuring_unit_name: 'Gramm',
  },
];

function greyZoneRow(overrides: Partial<IngredientReviewRow> = {}): IngredientReviewRow {
  return {
    key: 'row-1',
    source_text: '1 Dose Ananas',
    sources: [{ type: 'text', label: 'Eingefügter Rezepttext', value: 'text' }],
    selected_ingredient_id: null,
    selected_ingredient_slug: '',
    selected_ingredient_name: '',
    suggested_ingredient_id: null,
    suggested_ingredient_name: '1 Dose Ananas',
    candidates: [
      { id: 1, name: 'Ananas', slug: 'ananas', confidence: 0.5 },
      { id: 2, name: 'Ananasstücke (Dose)', slug: 'ananasstuecke-dose', confidence: 0.3 },
    ],
    selected_portion: null,
    suggested_portion: null,
    quantity: null,
    suggested_quantity: null,
    reason: 'Die semantische Ähnlichkeit ist nicht eindeutig.',
    technical_details: null,
    conflicts: [],
    new_ingredient_draft: null,
    status: 'unresolved',
    ...overrides,
  };
}

function newIngredientRow(overrides: Partial<IngredientReviewRow> = {}): IngredientReviewRow {
  return greyZoneRow({
    source_text: 'Crushed Ice',
    suggested_ingredient_name: 'Crushed Ice',
    candidates: [],
    new_ingredient_draft: {
      name: 'Crushed Ice',
      description: '',
      status: 'draft',
      values: { energy_kcal: 0, protein_g: 0, fat_g: 0, carbohydrate_g: 0, sugar_g: 0, fibre_g: 0, salt_g: 0 },
      portions: [
        {
          id: null,
          name: 'Handvoll',
          quantity: 1,
          weight_g: 50,
          measuring_unit_id: null,
          measuring_unit_name: null,
          is_new: true,
        },
      ],
      quantity: 2,
    },
    ...overrides,
  });
}

describe('RecipeIngredientReviewStep', () => {
  beforeEach(() => {
    // Portions are only known for the candidate ingredient, so the dialog must
    // load them for the ingredient it was opened for.
    vi.mocked(useIngredientPortions).mockImplementation(((slug: string) => (
      slug === 'ananas' ? { data: portions, isSuccess: true } : { data: [], isSuccess: Boolean(slug) }
    )) as never);
    useRecipeIngredientReviewStore.setState({
      rows: [],
      sources: [],
      aiInteractionId: null,
      isDirty: false,
      error: null,
      fieldErrors: {},
    });
  });

  it('shows candidates behind a collapsed "Alternativen anzeigen" toggle', () => {
    useRecipeIngredientReviewStore.setState({ rows: [greyZoneRow()] });
    renderReviewStep();

    expect(screen.queryByText('Ananasstücke (Dose)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Alternativen anzeigen/ }));
    expect(screen.getByRole('button', { name: /Ananasstücke \(Dose\)/ })).toBeInTheDocument();
  });

  it('selecting a candidate opens the quantity dialog and makes the row confirmable', () => {
    useRecipeIngredientReviewStore.setState({ rows: [greyZoneRow()] });
    renderReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /Alternativen anzeigen/ }));
    fireEvent.click(screen.getByRole('button', { name: /Ananas.*50 %/ }));

    expect(screen.getByText('Ananas hinzufügen')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));

    const row = useRecipeIngredientReviewStore.getState().rows[0];
    expect(row.selected_ingredient_id).toBe(1);
    expect(row.selected_ingredient_slug).toBe('ananas');
    expect(row.quantity).toBe(3);
    expect(row.selected_portion?.id).toBe(1);

    const confirmButton = screen.getByRole('button', { name: 'Vorschlag bestätigen' });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
  });

  it('offers no confirmation for an incomplete row', () => {
    useRecipeIngredientReviewStore.setState({ rows: [greyZoneRow()] });
    renderReviewStep();

    expect(screen.queryByRole('button', { name: 'Vorschlag bestätigen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zutat wählen' })).toBeInTheDocument();
  });

  describe('missing quantity', () => {
    const matchedRowWithoutQuantity = () => greyZoneRow({
      source_text: 'Ananas',
      selected_ingredient_id: 1,
      selected_ingredient_slug: 'ananas',
      selected_ingredient_name: 'Ananas',
      selected_portion: { ...portions[0], is_new: false },
      quantity: null,
      reason: 'Menge fehlt – bitte Menge und Portion festlegen.',
    });

    it('shows "Menge fehlt" and opens the quantity dialog from the primary action', () => {
      useRecipeIngredientReviewStore.setState({ rows: [matchedRowWithoutQuantity()] });
      renderReviewStep();

      expect(screen.getByText('Menge fehlt')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Menge festlegen' }));
      expect(screen.getByText('Ananas hinzufügen')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Übernehmen' }));

      expect(useRecipeIngredientReviewStore.getState().rows[0].quantity).toBe(1);
      expect(screen.getByRole('button', { name: 'Vorschlag bestätigen' })).toBeEnabled();
    });
  });

  it('keeps portion and quantity when the quantity dialog is cancelled', () => {
    useRecipeIngredientReviewStore.setState({
      rows: [greyZoneRow({
        selected_ingredient_id: 1,
        selected_ingredient_slug: 'ananas',
        selected_ingredient_name: 'Ananas',
        selected_portion: { ...portions[0], is_new: false },
        quantity: 2,
        status: 'open',
      })],
    });
    renderReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /Menge und Portion/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    const row = useRecipeIngredientReviewStore.getState().rows[0];
    expect(row.quantity).toBe(2);
    expect(row.selected_portion?.id).toBe(1);
    expect(screen.getByRole('button', { name: 'Vorschlag bestätigen' })).toBeEnabled();
  });

  it('shows the quantity in German format with the portion name and weight', () => {
    useRecipeIngredientReviewStore.setState({
      rows: [greyZoneRow({
        selected_ingredient_id: 1,
        selected_ingredient_slug: 'ananas',
        selected_ingredient_name: 'Ananas',
        selected_portion: { ...portions[0], name: 'Tasse Mehl', weight_g: 100, is_new: false },
        quantity: 2.4,
        status: 'open',
      })],
    });
    renderReviewStep();

    expect(screen.getByText(/2,4 × Tasse Mehl/)).toBeInTheDocument();
    expect(screen.getByText(/à 100 g/)).toBeInTheDocument();
  });

  describe('removing rows', () => {
    it('removes a row, lets the user undo it and never blocks the final save', () => {
      useRecipeIngredientReviewStore.setState({
        rows: [greyZoneRow({ key: 'keep', status: 'open', selected_ingredient_id: 1, selected_portion: { ...portions[0], is_new: false }, quantity: 1 }), greyZoneRow({ key: 'drop' })],
      });
      renderReviewStep();

      fireEvent.click(screen.getAllByRole('button', { name: 'Zeile entfernen' })[1]);

      expect(useRecipeIngredientReviewStore.getState().rows.map((row) => row.key)).toEqual(['keep']);
      useRecipeIngredientReviewStore.getState().confirmRow('keep');
      expect(useRecipeIngredientReviewStore.getState().getFinalizedRows()).toHaveLength(1);

      const calls = vi.mocked(toast).mock.calls;
      const [, options] = calls[calls.length - 1] as unknown as [string, { action: { onClick: () => void } }];
      options.action.onClick();
      expect(useRecipeIngredientReviewStore.getState().rows.map((row) => row.key)).toEqual(['keep', 'drop']);
    });

    it('asks before removing the last row', () => {
      useRecipeIngredientReviewStore.setState({ rows: [greyZoneRow({ key: 'only' })] });
      renderReviewStep();

      fireEvent.click(screen.getByRole('button', { name: 'Zeile entfernen' }));
      expect(useRecipeIngredientReviewStore.getState().rows).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: /^Entfernen$/ }));
      expect(useRecipeIngredientReviewStore.getState().rows).toHaveLength(0);
    });
  });

  it('adds an empty row with "Zutat hinzufügen"', () => {
    renderReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /Zutat hinzufügen/ }));

    const rows = useRecipeIngredientReviewStore.getState().rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('unresolved');
  });

  it('new ingredient draft is reviewed in a complete dialog and becomes confirmable', () => {
    useRecipeIngredientReviewStore.setState({ rows: [newIngredientRow()] });
    renderReviewStep();

    fireEvent.click(screen.getByRole('button', { name: /Portion & Menge festlegen/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Crushed Ice')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('50')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Zutat und Menge übernehmen/ }));

    const row = useRecipeIngredientReviewStore.getState().rows[0];
    expect(row.new_ingredient_draft).not.toBeNull();
    expect(row.selected_portion?.is_new).toBe(true);
    expect(row.quantity).toBe(2);

    const confirmButton = screen.getByRole('button', { name: 'Vorschlag bestätigen' });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
  });
});
