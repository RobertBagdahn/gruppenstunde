// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { IngredientReviewPreviewSchema, type IngredientReviewPreview } from '@/schemas/ingredientReview';
import { RecipeDetailSchema, type RecipeDetail } from '@/schemas/recipe';
import type { RecipeCreatePayload } from '@/api/recipes';
import { useRecipeIngredientReviewStore } from '@/store/useRecipeIngredientReviewStore';
import { useLoginPrompt } from '@/store/loginPromptStore';
import { useWizardStep } from './wizardContext';
import RecipeWizard from './RecipeWizard';

const mocks = vi.hoisted(() => ({
  analyze: vi.fn(),
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
  drafts: new Map<number, unknown>(),
  draftErrors: new Set<number>(),
  previewLeave: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  user: { current: { id: 1, email: 'u@inspi.dev' } as { id: number; email: string } | null },
}));

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ data: mocks.user.current }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

vi.mock('@/api/supplies', () => ({
  useIngredient: () => ({ data: undefined }),
}));

vi.mock('@/api/recipeImport', () => ({
  useRecipeIngredientReviewPreview: () => ({ mutateAsync: mocks.analyze }),
}));

vi.mock('@/api/recipes', () => ({
  useCreateRecipe: () => ({ mutateAsync: mocks.createRecipe }),
  useUpdateRecipe: () => ({ mutateAsync: mocks.updateRecipe }),
  useRecipe: (id: number) => ({
    data: mocks.drafts.get(id),
    isError: mocks.draftErrors.has(id),
  }),
}));

// Draft steps are covered by their own tests; stubs keep the wizard flow in focus.
vi.mock('./WizardStepIngredients', () => ({
  default: () => <div>Zutaten-Schritt</div>,
}));
vi.mock('./WizardStepMaterials', () => ({
  default: () => <div>Materialien-Schritt</div>,
}));
vi.mock('./WizardStepMetadata', () => ({
  default: () => <div>Metadaten-Schritt</div>,
}));
vi.mock('./WizardStepSteps', () => ({
  default: () => <div>Zubereitungs-Schritt</div>,
}));
vi.mock('./RecipeIngredientReviewStep', () => ({
  default: () => <div>Zutaten-prüfen-Schritt</div>,
}));
vi.mock('./WizardStepPreview', () => ({
  default: function PreviewStub() {
    const { registerLeave } = useWizardStep();
    useEffect(() => registerLeave((direction) => mocks.previewLeave(direction)), [registerLeave]);
    return <div>Vorschau-Schritt</div>;
  },
}));

function makeDraft(overrides: Partial<RecipeDetail> = {}): RecipeDetail {
  return RecipeDetailSchema.parse({
    id: 512,
    title: 'Kartoffelsuppe',
    slug: 'kartoffelsuppe',
    summary: '',
    summary_long: '',
    image_url: null,
    description: '',
    difficulty: 'easy',
    execution_time: 'less_30',
    preparation_time: 'none',
    status: 'draft',
    like_score: 0,
    view_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    scout_levels: [],
    tags: [],
    can_edit: true,
    can_delete: false,
    recipe_type: 'warm_meal',
    portions: 1,
    source_servings: 4,
    ...overrides,
  });
}

function makePreview(rowCount: number): IngredientReviewPreview {
  return IngredientReviewPreviewSchema.parse({
    rows: Array.from({ length: rowCount }, (_, index) => ({ key: `row-${index}`, source_text: `Zutat ${index}` })),
    recipe_draft: {
      title: 'Kartoffelsuppe',
      servings: 4,
      preparation_time: null,
      execution_time: null,
      recipe_type: 'warm_meal',
    },
  });
}

let navigateTo: (delta: number) => void = () => {};

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  navigateTo = (delta) => navigate(delta);
  return <div data-testid="location">{location.search}</div>;
}

function renderWizard(initialEntry = '/recipes/new') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RecipeWizard />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function searchParams(): URLSearchParams {
  return new URLSearchParams(screen.getByTestId('location').textContent ?? '');
}

function clickNext() {
  fireEvent.click(screen.getByTestId('recipe-wizard-next'));
}

async function analyzeText(preview: IngredientReviewPreview) {
  mocks.analyze.mockResolvedValueOnce(preview);
  fireEvent.change(screen.getByTestId('recipe-smart-input'), { target: { value: 'Kartoffelsuppe für 4 Personen' } });
  clickNext();
  await screen.findByTestId('recipe-wizard-step-basis');
}

function confirmServings() {
  fireEvent.click(screen.getByTestId('recipe-serving-context-confirm'));
}

