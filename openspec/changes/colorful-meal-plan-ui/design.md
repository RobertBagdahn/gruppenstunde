## Context

Die Essensplan-Detailseite (`frontend-food/src/pages/planning/MealEventDetailPage.tsx`) zeigt aktuell Mahlzeiten in einem minimalistischen, monochromen Design. Das Backend liefert pro `MealItem` nur Titel, Slug, Bild und Faktor — keine Kalorien oder Kosten. Die Kalorien/Kosten-Daten existieren im System (Recipe hat `cached_energy_kj` und `cached_price_total`), werden aber nicht auf MealItem-Ebene durchgereicht.

Betroffene Dateien:
- `backend/planner/schemas/meal_plan.py` — `MealItemOut`, `MealOut`
- `backend/planner/api/meal_plan.py` — Queryset-Annotation
- `frontend-food/src/schemas/mealPlan.ts` — Zod `MealItemSchema`, `MealSchema`
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — `MealSlot`, `DayPlanView`
- `frontend-food/src/pages/planning/TableView.tsx`
- `frontend-food/src/pages/planning/CostDashboard.tsx`

## Goals / Non-Goals

**Goals:**
- Kalorien (energy_kj) und Kosten (cost_eur) pro MealItem vom Backend liefern
- Kalorien-Summe und Kosten-Summe pro Meal berechnen und liefern
- %-Abdeckung des Mahlzeitbedarfs im Frontend berechnen und farbcodiert anzeigen
- Farbiges, semantisches UI mit klaren Status-Signalen (Grün/Gelb/Rot)
- Meal-Type-spezifische Akzentfarben
- Größere Schriftgrößen für bessere Lesbarkeit
- Einheitliche Farblogik auf allen 6 Tabs

**Non-Goals:**
- Keine neue API-Endpunkte (nur bestehende Schemas erweitern)
- Keine DB-Migration (Werte werden berechnet/annotiert)
- Kein Dark Mode
- Keine Änderung der Cockpit-HealthRules-Logik

## Decisions

### 1. Kalorien/Kosten auf MealItem-Ebene berechnen (nicht cachen)

**Entscheidung**: `MealItemOut` bekommt `energy_kj: float | None` und `cost_eur: float | None` als berechnete Felder via `resolve_*` Methoden.

**Rationale**: Recipe hat bereits `cached_energy_kj` und `cached_price_total`. Diese Werte skaliert mit `factor` und `norm_portions / recipe.servings` ergeben die Werte pro MealItem im Kontext des Plans. Keine Migration nötig, kein Cache-Invalidierungs-Problem.

**Alternative verworfen**: Separate API pro Meal — zu viele Requests, schlechtere UX.

### 2. Meal-Summen als berechnete Felder auf MealOut

**Entscheidung**: `MealOut` bekommt `total_energy_kj: float` und `total_cost_eur: float` (Summe aller Items).

**Rationale**: Frontend muss sonst selbst summieren und null-Handling machen. Backend kann das effizienter.

### 3. %-Berechnung im Frontend

**Entscheidung**: Frontend berechnet `coverage_percent = meal.total_energy_kj / (daily_target_kj * meal.day_part_factor) * 100`.

`daily_target_kj = 2000 kcal * 4.184 * activity_factor` (≈ 8368 kJ bei PAL 1.0).

**Rationale**: Der Tagesbedarf hängt von `activity_factor` ab, der im Plan-Objekt liegt — Frontend hat alle Daten.

### 4. Farbsystem via Tailwind-Klassen (kein CSS-Variables)

**Entscheidung**: Semantische Farben über Tailwind-Utility-Klassen mit `cn()` Helper:
- Status: `text-green-600`, `text-yellow-600`, `text-red-600` + entsprechende `bg-*/10`
- Meal-Types: Konstanten-Map `MEAL_TYPE_COLORS` mit Tailwind-Klassen

**Rationale**: Konsistent mit shadcn/ui Pattern, kein Custom-CSS nötig.

### 5. Schriftgrößen-Upgrade

| Element | Alt | Neu |
|---------|-----|-----|
| Tag-Header | `text-sm sm:text-base` | `text-base sm:text-lg` |
| Meal-Type | `text-sm` | `text-base` |
| Rezeptname | `text-sm` | `text-base` |
| Info-Zeile | — | `text-sm` |
| Buttons | `text-xs` | `text-sm` |

## Risks / Trade-offs

- **[Performance]** Jeder MealItem braucht Recipe-Zugriff für energy/cost → **Mitigation**: `select_related('recipe')` ist bereits im Queryset, Werte sind cached auf Recipe-Model
- **[Null-Werte]** Manche Recipes haben keine cached_energy_kj (Cache noch nicht berechnet) → **Mitigation**: `energy_kj: float | None`, Frontend zeigt "—" bei None
- **[Ingredient-Items]** MealItems die nur eine Zutat (kein Rezept) referenzieren haben keine sinnvollen Kalorien → **Mitigation**: energy_kj = None für ingredient-only Items
