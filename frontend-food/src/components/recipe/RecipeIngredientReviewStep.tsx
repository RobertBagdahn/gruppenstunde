import { useState } from 'react';
import { Check, ChevronDown, Plus, Search, Scale, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { IngredientReviewRow, ReviewPortion } from '@/schemas/ingredientReview';
import type { Portion } from '@/schemas/supply';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import { useIngredientPortions } from '@/api/supplies';
import IngredientQuantityDialog from './IngredientQuantityDialog';
import {
  isIngredientReviewRowComplete,
  useRecipeIngredientReviewStore,
} from '@/store/useRecipeIngredientReviewStore';

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

  if (!draft) return null;

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
    const portion = draft.portions[0];
    const quantity = draft.quantity && draft.quantity > 0 ? draft.quantity : 1;
    if (!portion) {
      updateRow(row.key, {
        selected_ingredient_name: draft.name,
        status: 'changed',
        reason: 'Bitte gib eine Portion für die neue Zutat an.',
      });
      return;
    }
    updateRow(row.key, {
      new_ingredient_draft: { ...draft, quantity },
      selected_ingredient_name: draft.name,
      selected_portion: { ...portion, is_new: true },
      suggested_portion: { ...portion, is_new: true },
      quantity,
      status: 'changed',
      reason: 'Neue Zutat vom Menschen bestätigt.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="flex-1">Neue Zutat prüfen</span>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              KI-Entwurf
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {DRAFT_NUMERIC_FIELDS.map(({ field, label }) => (
              <label key={field} className="block text-xs font-medium text-muted-foreground">
                {label}
                <input
                  type="number"
                  min="0"
                  value={String(draft.values[field] ?? '')}
                  onChange={(event) => updateValue(field, event.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Portion
              <input
                value={draft.portions[0]?.name ?? ''}
                onChange={(event) => updatePortion({ name: event.target.value })}
                placeholder="z. B. Stück"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Portionsgewicht (g)
              <input
                type="number"
                min="0.01"
                value={String(draft.portions[0]?.weight_g ?? '')}
                onChange={(event) => updatePortion({ weight_g: Number(event.target.value) || null })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Menge (Anzahl Portionen)
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={String(draft.quantity ?? 1)}
                onChange={(event) => updateDraft({ quantity: Number(event.target.value) || null })}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          {draft.portions[0]?.weight_g && draft.quantity && (
            <p className="text-xs text-muted-foreground">
              {draft.quantity} × {draft.portions[0].weight_g} g = {Math.round(draft.quantity * draft.portions[0].weight_g)} g
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const [newIngredientOpen, setNewIngredientOpen] = useState(false);
  const [quantityIngredient, setQuantityIngredient] = useState<{
    id: number;
    name: string;
    slug: string;
    portions: Portion[];
  } | null>(null);
  const confirmRow = useRecipeIngredientReviewStore((state) => state.confirmRow);
  const complete = isIngredientReviewRowComplete(row);
  const updateRow = useRecipeIngredientReviewStore((state) => state.updateRow);
  const { data: portions = [] } = useIngredientPortions(row.selected_ingredient_slug);
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

  const openQuantityDialogFor = (id: number, name: string, slug: string) => {
    setQuantityIngredient({ id, name, slug, portions });
    updateRow(row.key, {
      selected_ingredient_id: id,
      selected_ingredient_name: name,
      selected_ingredient_slug: slug,
      selected_portion: null,
      status: 'changed',
      reason: 'Die Zutat wurde vom Menschen ausgewählt. Bitte prüfe noch die Portion.',
    });
  };

  const selectCandidate = (id: number, name: string, slug: string) => {
    openQuantityDialogFor(id, name, slug);
    setAlternativesOpen(false);
  };

  const handleQuantityConfirm = (portionId: number | null, _measuringUnitId: number | null, quantity: number) => {
    if (!quantityIngredient) return;
    const portion = portions.find((p) => p.id === portionId);
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
  const alternativeCandidates = row.candidates.filter(
    (c) => c.id !== row.selected_ingredient_id && c.id !== row.suggested_ingredient_id,
  );

  return (
    <article className="rounded-xl border bg-card p-4 space-y-3" data-testid={`ingredient-review-row-${row.key}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Originalangabe</p>
          <p className="text-sm font-medium break-words">{row.source_text}</p>
          <div className="flex flex-wrap gap-1.5">
            {row.sources.map((source) => (
              <span key={`${source.type}-${source.value}`} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {source.label}
              </span>
            ))}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${row.status === 'confirmed' ? 'bg-primary/10 text-primary' : row.status === 'unresolved' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700'}`}>
          {row.status === 'confirmed' ? 'Bestätigt' : row.status === 'unresolved' ? 'Offen' : 'Zu prüfen'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Vorgeschlagene Zutat</p>
          <IngredientAutocomplete
            value={row.selected_ingredient_name || row.suggested_ingredient_name}
            onChange={(value) => updateRow(row.key, { selected_ingredient_name: value })}
            onSelect={(ingredient) => openQuantityDialogFor(ingredient.id, ingredient.name, ingredient.slug)}
            onCreateNew={() => updateRow(row.key, {
              selected_ingredient_id: null,
              selected_ingredient_name: '',
              status: 'unresolved',
              reason: 'Eine neue Zutat muss im Zutateneditor vollständig geprüft werden.',
            })}
            placeholder="Zutat suchen..."
          />
          <p className="text-xs text-muted-foreground mt-1">{row.reason || 'Manuelle Zuordnung erforderlich'}</p>

          {/* Candidate alternatives */}
          {alternativeCandidates.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setAlternativesOpen((open) => !open)}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
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
                      className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                    >
                      <span className="truncate">{candidate.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {Math.round(candidate.confidence * 100)} %
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(row.status === 'changed' || row.selected_ingredient_name !== row.suggested_ingredient_name) && (
            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs">
              <p className="font-medium text-muted-foreground">AI-Vorschlag</p>
              <p>{row.suggested_ingredient_name || 'Keine Zuordnung'}</p>
              <p className="mt-1 font-medium text-muted-foreground">Aktuelle Auswahl</p>
              <p>{row.selected_ingredient_name || 'Noch nicht ausgewählt'}</p>
            </div>
          )}

          {showDraftFields && draft && (
            <div className="mt-3 grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs font-semibold text-amber-950">Neue Zutat prüfen</p>
              <label className="text-xs text-amber-950">Name<input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
              {DRAFT_NUMERIC_FIELDS.map(({ field, label }) => (
                <label key={field} className="text-xs text-amber-950">{label}<input type="number" min="0" value={String(draft.values[field] ?? '')} onChange={(event) => updateDraft(field, event.target.value)} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
              ))}
              <button
                type="button"
                onClick={() => setNewIngredientOpen(true)}
                className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
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
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-primary"
              >
                <Sparkles className="h-4 w-4" />
                Neue Zutat prüfen
              </button>
            </div>
          )}
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-xs font-medium text-muted-foreground">Menge und Portion</p>
          <p>{row.quantity ?? '—'} {row.selected_portion?.name ?? '—'}</p>
          {row.suggested_quantity !== row.quantity && row.suggested_quantity !== null && (
            <p className="text-xs text-muted-foreground">AI-Menge: {row.suggested_quantity}</p>
          )}
          {row.selected_ingredient_id !== null && (
            <button
              type="button"
              onClick={() => {
                if (row.selected_ingredient_id === null) return;
                openQuantityDialogFor(row.selected_ingredient_id, row.selected_ingredient_name || '', row.selected_ingredient_slug);
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <Scale className="h-4 w-4" />
              Menge und Portion
            </button>
          )}
        </div>
      </div>

      {row.conflicts.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800">
          <p className="font-medium">Widersprüchliche Quellen</p>
          {row.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
          <Search className="h-4 w-4" />
          Zutat ändern
        </button>
        <button
          type="button"
          onClick={() => confirmRow(row.key)}
          disabled={!complete || row.status === 'confirmed'}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {row.status === 'confirmed' ? 'Bestätigt' : 'Vorschlag bestätigen'}
        </button>
        <button type="button" onClick={() => setDetailsOpen((open) => !open)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted">
          Details <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {detailsOpen && (
        <div className="border-t pt-3 text-sm text-muted-foreground space-y-1">
          <p>Match-Methode: {row.technical_details?.method ?? '—'}</p>
          <p>Konfidenz: {row.technical_details ? `${Math.round(row.technical_details.confidence * 100)} %` : '—'}</p>
          {row.technical_details?.candidates.map((candidate) => (
            <p key={candidate.id}>Kandidat: {candidate.name} ({Math.round(candidate.confidence * 100)} %)</p>
          ))}
        </div>
      )}

      {/* Quantity dialog for existing ingredients */}
      {quantityIngredient && (
        <IngredientQuantityDialog
          ingredient={quantityIngredient}
          open={!!quantityIngredient}
          onOpenChange={(isOpen) => {
            if (!isOpen) setQuantityIngredient(null);
          }}
          onConfirm={handleQuantityConfirm}
          initialQuantity={row.suggested_quantity ?? 1}
          confirmLabel="Übernehmen"
        />
      )}

      {/* Full AI draft review for new ingredients */}
      <NewIngredientDialog row={row} open={newIngredientOpen} onOpenChange={setNewIngredientOpen} />
    </article>
  );
}

export default function RecipeIngredientReviewStep({ onAddIngredient }: RecipeIngredientReviewStepProps) {
  const rows = useRecipeIngredientReviewStore((state) => state.rows);
  const error = useRecipeIngredientReviewStore((state) => state.error);
  const confirmCompleteRows = useRecipeIngredientReviewStore((state) => state.confirmCompleteRows);

  return (
    <section className="space-y-5" aria-labelledby="ingredient-review-title">
      <div>
        <h2 id="ingredient-review-title" className="text-2xl font-bold">Zutaten prüfen</h2>
        <p className="mt-1 text-sm text-muted-foreground">Die KI macht Vorschläge. Du entscheidest, welche Zutaten und Portionen ins Rezept kommen.</p>
      </div>
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={confirmCompleteRows} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
          <Check className="h-4 w-4" /> Alle Vorschläge übernehmen
        </button>
        <button type="button" onClick={onAddIngredient} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
          <Plus className="h-4 w-4" /> Zutat hinzufügen
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Noch keine Zutaten zur Prüfung vorhanden.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => <ReviewRow key={row.key} row={row} />)}
        </div>
      )}
    </section>
  );
}
