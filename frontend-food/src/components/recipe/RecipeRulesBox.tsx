import { useMemo, useState } from 'react';
import { useRecipeRules } from '@/api/recipes';

interface RecipeRulesBoxProps {
  recipeId: number;
}

export default function RecipeRulesBox({ recipeId }: RecipeRulesBoxProps) {
  const { data, isLoading, error } = useRecipeRules(recipeId);
  const [open, setOpen] = useState(false);

  const sortedItems = useMemo(() => {
    if (!data?.items) return [];
    const priority = { red: 0, yellow: 1, green: 2 };
    return [...data.items].sort((a, b) => priority[a.status] - priority[b.status]);
  }, [data?.items]);

  if (isLoading) {
    return (
      <div className="mt-6 bg-card rounded-xl border p-5 animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-2" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.is_applicable) {
    return (
      <section className="mt-6 rounded-xl border bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[20px] text-indigo-500 mt-0.5">info</span>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Keine Nährwert-Bewertung für diesen Rezepttyp</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.message || 'Rezeptregeln bewerten, ob eine vollständige Mahlzeit ausgewogen ist. Dieser Rezepttyp ist jedoch keine eigenständige Mahlzeit, sondern nur ein Baustein – die Nährwerte werden erst im Essensplaner auf die gesamte Mahlzeit angewandt.'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 bg-card rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/50 transition-colors"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span className="material-symbols-outlined text-[18px] text-indigo-500">task_alt</span>
          Rezeptregeln
        </h2>
        <div className="flex items-center gap-3">
          {/* Zähler-Ampel */}
          <div className="flex items-center gap-2 text-xs font-medium bg-muted px-2.5 py-1 rounded-full shrink-0">
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {data.green_count}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {data.yellow_count}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {data.red_count}
            </span>
          </div>
          <span
            className={`material-symbols-outlined text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            expand_more
          </span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-0">
          {sortedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              Keine Regeln für dieses Rezept definiert.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {sortedItems.map((item) => {
                const statusMeta = {
                  green: {
                    icon: 'check_circle',
                    text: 'text-emerald-600 dark:text-emerald-400',
                    border: 'border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10',
                  },
                  yellow: {
                    icon: 'warning',
                    text: 'text-amber-600 dark:text-amber-400',
                    border: 'border-amber-100 dark:border-amber-950 bg-amber-50/20 dark:bg-amber-950/10',
                  },
                  red: {
                    icon: 'cancel',
                    text: 'text-rose-600 dark:text-rose-400',
                    border: 'border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10',
                  },
                }[item.status] || { icon: 'help', text: 'text-muted-foreground', border: 'border-border' };

                const displayVal = item.display_value !== null && item.display_value !== undefined
                  ? item.display_value
                  : `${item.value_per_serving.toFixed(1)} ${item.unit}`.trim();

                const directionSymbol = item.threshold_direction === 'min' ? '≥' : '≤';
                const thresholdText = item.threshold !== null && item.threshold !== undefined
                  ? `(${directionSymbol} ${item.threshold} ${item.unit})`.trim()
                  : '';

                return (
                  <div key={item.rule_id} className="py-4 first:pt-2 last:pb-2 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`material-symbols-outlined text-[18px] shrink-0 ${statusMeta.text}`}>
                          {statusMeta.icon}
                        </span>
                        <span className="text-sm font-medium truncate">{item.name}</span>
                      </div>
                      <div className="text-sm shrink-0 flex items-center gap-1.5">
                        <span className="font-semibold">{displayVal}</span>
                        {thresholdText && (
                          <span className="text-xs text-muted-foreground font-mono">{thresholdText}</span>
                        )}
                      </div>
                    </div>
                    {item.status !== 'green' && item.tip_text && (
                      <div className={`mt-2 p-3 rounded-lg border text-xs leading-relaxed ${statusMeta.border}`}>
                        <p className="font-medium text-foreground">{item.tip_text}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
