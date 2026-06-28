## ADDED Requirements

### Requirement: seed_all integriert Breakfast-Seed-Commands

`seed_all` SHALL die Breakfast-Seed-Commands `seed_breakfast_catalog` und `seed_breakfast_recipes` intern aufrufen, sodass ein einziger Aufruf von `seed_all` den vollständigen Datenbestand inklusive Frühstücksdaten erzeugt.

#### Scenario: seed_all erzeugt Breakfast-Tags
- **WHEN** `uv run python manage.py seed_all` ausgeführt wird
- **THEN** existieren die `content.Tag`-Einträge mit den Slugs `breakfast-base`, `breakfast-topping`, `breakfast-drink`, `breakfast-warm-meal`

#### Scenario: seed_all erzeugt Base-Zutaten
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren 6 `supply.Ingredient`-Objekte mit Tag `breakfast-base`: Bauernbrot (50g, 265), Toastbrot (30g, 265), Stuten (45g, 280), Körnerbrot (55g, 230), Brötchen halbes (35g, 265), Brötchen ganzes (70g, 265)

#### Scenario: seed_all erzeugt Topping-Zutaten
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren 17 `supply.Ingredient`-Objekte mit Tag `breakfast-topping`:
  - Streichfähig: Butter, Nutella, Marmelade, Honig, Erdnussbutter, Frischkäse, Leberwurst, Hummus, Marmelade Erdbeere, Konfitüre Himbeere
  - Käse: Gouda, Emmentaler, Edamer
  - Wurst: Salami, Schinken (gekocht), Putenbrust (Aufschnitt)
  - Sonst: Avocado, Lachs (Scheiben)
- **AND** jeder Belag hat drei Belag-Portionen (knapp/normal/üppig) und eine Packungs-Portion

#### Scenario: seed_all erzeugt Drink-Zutaten
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren 6 `supply.Ingredient`-Objekte mit `is_standalone_food=True` und Tag `breakfast-drink`: Milch, Milch (laktosefrei), Hafermilch, Saft (Orange), Saft (Apfel), Saft (Multivitamin)
- **AND** jede Drink-Zutat hat mindestens eine Portion in ml

#### Scenario: seed_all erzeugt Drink-Rezepte
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren 3 `recipe.Recipe`-Objekte mit `recipe_type="drink"` und Tag `breakfast-drink`: Kaffee (4 kcal), Kakao (77 kcal), Tee (1 kcal)
- **AND** Kakao hat RecipeItems (Kakaopulver, Milch)

#### Scenario: seed_all erzeugt warme Frühstücksrezepte
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren 5 `recipe.Recipe`-Objekte mit `recipe_type="breakfast"` und Tag `breakfast-warm-meal`: Rührei, Pfannkuchen, Omelett, Porridge, Gekochte Eier
- **AND** jedes Rezept hat vollständige RecipeItem-Einträge

#### Scenario: seed_all erzeugt Müsli als Kaltgericht
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existiert 1 `recipe.Recipe`-Objekt mit `recipe_type="cold_meal"` und Slug `muesli`
- **AND** es hat RecipeItems (Haferflocken, Milch, Obst gemischt)

### Requirement: Datenkonflikte zwischen seed_all und seed_breakfast_catalog sind aufgelöst

Die 9 Ingredient-Overlaps (Butter, Honig, Nutella, Marmelade, Erdnussbutter, Leberwurst, Avocado, Hummus, Kaffee) SHALL in genau einer Seed-Quelle definiert sein – `seed_breakfast_catalog`. `seed_all._seed_content` SHALL diese 9 Einträge NICHT enthalten.

#### Scenario: Keine Duplikate bei overlap-Ingredients
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existiert jedes der 9 Overlap-Ingredients genau einmal in der Datenbank
- **AND** die Nährwerte entsprechen den Werten aus `seed_breakfast_catalog`

### Requirement: `seed_drink_recipes` wird von seed_all nicht mehr aufgerufen

`seed_all` SHALL den Command `seed_drink_recipes` NICHT mehr aufrufen. Die 4 Legacy-Drink-Rezepte werden durch 3 Drink-Rezepte + 6 Drink-Zutaten aus `seed_breakfast_catalog` ersetzt.

#### Scenario: Keine doppelten Drink-Rezepte
- **WHEN** `seed_all` ausgeführt wird
- **THEN** existieren genau 3 Drink-Rezepte (kaffee, kakao, tee)
- **AND** 6 Drink-Zutaten (milch, milch-laktosefrei, hafermilch, saft-orange, saft-apfel, saft-multivitamin)

### Requirement: Prod-Deploy-Seed ist per cloud-sql-proxy ausführbar

#### Scenario: cloud-sql-proxy Verbindung
- **WHEN** `cloud-sql-proxy inspi-441320:europe-west3:inspi-primary` läuft
- **AND** `uv run python manage.py seed_breakfast_catalog` ausgeführt wird
- **THEN** werden alle Breakfast-Tags, Base-Zutaten, Topping-Zutaten, Drink-Zutaten und Drink-Rezepte in der Prod-DB angelegt

#### Scenario: cloud-sql-proxy seed_breakfast_recipes
- **WHEN** `cloud-sql-proxy` läuft
- **AND** `uv run python manage.py seed_breakfast_recipes` ausgeführt wird
- **THEN** werden 5 warme Rezepte + Müsli (cold_meal) in der Prod-DB angelegt
- **AND** warme Rezepte haben Tag `breakfast-warm-meal`

### Requirement: Breakfast-Katalog-API antwortet auf Prod mit vollständigen Daten

Der Endpoint `GET /api/breakfast-catalog/` SHALL auf Produktion alle geseedeten Daten zurückgeben.

#### Scenario: Vollständiger Breakfast-Katalog
- **WHEN** `GET /api/breakfast-catalog/` aufgerufen wird (authentifiziert)
- **THEN** enthält die Response:
  - `bases`: 6 Base-Ingredients
  - `toppings`: 17 Topping-Ingredients
  - `drink_ingredients`: 6 Drink-Zutaten
  - `drink_recipes`: 3 Drink-Rezepte
  - `warm_meal_recipes`: 5 warme Rezepte
  - `gram_measuring_unit_id`: ID der Messeinheit "Gramm"
  - `ml_measuring_unit_id`: ID der Messeinheit "Milliliter"
