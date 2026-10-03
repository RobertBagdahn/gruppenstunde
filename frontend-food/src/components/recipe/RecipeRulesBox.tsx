import { useMemo, useState } from 'react';
import { NutritionBaseBadge } from '@/components/recipe/NutritionBaseBadge';
import { useRecipeRules } from '@/api/recipes';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

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
        <div className="h-5 bg-muted rounded-lg w-1/3 mb-2" />
        <div className="h-4 bg-muted rounded-lg w-1/4" />
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.is_applicable) {
    return (
      <section className="mt-6 rounded-xl border bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <Icon name="info" size={20} className="text-info mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-body font-semibold text-foreground">Keine Nährwert-Bewertung für diesen Rezepttyp</h2>
            <p className="text-body text-muted-foreground leading-relaxed">
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
        <h2 className="flex items-center gap-2 text-body font-semibold text-muted-foreground uppercase tracking-wide">
          <Icon name="task_alt" size={20} className="text-info" />
          Rezeptregeln
          <NutritionBaseBadge base="per_portion" />
        </h2>
        <div className="flex items-center gap-3">
          {/* Zähler-Ampel */}
          <div
            className="flex items-center gap-2 text-caption font-medium bg-muted px-2.5 py-1 rounded-full shrink-0"
            title={`${data.green_count} Regeln erfüllt (grün), ${data.yellow_count} leicht außerhalb des Zielbereichs (gelb), ${data.red_count} deutlich außerhalb (rot)`}
          >
            <span className="flex items-center gap-0.5 text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              {data.green_count}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-0.5 text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
              {data.yellow_count}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-0.5 text-danger">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              {data.red_count}
            </span>
          </div>
          <Icon name="expand_more" size={24} className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <p className="px-5 pb-3 -mt-2 text-caption text-muted-foreground flex items-center gap-1">
        Die Zahlen zählen die Regeln: grün (im Zielbereich) · gelb (leicht außerhalb) · rot (deutlich außerhalb).
      </p>

      {open && (
        <div className="px-5 pb-5 pt-0">
          {sortedItems.length === 0 ? (
            <p className="text-body text-muted-foreground italic py-4 text-center">
              Keine Regeln für dieses Rezept definiert.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {sortedItems.map((item) => {
                const statusMeta = {
                  green: {
                    icon: 'check_circle',
                    text: 'text-success',
                    border: 'border-success-border bg-success-soft/20',
                  },
                  yellow: {
                    icon: 'warning',
                    text: 'text-warning',
                    border: 'border-warning-border bg-warning-soft/20',
                  },
                  red: {
                    icon: 'cancel',
                    text: 'text-danger',
                    border: 'border-danger-border bg-danger-soft/20',
                  },
                }[item.status] || { icon: 'help', text: 'text-muted-foreground', border: 'border-border' };

                const displayVal = item.display_value !== null && item.display_value !== undefined
                  ? item.display_value
                  : `${formatNumber(item.value_per_serving, { maxDecimals: 1 })} ${item.unit}`.trim();

                const directionSymbol = item.threshold_direction === 'min' ? '≥' : '≤';
                const thresholdText = item.threshold !== null && item.threshold !== undefined
                  ? `(${directionSymbol} ${item.threshold} ${item.unit})`.trim()
                  : '';

                return (
                  <div key={item.rule_id} className="py-4 first:pt-2 last:pb-2 space-y-1">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon name={statusMeta.icon} size={20} className={`shrink-0 ${statusMeta.text}`} />
                        <span className="text-body font-medium truncate">{item.name}</span>
                      </div>
                      <div className="text-body shrink-0 flex items-center gap-1.5">
                        <span className="font-semibold">{displayVal}</span>
                        {thresholdText && (
                          <span className="text-caption text-muted-foreground font-mono">{thresholdText}</span>
                        )}
                      </div>
                    </div>
                    {item.status !== 'green' && item.tip_text && (
                      <div className={`mt-2 p-3 rounded-lg border text-caption leading-relaxed ${statusMeta.border}`}>
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
