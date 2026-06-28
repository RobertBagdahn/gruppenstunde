## 1. Backend — Dataclasses + Schemas erweitern

- [x] 1.1 Neue Dataclasses `StepIngredient` und `CookingScheduleStep` in `cooking_schedule_service.py` definieren
- [x] 1.2 Bestehende Dataclasses (`CookingScheduleIngredient`, `CookingScheduleItem`, `CookingScheduleDay`, `CookingScheduleResult`) um neue Felder erweitern (nutritional_tags, cost, energy, etc.)
- [x] 1.3 Pydantic-Schemas `StepOut`, `CookingScheduleIngredientOut`, `CookingScheduleItemOut`, `CookingScheduleDayOut`, `CookingScheduleOut` in `planner/schemas/meal_plan.py` aktualisieren
- [x] 1.4 Zod-Schemas in `frontend-food/src/schemas/mealPlan.ts` synchronisieren

## 2. Backend — Schritt-Parsing

- [x] 2.1 Python-Implementierung von `parse_recipe_steps(markdown: str) -> list[StepData]` in `planner/services/cooking_schedule_service.py` (oder neuer Helper-Datei)
- [x] 2.2 Timer-Extraktion aus Markdown (z.B. `[20min]` oder `⏱ 20 Minuten`)
- [x] 2.3 Integration in `build_cooking_schedule()`: `steps_parsed` aus `recipe.description` befüllen

## 3. Backend — Allergen/NutritionalTag-Anreicherung

- [x] 3.1 Pro RecipeItem: Ingredient.nutritional_tags sammeln
- [x] 3.2 Pro Recipe: recipe.nutritional_tags sammeln
- [x] 3.3 Deduplizierte Liste in `CookingScheduleItem.nutritional_tags` befüllen
- [x] 3.4 Pro Tag: alle Tags der Items aggregieren → `CookingScheduleDay.day_nutritional_tags`
- [x] 3.5 `CookingScheduleIngredient.nutritional_tags` aus Ingredient.nutritional_tags befüllen

## 4. Backend — Kosten + Nährwerte

- [x] 4.1 Pro RecipeItem: `compute_variant_cost` und `compute_variant_energy` aus `variant_service` aufrufen
- [x] 4.2 Skalierung auf effective_portions anwenden
- [x] 4.3 Summe pro `CookingScheduleItem` in `total_cost_eur`, `total_energy_kcal` ablegen
- [x] 4.4 Pro CookingScheduleDay: Summe aller Items berechnen
- [x] 4.5 Pro CookingScheduleResult: Gesamtsumme + mit Reservefaktor berechnen

## 5. Backend — Tages-Kopf + Gesamtzeit

- [x] 5.1 `day_start_time` aus frühester `start_time` aller Items des Tages
- [x] 5.2 `day_end_time` aus spätester `serving_time` aller Items des Tages
- [x] 5.3 `day_duration_minutes` aus Differenz berechnen
- [x] 5.4 `portions` aus `meal_plan.norm_portions` übernehmen
- [x] 5.5 Meal-Notiz (`meal.note`) pro CookingScheduleItem übernehmen

## 6. Backend — Tests

- [x] 6.1 Tests für erweiterten `build_cooking_schedule`: Allergene, Kosten, Nährwerte
- [x] 6.2 Tests für `parse_recipe_steps`: Heading-Parsing, Nummerierte-Liste-Parsing, Timer
- [x] 6.3 Tests für leere/Nicht-vorhandene Daten (keine Tags, keine Kosten, keine Beschreibung)

## 7. Frontend — Kochbuch-Layout (Print)

- [x] 7.1 `CookingSchedulePrintPage.tsx` komplett überarbeiten: Deckblatt + Tages-Köpfe + Rezeptkarten
- [x] 7.2 CSS für Seitenumbrüche (`page-break-before: always`, `break-inside: avoid`) und A4-Format
- [x] 7.3 Rezeptkarten-Komponente mit Zutaten (inkl. Notizen), Schritten, Allergen-Badges, Kosten, Nährwerten
- [x] 7.4 Tages-Kopf mit Personen, Gesamtzeit, Allergen-Zusammenfassung, Tageskosten
- [x] 7.5 Deckblatt mit Plan-Name, Datum, Personen, Gesamtkosten, Allergen-Übersicht
- [x] 7.6 Druck-Button im Footer

## 8. Frontend — Küchen-Dashboard

- [x] 8.1 Neue Seite `CookingScheduleKitchenPage.tsx` in `frontend-food/src/pages/planning/`
- [x] 8.2 Vertikale Timeline-Komponente: Zeit-Marker + Rezept-Karten
- [x] 8.3 Aufklappbare Rezept-Details (Accordion): Zutaten + Schritte
- [x] 8.4 Fix-Header: Personen, Allergen-Warnungen, Tagesinfo
- [x] 8.5 Mahlzeit-Gruppierung (Frühstück/Mittag/Abend) mit Farbcodierung
- [x] 8.6 Mobile-Optimierung: kompakte Timeline, Vollbreiten-Accordions
- [x] 8.7 Leer-/Lade-/Fehler-Zustände
- [x] 8.8 Route in `App.tsx` registrieren (`/meal-plans/:id/cooking-schedule/kitchen`)

## 9. Frontend — Bestehende Seite aktualisieren

- [x] 9.1 `CookingSchedulePage.tsx`: Personenanzahl im Header, Allergen-Badges in der Tabelle
- [x] 9.2 Link zum Küchen-Dashboard hinzufügen (neben Drucken-Button)
- [x] 9.3 Tägliche Gesamt-Kochzeit anzeigen

## 10. Integration — Verifikation

- [x] 10.1 Backend-Tests: 34/34 passed
- [x] 10.2 TypeScript: nur pre-existing Error (IngredientDetailPage)
- [ ] 10.3 Manueller Test: Kochplan aufrufen, Allergene prüfen, Druckansicht, Dashboard
