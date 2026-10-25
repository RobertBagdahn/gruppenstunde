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
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-card px-4 py-3 shadow-card md:py-4">
      <dt className="text-caption font-bold uppercase tracking-wider text-primary-dark">{label}</dt>
      <dd className="truncate font-display text-section font-extrabold tabular-nums text-foreground">{value ?? '–'}</dd>
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
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-line bg-card px-4 py-3 shadow-card md:py-4">
          <dt className="text-caption font-bold uppercase tracking-wider text-primary-dark">Nutri-Score</dt>
          <dd className="flex min-h-9 items-center">
            <NutriScoreBadge value={nutriClass} size="md" emptyLabel="–" className="h-10 w-10 text-section" />
          </dd>
        </div>
        <Fact
          label="Preis"
          value={pricePerKg != null ? `${formatEuro(pricePerKg)}/kg` : null}
        />
        {standard && (
          <Fact
            label="Standard-Portion"
            value={standard.weight_g != null ? `${standard.name} · ${formatWeight(standard.weight_g)}` : standard.name}
          />
        )}
        <Fact
          label="Energie / 100 g"
          value={energyKcal != null ? `${Math.round(energyKcal)} kcal` : null}
        />
        <Fact label="Eiweiß" value={grams(proteinG)} />
        <Fact label="Fett" value={grams(fatG)} />
        <Fact label="Kohlenhydrate" value={grams(carbohydrateG)} />
      </dl>
    </section>
  );
}
