import { NUTRI_SCORE_COLORS_BY_LETTER } from '@/schemas/supply';
import type { RecipeTypeStats } from '@/schemas/recipe';

interface Props {
  stats: RecipeTypeStats;
  currentNutriClass: number | undefined;
}

const GRADES = ['A', 'B', 'C', 'D', 'E'] as const;

function nutriClassToLetter(nutriClass: number): string {
  return { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' }[nutriClass] ?? '';
}

export function RecipeNutriScoreDistribution({ stats, currentNutriClass }: Props) {
  const dist = stats.nutri_score_dist;
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const currentLabel = nutriClassToLetter(currentNutriClass ?? 0);

  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Nutri-Score Verteilung
        <span className="font-normal ml-1.5 text-xs text-muted-foreground">
          ({stats.recipe_type}, {total} Rezepte)
        </span>
      </h3>

      <div className="space-y-2">
        {GRADES.map((grade) => {
          const count = dist[grade] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const isActive = currentLabel === grade;
          const colors = NUTRI_SCORE_COLORS_BY_LETTER[grade];

          return (
            <div key={grade} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-md text-xs font-extrabold shrink-0 ${
                  isActive
                    ? `${colors.bg} ${colors.text} shadow-md scale-110`
                    : `${colors.bg}/20 text-muted-foreground`
                }`}
              >
                {grade}
              </span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colors.bg}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {currentNutriClass != null && (
        <p className="text-xs text-muted-foreground text-center">
          Dieses Rezept: <span className="font-semibold text-foreground">Nutri-Score {currentLabel}</span>
        </p>
      )}
    </div>
  );
}
