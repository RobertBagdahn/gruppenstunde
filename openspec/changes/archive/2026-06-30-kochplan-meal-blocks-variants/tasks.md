## 1. Backend — Neue Dataclasses & Pydantic Schemas

- [x] 1.1 Neue Pydantic-Schemas in `planner/schemas/meal_plan.py` erstellen: `CookingScheduleVariantOut`, `CookingScheduleRecipeBlockOut`, `CookingScheduleMealOut`
- [x] 1.2 `CookingScheduleDayOut.items` durch `CookingScheduleDayOut.meals` ersetzen
- [x] 1.3 Alte `CookingScheduleItemOut` als deprecated markieren (nicht löschen, könnte von Tests referenziert sein)
- [x] 1.4 Backend-Dataclasses in `cooking_schedule_service.py` entsprechend anpassen: neue `CookingScheduleVariant`, `CookingScheduleRecipeBlock`, `CookingScheduleMeal` DataClasses
- [x] 1.5 `__init__.py` der Schemas aktualisieren (neue Schemas exportieren)

## 2. Backend — `build_cooking_schedule` umbauen

- [x] 2.1 `build_cooking_schedule()` in `cooking_schedule_service.py` umschreiben: Meal-Items nach `meal_id` gruppieren, darin nach `(recipe_id, variant_group_id)` für RecipeBlocks
- [x] 2.2 Varianten innerhalb eines RecipeBlocks sortieren nach `start_time`
- [x] 2.3 RecipeBlocks innerhalb eines Meals sortieren nach frühester Varianten-Startzeit
- [x] 2.4 Meals innerhalb eines Tages sortieren nach `serving_time`
- [x] 2.5 Meal-Metadaten aus Meal-Objekt in `CookingScheduleMeal` übernehmen (`display_name`, `note`, `override_portions`, etc.)
- [x] 2.6 `variant_display_name` aus `MealItem.display_name` übernehmen; bei `null` den Namen aus den aktiven RecipeItems generieren (oder `null` lassen wenn Single-Variante)
- [x] 2.7 `portion` pro Variante korrekt berechnen: `effective_portions * factor`
- [x] 2.8 API-Endpunkt `get_cooking_schedule` in `planner/api/meal_plan.py` aktualisieren (neuer Response-Typ `CookingScheduleOut`)

## 3. Backend — Zutaten-Skalierung fixen (Varianten-Bug)

- [x] 3.1 `_compute_scaled_ingredients()` um Parameter `active_recipe_item_ids: list[int]` erweitern
- [x] 3.2 Logik implementieren: Nur RecipeItems in der Exchange-Group, die in `active_recipe_item_ids` sind, plus nicht-exchangbare + nicht-optional-Items
- [x] 3.3 Aufruf in `build_cooking_schedule` aktualisieren: pro Variante mit deren `active_recipe_item_ids` aufrufen

## 4. Backend — Tests aktualisieren

- [x] 4.1 Bestehende Tests in `planner/tests/test_cooking_schedule.py` an neue API-Struktur anpassen (neue Felder, geschachtelte Assertions)
- [x] 4.2 Neuen Test für Varianten-Gruppierung: Recipe mit 2 Varianten → 1 RecipeBlock mit 2 Varianten in der Response
- [x] 4.3 Neuen Test für Single-Variante: Recipe ohne Varianten → 1 RecipeBlock mit 1 Variante (variant_group_id=null)
- [x] 4.4 Neuen Test für Zutaten-Filter: Variante mit `active_recipe_item_ids` zeigt nur korrekte Zutaten
- [x] 4.5 Neuen Test für Meal-Sortierung: 3 Meals an einem Tag in korrekter Reihenfolge
- [x] 4.6 Neuen Test für excluded meals: externe + null-start Mahlzeiten zählen zu `excluded_meal_count`
- [x] 4.7 Backend-Test-Suite ausführen: `uv run python manage.py test planner.tests.test_cooking_schedule -xvs`

## 5. Frontend — Zod Schemas synchronisieren

- [x] 5.1 Neue Zod-Schemas in `frontend-food/src/schemas/mealPlan.ts`: `CookingScheduleVariantSchema`, `CookingScheduleRecipeBlockSchema`, `CookingScheduleMealSchema`
- [x] 5.2 `CookingScheduleDaySchema.items` durch `meals` ersetzen
- [x] 5.3 Alte `CookingScheduleItemSchema` als deprecated markieren
- [x] 5.4 Exporte und Typen aktualisieren

## 6. Frontend — Kochplan-Seite restrukturieren

- [x] 6.1 `CookingSchedulePage.tsx` komplett umbauen: flache Tabelle durch Meal-Block-Layout ersetzen
- [x] 6.2 `MealBlock`-Komponente erstellen: Header mit Meal-Typ-Icon, Servierzeit, Portionen
- [x] 6.3 `RecipeBlock`-Komponente erstellen: Recipe-Card mit Bild (optional), Titel, Allergen-Badges, Varianten-Liste
- [x] 6.4 `VariantRow`-Komponente erstellen: Sub-Row mit Startzeit, Dauer, Portionen, Varianten-Name, ausklappbaren Details (Zutaten + Steps)
- [x] 6.5 Accordion-Verhalten implementieren: nur eine Variante gleichzeitig aufgeklappt
- [x] 6.6 Mobile-First: Varianten-Sub-Rows responsive gestalten (ab 320px)
- [x] 6.7 Ladezustand und Empty-State an neue Struktur anpassen
- [x] 6.8 Frontend-Lint ausführen: `cd frontend-food && npm run lint`
- [x] 6.9 Frontend-TypeScript-Check: `cd frontend-food && npx tsc --noEmit`
