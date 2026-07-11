import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Meal, MealItem } from '@/schemas/mealPlan';

export interface DaySection {
  date: string;
  formattedDate: string;
  meals: Meal[];
}

export interface AggregatedIngredient {
  ingredient_name: string;
  total_quantity_g: number;
  net_quantity_g: number;
  reserve_quantity_g: number;
  unit: string;
  display_text: string;
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'EEEE, d. MMMM yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'HH:mm', { locale: de });
  } catch {
    return '';
  }
}

export function groupMealsByDate(meals: Meal[] | undefined): DaySection[] {
  if (!meals?.length) return [];

  const byDate: Record<string, Meal[]> = {};
  for (const meal of meals) {
    const date = meal.start_datetime?.slice(0, 10) ?? 'Unbekannt';
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(meal);
  }

  return Object.keys(byDate)
    .sort()
    .map((date) => ({
      date,
      formattedDate: date === 'Unbekannt' ? date : formatDate(date + 'T12:00:00'),
      meals: byDate[date].sort((a, b) =>
        (a.start_datetime ?? '').localeCompare(b.start_datetime ?? ''),
      ),
    }));
}

export function formatIngredients(items: MealItem[] | undefined): string {
  if (!items?.length) return '[Zutaten nicht verfügbar]';

  const parts: string[] = [];
  for (const item of items) {
    if (item.recipe_title) {
      const portion = item.portion_display ? ` (${item.portion_display})` : '';
      parts.push(`${item.recipe_title}${portion}`);
    } else if (item.ingredient_name) {
      const qty =
        item.quantity != null && item.measuring_unit_name
          ? ` (${item.quantity} ${item.measuring_unit_name})`
          : '';
      parts.push(`${item.ingredient_name}${qty}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : '[Zutaten nicht verfügbar]';
}

export function aggregateIngredientsByDay(
  days: DaySection[],
): Record<string, AggregatedIngredient[]> {
  const byDay: Record<string, AggregatedIngredient[]> = {};

  for (const day of days) {
    const aggregated: Record<string, AggregatedIngredient> = {};

    for (const meal of day.meals) {
      for (const item of meal.items ?? []) {
        if (!item.ingredient_name) continue;

        const key = `${item.ingredient_name}__${item.measuring_unit_name}`;
        const qtyG = item.quantity_g ?? 0;

        if (aggregated[key]) {
          aggregated[key].total_quantity_g += qtyG;
          if (item.quantity != null) {
            aggregated[key].net_quantity_g += item.quantity;
          }
        } else {
          aggregated[key] = {
            ingredient_name: item.ingredient_name,
            total_quantity_g: qtyG,
            net_quantity_g: item.quantity ?? 0,
            reserve_quantity_g: 0,
            unit: item.measuring_unit_name,
            display_text:
              item.quantity != null
                ? `${item.quantity} ${item.measuring_unit_name}`
                : `${qtyG}g`,
          };
        }
      }
    }

    const list = Object.values(aggregated).sort((a, b) =>
      a.ingredient_name.localeCompare(b.ingredient_name, 'de'),
    );
    if (list.length > 0) {
      byDay[day.formattedDate] = list;
    }
  }

  return byDay;
}

export function calculateTotalIngredients(
  byDay: Record<string, AggregatedIngredient[]>,
): AggregatedIngredient[] {
  const totals: Record<string, AggregatedIngredient> = {};

  for (const list of Object.values(byDay)) {
    for (const ingredient of list) {
      const key = `${ingredient.ingredient_name}__${ingredient.unit}`;
      if (totals[key]) {
        totals[key].total_quantity_g += ingredient.total_quantity_g;
        totals[key].net_quantity_g += ingredient.net_quantity_g;
      } else {
        totals[key] = { ...ingredient };
      }
    }
  }

  return Object.values(totals).sort((a, b) =>
    a.ingredient_name.localeCompare(b.ingredient_name, 'de'),
  );
}