beforeEach(() => {
  mocks.user.current = { id: 1, email: 'u@inspi.dev' };
  localStorage.clear();
  useLoginPrompt.setState({ open: false });
  mocks.drafts.clear();
  mocks.draftErrors.clear();
  mocks.createRecipe.mockImplementation(async (payload: RecipeCreatePayload) => {
    const draft = makeDraft({ title: payload.title, source_servings: payload.input_servings ?? null });
    mocks.drafts.set(draft.id, draft);
    return draft;
  });
  mocks.updateRecipe.mockResolvedValue(undefined);
  mocks.previewLeave.mockResolvedValue(true);
  useRecipeIngredientReviewStore.getState().reset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RecipeWizard for visitors', () => {
  it('keeps the draft and opens the login dialog instead of creating the recipe', async () => {
    mocks.user.current = null;
    renderWizard();
    await analyzeText(makePreview(0));
    confirmServings();
    clickNext();

    await waitFor(() => expect(useLoginPrompt.getState().open).toBe(true));
    expect(mocks.createRecipe).not.toHaveBeenCalled();
    expect(useLoginPrompt.getState().next).toContain('restoreDraft=recipe%3Anew');
    const stored = JSON.parse(localStorage.getItem('draft:recipe:new') ?? '{}');
    expect(stored.value.creationMethod).toBe('smart');
    expect(stored.value.basics.servings).toBe(4);
  });
});

