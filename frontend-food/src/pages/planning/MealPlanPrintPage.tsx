/**
 * MealPlanPrintPage — Druckansicht für Essenspläne.
 * Route: /meal-plans/:id/print
 *
 * A4-optimiert mit:
 * - Tag-pro-Seite Layout (page-break-before: always)
 * - Essens-Boxen mit Notizbereichen
 * - Einkaufsliste (pro Tag + Gesamt)
 * - Seitenzahlen & Dokument-Referenz im Footer
 *
 * Empfohlene Druckeinstellungen:
 * - Papierformat: A4
 * - Skalierung: 100%
 * - Ränder: Keine/Minimal (2cm werden via CSS gesetzt)
 * - Hintergrundgrafiken: Aktiviert (für farbige Akzente)
 *
 * Öffne in neuem Tab, dann Browser-Drucken (Strg+P / Cmd+P).
 */
import { useParams } from 'react-router-dom';
import { useMealPlan } from '@/api/mealPlans';
import { Loader2 } from 'lucide-react';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  type AggregatedIngredient,
  formatTime,
  groupMealsByDate,
  formatIngredients,
  aggregateIngredientsByDay,
  calculateTotalIngredients,
} from './mealPlanPrintUtils';

// ==========================================================================
// Sub-Components
// ==========================================================================

function PrintHeader({
  name,
  dateRange,
  portions,
  reserveFactor,
  description,
  url,
}: {
  name: string;
  dateRange: string;
  portions: number;
  reserveFactor: number;
  description?: string | null;
  url: string;
}) {
  return (
    <div className="meal-plan-print-header">
      <h1>{name}</h1>
      <div className="meal-plan-print-header-meta">
        {dateRange && <span>{dateRange}</span>}
        <span>{portions} Personen</span>
        <span>+{Math.round((reserveFactor - 1) * 100)}% Reserve</span>
      </div>
      {description && <p>{description}</p>}
      <span className="meal-plan-print-header-url">{url}</span>
    </div>
  );
}

function DayHeader({ formattedDate }: { formattedDate: string }) {
  return (
    <h2 className="meal-plan-print-day-header">
      {formattedDate}
    </h2>
  );
}

function MealBox({ meal }: { meal: Meal }) {
  const mealTypeLabel = MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type;
  const icon = MEAL_TYPE_ICONS[meal.meal_type] ?? '';
  const timeStr = meal.start_datetime ? formatTime(meal.start_datetime) : '';
  const ingredientText = formatIngredients(meal.items);

  return (
    <div className="meal-plan-print-meal-row">
      <div className="meal-plan-print-meal-box">
        <h3>
        {icon && (
            <span className="material-symbols-outlined meal-plan-print-meal-icon">
              {icon}
            </span>
          )}
          {mealTypeLabel}
          {timeStr && <span className="meal-plan-print-meal-time"> ({timeStr} Uhr)</span>}
        </h3>
        <div className="meal-plan-print-ingredient-list">
          <p>{ingredientText}</p>
        </div>
      </div>
      <div className="meal-plan-print-notes-box">
        <span className="meal-plan-print-notes-label">Notizen</span>
      </div>
    </div>
  );
}

function DayEndNotes() {
  return (
    <div className="meal-plan-print-day-notes">
      <hr />
      <hr />
      <hr />
    </div>
  );
}

function ShoppingListSummary({
  byDay,
  totals,
}: {
  byDay: Record<string, AggregatedIngredient[]>;
  totals: AggregatedIngredient[];
}) {
  const dateKeys = Object.keys(byDay);
  const hasPerDay = dateKeys.length > 0;
  const hasTotals = totals.length > 0;

  if (!hasPerDay && !hasTotals) {
    return (
      <div className="meal-plan-print-shopping-list">
        <h2>Einkaufsliste</h2>
        <p>Keine Zutaten-Daten verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="meal-plan-print-shopping-list">
      <h2>Einkaufsliste</h2>

      {hasPerDay && (
        <>
          <h3>Pro Tag</h3>
          {dateKeys.map((dateLabel) => (
            <div key={dateLabel} className="meal-plan-print-shopping-day">
              <h4>{dateLabel}</h4>
              <ul>
                {byDay[dateLabel].map((ing, i) => (
                  <li key={i}>
                    {ing.ingredient_name} ({ing.display_text})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {hasTotals && (
        <>
          <h3>Gesamt</h3>
          <ul>
            {totals.map((ing, i) => (
              <li key={i}>
                {ing.ingredient_name} ({ing.display_text})
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PrintFooter({
  planName,
  url,
}: {
  planName: string;
  url: string;
}) {
  return (
    <div className="meal-plan-print-footer">
      <span className="meal-plan-print-footer-ref">{planName} — {url}</span>
      <span className="meal-plan-print-footer-page">Seite <span className="meal-plan-print-page-num" /> von <span className="meal-plan-print-page-total" /></span>
      <div className="print:hidden pt-2 text-center">
        <button
          onClick={() => window.print()}
          className="text-blue-600 underline text-sm"
        >
          Drucken
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// Main Page Component
// ==========================================================================

export default function MealPlanPrintPage() {
  const { id } = useParams<{ id: string }>();
  const planId = Number(id);

  const { data: plan, isLoading, error } = useMealPlan(planId);

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Essensplan nicht gefunden.
      </div>
    );
  }

  // Group meals by date
  const days = groupMealsByDate(plan.meals);

  // Format date range for header
  const formatDateRange = (): string => {
    if (!plan.start_datetime && !plan.end_datetime) return '';
    const start = plan.start_datetime
      ? format(new Date(plan.start_datetime), 'd. MMMM', { locale: de })
      : '';
    const end = plan.end_datetime
      ? format(new Date(plan.end_datetime), 'd. MMMM yyyy', { locale: de })
      : '';
    return start && end ? `${start} – ${end}` : start || end;
  };

  // Compute page URL
  const pageUrl = `${window.location.origin}/meal-plans/${id}`;

  // Shopping list aggregation
  const byDay = aggregateIngredientsByDay(days);
  const totals = calculateTotalIngredients(byDay);

  return (
    <div className="meal-plan-print-page">
      <div className="meal-plan-print-content">

        <PrintHeader
          name={plan.name}
          dateRange={formatDateRange()}
          portions={plan.norm_portions}
          reserveFactor={plan.reserve_factor}
          description={plan.description}
          url={pageUrl}
        />

        {days.length === 0 ? (
          <div className="meal-plan-print-empty">
            <p>Keine Mahlzeiten geplant.</p>
          </div>
        ) : (
          <>
            {days.map((day) => (
              <section key={day.date} className="meal-plan-print-day">
                <DayHeader formattedDate={day.formattedDate} />

                {day.meals.map((meal) => (
                  <MealBox key={meal.id} meal={meal} />
                ))}

                <DayEndNotes />
              </section>
            ))}

            <ShoppingListSummary
              byDay={byDay}
              totals={totals}
            />

            <PrintFooter
              planName={plan.name}
              url={pageUrl}
            />
          </>
        )}
      </div>
    </div>
  );
}
