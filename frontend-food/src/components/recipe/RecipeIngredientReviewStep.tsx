import { useState } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import type { IngredientReviewRow } from '@/schemas/ingredientReview';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import { useIngredientPortions } from '@/api/supplies';
import {
  isIngredientReviewRowComplete,
  useRecipeIngredientReviewStore,
} from '@/store/useRecipeIngredientReviewStore';

interface RecipeIngredientReviewStepProps {
  onAddIngredient?: () => void;
}

function ReviewRow({ row }: { row: IngredientReviewRow }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
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
            onSelect={(ingredient) => updateRow(row.key, {
              selected_ingredient_id: ingredient.id,
              selected_ingredient_slug: ingredient.slug,
              selected_ingredient_name: ingredient.name,
              selected_portion: null,
              suggested_portion: null,
              reason: 'Die Zutat wurde vom Menschen ausgewählt. Bitte prüfe noch die Portion.',
            })}
            onCreateNew={() => updateRow(row.key, {
              selected_ingredient_id: null,
              selected_ingredient_name: '',
              status: 'unresolved',
              reason: 'Eine neue Zutat muss im Zutateneditor vollständig geprüft werden.',
            })}
            placeholder="Zutat suchen..."
          />
          <p className="text-xs text-muted-foreground mt-1">{row.reason || 'Manuelle Zuordnung erforderlich'}</p>
          {(row.status === 'changed' || row.selected_ingredient_name !== row.suggested_ingredient_name) && (
            <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs">
              <p className="font-medium text-muted-foreground">AI-Vorschlag</p>
              <p>{row.suggested_ingredient_name || 'Keine Zuordnung'}</p>
              <p className="mt-1 font-medium text-muted-foreground">Aktuelle Auswahl</p>
              <p>{row.selected_ingredient_name || 'Noch nicht ausgewählt'}</p>
            </div>
          )}
          {draft && (
            <div className="mt-3 grid gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:grid-cols-2">
              <p className="sm:col-span-2 text-xs font-semibold text-amber-950">Neue Zutat prüfen</p>
              <label className="text-xs text-amber-950">Name<input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
              {['energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g', 'sugar_g', 'fibre_g', 'salt_g'].map((field) => (
                <label key={field} className="text-xs text-amber-950">{field}<input type="number" min="0" value={String(draft.values[field] ?? '')} onChange={(event) => updateDraft(field, event.target.value)} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
              ))}
              <label className="text-xs text-amber-950">Portion<input value={draft.portions[0]?.name ?? ''} onChange={(event) => updateRow(row.key, { new_ingredient_draft: { ...draft, portions: draft.portions.length > 0 ? [{ ...draft.portions[0], name: event.target.value }] : [{ id: null, name: event.target.value, quantity: 1, weight_g: null, measuring_unit_id: null, measuring_unit_name: null, is_new: true }] } })} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
              <label className="text-xs text-amber-950">Portionsgewicht (g)<input type="number" min="0.01" value={String(draft.portions[0]?.weight_g ?? '')} onChange={(event) => updateRow(row.key, { new_ingredient_draft: { ...draft, portions: draft.portions.length > 0 ? [{ ...draft.portions[0], weight_g: Number(event.target.value) || null }] : draft.portions } })} className="mt-1 w-full rounded border bg-white px-2 py-1.5 text-sm" /></label>
              {draft.portions[0] && row.selected_portion === null && <button type="button" onClick={() => updateRow(row.key, { selected_ingredient_name: draft.name, selected_portion: draft.portions[0] })} className="sm:col-span-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary">Zutat und Portion als geprüft übernehmen</button>}
            </div>
          )}
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-xs font-medium text-muted-foreground">Menge und Portion</p>
          <p>{row.quantity ?? '—'} {row.selected_portion?.name ?? '—'}</p>
          {row.suggested_quantity !== row.quantity && row.suggested_quantity !== null && (
            <p className="text-xs text-muted-foreground">AI-Menge: {row.suggested_quantity}</p>
          )}
          {row.selected_ingredient_id !== null && row.selected_portion === null && portions.length > 0 && (
            <select
              className="mt-2 max-w-full rounded-md border bg-background px-2 py-1 text-xs"
              defaultValue=""
              onChange={(event) => {
                const portion = portions.find((candidate) => candidate.id === Number(event.target.value));
                if (!portion) return;
                updateRow(row.key, {
                  selected_portion: {
                    id: portion.id,
                    name: portion.name,
                    quantity: portion.quantity,
                    weight_g: portion.weight_g,
                    measuring_unit_id: portion.measuring_unit_id,
                    measuring_unit_name: portion.measuring_unit_name,
                    is_new: false,
                  },
                  suggested_portion: null,
                });
              }}
            >
              <option value="">Portion auswählen</option>
              {portions.map((portion) => <option key={portion.id} value={portion.id}>{portion.name}</option>)}
            </select>
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
