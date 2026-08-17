## 1. Neue Zutaten

- [x] 1.1 Paprikapulver, Kreuzkümmel, Chilipulver zu `ingredients_data` in `_seed_content()` hinzufügen (Nährwerte, price_per_kg, retail_section, tags)
- [x] 1.2 Portionen für neue Gewürze in `extra_portions` ergänzen (1 TL = 3g)

## 2. Neue Rezepte

- [x] 2.1 Rezept "Gulasch" in `recipe_data` ergänzen (warm_meal, servings=1, MEDIUM, 60-90min)
- [x] 2.2 Rezept "Chili con Carne" ergänzen (warm_meal, servings=1, MEDIUM, 30-60min)
- [x] 2.3 Rezept "Porridge" ergänzen (breakfast, servings=1, EASY, <30min)
- [x] 2.4 Rezept "Brotzeit" ergänzen (cold_meal, servings=1, EASY, <30min)
- [x] 2.5 Rezept "Grillwürstchen" ergänzen (warm_meal, servings=1, EASY, <30min)
- [x] 2.6 RecipeItems für alle 5 neuen Rezepte in `recipe_ingredients_map` ergänzen (Zutaten + Mengen pro Normportion)
- [x] 2.7 Tags und ScoutLevels für neue Rezepte zuweisen

## 3. Wochenend-MealPlans

- [x] 3.1 10 MealPlan-Definitionen als Daten-Liste erstellen (name, description, norm_portions, activity_factor, reserve_factor, budget_per_person_per_day, start_datetime, end_datetime)
- [x] 3.2 Mahlzeiten-Zuordnungstabelle definieren (welches Rezept zu welcher Mahlzeit pro MealPlan)
- [x] 3.3 MealPlan-Erzeugung implementieren: Loop über Daten, `create_meals_for_date_timeaware()` für jeden Tag, MealItem-Zuordnung
- [x] 3.4 Idempotenz-Check: `MealPlan.objects.filter(name=...).exists()` pro Plan

## 4. Lokaler Test

- [x] 4.1 `uv run python manage.py seed_all --only recipes` lokal ausführen und prüfen
- [x] 4.2 `uv run python manage.py seed_all --only planner` lokal ausführen und prüfen
- [x] 4.3 Verifizieren: 10 neue MealPlans mit je 7 Meals und MealItems existieren

## 5. Prod-Deployment

- [x] 5.1 cloud-sql-proxy starten
- [x] 5.2 `uv run python manage.py seed_all --only recipes` gegen Prod ausführen
- [x] 5.3 `uv run python manage.py seed_all --only planner` gegen Prod ausführen
