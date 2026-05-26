## ADDED Requirements

### Requirement: Import Management Command

Das System MUSS ein Management Command `import_inspi_data` bereitstellen, das Daten aus dem Inspi-Projekt importiert.

#### Scenario: Command ausführen mit Default-Pfad
- **WHEN** `uv run python manage.py import_inspi_data` ausgeführt wird
- **THEN** MUSS das Command Daten aus `/Users/robertbagdahn/code/inspi/data/` lesen
- **THEN** MUSS das Command eine Zusammenfassung der importierten Records ausgeben (Anzahl pro Typ)

#### Scenario: Command mit benutzerdefiniertem Pfad
- **WHEN** `uv run python manage.py import_inspi_data --data-dir /pfad/zum/data` ausgeführt wird
- **THEN** MUSS das Command Daten aus dem angegebenen Verzeichnis lesen

#### Scenario: Fehlender Daten-Pfad
- **WHEN** das angegebene Datenverzeichnis nicht existiert
- **THEN** MUSS das Command mit einer verständlichen Fehlermeldung abbrechen

#### Scenario: Idempotenz
- **WHEN** das Command mehrfach ausgeführt wird
- **THEN** DÜRFEN keine Duplikate entstehen (basierend auf `slug` oder `name`)
- **THEN** MÜSSEN bestehende Einträge unverändert bleiben

#### Scenario: Atomarer Import
- **WHEN** ein Fehler während des Imports auftritt
- **THEN** MÜSSEN alle bereits importierten Daten in dieser Ausführung zurückgerollt werden (`transaction.atomic()`)

### Requirement: Master-Daten Import

Das Command MUSS die Inspi-Master-Daten in die entsprechenden gruppenstunde-Modelle importieren.

#### Scenario: MeasuringUnits importieren
- **WHEN** die Datei `food/0_init_data.json` gelesen wird
- **THEN** MÜSSEN alle `food.measuringunit`-Einträge als `MeasuringUnit` importiert werden
- **THEN** MUSS das Feld-Mapping korrekt sein: `name`, `description`, `quantity`, `unit`

#### Scenario: RetailSections importieren
- **WHEN** die Datei `food/0_init_data.json` gelesen wird
- **THEN** MÜSSEN alle `food.retailsection`-Einträge als `RetailSection` importiert werden
- **THEN** MUSS das Feld-Mapping korrekt sein: `name`, `description`, `rank`

#### Scenario: NutritionalTags importieren
- **WHEN** die Datei `food/0_init_data.json` gelesen wird
- **THEN** MÜSSEN alle `food.nutritionaltag`-Einträge als `NutritionalTag` importiert werden
- **THEN** MUSS das Feld-Mapping korrekt sein: `name`, `name_opposite`, `description`, `rank`

#### Scenario: Topics als Tags importieren
- **WHEN** die Datei `activity/master-data/1_topic.json` gelesen wird
- **THEN** MÜSSEN alle `activity.topic`-Einträge als `Tag` importiert werden
- **THEN** MUSS `name` und `slug` (aus Name generiert) korrekt gesetzt sein

#### Scenario: ScoutLevels importieren
- **WHEN** die Datei `activity/master-data/3_scout_level_choice.json` gelesen wird
- **THEN** MÜSSEN die 3 Pfadfinderebenen (Wölflinge, Pfadfinder, Rover) als `ScoutLevel` importiert werden

#### Scenario: RecipeHints als HealthRules importieren
- **WHEN** die Datei `food/0_init_data.json` gelesen wird
- **THEN** MÜSSEN alle `food.recipehint`-Einträge als `HealthRule` (oder `RecipeHint`) importiert werden

### Requirement: Zutaten-Import

Das Command MUSS Inspi-Zutaten mit vollständigen Nährwertdaten, Preisen und Portionen importieren.

#### Scenario: REWE-Zutaten importieren
- **WHEN** die Datei `food/1_data_food_inspi.json` gelesen wird
- **THEN** MÜSSEN alle ~6.319 `food.ingredient`-Einträge als `Ingredient` importiert werden
- **THEN** MÜSSEN die Nährwertdaten aus dem verknüpften `food.metainfo`-Eintrag direkt auf die Ingredient-Felder gemappt werden

#### Scenario: Nährwert-Felder korrekt mappen
- **WHEN** ein Ingredient importiert wird
- **THEN** MÜSSEN folgende Felder befüllt sein: `name`, `slug`, `energy_kj`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `nutri_score`, `nutri_class`, `price_per_kg`
- **THEN** MUSS `status` auf `verified` gesetzt sein

#### Scenario: Portionen importieren
- **WHEN** ein `food.portion`-Eintrag verarbeitet wird
- **THEN** MUSS eine `Portion` mit korrekter `weight_g` (berechnet aus MetaInfo `weight_g`), `measuring_unit` und `ingredient`-Verknüpfung erstellt werden

#### Scenario: Legacy-Zutaten importieren
- **WHEN** die Datei `food/2_food_inspi_import_old.json` gelesen wird
- **THEN** MÜSSEN die ~221 FDC-basierten Zutaten ebenfalls als `Ingredient` importiert werden

