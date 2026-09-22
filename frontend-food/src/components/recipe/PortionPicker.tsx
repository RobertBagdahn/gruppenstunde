/**
 * PortionPicker — custom portion dropdown for recipe ingredient editing.
 *
 * Grouped sections:
 *  - "Zutat": the ingredient's own portions (by rank), name left, weight right
 *  - "Standardmengen": fixed catalog (EL, TL, Tasse, …), density-based grams
 *  - "Gramm": direct gram entry (no portion)
 *
 * Replaces the tiny native <select> in the inline ingredient editor and the
 * shadcn Select in the ingredient quantity dialog. Follows the custom
 * popover pattern of IngredientAssignmentDropdown (mobile-friendly, no new
 * dependencies).
 */
import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useStandardMeasures } from '@/api/supplies';
import { formatGramsShort, type PortionLabelInput } from '@/lib/portionLabels';
import { cn } from '@/lib/utils';

export interface PortionPickerPortion extends PortionLabelInput {
  id: number;
  rank: number;
  is_weight_trusted?: boolean | null;
}

/** Compact standard-measure shape the picker works with (full Zod schema may
 * carry stricter defaults; the picker only needs these display fields). */
export interface PickerStandardMeasure {
  key: string;
  name: string;
  grams: number;
  is_approx?: boolean;
}

interface PortionPickerProps {
  /** The ingredient's own portions (already sorted by rank from the API). */
  portions: PortionPickerPortion[];
  /** Currently selected portion id — null means direct grams. */
  value: number | null;
  /** Slug used to load the standard-measure catalog; hides that section when omitted. */
  ingredientSlug?: string;
  onSelectPortion: (portionId: number) => void;
  onSelectStandardMeasure: (measure: PickerStandardMeasure) => void;
  onSelectGrams: () => void;
  showGramsSection?: boolean;
  className?: string;
}

function portionDisplayName(portion: PortionPickerPortion): string {
  return portion.name || portion.measuring_unit_name || 'Gramm';
}

export default function PortionPicker({
  portions,
  value,
  ingredientSlug,
  onSelectPortion,
  onSelectStandardMeasure,
  onSelectGrams,
  showGramsSection = true,
  className,
}: PortionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: standardMeasures = [] } = useStandardMeasures(ingredientSlug ?? '');

  const close = () => setIsOpen(false);

  const selectedPortion = value != null ? portions.find((p) => p.id === value) ?? null : null;
  const triggerWeight = selectedPortion && selectedPortion.weight_g && selectedPortion.weight_g > 0
    ? formatGramsShort(selectedPortion.weight_g)
    : (selectedPortion ? 'Gewicht fehlt' : null);

  const sortedPortions = [...portions].sort((a, b) => a.rank - b.rank);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Portion wählen"
        className="w-full flex items-center justify-between gap-1 min-w-[4.5rem] px-1.5 py-1.5 text-xs text-muted-foreground border border-input rounded-md bg-background hover:bg-muted transition-colors"
      >
        <span className="truncate">{selectedPortion ? portionDisplayName(selectedPortion) : 'Gramm'}</span>
        <span className={cn('flex items-center gap-1 shrink-0', 'text-xs tabular-nums')}>
          {triggerWeight && <span className={selectedPortion && (!selectedPortion.weight_g || selectedPortion.weight_g <= 0) ? 'text-amber-600' : ''}>{triggerWeight}</span>}
          <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute top-full right-0 mt-1 w-56 max-w-[80vw] bg-card border border-border rounded-lg shadow-lg z-40 max-h-72 overflow-y-auto p-1">
            {/* Portionen der Zutat */}
            <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Zutat
            </p>
            {sortedPortions.map((portion) => {
              const isSelected = portion.id === value;
              const hasWeight = !!(portion.weight_g && portion.weight_g > 0);
              return (
                <button
                  key={portion.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectPortion(portion.id);
                    close();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-1 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
                    isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground',
                  )}
                >
                  <span className="truncate">{portionDisplayName(portion)}</span>
                  {hasWeight ? (
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {formatGramsShort(portion.weight_g ?? 0)}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 shrink-0">Gewicht fehlt</span>
                  )}
                  {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}

            {/* Standardmengen-Katalog */}
            {ingredientSlug && standardMeasures.length > 0 && (
              <>
                <p className="px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  Standardmengen
                </p>
                {standardMeasures.map((measure) => (
                  <button
                    key={measure.key}
                    type="button"
                    role="option"
                    onClick={() => {
                      onSelectStandardMeasure(measure);
                      close();
                    }}
                    className="w-full flex items-center justify-between gap-1 px-2 py-1.5 text-sm rounded-md transition-colors text-left hover:bg-muted text-foreground"
                  >
                    <span className="truncate">{measure.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {formatGramsShort(measure.grams)} g{measure.is_approx ? ' (ca.)' : ''}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Direkte Gramm-Eingabe */}
            {showGramsSection && (
              <>
                <p className="px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  Gramm
                </p>
                <button
                  type="button"
                  role="option"
                  aria-selected={value == null}
                  onClick={() => {
                    onSelectGrams();
                    close();
                  }}
                  className={cn(
                    'w-full flex items-center justify-between gap-1 px-2 py-1.5 text-sm rounded-md transition-colors text-left',
                    value == null ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground',
                  )}
                >
                  <span>Gramm</span>
                  <span className="text-xs text-muted-foreground shrink-0">freie Menge</span>
                  {value == null && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
