## Why

Die aktuelle Seed-Datenbank enthält nur ~50 handgeschriebene Zutaten, ~5 Sessions, ~3 Games und ~10 Rezepte. Das Vorgängerprojekt **Inspi** (unter `/Users/robertbagdahn/code/inspi/data`) enthält einen umfangreichen Datenbestand mit **239 Activities**, **6.319 REWE-Zutaten** (inkl. Nährwerten und Preisen), **203 Rezepte**, **660 Materialien** und **553 Material-Zuordnungen**. Dieser Datenbestand soll über ein Management Command in die neue Gruppenstunde-Plattform importiert werden, um sofort eine realistische und umfangreiche Datenbasis für Entwicklung, Testing und Demo-Zwecke zu haben.

## What Changes

- **Neues Management Command** `import_inspi_data` zum Einmalimport der Inspi-Daten in die gruppenstunde-Datenbank
- **Import von ~239 Activities** → Mapping auf `GroupSession`, `Game` und `Recipe` (je nach `activity_type`)
- **Import von ~6.319 Zutaten** aus `1_data_food_inspi.json` mit vollständigen Nährwertdaten, Nutri-Score und Preisen → `Ingredient` + `Portion`
- **Import von ~203 Rezepte** aus `3_food_inspi_import_recipe_old.json` mit RecipeItems → `Recipe` + `RecipeItem`
- **Import von ~660 Materialnamen** → `Material`
- **Import von ~553 Material-Zuordnungen** → `ContentMaterialItem`
- **Import von Master-Daten**: Topics → `Tag`, ScoutLevels → `ScoutLevel`, RetailSections, NutritionalTags, MeasuringUnits, RecipeHints → `HealthRule`
- **Idempotenz**: Wiederholtes Ausführen erzeugt keine Duplikate (`get_or_create` / Slug-basiert)
- Bestehende Seed-Daten (`seed_all`) bleiben unverändert — der Import ist ein separates Command

## Capabilities

### New Capabilities
- `inspi-data-import`: Management Command und Mapping-Logik zum Import der Inspi-Datenbank (Activities, Zutaten, Rezepte, Materialien, Master-Daten) in die gruppenstunde-Modelle

### Modified Capabilities
- `seed-data`: Ergänzung der Dokumentation um den neuen Import-Pfad; keine Anforderungsänderung an bestehende Seed-Logik

## Impact

- **Backend-Apps**: `content`, `session`, `game`, `recipe`, `supply`, `blog`
- **Neue Datei**: `backend/core/management/commands/import_inspi_data.py`
- **Datenquelle**: Liest JSON-Fixtures aus `/Users/robertbagdahn/code/inspi/data/` (wird zur Laufzeit geladen, keine Dependency)
- **Datenbank**: Erstellt tausende Einträge — nur für Entwicklung/Staging gedacht, nicht für Production
- **Keine Schema-Änderungen**: Alle importierten Daten passen in die bestehenden Modelle
- **Keine Migrations nötig**: Keine Model-Änderungen
- **Keine Frontend-Änderungen**: Rein backend-seitiger Daten-Import
