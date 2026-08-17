## Why

Die Plattform hat aktuell keine Seed-Daten — alle Rezepte, Zutaten und Preise müssen manuell erstellt werden. Für Entwicklung, Demos und eine ansprechende erste User-Erfahrung brauchen wir realistische Beispieldaten. Außerdem fehlen Preisangaben bei Zutaten, Rezeptmengen sind nicht konsistent auf 1 Portion normalisiert, Umlaute werden teilweise als `ae`/`oe`/`ue` geschrieben, und im Essensplan fehlen Links zu Zutaten und Rezepten.

## What Changes

### Seed-Daten
- **Rezept-Seeds**: Mindestens 10 realistische Pfadfinder-Rezepte (Lagerfeuer, Gruppenkochen, Wanderproviant etc.) als JSON/YAML-Fixtures oder Management Command
- **Zutaten-Seeds**: Basis-Zutatendatenbank mit ~50 häufigen Zutaten inkl. vollständiger Nährwertdaten, Nutri-Score, Portionen
- **Datenquelle**: Importiere Daten aus öffentlichen Quellen (BLS, USDA FoodData Central) oder erstelle manuell kuratierte Daten
- **Rezeptmengen**: Alle Seed-Rezepte MÜSSEN auf 1 Portion normalisiert sein (servings=1)

### Preise
- **Zutaten-Preise**: `price_per_kg` für alle Seed-Zutaten pflegen (realistische deutsche Supermarkt-Preise)
- **Rezept-Preisberechnung**: `cached_price_total` wird automatisch über den bestehenden `recalculate_recipe_cache` berechnet

### Umlaute
- **Umlaut-Korrektur**: Alle bestehenden Texte in der Codebase prüfen — `ae` → `ä`, `oe` → `ö`, `ue` → `ü`, `ss` → `ß` (wo korrekt). Betrifft: UI-Labels, Seed-Daten, Fehlermeldungen, Tooltips

### Essensplan-Links
- **Zutat-Links**: Im Essensplan (Meal Plan) Links zu den verwendeten Zutaten anzeigen
- **Rezept-Links**: Im Essensplan Links zu den zugeordneten Rezepten anzeigen (klickbar zur Detailseite)

## Capabilities

### New Capabilities
- `seed-data`: Management Command und Fixture-Daten für Rezepte, Zutaten und Portionen

### Modified Capabilities
- `ingredient-database`: Preise für alle Basis-Zutaten pflegen
- `umlaut-correction`: Konsistente Umlaut-Verwendung in der gesamten Codebase (UI-Texte, Seed-Daten)
- `meal-plan`: Links zu Zutaten und Rezepten im Essensplan

## Impact

### Backend (Django)
- **Neues Management Command**: `seed_data` in `backend/recipe/management/commands/` — erstellt Zutaten, Portionen, Rezepte, RecipeItems
- **Fixture-Daten**: JSON-Dateien unter `backend/recipe/fixtures/` oder `backend/supply/fixtures/`
- **`supply` App**: `price_per_kg` für Seed-Zutaten befüllen
- **Keine Schema-Änderungen** für Seed-Daten
- **Keine Migrationen** für Seed-Daten

### Frontend (React)
- **Umlaut-Korrektur**: Alle Strings in `.tsx`-Dateien prüfen und korrigieren
- **Essensplan**: `MealPlanPage.tsx` oder äquivalent — Links zu Rezept-Detailseiten und Zutaten-Seiten einbauen
- **Keine neuen Zod-Schemas nötig** (die existierenden Schemas enthalten bereits `slug` und `id` für Verlinkung)
