import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import type { PackageSuggestion, PackageSuggestionPatch } from '@/schemas/dataOffensive';
import { PHYSICAL_VISCOSITY_LABELS } from '@/schemas/supply';
import { DataCardRow } from '@/components/shared/CardTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatExactWeight, formatNumber } from '@/lib/format';
import { formatPackageLabel } from '@/lib/shoppingItemDisplay';
import { cn } from '@/lib/utils';

interface PackageSuggestionRowProps {
  suggestion: PackageSuggestion;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onAccept: () => void;
  onReject: () => void;
  onSave: (patch: PackageSuggestionPatch) => Promise<unknown>;
}

const STATUS_LABELS: Record<PackageSuggestion['status'], string> = {
  pending: 'Offen',
  accepted: 'Übernommen',
  rejected: 'Verworfen',
};

function confidenceClass(confidence: number): string {
  if (confidence >= 0.8) return 'bg-primary/10 text-primary border-primary/20';
  if (confidence >= 0.5) return 'bg-muted text-foreground border-border';
  return 'bg-destructive/10 text-destructive border-destructive/20';
}

/** One AI package suggestion with inline editing and accept/reject actions. */
export default function PackageSuggestionRow({
  suggestion,
  selected,
  busy,
  onToggle,
  onAccept,
  onReject,
  onSave,
}: PackageSuggestionRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(suggestion.package_name);
  const [weight, setWeight] = useState(String(suggestion.weight_g));
  const pending = suggestion.status === 'pending';
  const parsedWeight = Number(weight.replace(',', '.'));
  const canSave = name.trim().length > 0 && Number.isFinite(parsedWeight) && parsedWeight > 0;

  const save = async () => {
    if (!canSave) return;
    await onSave({ package_name: name.trim(), weight_g: parsedWeight });
    setEditing(false);
  };

  const viscosityLabel = PHYSICAL_VISCOSITY_LABELS[suggestion.physical_viscosity] ?? suggestion.physical_viscosity;

  return (
    <DataCardRow className={cn('md:items-start', selected && 'border-primary/40')} data-testid="package-suggestion">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {pending && (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0"
            checked={selected}
            onChange={onToggle}
            aria-label={`${suggestion.ingredient_name} auswählen`}
          />
        )}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/ingredients/${suggestion.ingredient_slug}`} className="font-semibold text-sm hover:text-primary">
              {suggestion.ingredient_name}
            </Link>
            {suggestion.retail_section_name && (
              <span className="text-xs text-muted-foreground">{suggestion.retail_section_name}</span>
            )}
            <span
              className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', confidenceClass(suggestion.confidence))}
              title="Konfidenz der KI"
            >
              {formatNumber(suggestion.confidence * 100, { maxDecimals: 0 })} %
            </span>
            {!pending && (
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                {STATUS_LABELS[suggestion.status]}
              </span>
            )}
          </div>

          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-8 w-44"
                aria-label="Packungsname"
              />
              <Input
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                inputMode="decimal"
                className="h-8 w-24"
                aria-label="Gewicht in Gramm"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          ) : (
            <p className="text-sm">
              <span className="font-medium">{formatPackageLabel(suggestion)}</span>
              <span className="text-muted-foreground"> · {formatExactWeight(suggestion.weight_g)}</span>
              {suggestion.volume_ml && (
                <span className="text-muted-foreground"> · {formatNumber(suggestion.volume_ml, { maxDecimals: 0 })} ml</span>
              )}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {viscosityLabel}
            {suggestion.physical_density && ` · Dichte ${formatNumber(suggestion.physical_density, { maxDecimals: 2 })} g/ml`}
            {suggestion.viscosity_is_manual && ' · Aggregatzustand manuell gepflegt, wird nicht überschrieben'}
          </p>
          {suggestion.reason && <p className="text-xs text-muted-foreground italic">{suggestion.reason}</p>}
        </div>
      </div>

      {pending && (
        <div className="flex flex-wrap gap-1.5 md:justify-end shrink-0">
          {editing ? (
            <>
              <Button size="sm" disabled={busy || !canSave} onClick={save}>
                <Check className="h-4 w-4" /> Speichern
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Abbrechen
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" disabled={busy} onClick={onAccept}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Übernehmen
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)} aria-label="Bearbeiten">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={onReject} aria-label="Verwerfen">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </DataCardRow>
  );
}
