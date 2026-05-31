/**
 * UnitSwitcher — Allows switching the display unit for a recipe ingredient.
 * Shows a dropdown with alternative kitchen units (Tasse, EL, TL, etc.).
 * Marks approximate (generic) conversions with "(ca.)".
 *
 * Receives normalized conversion factors (per 1g) and scales them
 * by the actual ingredient weight.
 */
import { useMemo, useState } from 'react';
import type { AvailableConversionItem } from '@/schemas/supply';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface UnitSwitcherProps {
  /** The original formatted display string (e.g. "200 g") */
  originalDisplay: string;
  /** Normalized conversion factors (per 1 unit of from_unit) */
  conversions: AvailableConversionItem[];
  /** Actual weight in grams to scale the conversions */
  weightG: number;
  className?: string;
}

/** Units that are too small/large to be useful for display */
const HIDDEN_UNITS = new Set(['Pr', 'Msp', 'Tropfen', 'Kg']);

function formatNumber(value: number): string {
  if (value >= 100) {
    return Math.round(value).toLocaleString('de-DE');
  }
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

interface ScaledConversion {
  to_unit_id: number;
  to_unit_name: string;
  quantity: number;
  is_ingredient_specific: boolean;
  display: string;
}

export default function UnitSwitcher({
  originalDisplay,
  conversions,
  weightG,
  className,
}: UnitSwitcherProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Scale normalized factors by actual weight and filter useless results
  const scaledConversions = useMemo(() => {
    return conversions
      .filter((c) => !HIDDEN_UNITS.has(c.to_unit_name))
      .map((c): ScaledConversion => {
        const scaled = c.quantity * weightG;
        return {
          ...c,
          quantity: scaled,
          display: `${formatNumber(scaled)} ${c.to_unit_name}`,
        };
      })
      .filter((c) => c.quantity >= 0.01 && c.quantity <= 10000);
  }, [conversions, weightG]);

  if (scaledConversions.length === 0) {
    return (
      <span className={cn('font-semibold text-foreground text-base', className)}>
        {originalDisplay}
      </span>
    );
  }

  const selected = scaledConversions.find((c) => c.to_unit_id === selectedId);
  const currentDisplay = selected?.display ?? originalDisplay;
  const showApprox = selected ? !selected.is_ingredient_specific : false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'font-semibold text-foreground text-base inline-flex items-center gap-0.5',
            'hover:text-rose-600 transition-colors cursor-pointer',
            'border-b border-dashed border-muted-foreground/40 hover:border-rose-400',
            className,
          )}
          title="Einheit umschalten"
        >
          {currentDisplay}
          {showApprox && (
            <span className="text-xs text-muted-foreground font-normal ml-0.5">(ca.)</span>
          )}
          <span className="material-symbols-outlined text-[14px] text-muted-foreground ml-0.5">
            swap_vert
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        {selected && (
          <DropdownMenuItem onClick={() => setSelectedId(null)}>
            <span className="font-medium">{originalDisplay}</span>
            <span className="text-xs text-muted-foreground ml-auto">Original</span>
          </DropdownMenuItem>
        )}
        {scaledConversions.map((conv) => {
          const isActive = conv.to_unit_id === selectedId;

          return (
            <DropdownMenuItem
              key={conv.to_unit_id}
              onClick={() => setSelectedId(conv.to_unit_id)}
              disabled={isActive}
            >
              <span className={cn(isActive && 'font-medium')}>
                {conv.display}
              </span>
              {!conv.is_ingredient_specific && (
                <span className="text-xs text-muted-foreground ml-auto">(ca.)</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
