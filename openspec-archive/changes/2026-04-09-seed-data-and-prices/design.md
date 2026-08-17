## Context

Die Plattform hat keine Seed-/Fixture-Daten. Zutaten werden einzeln über die UI oder den `IngredientAIService` erstellt. Preise sind auf dem `Ingredient`-Modell als `price_per_kg` vorhanden, aber bei den meisten Zutaten nicht befüllt. Der Essensplan (`planner` App) zeigt Mahlzeiten mit zugeordneten Rezepten, aber ohne direkte Links zu Detailseiten.

**Bestehende Datenquellen:**
- `supply/data/dge_reference.py`: DGE-Referenzwerte (statisch, kein Import nötig)
- `Ingredient`-Modell hat ein `fdc_id`-Feld (USDA FoodData Central ID) — könnte für Import genutzt werden
- Kein `inspi/data/food`-Verzeichnis vorhanden (der User meinte vermutlich eine externe Datenquelle)

## Goals / Non-Goals

**Goals:**
- Realistische Seed-Daten für sofortiges Testen und Demo
- Alle Seed-Rezepte auf 1 Portion normalisiert
- Zutaten mit vollständigen Nährwerten und realistischen Preisen
- Konsistente Umlaute in der gesamten Codebase
- Verlinkte Essensplan-Einträge

**Non-Goals:**
- Automatischer Import aus BLS/USDA-API (manuell kuratierte Daten sind zuverlässiger)
- Vollständige Zutatendatenbank mit hunderten Einträgen (50 Basis-Zutaten reichen)
- Preisvergleich zwischen Supermärkten (ein Durchschnittspreis pro Zutat genügt)

## Decisions

### 1. Management Command statt Django Fixtures

**Entscheidung:** Ein `seed_data` Management Command (`uv run python manage.py seed_data`) das Zutaten, Portionen, Rezepte und RecipeItems programmatisch erstellt.

**Begründung:** Django JSON-Fixtures sind bei verknüpften Modellen (Ingredient → Portion → RecipeItem → Recipe) fehleranfällig wegen fixer PKs. Ein Management Command kann `get_or_create` nutzen und ist idempotent.

**Alternative:** JSON-Fixtures mit `loaddata` — abgelehnt wegen FK-Problemen und fehlender Idempotenz.

### 2. Seed-Daten als Python-Dicts im Command

**Entscheidung:** Die Rezept- und Zutatendaten werden als Python-Dicts direkt im Management Command definiert (oder als separate `seed_data.py` Datendatei im gleichen Verzeichnis).

**Begründung:** Typisierung, Validierung und Verknüpfung sind in Python einfacher als in JSON/YAML.

### 3. Umlaut-Korrektur als einmaliger Sweep

**Entscheidung:** Einmaliges Durchsuchen aller `.tsx`, `.ts` und `.py` Dateien nach `ae`→`ä`, `oe`→`ö`, `ue`→`ü` Mustern in deutschen Texten. Nur in String-Literals und Kommentaren, nicht in Variablennamen oder englischem Code.

**Begründung:** Variablennamen sind englisch (keine Umlaute). Nur deutsche UI-Texte und Fehlermeldungen sind betroffen.

### 4. Essensplan-Links als React Router Links

**Entscheidung:** In der Essensplan-Darstellung werden Rezeptnamen als `<Link to={/recipes/${slug}}/>` und Zutatennamen als `<Link to={/ingredients/${slug}}/>` gerendert.

## Risks / Trade-offs

**[Seed-Daten-Pflege]** → Seed-Daten können veralten wenn sich Models ändern. Mitigation: Management Command beim CI-Build laufen lassen (Smoke-Test).

**[Umlaut-False-Positives]** → Nicht jedes `ue` ist ein `ü` (z.B. „queue", „true"). Mitigation: Nur in deutschen String-Literals korrigieren, nicht in englischen Variablen/Kommentaren.

**[Preis-Aktualität]** → Supermarkt-Preise ändern sich. Mitigation: Ungefähre Durchschnittspreise verwenden, Preise als Schätzwerte kennzeichnen.
