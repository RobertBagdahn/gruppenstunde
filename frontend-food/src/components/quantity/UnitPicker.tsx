import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { optionWeightText } from '@/lib/quantityUnits';
import type { UnitOption } from '@/schemas/quantityUnits';

interface UnitPickerProps {
  /** Unit options of the ingredient; undefined while not loaded yet. */
  options: UnitOption[] | undefined;
  isLoading?: boolean;
  selectedKey: string | null;
  triggerLabel: string;
  onSelect: (option: UnitOption) => void;
  onMissingWeight?: (option: UnitOption) => void;
  /** Called when the list opens, so callers can load options lazily. */
  onOpen?: () => void;
  ariaLabel?: string;
  className?: string;
}

const GROUPS: { title: string; kinds: UnitOption['kind'][] }[] = [
  { title: 'Zutat', kinds: ['portion'] },
  { title: 'Standardmengen', kinds: ['standard'] },
  { title: 'Gramm', kinds: ['grams', 'milliliters'] },
];

/**
 * Compact unit switcher: every portion of the ingredient, all standard measures and g/ml,
 * each with its gram weight. Used for viewing and entering amounts in any unit.
 */
export default function UnitPicker({
  options,
  isLoading,
  selectedKey,
  triggerLabel,
  onSelect,
  onMissingWeight,
  onOpen,
  ariaLabel = 'Einheit wählen',
  className,
}: UnitPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    if (!isOpen) onOpen?.();
    setIsOpen(!isOpen);
  };

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className="inline-flex items-center gap-0.5 max-w-full px-1.5 py-0.5 text-caption text-muted-foreground border border-input rounded-lg bg-background hover:bg-muted transition-colors"
      >
        <span className="text-left">{triggerLabel}</span>
        <ChevronDown size={12} className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div
            role="listbox"
            aria-label={ariaLabel}
            className="absolute top-full right-0 mt-1 w-56 max-w-[80vw] bg-card rounded-xl shadow-card z-40 max-h-72 overflow-y-auto p-1"
          >
            {!options && (
              <p className="px-2 py-1.5 text-caption text-muted-foreground">
                {isLoading ? 'Einheiten werden geladen' : 'Keine Einheiten verfügbar'}
              </p>
            )}
            {options &&
              GROUPS.map((group) => {
                const groupOptions = options.filter((option) => group.kinds.includes(option.kind));
                if (groupOptions.length === 0) return null;
                return (
                  <div key={group.title}>
                    <p className="px-2 pt-2 pb-1 text-caption font-medium uppercase tracking-wide text-muted-foreground/70">
                      {group.title}
                    </p>
                    {groupOptions.map((option) => {
                      const isSelected = option.key === selectedKey;
                      const weight = optionWeightText(option);
                      return (
                        <div key={option.key}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            onSelect(option);
                            setIsOpen(false);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between gap-1 px-2 py-1.5 text-body rounded-lg transition-colors text-left',
                            isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground',
                          )}
                        >
                          <span className="truncate">{option.label}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {weight && (
                              <span
                                className={cn(
                                  'text-caption tabular-nums',
                                  option.has_weight ? 'text-muted-foreground' : 'text-warning',
                                )}
                              >
                                {weight}
                              </span>
                            )}
                            {isSelected && <Check size={14} className="text-primary" />}
                          </span>
                        </button>
                        {!option.has_weight && option.portion_id != null && onMissingWeight && (
                          <button
                            type="button"
                            onClick={() => {
                              onMissingWeight(option);
                              setIsOpen(false);
                            }}
                            className="w-full px-2 pb-1.5 text-left text-caption text-primary hover:underline"
                          >
                            Gewicht ergänzen
                          </button>
                        )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>
        </>
      )}
    </span>
  );
}
