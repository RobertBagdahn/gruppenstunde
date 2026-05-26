## Why

Die aktuelle Rezept- und Zutaten-Bewertung deckt nur die Big 7 Makronährstoffe (Energie, Eiweiß, Fett, gesättigte Fettsäuren, Kohlenhydrate, Zucker, Salz) plus Ballaststoffe ab. Vitamine, Mineralstoffe und erweiterte Nährwertregeln fehlen komplett. Dadurch können Rezepte nicht umfassend auf Gesundheit bewertet werden. Im alten Inspi-Projekt (`/inspi/food`) existieren bereits 20+ RecipeHint-Regeln, die in der neuen Codebasis nur als 4 rudimentäre Seed-Daten existieren. Außerdem fehlen DGE-konforme Referenzwerte für Vitamine und Mineralstoffe, die für eine vollständige Ernährungsbewertung (besonders für Pfadfinder-Zielgruppe 10-18 Jahre) essenziell sind.

## What Changes

### Erweiterte Nährwertfelder auf Ingredient
- **BREAKING**: Neue Felder auf `Ingredient` für Vitamine (A, B1, B2, B6, B12, C, D, E, K, Niacin, Folat, Pantothensäure, Biotin) und Mineralstoffe (Calcium, Eisen, Magnesium, Zink, Kalium, Phosphor, Jod, Selen, Kupfer, Mangan, Chrom, Fluorid)
- **BREAKING**: Neue Felder auf `Recipe` für denormalisierte Cache-Werte der erweiterten Nährstoffe
- Neue DGE-Referenzwerte für Vitamine und Mineralstoffe in `dge_reference.py`

### Erweiterte Nährwert-Tabelle in Admin und UI
- Admin-Oberfläche mit vollständiger Nährwerttabelle (Big 7 + Ballaststoffe + Vitamine + Mineralstoffe) pro Ingredient
- Nährwert-Breakdown-Tabelle in der Rezeptdetailansicht erweitert um Vitamine/Mineralstoffe
- Prozentuale DGE-Bedarfsdeckung pro Nährstoff anzeigbar

### Massiv erweiterte RecipeHint-Regeln
- Migration aller 20+ alten Inspi-Regeln (aus `0_init_data.json`) in die neue Codebasis
- Neue Regeln für: Vitamin-Abdeckung, Mineralstoff-Schwellenwerte, Ballaststoff-Mindestmengen, Natrium-Obergrenzen, Fett-Verhältnisse
- Improvement-Texte mit konkreten Verbesserungsvorschlägen (z.B. "Ersetze weißen Reis durch Vollkornreis für mehr Ballaststoffe")
- Regeln nach `recipe_objective` kategorisiert (health, taste, cost, fulfillment)
- Regeln nach `recipe_type` differenziert (Frühstück hat andere Schwellenwerte als warme Mahlzeit)

### Admin-pflegbare Regeln und Referenzwerte
- HealthRule-Admin erweitert mit Bulk-Import/Export
- RecipeHint-Admin mit besserer Filterung und Improvement-Texten
- DGE-Referenzwerte als pflegbares Model statt statischer Python-Datei

## Capabilities

### New Capabilities
- `extended-nutrition-data`: Erweiterte Nährwertfelder (Vitamine, Mineralstoffe) auf Ingredient und Recipe mit DGE-Referenzwerten als pflegbares Model
- `extended-nutrition-rules`: Umfassende RecipeHint- und HealthRule-Regeln mit Verbesserungsvorschlägen, differenziert nach Rezepttyp und Bewertungsdimension

### Modified Capabilities
- `ingredient-database`: Neue Nährwertfelder (Vitamine, Mineralstoffe) auf dem Ingredient-Model, erweiterte Admin-Fieldsets, erweiterte Schemas
- `recipe`: Erweiterte denormalisierte Cache-Felder, erweiterter Nutrition-Breakdown, DGE-Bedarfsdeckung in API-Response
- `meal-cockpit`: Neue HealthRules für Vitamine/Mineralstoffe auf Tages- und Mahlzeitebene
- `seed-data`: Erweiterung der Seed-Daten um alle Nutrition-Rules und DGE-Referenzwerte

## Impact

### Backend (Django)
- **Models**: `supply.Ingredient` (25+ neue Felder), `recipe.Recipe` (15+ neue cached-Felder), neues `supply.DgeReference` Model
- **Migrations**: 2-3 neue Migrations für supply und recipe App
- **Schemas**: `IngredientDetailOut`, `IngredientCreateIn`, `RecipeNutritionBreakdownOut`, `RecipeDetailOut` erweitern
- **Services**: `nutri_service.py`, `recipe_checks.py`, `cockpit_service.py` erweitern
- **Admin**: `IngredientAdmin`, `RecipeHintAdmin`, `HealthRuleAdmin` erweitern, neuer `DgeReferenceAdmin`
- **Seed**: `seed_all.py` um 40+ RecipeHints und 6+ HealthRules erweitern

### Frontend (React)
- **Zod Schemas**: `ingredientSchema`, `recipeSchema`, `nutritionBreakdownSchema` erweitern
- **Pages**: Rezeptdetail-Nährwerttabelle erweitern, Ingredient-Detail erweitern
- **API Hooks**: Bestehende Hooks anpassen (Rückgabewerte erweitert)

### Datenbank
- PostgreSQL: ~40 neue nullable Float-Columns auf `supply_ingredient`, ~15 neue auf `recipe_recipe`
- Keine Index-Änderungen nötig (Nährwertfelder werden nicht gefiltert)