describe('RecipeWizard step model', () => {
  it('shows the review step only when the analysis found ingredients', async () => {
    renderWizard();
    await analyzeText(makePreview(3));

    expect(screen.getByTestId('recipe-wizard-indicator-review')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  it('creates the draft when leaving basis if the AI found no ingredients', async () => {
    renderWizard();
    await analyzeText(makePreview(0));
    expect(screen.queryByTestId('recipe-wizard-indicator-review')).toBeNull();

    confirmServings();
    clickNext();

    await screen.findByText('Zutaten-Schritt');
    expect(mocks.createRecipe).toHaveBeenCalledTimes(1);
    const payload = mocks.createRecipe.mock.calls[0][0] as RecipeCreatePayload;
    expect(payload.recipe_items).toBeUndefined();
    expect(payload.input_servings).toBe(4);
    expect(searchParams().get('draft')).toBe('512');
    expect(searchParams().get('step')).toBe('ingredients');
  });

  it('falls back to "basis" when the last review row is removed, not to "input"', async () => {
    renderWizard();
    await analyzeText(makePreview(1));
    confirmServings();
    clickNext();
    await screen.findByTestId('recipe-wizard-step-review');

    act(() => {
      const { rows, removeRow } = useRecipeIngredientReviewStore.getState();
      removeRow(rows[0].key);
    });

    await screen.findByTestId('recipe-wizard-step-basis');
    expect(screen.queryByTestId('recipe-wizard-indicator-review')).toBeNull();
    await waitFor(() => expect(searchParams().get('step')).toBe('basis'));
    expect(mocks.createRecipe).not.toHaveBeenCalled();
  });

  it('sends review totals with input_servings instead of dividing them', async () => {
    renderWizard();
    await analyzeText(makePreview(1));
    confirmServings();
    clickNext();
    await screen.findByText('Zutaten-prüfen-Schritt');
    expect(mocks.createRecipe).not.toHaveBeenCalled();

    act(() => useRecipeIngredientReviewStore.setState({
      getFinalizedRows: () => [{
        key: 'row-0',
        status: 'confirmed',
        selected_ingredient_id: 7,
        selected_portion_id: 70,
        quantity: 500,
        temporary_ingredient: null,
      }],
    }));
    clickNext();

    await screen.findByText('Zutaten-Schritt');
    const payload = mocks.createRecipe.mock.calls[0][0] as RecipeCreatePayload;
    expect(payload.input_servings).toBe(4);
    expect(payload.recipe_items?.[0].quantity).toBe(500);
    expect(payload.ingredient_review_rows?.[0].quantity).toBe(500);
  });

  it('starts manually without calling the AI', async () => {
    renderWizard();
    fireEvent.click(screen.getByTestId('recipe-manual-start'));

    await screen.findByTestId('recipe-wizard-step-basis');
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect((screen.getByTestId('recipe-basis-title') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('recipe-serving-context-input') as HTMLInputElement).value).toBe('');
    expect(screen.queryByTestId('recipe-serving-context-confirm')).toBeNull();
    expect(screen.queryByTestId('recipe-wizard-indicator-review')).toBeNull();

    clickNext();
    expect(await screen.findByText('Bitte gib einen Titel ein.')).toBeInTheDocument();
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(screen.getByTestId('recipe-wizard-step-basis')).toBeTruthy();

    fireEvent.change(screen.getByTestId('recipe-basis-title'), { target: { value: 'Stockbrot' } });
    fireEvent.click(screen.getByRole('button', { name: 'Snack' }));
    fireEvent.change(screen.getByTestId('recipe-serving-context-input'), { target: { value: '6' } });
    clickNext();

    await screen.findByText('Zutaten-Schritt');
    const payload = mocks.createRecipe.mock.calls[0][0] as RecipeCreatePayload;
    expect(payload.title).toBe('Stockbrot');
    expect(payload.recipe_type).toBe('snack');
    expect(payload.input_servings).toBe(6);
    expect(payload.recipe_items).toBeUndefined();
  });

  it('rejects an empty analysis input with a hint to the manual start', async () => {
    renderWizard();
    clickNext();

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1));
    expect(mocks.toast.error.mock.calls[0][1]).toEqual({ description: 'Oder wähle „Ohne KI manuell beginnen“.' });
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(screen.getByTestId('recipe-wizard-step-input')).toBeTruthy();
  });

  it('creates one recipe on a double click and sends an idempotency key', async () => {
    let resolveCreate: (draft: RecipeDetail) => void = () => {};
    mocks.createRecipe.mockImplementation(() => new Promise<RecipeDetail>((resolve) => {
      resolveCreate = (draft) => {
        mocks.drafts.set(draft.id, draft);
        resolve(draft);
      };
    }));
    renderWizard();
    await analyzeText(makePreview(0));
    confirmServings();

    clickNext();
    clickNext();
    await waitFor(() => expect(mocks.createRecipe).toHaveBeenCalledTimes(1));
    await act(async () => resolveCreate(makeDraft()));

    await screen.findByText('Zutaten-Schritt');
    expect(mocks.createRecipe).toHaveBeenCalledTimes(1);
    const payload = mocks.createRecipe.mock.calls[0][0] as RecipeCreatePayload;
    expect(payload.idempotency_key).toMatch(/^recipe-wizard-/);
  });
});

describe('RecipeWizard URL state', () => {
  it('resumes a draft from the URL after a reload', async () => {
    mocks.drafts.set(512, makeDraft());
    renderWizard('/recipes/new?draft=512&step=materials');

    expect(await screen.findByText('Materialien-Schritt')).toBeTruthy();
    expect(mocks.createRecipe).not.toHaveBeenCalled();
  });

  it('opens ingredients for a step before the creation point', async () => {
    mocks.drafts.set(512, makeDraft());
    renderWizard('/recipes/new?draft=512&step=basis');

    expect(await screen.findByText('Zutaten-Schritt')).toBeTruthy();
    await waitFor(() => expect(searchParams().get('step')).toBe('ingredients'));
    expect(screen.getByTestId('recipe-wizard-back')).toHaveProperty('disabled', true);
    expect(screen.getByTestId('recipe-wizard-back-locked-hint')).toBeTruthy();
  });

  it('starts at input when reloading before the draft exists', async () => {
    renderWizard('/recipes/new?step=basis');

    expect(await screen.findByTestId('recipe-wizard-step-input')).toBeTruthy();
    await waitFor(() => expect(searchParams().get('step')).toBe('input'));
  });

  it('shows "Entwurf nicht gefunden" for a foreign draft', async () => {
    mocks.drafts.set(512, makeDraft({ can_edit: false, title: 'Fremdes Rezept' }));
    renderWizard('/recipes/new?draft=512&step=ingredients');

    expect(await screen.findByTestId('recipe-wizard-draft-not-found')).toBeTruthy();
    expect(screen.queryByText('Fremdes Rezept')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Neu beginnen' }));
    expect(await screen.findByTestId('recipe-wizard-step-input')).toBeTruthy();
    expect(searchParams().get('draft')).toBeNull();
  });

  it('shows "Entwurf nicht gefunden" for a missing draft', async () => {
    mocks.draftErrors.add(999);
    renderWizard('/recipes/new?draft=999');

    expect(await screen.findByTestId('recipe-wizard-draft-not-found')).toBeTruthy();
  });

  it('walks back one step with the browser history', async () => {
    mocks.drafts.set(512, makeDraft());
    renderWizard('/recipes/new?draft=512&step=materials');
    await screen.findByText('Materialien-Schritt');
    clickNext();
    await screen.findByText('Metadaten-Schritt');

    act(() => navigateTo(-1));

    expect(await screen.findByText('Materialien-Schritt')).toBeTruthy();
    expect(searchParams().get('draft')).toBe('512');
  });

  it('bounces browser back across the creation point', async () => {
    renderWizard();
    await analyzeText(makePreview(0));
    confirmServings();
    clickNext();
    await screen.findByText('Zutaten-Schritt');

    act(() => navigateTo(-1));

    await waitFor(() => expect(searchParams().get('draft')).toBe('512'));
    expect(searchParams().get('step')).toBe('ingredients');
    expect(screen.getByText('Zutaten-Schritt')).toBeTruthy();
    expect(mocks.toast.info).toHaveBeenCalled();
  });
});

describe('RecipeWizard toasts', () => {
  async function renderPreview() {
    mocks.drafts.set(512, makeDraft());
    renderWizard('/recipes/new?draft=512&step=preview');
    await screen.findByText('Vorschau-Schritt');
  }

  it('shows only the success toast when finishing works', async () => {
    await renderPreview();
    fireEvent.click(screen.getByTestId('recipe-wizard-finish'));

    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith('Rezept fertiggestellt', undefined));
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });

  it('shows only one error toast when finishing fails', async () => {
    mocks.previewLeave.mockRejectedValueOnce(new Error('Keine Berechtigung'));
    await renderPreview();
    fireEvent.click(screen.getByTestId('recipe-wizard-finish'));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(1));
    expect(mocks.toast.error).toHaveBeenCalledWith('Speichern fehlgeschlagen', { description: 'Keine Berechtigung' });
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });
});
