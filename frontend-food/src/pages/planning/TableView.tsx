import { useMemo } from 'react';
import type { Meal } from '@/schemas/mealPlan';
import { MEAL_TYPE_LABELS, MEAL_TYPE_COLORS } from '@/schemas/mealPlan';

interface TableViewProps {
  meals: Meal[];
  normPortions: number;
}

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

export default function TableView({ meals, normPortions }: TableViewProps) {
  const { dates, grid } = useMemo(() => {
    // Collect unique dates sorted
    const dateSet = new Set<string>();
    for (const meal of meals) {
      dateSet.add(meal.start_datetime.slice(0, 10));
    }
    const dates = [...dateSet].sort();

    // Build grid: mealType -> date -> Meal
    const grid: Record<string, Record<string, Meal | undefined>> = {};
    for (const type of MEAL_TYPE_ORDER) {
      grid[type] = {};
    }
    for (const meal of meals) {
      const date = meal.start_datetime.slice(0, 10);
      if (!grid[meal.meal_type]) {
        grid[meal.meal_type] = {};
      }
      grid[meal.meal_type][date] = meal;
    }

    return { dates, grid };
  }, [meals]);

  if (dates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Noch keine Tage im Essensplan.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' });
    const day = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return { weekday, day };
  };

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-background border-b border-r px-3 py-2 text-left font-medium text-muted-foreground min-w-[100px]">
              Mahlzeit
            </th>
            {dates.map((date) => {
              const { weekday, day } = formatDate(date);
              return (
                <th
                  key={date}
                  className="border-b px-3 py-2 text-center font-medium min-w-[140px]"
                >
                  <div className="text-xs text-muted-foreground">{weekday}</div>
                  <div>{day}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {MEAL_TYPE_ORDER.filter((type) => {
            // Only show rows that have at least one meal
            return dates.some((date) => grid[type]?.[date]);
          }).map((mealType) => (
            <tr key={mealType} className="border-b">
              <td className={`sticky left-0 bg-background border-r px-3 py-2 font-medium whitespace-nowrap ${MEAL_TYPE_COLORS[mealType]?.text || 'text-muted-foreground'}`}>
                {MEAL_TYPE_LABELS[mealType] ?? mealType}
              </td>
              {dates.map((date) => {
                const meal = grid[mealType]?.[date];
                if (!meal) {
                  return (
                    <td key={date} className="px-3 py-2 text-center text-muted-foreground/40">
                      —
                    </td>
                  );
                }
                const portions = meal.override_portions || normPortions;
                const isEmpty = meal.items.length === 0;
                const itemNames = meal.items
                  .map((item) => item.recipe_title || item.ingredient_name || item.display_name || '')
                  .filter(Boolean);

                return (
                  <td key={date} className={`px-3 py-2 align-top ${isEmpty ? 'bg-red-50' : ''}`}>
                    <div className="space-y-0.5">
                      {itemNames.length > 0 ? (
                        itemNames.map((name, i) => (
                          <div key={i} className="text-sm truncate max-w-[160px]" title={name}>
                            {name}
                          </div>
                        ))
                      ) : (
                        <div className="text-red-500 italic text-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">error</span>
                          Leer
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {portions} Pers.
                      </div>
                      {meal.note && (
                        <div className="text-xs text-muted-foreground italic truncate max-w-[160px]" title={meal.note}>
                          {meal.note}
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
