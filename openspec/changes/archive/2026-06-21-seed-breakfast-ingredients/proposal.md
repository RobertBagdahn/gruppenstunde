## Why

Der `seed_breakfast_recipes`-Command existiert bereits mit 26 Frühstücksrezepten, aber 13 der benötigten Zutaten fehlen im `seed_all`-Command. Dadurch werden RecipeItems beim Seeden lautlos übersprungen — Frühstücksrezepte entstehen ohne Zutaten und sind für Entwicklung und Demo-Umgebungen unbrauchbar.

## What Changes

- `seed_all.py` um 13 fehlende Frühstückszutaten erweitern (Nutella, Marmelade, Wurst, Erdnussbutter, Leberwurst, Lachs, Avocado, Hummus, Cornflakes, Obst, Kakaopulver, Orangensaft, Kaffee)
- Alle neuen Zutaten erhalten plausible Nährwert-Schätzwerte, `price_per_kg`, `physical_density` und Zuordnung zu `RetailSection`

## Capabilities

### New Capabilities

- `breakfast-seed-data`: Vollständige Seed-Daten für Frühstückszutaten, sodass `seed_breakfast_recipes` alle 26 Rezepte korrekt mit RecipeItems anlegen kann

### Modified Capabilities

_(keine Spec-Level-Änderungen an bestehenden Capabilities)_

## Impact

- **Backend**: `backend/core/management/commands/seed_all.py` — `ingredients_data`-Liste erweitert
- **Keine Migrations**: Nur Seed-Daten, keine Modell-Änderungen
- **Keine API-Änderungen**: Keine Pydantic- oder Zod-Schema-Änderungen nötig
- **Keine Frontend-Änderungen**: Rein backend-seitiger Seed-Command
- **Betroffene App**: `supply` (Ingredient-Model), `recipe` (seed_breakfast_recipes nutzt die neuen Zutaten)
