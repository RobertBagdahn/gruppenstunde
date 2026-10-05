import { useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Scale, Search, Sparkles, Trash2 } from 'lucide-react';
import { notify, UNDO_DURATION_MS } from '@/lib/notify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { IngredientReviewRow, ReviewPortion } from '@/schemas/ingredientReview';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import { useIngredientPortions } from '@/api/supplies';
import IngredientQuantityDialog from './IngredientQuantityDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  isIngredientReviewRowComplete,
  useRecipeIngredientReviewStore,
} from '@/store/useRecipeIngredientReviewStore';
import { formatExactWeight, formatNumber, formatWeight } from '@/lib/format';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimalInput';
import {
  validateNutritionValues,
  type NutritionFieldErrors,
  type NutritionValues,
} from '@/lib/nutritionValidation';

interface RecipeIngredientReviewStepProps {
  onAddIngredient?: () => void;
}

// ---------------------------------------------------------------------------
// New ingredient review dialog
// ---------------------------------------------------------------------------

const DRAFT_NUMERIC_FIELDS = [
  { field: 'energy_kcal', label: 'Energie (kcal/100g)' },
  { field: 'protein_g', label: 'Eiweiß (g/100g)' },
  { field: 'fat_g', label: 'Fett (g/100g)' },
  { field: 'carbohydrate_g', label: 'Kohlenhydrate (g/100g)' },
  { field: 'sugar_g', label: 'Zucker (g/100g)' },
  { field: 'fibre_g', label: 'Ballaststoffe (g/100g)' },
  { field: 'salt_g', label: 'Salz (g/100g)' },
] as const;

/** Hard nutrition rules (same as the backend) for the draft's numeric values. */
function draftNutritionErrors(values: Record<string, unknown>): NutritionFieldErrors {
  const numeric: NutritionValues = {};
  for (const { field } of DRAFT_NUMERIC_FIELDS) {
    const raw = values[field];
    const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : null;
    numeric[field] = value !== null && Number.isFinite(value) ? value : null;
  }
  return validateNutritionValues(numeric);
}

