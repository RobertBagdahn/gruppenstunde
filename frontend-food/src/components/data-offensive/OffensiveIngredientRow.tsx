import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, ExternalLink, Loader2, Sparkles, Trash2 } from 'lucide-react';
import type { OffensiveIngredient, OffensiveIngredientPatch, RetailSectionOption } from '@/schemas/dataOffensive';
import { DataCardRow } from '@/components/shared/CardTable';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CRITICAL_ISSUES,
  NUTRITION_COLUMNS,
  STATUS_LABELS,
  VERDICT_LABELS,
  flaggedFields,
  formatNumber,
  type NutritionField,
} from './offensiveMeta';

interface NumberCellProps {
  label: string;
  value: number | null;
  flagged: boolean;
  suggestion: number | undefined;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}

function parseNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function NumberCell({ label, value, flagged, suggestion, disabled, onCommit }: NumberCellProps) {
  const display = (v: number | null) => (v === null ? '' : String(Math.round(v * 100) / 100));
  const [draft, setDraft] = useState(display(value));
  useEffect(() => setDraft(display(value)), [value]);

  const commit = () => {
    const next = parseNumber(draft);
    if (next !== value) onCommit(next);
  };

  return (
    <label className="flex flex-col gap-0.5 min-w-0">
      <span className="text-caption uppercase tracking-wide text-muted-foreground truncate">{label}</span>
      <input
        inputMode="decimal"
        value={draft}
        disabled={disabled}
        placeholder="?"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
        }}
        className={cn(
          'h-8 w-full rounded-lg border bg-background px-1.5 text-body tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          flagged && 'border-destructive bg-destructive/5',
          value === null && 'border-dashed'
        )}
        aria-invalid={flagged}
      />
      {suggestion !== undefined && suggestion !== value && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCommit(suggestion)}
          className="text-caption text-primary hover:underline text-left truncate"
          title="KI-Vorschlag übernehmen"
        >
          KI: {formatNumber(suggestion)}
        </button>
      )}
    </label>
  );
}

interface OffensiveIngredientRowProps {
  ingredient: OffensiveIngredient;
  selected: boolean;
  sections: RetailSectionOption[];
  issueLabels: Record<string, string>;
  nutritionIssueLabels: Record<string, string>;
  busy: boolean;
  onToggle: () => void;
  onPatch: (patch: OffensiveIngredientPatch) => void;
  onReview: () => void;
  onAcceptSuggestions: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onMergeInto: (targetId: number) => void;
}

const HIDDEN_ROW_ISSUES = new Set(['not_reviewed', 'embedding_missing', 'suggestions_pending']);

