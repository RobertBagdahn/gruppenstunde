import { useState, useMemo, lazy, Suspense } from 'react';
import { Scale, TrendingUp } from 'lucide-react';
import { useNutritionSummary, useAllergenScan } from '@/api/mealPlans';
import { useRules } from '@/api/suggestions';
import { MEAL_TYPE_ORDER, type Meal, getDayCoverage, getEffectiveCoverage, getCoverageBadge } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import SollIstBar from '@/components/shared/SollIstBar';
import { cn } from '@/lib/utils';

const LazyNutrientBalanceChart = lazy(() => import('@/components/charts/NutrientBalanceChart'));

function groupMealsByDate(meals: Meal[]): { date: string; meals: Meal[] }[] {
  const groups: Record<string, Meal[]> = {};
  for (const meal of meals) {
    if (!meal.start_datetime) continue;
    const date = meal.start_datetime.slice(0, 10);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meal);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, meals]) => ({
      date,
      meals: meals.sort((a, b) => {
        const getOrder = (mt: string) => {
          const idx = MEAL_TYPE_ORDER.indexOf(mt as typeof MEAL_TYPE_ORDER[number]);
          return idx === -1 ? 999 : idx;
        };
        return getOrder(a.meal_type) - getOrder(b.meal_type);
      }),
    }));
}

interface FallbackRule {
  name: string;
  min_green: number | null;
  max_green: number | null;
  min_yellow: number | null;
  max_yellow: number | null;
  unit: string;
}

const NUTRITION_FALLBACKS: Record<string, FallbackRule> = {
  energy_kcal: {
    name: 'Energie',
    min_green: 1912,
    max_green: 2629,
    min_yellow: 1554,
    max_yellow: 3107,
    unit: 'kcal',
  },
  protein_g: {
    name: 'Protein',
    min_green: 45,
    max_green: 80,
    min_yellow: 35,
    max_yellow: 100,
    unit: 'g',
  },
  fat_g: {
    name: 'Fett',
    min_green: 55,
    max_green: 85,
    min_yellow: 40,
    max_yellow: 100,
    unit: 'g',
  },
  carbohydrate_g: {
    name: 'Kohlenhydrate',
    min_green: 250,
    max_green: 400,
    min_yellow: 200,
    max_yellow: 450,
    unit: 'g',
  },
  sugar_g: {
    name: 'Zucker',
    min_green: null,
    max_green: 50,
    min_yellow: null,
    max_yellow: 75,
    unit: 'g',
  },
  fibre_g: {
    name: 'Ballaststoffe',
    min_green: 25,
    max_green: null,
    min_yellow: 18,
    max_yellow: null,
    unit: 'g',
  },
  salt_g: {
    name: 'Salz',
    min_green: null,
    max_green: 5,
    min_yellow: null,
    max_yellow: 7,
    unit: 'g',
  },
};

