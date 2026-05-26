// Nutri-Score Badge + Total Price KPI — visible on mobile, hidden on desktop (sidebar takes over)

const NUTRI_SCORE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
};

interface RecipeHeaderInfoProps {
  nutriClass: number | null | undefined;
  priceTotal: number | null | undefined;
}

export default function RecipeHeaderInfo({ nutriClass, priceTotal }: RecipeHeaderInfoProps) {
  const hasNutri = nutriClass != null;
  const hasPrice = priceTotal != null;

  if (!hasNutri && !hasPrice) return null;

  const nutriLabel = hasNutri ? ['A', 'B', 'C', 'D', 'E'][nutriClass - 1] : null;
  const nutriColors = nutriLabel ? NUTRI_SCORE_COLORS[nutriLabel] : null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:hidden">
      {nutriLabel && nutriColors && (
        <div className="flex flex-col items-center text-center gap-2 bg-card rounded-xl border p-5">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Nutri-Score</span>
          <span className={`${nutriColors.bg} ${nutriColors.text} text-2xl font-extrabold px-5 py-2 rounded-md`}>
            {nutriLabel}
          </span>
        </div>
      )}
      {hasPrice && (
        <div className="flex flex-col items-center text-center gap-1 bg-yellow-50 rounded-xl border border-yellow-200 p-5">
          <span className="material-symbols-outlined text-3xl text-yellow-600">euro</span>
          <span className="text-base font-bold">
            {priceTotal!.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} €
          </span>
          <span className="text-xs text-muted-foreground">Gesamtkosten</span>
        </div>
      )}
    </div>
  );
}