export default function OffensiveIngredientRow({
  ingredient,
  selected,
  sections,
  issueLabels,
  nutritionIssueLabels,
  busy,
  onToggle,
  onPatch,
  onReview,
  onAcceptSuggestions,
  onPublish,
  onDelete,
  onMergeInto,
}: OffensiveIngredientRowProps) {
  const flagged = flaggedFields(ingredient);
  const hasSuggestions = Object.keys(ingredient.suggestions).length > 0 || !!ingredient.suggested_name;
  const visibleIssues = ingredient.issues.filter((issue) => !HIDDEN_ROW_ISSUES.has(issue));
  const [priceDraft, setPriceDraft] = useState(ingredient.price_per_kg === null ? '' : String(ingredient.price_per_kg));
  useEffect(
    () => setPriceDraft(ingredient.price_per_kg === null ? '' : String(ingredient.price_per_kg)),
    [ingredient.price_per_kg]
  );

  return (
    <DataCardRow className={cn('md:items-start', selected && 'border-primary/50 bg-primary/5')}>
      <div className="flex gap-3 min-w-0 md:w-72 md:shrink-0">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`${ingredient.name} auswählen`} className="mt-1" />
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Link
              to={`/ingredients/${ingredient.slug}`}
              target="_blank"
              className="font-semibold text-body leading-tight hover:text-primary truncate"
              title={ingredient.name}
            >
              {ingredient.name}
            </Link>
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          </div>
          <p className="text-caption text-muted-foreground">
            {STATUS_LABELS[ingredient.status] ?? ingredient.status} · {ingredient.usage_count}× verwendet
            {ingredient.quality_score !== null && ` · Qualität ${ingredient.quality_score}`}
          </p>
          {ingredient.suggested_name && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onPatch({ name: ingredient.suggested_name ?? undefined })}
              className="block text-left text-caption text-primary hover:underline"
            >
              Umbenennen in „{ingredient.suggested_name}“
            </button>
          )}
          {ingredient.duplicate_of_id !== null && ingredient.duplicate_of_name && (
            <button
              type="button"
              disabled={busy}
              onClick={() => ingredient.duplicate_of_id !== null && onMergeInto(ingredient.duplicate_of_id)}
              className="block text-left text-caption text-primary hover:underline"
            >
              In „{ingredient.duplicate_of_name}“ zusammenführen
            </button>
          )}
          <div className="flex flex-wrap gap-1">
            {ingredient.ai_review_verdict && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-caption font-medium">
                {VERDICT_LABELS[ingredient.ai_review_verdict] ?? ingredient.ai_review_verdict}
              </span>
            )}
            {visibleIssues.map((issue) => (
              <span
                key={issue}
                className={cn(
                  'rounded-full px-2 py-0.5 text-caption font-medium',
                  CRITICAL_ISSUES.has(issue) ? 'bg-destructive/10 text-destructive' : 'bg-accent/15 text-foreground'
                )}
              >
                {issueLabels[issue] ?? issue}
              </span>
            ))}
          </div>
          {ingredient.nutrition_issues.length > 0 && (
            <p className="text-caption text-destructive">
              {ingredient.nutrition_issues.map((code) => nutritionIssueLabels[code] ?? code).join(' · ')}
            </p>
          )}
          {ingredient.ai_reason && (
            <p className="text-caption text-muted-foreground italic">
              KI: {ingredient.ai_reason}
              {ingredient.ai_confidence !== null && ` (${Math.round(ingredient.ai_confidence * 100)} %)`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 flex-1 min-w-0 xl:grid-cols-8">
        {NUTRITION_COLUMNS.map(({ field, label }) => (
          <NumberCell
            key={field}
            label={label}
            value={ingredient[field]}
            flagged={flagged.has(field as NutritionField)}
            suggestion={ingredient.suggestions[field]}
            disabled={busy}
            onCommit={(value) => onPatch({ [field]: value })}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 md:w-56 md:shrink-0">
        <div className="grid grid-cols-[1fr_5rem] gap-1.5">
          <label className="flex flex-col gap-0.5 min-w-0">
            <span className="text-caption uppercase tracking-wide text-muted-foreground">
              Warengruppe{ingredient.retail_section_source === 'manual' && ' · manuell'}
            </span>
            <select
              value={ingredient.retail_section_id ?? ''}
              disabled={busy}
              onChange={(event) =>
                onPatch({ retail_section_id: event.target.value ? Number(event.target.value) : null })
              }
              className={cn(
                'h-8 w-full rounded-lg border bg-background px-1.5 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ingredient.issues.includes('section_missing') && 'border-destructive'
              )}
            >
              <option value="">– keine –</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-caption uppercase tracking-wide text-muted-foreground">€/kg</span>
            <input
              inputMode="decimal"
              value={priceDraft}
              disabled={busy}
              placeholder="?"
              onChange={(event) => setPriceDraft(event.target.value)}
              onBlur={() => {
                const next = parseNumber(priceDraft);
                if (next !== ingredient.price_per_kg) onPatch({ price_per_kg: next });
              }}
              className={cn(
                'h-8 w-full rounded-lg border bg-background px-1.5 text-body tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ingredient.issues.includes('price_missing') && 'border-destructive'
              )}
            />
            {ingredient.suggestions.price_per_kg !== undefined && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPatch({ price_per_kg: ingredient.suggestions.price_per_kg })}
                className="text-caption text-primary hover:underline text-left"
              >
                KI: {formatNumber(ingredient.suggestions.price_per_kg, 2)}
              </button>
            )}
          </label>
        </div>
        <div className="flex flex-wrap gap-1 justify-end">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-primary self-center" aria-label="Speichert" />}
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={onReview} title="Mit KI prüfen">
            <Sparkles className="h-4 w-4 text-primary" />
          </Button>
          {hasSuggestions && (
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={onAcceptSuggestions} title="Alle KI-Vorschläge übernehmen">
              <Check className="h-4 w-4" />
            </Button>
          )}
          {ingredient.status === 'draft' && (
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={onPublish} title="Veröffentlichen (nur wenn plausibel)">
              <BadgeCheck className="h-4 w-4" />
            </Button>
          )}
          {ingredient.can_delete && (
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={onDelete} title="Löschen (nur wenn unbenutzt)">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
    </DataCardRow>
  );
}
