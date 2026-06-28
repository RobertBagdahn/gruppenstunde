## Why

Der Kochplan (Cooking Schedule) zeigt aktuell nur eine chronologische Rezept-Liste mit aufklappbaren Zutaten und Schritten. Für den praktischen Einsatz in der Lagerküche fehlen: Allergen-Warnungen, Personenanzahl, Nährwerte, Kosten, strukturierte Schritte und eine druckoptimierte Ansicht mit Seitenumbrüchen. Ausserdem gibt es keine spezielle Bildschirm-Ansicht für die Küche.

## What Changes

### Backend — Cooking Schedule API

- **Allergene**: CookingScheduleItem und CookingScheduleIngredient erhalten `nutritional_tags[]` – sowohl Rezept-Tags als auch Zutaten-Tags
- **Kosten**: CookingScheduleItem erhält `total_cost_eur`, CookingScheduleDay erhält `total_cost_eur`, CookingScheduleOut erhält `total_cost_eur` + `total_cost_with_reserve`
- **Nährwerte**: CookingScheduleItem erhält `total_energy_kcal`, `total_protein_g`, `total_fat_g`, `total_carbohydrate_g`
- **Strukturierte Schritte**: `steps` (String) wird ergänzt durch `steps_parsed: StepOut[]` – aus Markdown geparste Einzelschritte mit optionalem Timer
- **Meal-Notiz**: CookingScheduleItem erhält `meal_note` (aus Meal.note)
- **Tages-Kopf**: CookingScheduleDay erhält `day_start_time`, `day_end_time`, `day_duration_minutes`, `portions`, `day_nutritional_tags[]`
- **Gesamt-Kopf**: CookingScheduleOut erhält `total_cost_eur`, `total_cost_with_reserve`, `total_energy_kcal`, `norm_portions`, `excluded_meal_count` (bleibt)

### Frontend — Kochbuch-Layout (Print)

- **CookingSchedulePrintPage** komplett überarbeitet
- Seitenumbrüche pro Rezept (`page-break-before: always`)
- Rezeptkarten mit Zutaten (inkl. Notizen) und strukturierten Schritten
- Allergen-Badges pro Rezept + Tages-Zusammenfassung
- Kosten pro Rezept + Tag + Gesamt
- Nährwerte pro Mahlzeit
- Personenanzahl prominent im Header
- Tägliche Gesamt-Kochzeit

### Frontend — Küchen-Dashboard (Screen)

- **Neue Seite**: `/meal-plans/:id/cooking-schedule/kitchen`
- Vertikale Timeline: Rezepte chronologisch mit Zeit-Markern
- Aufklappbare Rezept-Details (Zutaten + Schritte)
- Allergen-Warnungen am Tageskopf
- Personenanzahl und Kosten/Nährwerte sichtbar
- Mobile-first: kompakte Darstellung auf Smartphones

### Bestehende Seite (CookingSchedulePage)

- Wird nicht ersetzt, bleibt als schnelle Übersicht
- Erhält Allergen-Badges und Personenanzahl im Header

## Capabilities

### New Capabilities
- `cooking-schedule-allergens`: Allergen/NutritionalTag-Integration in den Kochplan (Backend + Frontend)
- `cooking-schedule-nutrition`: Nährwert-Anzeige pro Mahlzeit im Kochplan
- `cooking-schedule-costs`: Kosten-Anzeige pro Rezept/Tag/Gesamt im Kochplan
- `cooking-schedule-kitchen-dashboard`: Interaktive vertikale Timeline-Ansicht für die Küche
- `cooking-schedule-print-layout`: Überarbeitete Druckansicht mit Kochbuch-Layout, Seitenumbrüchen, Rezeptkarten

### Modified Capabilities
- `cooking-schedule` (bestehend): Backend-API erhält neue Felder; Frontend-Print-Seite wird komplett ersetzt

## Impact

- **Backend**: `planner/services/cooking_schedule_service.py` – neue Felder in Dataclasses, neue Berechnungen für Kosten/Nährwerte/Allergene
- **Backend**: `planner/schemas/meal_plan.py` – neue Pydantic-Schemas (`StepOut`)
- **Frontend**: `frontend-food/src/pages/planning/CookingSchedulePrintPage.tsx` – komplett neu
- **Frontend**: `frontend-food/src/pages/planning/CookingScheduleKitchenPage.tsx` – neu
- **Frontend**: `frontend-food/src/pages/planning/CookingSchedulePage.tsx` – kleinere Ergänzungen
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts` – neue Zod-Schemas + erweiterte bestehende
- **Frontend**: `frontend-food/src/api/mealPlans.ts` – ggf. neuer Hook für Dashboard
- **Frontend**: `frontend-food/src/App.tsx` – neue Route für Dashboard
- **DB**: Keine Migration nötig (alle Daten existieren bereits, nur neue API-Abfragen)
