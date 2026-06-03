## Context

This change, `meal-plan-ui-polish`, targets the UI/UX polish for the Meal Planning frontend. It improves the visual presentation and usability of the meal planning table, integrates human-readable labels and options for Physical Activity Level (PAL), optimizes nutrition indicators to focus on relative "Ist/Soll" statuses, and enhances the nutrition cockpit with a Day-by-Day selector (a 7-day style bar) and a global "Gesamt" toggle.

## Goals / Non-Goals

**Goals:**
- Provide clear daily total rows at the bottom of the planning Table View (showing total daily kcal and cost).
- Map PAL numeric values (e.g. 1.2, 1.5, 1.75, 2.0) to user-friendly German activity categories in headers, settings, and simulators.
- Improve the Settings Panel PAL input by replacing or augmenting it with standard descriptive activity level options.
- Redesign the Nutrition View with a horizontal Day-by-Day bar selector (including weekday/day number) and a "Gesamt" (All Days) button.
- Make meal slot cells in the Table View more visually appealing with subtle styling, proper border-collapse, clear empty states, and relative Soll-Ist indicators where applicable.

**Non-Goals:**
- Modifying backend database schemas or introducing new Django migrations (all requirements are successfully handled via frontend layout, aggregation, and display-level changes).

## Decisions

### 1. PAL Numeric-to-Label Mapping
We will define a centralized helper or array of options to map PAL numbers to localized German descriptions:
- `<= 1.2` / `Ruhend` (Kaum körperliche Aktivität, z.B. nur sitzend/liegend)
- `1.3 - 1.5` / `Moderat` (Normale Pfadfinder-Aktivität, sitzend mit zeitweise stehender/gehender Tätigkeit)
- `1.6 - 1.8` / `Aktiv` (Wanderung, Geländespiel, überwiegend stehende/gehende Arbeit)
- `>= 1.9` / `Sehr aktiv` (Hajk, intensives Lager, körperlich anstrengende Arbeit)

In `MealEventDetailPage.tsx` and `NormPortionSimulatorPage.tsx`, we will render these labels alongside the PAL factor (e.g., `Aktivität: Moderat (PAL 1,5)`). In the `SettingsPanel` of `MealEventDetailPage.tsx`, we will replace the raw `number` input for PAL with a structured select dropdown containing these user-friendly options.

### 2. Table View: Day Summary Row ("Tagessummen-Zeile")
At the bottom of `TableView.tsx`, we will add a `tfoot` or final table row labeled **Tagessumme**. For each date column, we will aggregate the sum of all meal slots:
- **Daily Energy**: Sum `kjToKcal(meal.total_energy_kj)` for regular meals and `meal.external_energy_kcal` for external meals.
- **Daily Cost**: Sum `meal.total_cost_eur`.
- Both values will be displayed with relative context or clean formatting (e.g., kcal, €).

### 3. Nutrition View: Horizontal Day Selector ("Bar7-Style")
Currently, `NutritionView` has a small dropdown to select the date. We will replace or augment this dropdown with a horizontal bar selector of days (rendered as modern clickable badges/cards displaying the weekday and day, e.g., `Mo 03.06.`). It will also feature a leading "Gesamt" button to toggle the view back to the full timeframe summary.

## Risks / Trade-offs

- **[Risk]**: A custom PAL factor that is not exactly 1.2, 1.5, 1.75, or 2.0 might be loaded from a plan.
- **[Mitigation]**: If the plan's PAL does not exactly match one of the predefined options, the settings dropdown will display a "Benutzerdefiniert" fallback option or fallback gracefully to showing the raw number.
