## Why

Zwei Stakeholder-Befunde aus der Essensplanung: (1) Der **Anreisetag wird als voller Tag gewertet** — obwohl die zeitbasierte Skip-Logik existiert, setzt der Plan-Erstellpfad aus Events Start/Ende auf `00:00`, wodurch am Anreisetag alle Mahlzeiten angelegt werden (und am Abreisetag keine). (2) **Referenzmahlzeiten synchronisieren sich nicht zuverlässig** — das Übernehmen einer geänderten Vorlage auf verlinkte Tagesmahlzeiten ist nur ein separater, leicht vergessener manueller Schritt.

## What Changes

- **Sinnvolle Default-Zeiten für Event-Pläne** — Beim Erzeugen eines MealPlans aus einem Event werden Start/Ende nicht mehr auf `00:00` gesetzt, sondern auf sinnvolle Anreise-/Abreisezeiten (Anreise 17:00, Abreise 11:00), sodass die bestehende Mahlzeiten-Skip-Logik greift. **BREAKING** für das bisherige 00:00-Verhalten.
- **Konsistente Mahlzeitenzeiten** — Die serverseitige Skip-Logik (`create_meals_for_date_timeaware`) nutzt das Plan-Feld `meal_default_times` statt der hartkodierten Default-Zeiten, konsistent mit dem Frontend.
- **RefMeal-Auto-Sync beim Speichern (mit Bestätigung)** — Beim Speichern eines RefMeals werden verlinkte (`is_synced = true`) Mahlzeiten automatisch synchronisiert. Vorher zeigt die UI, wie viele Mahlzeiten überschrieben werden, und holt eine Bestätigung ein (da Sync deren Items ersetzt).

## Capabilities

### New Capabilities
- `meal-plan-arrival-departure-days`: Korrekte Behandlung von Anreise-/Abreisetagen als Teiltage über sinnvolle Default-Zeiten und konsistente Nutzung von `meal_default_times`.
- `ref-meal-auto-sync`: Automatisches Synchronisieren verlinkter Mahlzeiten beim Speichern eines RefMeals, mit vorheriger Bestätigung über die Anzahl betroffener Mahlzeiten.

### Modified Capabilities
- (keine)

## Impact

- **Backend-Apps**: `planner` (`api/meal_plan.py` Event-Erstellpfad + Default-Zeiten, `models/meal_plan.py` `create_meals_for_date_timeaware` Skip-Logik, `api/ref_meal.py` `update_ref_meal` + `_sync_ref_meal_to_targets`).
- **Frontend-Pages**: `frontend-food` — `RefMealEditorPage.tsx` (Bestätigungsdialog + Sync beim Speichern), Wizard-/Erstellpfade.
- **Pydantic-Schemas**: ggf. `update_ref_meal`-Response um Anzahl betroffener Mahlzeiten; `meal_default_times`-Nutzung.
- **Zod-Schemas**: `frontend-food/src/schemas/mealPlan.ts` / `refMeal`-Schemas synchron.
- **Migration**: Keine (nutzt bestehende Felder); nur Verhaltensänderung.
- **Tests**: Neue Tests für `create_meals_for_date_timeaware` (bisher keine) und für Auto-Sync.
