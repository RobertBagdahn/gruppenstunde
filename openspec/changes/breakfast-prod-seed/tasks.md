## 1. Overlap-Ingredients aus seed_all._seed_content entfernen

- [x] 1.1 In `core/management/commands/seed_all.py` die 9 Overlap-Ingredients (Butter, Honig, Nutella, Marmelade, Erdnussbutter, Leberwurst, Avocado, Hummus, Kaffee) aus der `ingredients_data`-Liste in `_seed_content` entfernen
- [x] 1.2 Prüfen, ob RecipeItems in `_seed_recipes` diese 9 Ingredients per `name__icontains` referenzieren – falls ja, sicherstellen dass der Lookup auch nach dem Entfernen funktioniert

## 2. seed_breakfast_catalog erweitern: Drink-Split + spezifische Wurst/Käse

- [x] 2.1 Toppings aktualisieren: generische "Käse (Scheiben)" und "Wurst (Scheiben)" ersetzen durch Gouda, Emmentaler, Edamer, Salami, Schinken (gekocht), Putenbrust (Aufschnitt) – 17 Toppings gesamt
- [x] 2.2 Drink-Split umsetzen: 6 Drink-Zutaten (Milch, Milch laktosefrei, Hafermilch, Saft Orange, Saft Apfel, Saft Multivitamin) als `supply.Ingredient` mit `is_standalone_food=True`, Tag `breakfast-drink`, Portionen in ml
- [x] 2.3 Drink-Rezepte reduzieren: nur noch Kaffee, Kakao, Tee als `recipe.Recipe` mit Tag `breakfast-drink` – Kakao erhält RecipeItems (Kakaopulver + Milch)

## 3. Breakfast-API erweitern: drink_ingredients Feld

- [x] 3.1 In `supply/api/breakfast_catalog.py`: neues Schema `DrinkIngredientOut` hinzufügen (analog zu `BaseIngredientOut`)
- [x] 3.2 `BreakfastCatalogOut` um Feld `drink_ingredients: list[DrinkIngredientOut]` erweitern
- [x] 3.3 Endpoint `get_breakfast_catalog`: Drink-Zutaten mit Tag `breakfast-drink` laden und in `drink_ingredients` zurückgeben
- [x] 3.4 `GET /breakfast-catalog/drinks/` Endpoint aktualisieren: gibt jetzt nur noch Rezept-basierte Drinks zurück (Kaffee, Kakao, Tee)

## 4. seed_breakfast_recipes erweitern: neue Rezepte + Tags

- [x] 4.1 3 neue warme Rezepte hinzufügen: Omelett, Porridge, Gekochte Eier (alle mit `recipe_type=breakfast`)
- [x] 4.2 Müsli als `recipe_type=cold_meal` hinzufügen mit RecipeItems (Haferflocken, Milch, Obst gemischt)
- [x] 4.3 Nach Erstellung jedes Rezepts `recipe.tags.add(breakfast_warm_meal_tag)` aufrufen (für warme Rezepte) – Tag per `get_or_create` referenzieren

## 5. seed_all integriert Breakfast-Commands + entfernt legacy

- [x] 5.1 In `seed_all.py`: `call_command('seed_breakfast_catalog')` und `call_command('seed_breakfast_recipes')` nach `_seed_content` und `_seed_recipes` einfügen
- [x] 5.2 `--if-empty` Flag an die Sub-Commands durchreichen
- [x] 5.3 In `seed_all.py`: bestehenden Aufruf von `call_command('seed_drink_recipes')` entfernen
- [x] 5.4 In `seed_drink_recipes.py`: Deprecation-Kommentar hinzufügen

## 6. Tests schreiben

- [x] 6.1 Test: `seed_all` erzeugt alle 4 Breakfast-Tags
- [x] 6.2 Test: `seed_all` erzeugt 6 Base- + 17 Topping-Ingredients
- [x] 6.3 Test: `seed_all` erzeugt 3 Drink-Rezepte + 6 Drink-Zutaten + 5 warme Rezepte + 1 Müsli
- [x] 6.4 Test: Keine Duplikate bei wiederholtem `seed_all --if-empty`
- [x] 6.5 Test: Breakfast-Catalog API gibt `drink_ingredients` zurück

## 7. Lokal testen

- [x] 7.1 `uv run python manage.py migrate` (frische DB) – über Tests abgedeckt
- [x] 7.2 `uv run python manage.py seed_all` ausführen – über Tests abgedeckt
- [x] 7.3 `GET /api/breakfast-catalog/` aufrufen und Response prüfen: 6 bases, 17 toppings, 6 drink ingredients, 3 drink recipes, 5 warm meals – über Tests abgedeckt

## 8. Deploy-Skill aktualisieren

- [x] 8.1 In `.opencode/skills/deploy/SKILL.md` Phase 7 ergänzen: "seed_all ruft jetzt seed_breakfast_catalog und seed_breakfast_recipes intern auf"
- [x] 8.2 Hinweis für initialen Prod-Seed hinzufügen (cloud-sql-proxy + manuelle Befehle)

## 9. Auf Produktion deployen

- [ ] 9.1 Code committen, neuen Build triggern
- [ ] 9.2 `cloud-sql-proxy inspi-441320:europe-west3:inspi-primary` starten
- [ ] 9.3 `uv run python manage.py seed_breakfast_catalog` (für bestehende Prod-DB)
- [ ] 9.4 `uv run python manage.py seed_breakfast_recipes` (für bestehende Prod-DB)

## 10. Verifikation auf Produktion

- [ ] 10.1 `curl https://<backend-url>/api/breakfast-catalog/` aufrufen und Response validieren
- [ ] 10.2 Breakfast-Wizard im Frontend öffnen und Basis/Belag/Getränke konfigurieren
- [ ] 10.3 Wizard speichern und prüfen ob MealItems korrekt angelegt wurden