function NewIngredientDialog({
  row,
  open,
  onOpenChange,
}: {
  row: IngredientReviewRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateRow = useRecipeIngredientReviewStore((state) => state.updateRow);
  const draft = row.new_ingredient_draft;
  const [quantityInput, setQuantityInput] = useState(() =>
    formatDecimalInput(draft?.quantity ?? 1),
  );
  const quantity = parseDecimalInput(quantityInput);
  const validQuantity = quantity !== null && quantity >= 0.01 ? quantity : null;

  if (!draft) return null;
  const nutritionErrors = draftNutritionErrors(draft.values);

  const updateDraft = (patch: Record<string, unknown>) => {
    updateRow(row.key, { new_ingredient_draft: { ...draft, ...patch } });
  };

  const updateValue = (field: string, value: string) => {
    const numericFields = new Set<string>(DRAFT_NUMERIC_FIELDS.map((f) => f.field));
    const key: string = field;
    updateDraft({
      values: {
        ...draft.values,
        [key]: numericFields.has(field) && value !== '' ? Number(value) : value,
      },
    });
  };

  const updatePortion = (patch: Partial<ReviewPortion>) => {
    const portions = draft.portions.length > 0
      ? [{ ...draft.portions[0], ...patch }]
      : [{
          id: null,
          name: 'Stück',
          quantity: 1,
          weight_g: null,
          measuring_unit_id: null,
          measuring_unit_name: null,
          is_new: true,
          ...patch,
        }];
    updateDraft({ portions });
  };

  const handleConfirm = () => {
    if (Object.keys(nutritionErrors).length > 0) return;
    const portion = draft.portions[0];
    if (validQuantity === null) return;
    if (!portion) {
      updateRow(row.key, {
        selected_ingredient_name: draft.name,
        status: 'changed',
        reason: 'Bitte gib eine Portion für die neue Zutat an.',
      });
      return;
    }
    updateRow(row.key, {
      new_ingredient_draft: { ...draft, quantity: validQuantity },
      selected_ingredient_name: draft.name,
      selected_portion: { ...portion, is_new: true },
      suggested_portion: { ...portion, is_new: true },
      quantity: validQuantity,
      status: 'changed',
      reason: 'Neue Zutat vom Menschen bestätigt.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-section font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="flex-1">Neue Zutat prüfen</span>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-caption font-medium text-primary">
              KI-Entwurf
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-body font-medium mb-1">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {DRAFT_NUMERIC_FIELDS.map(({ field, label }) => (
              <label key={field} className="block text-caption font-medium text-muted-foreground">
                {label}
                <input
                  type="number"
                  min="0"
                  value={String(draft.values[field] ?? '')}
                  onChange={(event) => updateValue(field, event.target.value)}
                  aria-invalid={nutritionErrors[field] ? true : undefined}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {nutritionErrors[field] && (
                  <span role="alert" className="mt-1 block text-destructive">
                    {nutritionErrors[field]}
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-caption font-medium text-muted-foreground">
              Portion
              <input
                value={draft.portions[0]?.name ?? ''}
                onChange={(event) => updatePortion({ name: event.target.value })}
                placeholder="z. B. Stück"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block text-caption font-medium text-muted-foreground">
              Portionsgewicht (g)
              <input
                type="number"
                min="0.01"
                value={String(draft.portions[0]?.weight_g ?? '')}
                onChange={(event) => updatePortion({ weight_g: Number(event.target.value) || null })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block text-caption font-medium text-muted-foreground">
              Menge (Anzahl Portionen)
              <input
                type="text"
                inputMode="decimal"
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
                aria-invalid={validQuantity === null}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          {draft.portions[0]?.weight_g && validQuantity !== null && (
            <p className="text-caption text-muted-foreground">
              {formatNumber(validQuantity, { maxDecimals: 2 })} × {formatExactWeight(draft.portions[0].weight_g)} = {formatWeight(validQuantity * draft.portions[0].weight_g)}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-body rounded-lg border hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={Object.keys(nutritionErrors).length > 0 || validQuantity === null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-body text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Zutat und Menge übernehmen
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Review row
// ---------------------------------------------------------------------------

function ReviewRow({ row }: { row: IngredientReviewRow }) {
  const [searchValue, setSearchValue] = useState(
    () => row.selected_ingredient_name || row.suggested_ingredient_name,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [newIngredientOpen, setNewIngredientOpen] = useState(false);
  const [removeLastOpen, setRemoveLastOpen] = useState(false);
  const [quantityIngredient, setQuantityIngredient] = useState<{
    id: number;
    name: string;
    slug: string;
  } | null>(null);
  const confirmRow = useRecipeIngredientReviewStore((state) => state.confirmRow);
  const removeRow = useRecipeIngredientReviewStore((state) => state.removeRow);
  const restoreRow = useRecipeIngredientReviewStore((state) => state.restoreRow);
  const complete = isIngredientReviewRowComplete(row);
  const updateRow = useRecipeIngredientReviewStore((state) => state.updateRow);
  const searchRef = useRef<HTMLDivElement>(null);
  // The quantity dialog must always offer the portions of the ingredient it was
  // opened for — not those of the row's previous selection.
  const {
    data: dialogPortions = [],
    isSuccess: dialogPortionsReady,
  } = useIngredientPortions(quantityIngredient?.slug ?? '');
  const draft = row.new_ingredient_draft;

  const updateDraft = (field: string, value: string) => {
    if (!draft) return;
    const numericFields = new Set(['energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g', 'sugar_g', 'fibre_g', 'salt_g', 'portion_weight_g']);
    updateRow(row.key, {
      new_ingredient_draft: {
        ...draft,
        name: field === 'name' ? value : draft.name,
        values: {
          ...draft.values,
          ...(field !== 'name' ? { [field]: numericFields.has(field) && value !== '' ? Number(value) : value } : {}),
        },
      },
      selected_ingredient_name: field === 'name' ? value : row.selected_ingredient_name,
    });
  };

  // A different ingredient invalidates portion and quantity; the dialog then
  // asks for both again.
  const selectIngredient = (id: number, name: string, slug: string) => {
    setSearchValue(name);
    setQuantityIngredient({ id, name, slug });
    updateRow(row.key, {
      selected_ingredient_id: id,
      selected_ingredient_name: name,
      selected_ingredient_slug: slug,
      selected_portion: null,
      quantity: null,
      // An existing ingredient replaces any pending "Neue Zutat prüfen" draft.
      new_ingredient_draft: null,
      status: 'changed',
      reason: 'Die Zutat wurde vom Menschen ausgewählt. Bitte prüfe noch die Portion.',
    });
  };

  // Re-opening the dialog for the current ingredient must not touch the row:
  // cancelling keeps portion and quantity.
  const openQuantityDialog = () => {
    if (row.selected_ingredient_id === null) return;
    setQuantityIngredient({
      id: row.selected_ingredient_id,
      name: row.selected_ingredient_name,
      slug: row.selected_ingredient_slug,
    });
  };

  const selectCandidate = (id: number, name: string, slug: string) => {
    selectIngredient(id, name, slug);
    setAlternativesOpen(false);
  };

  // Focus with the current text selected, so typing replaces it instead of appending to it.
  const focusSearch = () => {
    const input = searchRef.current?.querySelector('input');
    input?.focus();
    input?.select();
  };

  const handleNameChange = (value: string) => {
    setSearchValue(value);
    const current = useRecipeIngredientReviewStore.getState().rows.find((candidate) => candidate.key === row.key);
    if (!current || value === current.selected_ingredient_name) return;
    if (current.selected_ingredient_id === null) {
      updateRow(row.key, { selected_ingredient_name: value });
      return;
    }
    // Typing over a selected ingredient without picking a result: the name and the
    // saved ingredient must never differ, so the row becomes unresolved.
    updateRow(row.key, {
      selected_ingredient_id: null,
      selected_ingredient_slug: '',
      selected_ingredient_name: value,
      selected_portion: null,
      quantity: null,
      status: 'unresolved',
      reason: 'Bitte wähle eine Zutat aus der Suche.',
    });
  };

  const removeNow = () => {
    const removed = removeRow(row.key);
    if (!removed) return;
    notify.message('Zeile entfernt', {
      duration: UNDO_DURATION_MS,
      description: row.source_text,
      action: { label: 'Rückgängig', onClick: () => restoreRow(removed.row, removed.index) },
    });
  };

  // Removing the last row also removes the review step, so ask first.
  const handleRemove = () => {
    if (useRecipeIngredientReviewStore.getState().rows.length <= 1) {
      setRemoveLastOpen(true);
      return;
    }
    removeNow();
  };

  const missingQuantity = row.selected_ingredient_id !== null && row.quantity === null;

  const handleQuantityConfirm = (portionId: number | null, _measuringUnitId: number | null, quantity: number) => {
    if (!quantityIngredient) return;
    const portion = dialogPortions.find((p) => p.id === portionId);
    const selectedPortion: ReviewPortion | null = portion
      ? {
          id: portion.id,
          name: portion.name,
          quantity: portion.quantity,
          weight_g: portion.weight_g,
          measuring_unit_id: portion.measuring_unit_id,
          measuring_unit_name: portion.measuring_unit_name,
          is_new: false,
        }
      : null;
    updateRow(row.key, {
      selected_portion: selectedPortion,
      suggested_portion: selectedPortion,
      quantity,
      status: 'changed',
      reason: selectedPortion
        ? 'Portion und Menge vom Menschen bestätigt.'
        : 'Menge in Gramm vom Menschen bestätigt.',
    });
    setQuantityIngredient(null);
  };

  const showDraftFields = draft && !newIngredientOpen;
  const inlineNutritionErrors: NutritionFieldErrors = draft ? draftNutritionErrors(draft.values) : {};
  const alternativeCandidates = row.candidates.filter(
    (c) => c.id !== row.selected_ingredient_id && c.id !== row.suggested_ingredient_id,
  );

  return (
    <article className="rounded-xl bg-card p-4 space-y-3 shadow-card" data-testid={`ingredient-review-row-${row.key}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Originalangabe</p>
          <p className="text-body font-medium break-words">{row.source_text}</p>
          <div className="flex flex-wrap gap-1.5">
            {row.sources.map((source) => (
              <span key={`${source.type}-${source.value}`} className="rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
                {source.label}
              </span>
            ))}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-caption font-medium ${row.status === 'confirmed' ? 'bg-primary/10 text-primary' : row.status === 'unresolved' ? 'bg-destructive/10 text-destructive' : 'bg-warning-soft text-warning'}`}>
          {row.status === 'confirmed' ? 'Bestätigt' : row.status === 'unresolved' ? 'Offen' : 'Zu prüfen'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-caption font-medium text-muted-foreground">Vorgeschlagene Zutat</p>
          <div ref={searchRef}>
          <IngredientAutocomplete
            value={searchValue}
            onChange={handleNameChange}
            onSelect={(ingredient) => selectIngredient(ingredient.id, ingredient.name, ingredient.slug)}
            onCreateNew={(name) => {
              // "No existing ingredient fits": start a new-ingredient draft from the
              // typed name; the draft dialog completes values, portion and quantity.
              const draftName = (name || row.source_text).trim();
              setSearchValue(draftName);
              updateRow(row.key, {
                selected_ingredient_id: null,
                selected_ingredient_slug: '',
                selected_ingredient_name: draftName,
                selected_portion: null,
                quantity: null,
                new_ingredient_draft: row.new_ingredient_draft ?? {
                  name: draftName,
                  description: '',
                  status: 'draft',
                  values: {},
                  portions: [],
                  quantity: null,
                },
                status: 'unresolved',
                reason: 'Neue Zutat: bitte Nährwerte, Portion und Menge prüfen.',
              });
              setNewIngredientOpen(true);
            }}
            placeholder="Zutat suchen..."
          />
          </div>
          <p className="text-caption text-muted-foreground mt-1">{row.reason || 'Manuelle Zuordnung erforderlich'}</p>

          {/* Candidate alternatives */}
          {alternativeCandidates.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setAlternativesOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-caption font-medium text-muted-foreground hover:bg-muted"
              >
                <Search className="h-3.5 w-3.5" />
                Alternativen anzeigen ({alternativeCandidates.length})
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${alternativesOpen ? 'rotate-180' : ''}`} />
              </button>
              {alternativesOpen && (
                <div className="mt-2 space-y-1.5">
                  {alternativeCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => selectCandidate(candidate.id, candidate.name, candidate.slug)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-body hover:bg-muted"
                    >
                      <span className="truncate">{candidate.name}</span>
                      <span className="shrink-0 text-caption text-muted-foreground">
                        {Math.round(candidate.confidence * 100)} %
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(row.status === 'changed' || row.selected_ingredient_name !== row.suggested_ingredient_name) && (
            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2 text-caption">
              <p className="font-medium text-muted-foreground">AI-Vorschlag</p>
              <p>{row.suggested_ingredient_name || 'Keine Zuordnung'}</p>
              <p className="mt-1 font-medium text-muted-foreground">Aktuelle Auswahl</p>
              <p>{row.selected_ingredient_name || 'Noch nicht ausgewählt'}</p>
            </div>
          )}

          {showDraftFields && draft && (
            <div className="mt-3 grid gap-2 rounded-lg border border-warning-border bg-warning-soft p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-caption font-semibold text-warning">Neue Zutat prüfen</p>
              <label className="text-caption text-warning">Name<input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-body" /></label>
              {DRAFT_NUMERIC_FIELDS.map(({ field, label }) => (
                <label key={field} className="text-caption text-warning">{label}<input type="number" min="0" value={String(draft.values[field] ?? '')} onChange={(event) => updateDraft(field, event.target.value)} aria-invalid={inlineNutritionErrors[field] ? true : undefined} className="mt-1 w-full rounded-lg border bg-white px-2 py-1.5 text-body" />{inlineNutritionErrors[field] && <span role="alert" className="mt-1 block text-destructive">{inlineNutritionErrors[field]}</span>}</label>
              ))}
              <button
                type="button"
                onClick={() => setNewIngredientOpen(true)}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-body text-primary-foreground"
              >
                <Sparkles className="h-4 w-4" />
                Portion & Menge festlegen
              </button>
            </div>
          )}

          {draft && !showDraftFields && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setNewIngredientOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-body text-primary"
              >
                <Sparkles className="h-4 w-4" />
                Neue Zutat prüfen
              </button>
            </div>
          )}
        </div>
        <div className="text-body sm:text-right">
          <p className="text-caption font-medium text-muted-foreground">Menge und Portion</p>
          {row.quantity === null ? (
            <p className="font-medium text-warning">Menge fehlt</p>
          ) : (
            <p className="text-emphasis font-semibold">
              {formatNumber(row.quantity, { maxDecimals: 2 })} × {row.selected_portion?.name ?? '—'}
              {row.selected_portion?.weight_g ? (
                <span className="block text-caption font-normal text-muted-foreground">
                  à {formatExactWeight(row.selected_portion.weight_g)}
                </span>
              ) : null}
            </p>
          )}
          {row.suggested_quantity !== row.quantity && row.suggested_quantity !== null && (
            <p className="text-caption text-muted-foreground">
              KI-Menge: {formatNumber(row.suggested_quantity, { maxDecimals: 2 })}
            </p>
          )}
          {row.selected_ingredient_id !== null && (
            <button
              type="button"
              onClick={openQuantityDialog}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-body hover:bg-muted"
            >
              <Scale className="h-4 w-4" />
              Menge und Portion
            </button>
          )}
        </div>
      </div>

      {row.conflicts.length > 0 && (
        <div className="rounded-lg bg-warning-soft p-3 text-body text-warning">
          <p className="font-medium">Widersprüchliche Quellen</p>
          {row.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={focusSearch} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-body hover:bg-muted">
          <Search className="h-4 w-4" />
          Zutat ändern
        </button>
        <button
          type="button"
          onClick={() => {
            if (complete) {
              confirmRow(row.key);
            } else if (row.selected_ingredient_id !== null) {
              openQuantityDialog();
            } else if (draft) {
              setNewIngredientOpen(true);
            } else {
              focusSearch();
            }
          }}
          disabled={row.status === 'confirmed'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-body text-primary-foreground disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {row.status === 'confirmed'
            ? 'Bestätigt'
            : complete
              ? 'Vorschlag bestätigen'
              : missingQuantity || row.selected_ingredient_id !== null
                ? 'Menge festlegen'
                : 'Zutat wählen'}
        </button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Zeile entfernen"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-body text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Entfernen
        </button>
        <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-body text-muted-foreground hover:bg-muted">
          Details <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {detailsOpen && (
        <div className="border-t pt-3 text-body text-muted-foreground space-y-1">
          <p>Match-Methode: {row.technical_details?.method ?? '—'}</p>
          <p>Konfidenz: {row.technical_details ? `${Math.round(row.technical_details.confidence * 100)} %` : '—'}</p>
          {row.technical_details?.candidates.map((candidate) => (
            <p key={candidate.id}>Kandidat: {candidate.name} ({Math.round(candidate.confidence * 100)} %)</p>
          ))}
        </div>
      )}

      {/* Quantity dialog for existing ingredients */}
      {quantityIngredient && dialogPortionsReady && (
        <IngredientQuantityDialog
          key={quantityIngredient.slug}
          ingredient={{ ...quantityIngredient, portions: dialogPortions }}
          open={!!quantityIngredient}
          onOpenChange={(isOpen) => {
            if (!isOpen) setQuantityIngredient(null);
          }}
          onConfirm={handleQuantityConfirm}
          initialPortionId={row.selected_portion?.id ?? null}
          initialQuantity={row.selected_portion ? (row.quantity ?? 1) : (row.suggested_quantity ?? 1)}
          confirmLabel="Übernehmen"
        />
      )}

      <ConfirmDialog
        open={removeLastOpen}
        onConfirm={() => {
          setRemoveLastOpen(false);
          removeNow();
        }}
        onCancel={() => setRemoveLastOpen(false)}
        title="Letzte Zeile entfernen?"
        description="Danach gibt es nichts mehr zu prüfen, und das Rezept wird ohne importierte Zutaten angelegt."
        confirmLabel="Entfernen"
      />

      {/* Full AI draft review for new ingredients */}
      <NewIngredientDialog row={row} open={newIngredientOpen} onOpenChange={setNewIngredientOpen} />
    </article>
  );
}

export default function RecipeIngredientReviewStep({ onAddIngredient }: RecipeIngredientReviewStepProps) {
  const rows = useRecipeIngredientReviewStore((state) => state.rows);
  const error = useRecipeIngredientReviewStore((state) => state.error);
  const confirmCompleteRows = useRecipeIngredientReviewStore((state) => state.confirmCompleteRows);
  const addEmptyRow = useRecipeIngredientReviewStore((state) => state.addEmptyRow);

  return (
    <section className="space-y-5" aria-labelledby="ingredient-review-title">
      <div>
        <h2 id="ingredient-review-title" className="text-title font-bold">Zutaten prüfen</h2>
        <p className="mt-1 text-body text-muted-foreground">Die KI macht Vorschläge. Du entscheidest, welche Zutaten und Portionen ins Rezept kommen.</p>
      </div>
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-body text-destructive">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={confirmCompleteRows} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-body hover:bg-muted">
          <Check className="h-4 w-4" /> Alle Vorschläge übernehmen
        </button>
        <button type="button" onClick={() => { addEmptyRow(); onAddIngredient?.(); }} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-body hover:bg-muted">
          <Plus className="h-4 w-4" /> Zutat hinzufügen
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-body text-muted-foreground">Noch keine Zutaten zur Prüfung vorhanden.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => <ReviewRow key={row.key} row={row} />)}
        </div>
      )}
    </section>
  );
}
