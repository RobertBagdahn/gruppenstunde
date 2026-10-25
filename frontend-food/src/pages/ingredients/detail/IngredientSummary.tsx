/**
 * Summary at the top of the ingredient detail page (food-progressive-disclosure):
 * Nutri-Score, price, the four core nutrition values and the standard portion.
 * Everything else lives in collapsible sections below.
 */
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import { formatEuro, formatNumber, formatWeight } from '@/lib/format';
import { cn } from '@/lib/utils';
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

function Fact({ label, value, tint }: { label: string; value: string | null; tint: string }) {
  return (
    <div className={cn('min-w-0 rounded-xl px-4 py-3', tint)}>
      <dt className="text-caption font-bold">{label}</dt>
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
    <section aria-label="Zusammenfassung" className="mb-6 space-y-3">
      <div className="flex items-center gap-3">
        <NutriScoreBadge value={nutriClass} size="scale" />
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Fact
          tint="bg-category-warm-soft text-category-warm-foreground"
          label="Preis"
          value={pricePerKg != null ? `${formatEuro(pricePerKg)}/kg` : null}
        />
        {standard && (
          <Fact
            tint="bg-category-recipe-part-soft text-category-recipe-part-foreground"
            label="Standard-Portion"
            value={standard.weight_g != null ? `${standard.name} · ${formatWeight(standard.weight_g)}` : standard.name}
          />
        )}
        <Fact
          tint="bg-category-breakfast-soft text-category-breakfast-foreground"
          label="Energie / 100 g"
          value={energyKcal != null ? `${Math.round(energyKcal)} kcal` : null}
        />
        <Fact tint="bg-category-cold-soft text-category-cold-foreground" label="Eiweiß" value={grams(proteinG)} />
        <Fact tint="bg-category-snack-soft text-category-snack-foreground" label="Fett" value={grams(fatG)} />
        <Fact tint="bg-category-dessert-soft text-category-dessert-foreground" label="Kohlenhydrate" value={grams(carbohydrateG)} />
      </dl>
    </section>
  );
}
