/**
 * Side panel of the ingredient detail page (canvas layout, desktop right column,
 * stacked below the main content on the phone): macro bars per 100 g and the
 * portion chips. Bars use one primary colour on a neutral track; no category tint.
 */
import { formatNumber, formatWeight } from '@/lib/format';
import type { Portion } from '@/schemas/supply';

interface IngredientNutrientAsideProps {
  carbohydrateG: number | null;
  proteinG: number | null;
  fatG: number | null;
  fibreG: number | null;
  saltG: number | null;
  portions: Portion[];
}

function NutrientBar({ label, value }: { label: string; value: number | null }) {
  const percent = value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-3 text-body">
      <span className="w-28 shrink-0 text-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-foreground">
        {value == null ? '–' : `${formatNumber(value, { maxDecimals: 1 })} g`}
      </span>
    </div>
  );
}

export default function IngredientNutrientAside({
  carbohydrateG,
  proteinG,
  fatG,
  fibreG,
  saltG,
  portions,
}: IngredientNutrientAsideProps) {
  return (
    <aside
      aria-label="Nährwerte und Portionen"
      className="space-y-5 rounded-xl border border-line bg-card p-5 shadow-card lg:sticky lg:top-24"
    >
      <div className="space-y-3">
        <h2 className="text-caption font-bold uppercase tracking-wider text-primary-dark">Nährwerte pro 100 g</h2>
        <NutrientBar label="Kohlenhydrate" value={carbohydrateG} />
        <NutrientBar label="Eiweiß" value={proteinG} />
        <NutrientBar label="Fett" value={fatG} />
        <NutrientBar label="Ballaststoffe" value={fibreG} />
        <NutrientBar label="Salz" value={saltG} />
      </div>
      {portions.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h2 className="text-caption font-bold uppercase tracking-wider text-primary-dark">Portionen</h2>
          <ul className="flex flex-wrap gap-2">
            {portions.map((portion) => (
              <li
                key={portion.id}
                className="rounded-full bg-muted px-3 py-1 text-caption font-semibold text-foreground"
              >
                {portion.name}
                {portion.weight_g != null && <span className="text-muted-foreground"> ≈ {formatWeight(portion.weight_g)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