export default function NutritionView({
  mealPlanId,
  meals = [],
  onSelectTab,
}: {
  mealPlanId: number;
  meals?: Meal[];
  onSelectTab?: (tab: 'plan' | 'schedule' | 'table' | 'nutrition' | 'costs' | 'shopping' | 'suggestions' | 'allergens') => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data, error, isLoading, refetch } = useNutritionSummary(mealPlanId, selectedDate || undefined);
  const { data: rules } = useRules();
  const { data: scanData } = useAllergenScan(mealPlanId);
  const [showPerPortion, setShowPerPortion] = useState(true);

  // Group meals by date to get unique dates
  const dayGroups = useMemo(() => groupMealsByDate(meals), [meals]);
  const uniqueDates = useMemo(() => dayGroups.map((g) => g.date), [dayGroups]);

  const dayCoverageMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of dayGroups) {
      map[group.date] = getDayCoverage(group.meals);
    }
    return map;
  }, [dayGroups]);

  const avgCoverage = uniqueDates.length > 0
    ? uniqueDates.reduce((sum, d) => sum + (dayCoverageMap[d] ?? 1), 0) / uniqueDates.length
    : 1;
  const selectedCoverage = selectedDate ? (dayCoverageMap[selectedDate] ?? 1) : avgCoverage;
  const effCoverage = getEffectiveCoverage(selectedCoverage);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data) return null;

  const numDays = Math.max(uniqueDates.length, 1);

  function evaluateRuleStatus(
    val: number,
    min_green: number | null,
    max_green: number | null,
    min_yellow: number | null,
    max_yellow: number | null
  ): 'green' | 'yellow' | 'red' {
    if (min_yellow !== null && val < min_yellow) return 'red';
    if (max_yellow !== null && val > max_yellow) return 'red';
    if (min_green !== null && val < min_green) return 'yellow';
    if (max_green !== null && val > max_green) return 'yellow';
    return 'green';
  }

  const rows = [
    {
      label: 'Energie',
      parameter: 'energy_kcal',
      totalValue: Math.round(data.energy_kcal),
      perPortionValue: Math.round(data.per_portion_energy_kcal),
      unit: 'kcal',
      icon: 'local_fire_department',
    },
    {
      label: 'Protein',
      parameter: 'protein_g',
      totalValue: data.protein_g,
      perPortionValue: data.per_portion_protein_g,
      unit: 'g',
      icon: 'fitness_center',
    },
    {
      label: 'Fett',
      parameter: 'fat_g',
      totalValue: data.fat_g,
      perPortionValue: data.per_portion_fat_g,
      unit: 'g',
      icon: 'water_drop',
    },
    {
      label: 'Kohlenhydrate',
      parameter: 'carbohydrate_g',
      totalValue: data.carbohydrate_g,
      perPortionValue: data.per_portion_carbohydrate_g,
      unit: 'g',
      icon: 'grain',
    },
    {
      label: 'Zucker',
      parameter: 'sugar_g',
      totalValue: data.sugar_g,
      perPortionValue: data.per_portion_sugar_g,
      unit: 'g',
      icon: 'cake',
    },
    {
      label: 'Ballaststoffe',
      parameter: 'fibre_g',
      totalValue: data.fibre_g,
      perPortionValue: data.per_portion_fibre_g,
      unit: 'g',
      icon: 'eco',
    },
    {
      label: 'Salz',
      parameter: 'salt_g',
      totalValue: data.salt_g,
      perPortionValue: data.per_portion_salt_g,
      unit: 'g',
      icon: 'water_drop',
    },
  ];

  return (
    <div className="space-y-4">
      {scanData && scanData.violations.length > 0 && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-sm flex items-center justify-between gap-4 shadow-soft">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">⚠️</span>
            <p className="font-semibold text-destructive truncate">
              Dieser Essensplan enthält Allergene: {Array.from(new Set(scanData.violations.map(v => v.nutritional_tag.name))).join(', ')}. {scanData.summary.affected_meals} {scanData.summary.affected_meals === 1 ? 'Mahlzeit' : 'Mahlzeiten'} betroffen.
            </p>
          </div>
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('allergens')}
              className="text-xs font-bold underline shrink-0 text-destructive hover:text-destructive/80 transition-colors"
            >
              Zum Scanner
            </button>
          )}
        </div>
      )}
      <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="font-display font-bold flex items-center gap-2">
            <Scale className="w-4.5 h-4.5 text-primary" />
            Nährwert-Zusammenfassung {showPerPortion ? '(pro Normportion)' : '(gesamt)'}
          </h3>

          {/* Horizontal Day-by-Day Selector */}
          {uniqueDates.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full sm:ml-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors",
                    selectedDate === null
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Gesamter Plan ({numDays} Tage)</span>
                  {avgCoverage < 1 && (
                    <span className="block text-[9px] opacity-70 font-normal">
                      Ø {Math.round(avgCoverage * 100)} % Abdeckung
                    </span>
                  )}
                </button>
                {uniqueDates.map((date) => {
                  const dayCoverage = dayCoverageMap[date] ?? 1;
                  const badge = getCoverageBadge(dayCoverage);
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors flex flex-col items-center gap-0.5",
                        selectedDate === date
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{formatDate(date)}</span>
                      {dayCoverage < 1 && (
                        <span className={cn(
                          "text-[9px] font-bold px-1 rounded",
                          selectedDate === date ? "text-primary-foreground/80" : "text-muted-foreground/60"
                        )}>
                          {badge.label}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPerPortion(!showPerPortion)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted/50 transition-colors font-medium self-end sm:self-auto"
        >
          {showPerPortion ? 'Gesamt anzeigen' : `Pro Portion (${data.norm_portions})`}
        </button>
      </div>
      {/* Summe pro Tag Section */}
      {uniqueDates.length > 0 && (
        <>
          <div className="px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold">Summe pro Tag</h4>
            </div>
          </div>
          {(selectedDate ? [selectedDate] : uniqueDates).map((date) => {
            const dayNum = uniqueDates.indexOf(date) + 1;
            return (
              <div key={date} className="divide-y">
                {rows.map((row) => {
                  const dayRule = rules?.find(
                    (r) => r.parameter === row.parameter && r.scope === 'day'
                  );

                  const activeRule = dayRule || (NUTRITION_FALLBACKS[row.parameter] ? {
                    parameter: row.parameter,
                    scope: 'day',
                    min_green: NUTRITION_FALLBACKS[row.parameter].min_green,
                    max_green: NUTRITION_FALLBACKS[row.parameter].max_green,
                    min_yellow: NUTRITION_FALLBACKS[row.parameter].min_yellow,
                    max_yellow: NUTRITION_FALLBACKS[row.parameter].max_yellow,
                    name: NUTRITION_FALLBACKS[row.parameter].name,
                    unit: NUTRITION_FALLBACKS[row.parameter].unit,
                  } : undefined);

                  const dailyPortionVal = selectedDate ? row.perPortionValue : row.perPortionValue / numDays;

                  const scaledMinGreen = activeRule?.min_green != null ? activeRule.min_green * effCoverage : null;
                  const scaledMaxGreen = activeRule?.max_green != null ? activeRule.max_green * effCoverage : null;
                  const scaledMinYellow = activeRule?.min_yellow != null ? activeRule.min_yellow * effCoverage : null;
                  const scaledMaxYellow = activeRule?.max_yellow != null ? activeRule.max_yellow * effCoverage : null;

                  const hasSollIst = !!activeRule;
                  const status = activeRule
                    ? evaluateRuleStatus(
                        dailyPortionVal,
                        scaledMinGreen,
                        scaledMaxGreen,
                        scaledMinYellow,
                        scaledMaxYellow
                      )
                    : 'green';

                  const target_mid = activeRule
                    ? scaledMinGreen !== null && scaledMaxGreen !== null
                      ? (scaledMinGreen + scaledMaxGreen) / 2
                      : scaledMinGreen ?? scaledMaxGreen
                    : null;

                  const displayVal = showPerPortion
                    ? `${row.perPortionValue.toFixed(row.unit === 'kcal' ? 0 : 1)} ${row.unit}`
                    : `${row.totalValue.toFixed(row.unit === 'kcal' ? 0 : 1)} ${row.unit}`;

                  return (
                    <div key={row.label} className="px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                            {row.icon}
                          </span>
                          {row.label}
                        </span>
                        <span className="text-sm font-semibold">{displayVal}</span>
                      </div>

                      {hasSollIst && activeRule && (
                        <div className="pl-6 max-w-xl">
                          <SollIstBar
                            current={dailyPortionVal}
                            min_green={scaledMinGreen}
                            max_green={scaledMaxGreen}
                            target_mid={target_mid}
                            status={status}
                            unit={row.unit}
                            scopeLabel={`Summe Tag ${dayNum} (${formatDate(date)})`}
                          />
                          {effCoverage < 1 && (
                            <div className="text-[10px] text-muted-foreground italic mt-0.5">
                              Skaliert auf {Math.round(effCoverage * 100)} % Tagesabdeckung
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}

      {/* Durchschnitt pro Tag (Ø Plan) Section — hidden when a specific day is selected */}
      {selectedDate === null && (
        <>
          <div className="px-4 py-3 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[hsl(var(--chart-2))]" />
              <h4 className="text-sm font-semibold">Durchschnitt pro Tag (Ø Plan)</h4>
            </div>
          </div>
          <div className="divide-y">
            {rows.map((row) => {
              const mealEventRule = rules?.find(
                (r) => r.parameter === row.parameter && r.scope === 'meal_event'
              );

              const activeRule = mealEventRule || (NUTRITION_FALLBACKS[row.parameter] ? {
                parameter: row.parameter,
                scope: 'meal_event',
                min_green: NUTRITION_FALLBACKS[row.parameter].min_green,
                max_green: NUTRITION_FALLBACKS[row.parameter].max_green,
                min_yellow: NUTRITION_FALLBACKS[row.parameter].min_yellow,
                max_yellow: NUTRITION_FALLBACKS[row.parameter].max_yellow,
                name: NUTRITION_FALLBACKS[row.parameter].name,
                unit: NUTRITION_FALLBACKS[row.parameter].unit,
              } : undefined);

              const dailyPortionVal = row.perPortionValue / numDays;

              const scaledMinGreen = activeRule?.min_green != null ? activeRule.min_green * effCoverage : null;
              const scaledMaxGreen = activeRule?.max_green != null ? activeRule.max_green * effCoverage : null;
              const scaledMinYellow = activeRule?.min_yellow != null ? activeRule.min_yellow * effCoverage : null;
              const scaledMaxYellow = activeRule?.max_yellow != null ? activeRule.max_yellow * effCoverage : null;

              const hasSollIst = !!activeRule;
              const status = activeRule
                ? evaluateRuleStatus(
                    dailyPortionVal,
                    scaledMinGreen,
                    scaledMaxGreen,
                    scaledMinYellow,
                    scaledMaxYellow
                  )
                : 'green';

              const target_mid = activeRule
                ? scaledMinGreen !== null && scaledMaxGreen !== null
                  ? (scaledMinGreen + scaledMaxGreen) / 2
                  : scaledMinGreen ?? scaledMaxGreen
                : null;

              const displayVal = showPerPortion
                ? `${row.perPortionValue.toFixed(row.unit === 'kcal' ? 0 : 1)} ${row.unit}`
                : `${row.totalValue.toFixed(row.unit === 'kcal' ? 0 : 1)} ${row.unit}`;

              const scopeLabel = numDays === 1 ? '1 Tag' : `Ø ${numDays} Tage`;

              return (
                <div key={row.label} className="px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                        {row.icon}
                      </span>
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold">{displayVal}</span>
                  </div>

                  {hasSollIst && activeRule && (
                    <div className="pl-6 max-w-xl">
                      <SollIstBar
                        current={dailyPortionVal}
                        min_green={scaledMinGreen}
                        max_green={scaledMaxGreen}
                        target_mid={target_mid}
                        status={status}
                        unit={row.unit}
                        scopeLabel={scopeLabel}
                      />
                      {effCoverage < 1 && (
                        <div className="text-[10px] text-muted-foreground italic mt-0.5">
                          Skaliert auf {Math.round(effCoverage * 100)} % Tagesabdeckung
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Nutrient Balance Chart */}
      {(data.protein_g > 0 || data.fat_g > 0 || data.carbohydrate_g > 0) && (
        <div className="px-4 py-4 border-t">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            Nährstoff-Verteilung {showPerPortion ? '(pro Portion)' : '(gesamt)'}
          </h4>
          <Suspense fallback={<div className="h-[260px] bg-muted rounded-xl animate-pulse" />}>
            <LazyNutrientBalanceChart
              proteinG={showPerPortion ? data.per_portion_protein_g : data.protein_g}
              fatG={showPerPortion ? data.per_portion_fat_g : data.fat_g}
              carbsG={showPerPortion ? data.per_portion_carbohydrate_g : data.carbohydrate_g}
              sugarG={showPerPortion ? data.per_portion_sugar_g : data.sugar_g}
              fibreG={showPerPortion ? data.per_portion_fibre_g : data.fibre_g}
              saltG={showPerPortion ? data.per_portion_salt_g : data.salt_g}
              numDays={selectedDate ? 1 : numDays}
              showPerPortion={showPerPortion}
              normPortions={data.norm_portions}
            />
          </Suspense>
        </div>
      )}
    </div>
    </div>
  );
}