#### Scenario: EAN und FDC-IDs übernehmen
- **WHEN** ein Ingredient eine `ean` oder `fdc_id` hat
- **THEN** MÜSSEN diese Werte auf die entsprechenden Felder des `Ingredient`-Models übertragen werden

### Requirement: Rezept-Import

Das Command MUSS Inspi-Rezepte mit RecipeItems importieren.

#### Scenario: Rezepte importieren
- **WHEN** die Datei `food/3_food_inspi_import_recipe_old.json` gelesen wird
- **THEN** MÜSSEN alle ~203 `food.recipe`-Einträge als `Recipe` importiert werden
- **THEN** MUSS jedes Rezept `title`, `slug`, `description`, `status=approved`, `recipe_type` haben

#### Scenario: RecipeItems importieren
- **WHEN** ein Rezept RecipeItems hat
- **THEN** MÜSSEN alle ~639 `food.recipeitem`-Einträge als `RecipeItem` mit korrekter `ingredient`, `quantity`, `measuring_unit` Verknüpfung importiert werden

#### Scenario: Rezept-Caches berechnen
- **WHEN** ein Rezept mit allen RecipeItems importiert wurde
- **THEN** SOLL `recalculate_recipe_cache(recipe)` aufgerufen werden, um die denormalisierten Cache-Felder zu aktualisieren

### Requirement: Activity-Import

Das Command MUSS Inspi-Activities als GroupSessions oder Games importieren.

#### Scenario: Activities nach Typ mappen
- **WHEN** eine Activity den `activity_type_id=1` (Spiel) hat
- **THEN** MUSS sie als `Game` importiert werden
- **WHEN** eine Activity den `activity_type_id` 2, 3 oder 4 (Lernen/Forschen/Kreatives) hat
- **THEN** MUSS sie als `GroupSession` importiert werden
- **WHEN** eine Activity den `activity_type_id=5` (Rezept) hat
- **THEN** MUSS sie übersprungen werden (Rezepte kommen aus Food-Daten)

#### Scenario: Activity-Felder mappen
- **WHEN** eine Activity importiert wird
- **THEN** MUSS `title` übernommen werden
- **THEN** MUSS `description` von HTML zu Markdown konvertiert werden
- **THEN** MUSS `summary` von HTML zu Markdown konvertiert werden
- **THEN** MUSS `status=approved` gesetzt werden (für Activities mit `status="2"`)
- **THEN** MÜSSEN `difficulty`, `execution_time`, `costs_rating` auf die gruppenstunde-Choices gemappt werden

#### Scenario: Activity-Tags zuordnen
- **WHEN** eine Activity `topics`-Referenzen hat
- **THEN** MÜSSEN die entsprechenden `Tag`-Objekte über M2M verknüpft werden

#### Scenario: Activity-ScoutLevels zuordnen
- **WHEN** eine Activity `scout_levels`-Referenzen hat
- **THEN** MÜSSEN die entsprechenden `ScoutLevel`-Objekte über M2M verknüpft werden

### Requirement: Material-Import

Das Command MUSS Inspi-Materialien und deren Zuordnungen zu Activities importieren.

#### Scenario: MaterialNames importieren
- **WHEN** die Datei `activity/test-data/1_material_name.json` gelesen wird
- **THEN** MÜSSEN die ~660 `activity.MaterialName`-Einträge als `Material` importiert werden
- **THEN** MUSS `name` übernommen und `material_category` auf einen Default gesetzt werden

#### Scenario: MaterialItems importieren
- **WHEN** die Datei `activity/test-data/4_materialitem.json` gelesen wird
- **THEN** MÜSSEN die ~553 `activity.materialitem`-Einträge als `ContentMaterialItem` importiert werden
- **THEN** MUSS jeder Eintrag korrekt über GenericFK mit dem entsprechenden Content-Objekt (GroupSession/Game) verknüpft werden

### Requirement: HTML zu Markdown Konvertierung

Alle importierten Textfelder MÜSSEN Markdown verwenden, nicht HTML.

#### Scenario: HTML-Tags konvertieren
- **WHEN** ein Textfeld HTML enthält (z.B. `<p>`, `<br>`, `<b>`, `<i>`, `<ul>`, `<li>`, `<h1>`-`<h6>`)
- **THEN** MUSS der HTML-Inhalt in äquivalentes Markdown konvertiert werden

#### Scenario: Leere HTML-Felder
- **WHEN** ein Textfeld leer ist oder nur Whitespace enthält
- **THEN** MUSS ein leerer String gesetzt werden

### Requirement: Import-Fortschritt und Logging

Das Command MUSS den Fortschritt des Imports transparent anzeigen.

#### Scenario: Fortschrittsanzeige
- **WHEN** das Command läuft
- **THEN** MUSS für jede Import-Phase (Master-Daten, Ingredients, Recipes, Activities, Materials) eine Statusmeldung ausgegeben werden

#### Scenario: Abschluss-Zusammenfassung
- **WHEN** der Import abgeschlossen ist
- **THEN** MUSS eine Zusammenfassung mit der Anzahl importierter Records pro Typ ausgegeben werden
- **THEN** MUSS die Anzahl übersprungener Duplikate ausgegeben werden
