/**
 * Summary at the top of the ingredient detail page (food-progressive-disclosure):
 * Nutri-Score, price, the four core nutrition values and the standard portion.
 * Everything else lives in collapsible sections below.
 */
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import { formatEuro, formatNumber, formatWeight } from '@/lib/format';
import type { Portion } from '@/schemas/supply';

interface IngredientSummaryProps {
  nutriClass: number | null;
  pricePerKg: number | null;
  energyKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbohydrateG: number | null;
  portions: Portion[];
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="font-display text-emphasis font-bold tabular-nums text-foreground">{value ?? '–'}</dd>
    </div>
  );
}

function grams(value: number | null): string | null {
  return value == null ? null : `${formatNumber(value, { maxDecimals: 1 })} g`;
}

export default function IngredientSummary({
  nutriClass,
  pricePerKg,
  energyKcal,
  proteinG,
  fatG,
  carbohydrateG,
  portions,
}: IngredientSummaryProps) {
  const standard = portions.find((portion) => portion.is_default) ?? [...portions].sort((a, b) => a.rank - b.rank)[0];

  return (
    <section aria-label="Zusammenfassung" className="mb-6 rounded-xl bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex items-center gap-3">
          <NutriScoreBadge value={nutriClass} size="scale" />
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-3">
          <Fact label="Preis" value={pricePerKg != null ? `${formatEuro(pricePerKg)}/kg` : null} />
          {standard && (
            <Fact
              label="Standard-Portion"
              value={standard.weight_g != null ? `${standard.name} · ${formatWeight(standard.weight_g)}` : standard.name}
            />
          )}
        </dl>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border/60 pt-4 sm:grid-cols-4">
        <Fact label="Energie / 100 g" value={energyKcal != null ? `${Math.round(energyKcal)} kcal` : null} />
        <Fact label="Eiweiß" value={grams(proteinG)} />
        <Fact label="Fett" value={grams(fatG)} />
        <Fact label="Kohlenhydrate" value={grams(carbohydrateG)} />
      </dl>
    </section>
  );
}
