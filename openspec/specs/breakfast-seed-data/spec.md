# Spec: breakfast-seed-data

## Requirements

### Requirement: Frühstückszutaten in seed_all vorhanden

`seed_all.py` SHALL alle Zutaten enthalten, die von `seed_breakfast_recipes` benötigt werden. Die folgenden 13 Zutaten MUST in der `ingredients_data`-Liste vorhanden sein:

- Nutella (Brotaufstrich)
- Marmelade (Brotaufstrich)
- Wurst (Aufschnitt, Aufschnitt-Qualität für Brot)
- Erdnussbutter (Brotaufstrich)
- Leberwurst (Aufschnitt)
- Lachs (Aufschnitt/Räucherlachs)
- Avocado (Obst & Gemüse)
- Hummus (Brotaufstrich)
- Cornflakes (Cerealien)
- Obst gemischt (generische Obst-Zutat)
- Kakaopulver (Backwaren/Getränke)
- Orangensaft (Getränk)
- Kaffee (Getränk)

#### Scenario: seed_all vollständig ausgeführt

- **WHEN** `uv run python manage.py seed_all` ausgeführt wird
- **THEN** sind alle 13 neuen Frühstückszutaten als `supply.Ingredient`-Objekte in der Datenbank vorhanden

#### Scenario: seed_breakfast_recipes nach seed_all

- **WHEN** `uv run python manage.py seed_all` und danach `uv run python manage.py seed_breakfast_recipes` ausgeführt werden
- **THEN** entstehen alle 26 Frühstücksrezepte mit vollständigen RecipeItems (keine WARNING-Meldungen für fehlende Zutaten)

### Requirement: Neue Zutaten haben vollständige Pflichtfelder

Jede neue Zutat MUST folgende Felder gesetzt haben: `name`, `slug`, `physical_density`, `physical_viscosity`, `energy_kcal`, `price_per_kg`, sowie eine Zuordnung zu einer `RetailSection`.

#### Scenario: Zutat hat Nährwerte

- **WHEN** eine neue Frühstückszutat angelegt wird
- **THEN** hat sie mindestens `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g` gesetzt (keine None-Werte für diese Felder)

### Requirement: Seed-Command ist idempotent

Der `seed_all`-Command SHALL beim wiederholten Ausführen keine Duplikate der neuen Zutaten erzeugen.

#### Scenario: Seed zweimal ausgeführt

- **WHEN** `uv run python manage.py seed_all` zweimal hintereinander ausgeführt wird
- **THEN** existieren die 13 neuen Zutaten genau einmal in der Datenbank
