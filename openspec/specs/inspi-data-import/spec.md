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

The command MUST import Inspi ingredients with full nutritional data, pricing, and portions. Das Command MUSS Inspi-Zutaten mit vollständigen Nährwertdaten, Preisen und Portionen importieren. Für den Bulk-Modus (`import_legacy_food`) DARF KEINE Deduplizierung auf Ingredient-Ebene erfolgen; für den Default-Modus (`import_inspi_data`) bleibt Slug-basierte Deduplizierung bestehen.

#### Scenario: REWE-Zutaten importieren (bulk)

- **WHEN** `import_legacy_food` die Datei `food/1_data_food_inspi.json` liest
- **THEN** MÜSSEN alle ~6.319 `food.ingredient`-Einträge als `Ingredient` importiert werden
- **THEN** MÜSSEN die Nährwertdaten aus dem per `ingredient.meta_info` verknüpften MetaInfo flach auf das Ingredient gemappt werden
- **THEN** DARF KEINE Dedup-Prüfung erfolgen (Duplikate erlaubt)

#### Scenario: Nährwert-Felder korrekt mappen

- **WHEN** ein Ingredient importiert wird
- **THEN** MÜSSEN folgende Felder befüllt sein: `name`, `slug`, `energy_kj`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `nutri_score`, `nutri_class`, `price_per_kg`
- **THEN** MUSS `status = user_content` gesetzt sein (vorher: `verified`)

#### Scenario: Portionen importieren

- **WHEN** ein `food.portion`-Eintrag verarbeitet wird
- **THEN** MUSS eine `Portion` mit korrekter `weight_g` (aus `portion.meta_info.weight_g`), `measuring_unit` und `ingredient`-Verknüpfung erstellt werden

#### Scenario: Legacy-Zutaten importieren

- **WHEN** die Datei `food/2_food_inspi_import_old.json` gelesen wird
- **THEN** MÜSSEN die ~221 FDC-basierten Zutaten ebenfalls als `Ingredient` importiert werden

#### Scenario: EAN und FDC-IDs übernehmen

- **WHEN** ein Ingredient eine `ean` oder `fdc_id` hat
- **THEN** MÜSSEN diese Werte auf die entsprechenden Felder des `Ingredient`-Models übertragen werden

### Requirement: Rezept-Import

The command MUST import Inspi recipes with their RecipeItems. Das Command MUSS Inspi-Rezepte mit RecipeItems importieren. Für den Bulk-Modus werden Rezepte als Inspi-Seed-Daten (`owner=null`, `status=approved`, `visibility=null`) angelegt, ohne Dedup-Prüfung.

#### Scenario: Rezepte importieren

- **WHEN** `import_legacy_food` die Datei `food/3_food_inspi_import_recipe_old.json` liest
- **THEN** MÜSSEN alle ~203 `food.recipe`-Einträge als `Recipe` importiert werden
- **THEN** MUSS jedes Rezept `title`, `slug` (neu generiert), `description`, `status=approved`, `owner=null`, `servings=1` haben

#### Scenario: RecipeItems importieren

- **WHEN** ein Rezept RecipeItems hat
- **THEN** MÜSSEN alle ~639 `food.recipeitem`-Einträge als `RecipeItem` mit korrekter `ingredient`, `quantity`, `measuring_unit` Verknüpfung importiert werden
- **THEN** MÜSSEN RecipeItems mit nicht auflösbarer `ingredient`-FK übersprungen und gezählt werden

#### Scenario: Rezept-Caches berechnen

- **WHEN** ein Rezept mit allen RecipeItems importiert wurde
- **THEN** MUSS `recalculate_recipe_cache(recipe)` aufgerufen werden (gebündelt nach Abschluss aller Dateien, nicht pro Recipe)

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

### Requirement: Legacy Food Bulk Import Command

The system MUST provide a standalone management command `import_legacy_food`. Das Command MUSS die vier Legacy-Food-JSON-Dateien (`0_init_data.json`, `1_data_food_inspi.json`, `2_food_inspi_import_old.json`, `3_food_inspi_import_recipe_old.json`) in die neue Schema-Form überführen, mit möglichst hoher Zeilenabdeckung und ohne Deduplizierung von Content-Datensätzen.

#### Scenario: Command ausführen mit Default-Pfad

- **WHEN** `uv run python manage.py import_legacy_food` ausgeführt wird
- **THEN** MUSS das Command Daten aus `/Users/robertbagdahn/code/inspi/data/food/` lesen
- **THEN** MÜSSEN die vier Dateien in Reihenfolge `0 → 1 → 2 → 3` verarbeitet werden
- **THEN** MUSS pro Datei eine Zusammenfassung (erstellt/übersprungen/verworfen) ausgegeben werden

#### Scenario: Custom Data-Directory

- **WHEN** `uv run python manage.py import_legacy_food --data-dir /pfad/zum/food` ausgeführt wird
- **THEN** MUSS das Command die vier Dateien aus dem angegebenen Verzeichnis lesen

#### Scenario: Datei-Filter

- **WHEN** `--files 0,1` übergeben wird
- **THEN** DÜRFEN nur `0_init_data.json` und `1_data_food_inspi.json` verarbeitet werden

#### Scenario: Dry-Run

- **WHEN** `--dry-run` gesetzt ist
- **THEN** MUSS das Mapping komplett durchlaufen werden
- **THEN** DÜRFEN keine DB-Änderungen persistent bleiben (Rollback am Ende)
- **THEN** MUSS das Summary exakt gleich wie im echten Lauf sein

#### Scenario: Fehlendes Datenverzeichnis

- **WHEN** das angegebene Verzeichnis nicht existiert
- **THEN** MUSS das Command mit einer deutschen Fehlermeldung `CommandError` abbrechen

### Requirement: Duplikat-Toleranz für Content-Daten

The bulk import MUST NOT deduplicate content rows. Für Food-Content (Ingredients, Portions, Recipes, RecipeItems) DARF der Import KEINE Deduplizierung auf Basis von Name, Slug oder anderen Feldern vornehmen; jede Legacy-Zeile MUSS als neue DB-Zeile angelegt werden.

#### Scenario: Mehrfachimport erlaubt Duplikate

- **WHEN** `import_legacy_food` zweimal hintereinander ohne Truncate läuft
- **THEN** MÜSSEN die Ingredient-/Recipe-/Portion-/RecipeItem-Zahlen sich nach dem zweiten Lauf verdoppeln
- **THEN** DARF das Command KEINE `IntegrityError`s werfen (Slugs werden per Counter-Suffix eindeutig gemacht)

#### Scenario: Legacy-Ingredient mit gleichem Namen wie bestehender

- **WHEN** eine Legacy-Zeile den Namen "Mehl" hat und bereits ein Ingredient "Mehl" in der DB existiert
- **THEN** MUSS ein zweites Ingredient "Mehl" angelegt werden (mit eindeutigem Slug wie `mehl-1`)

### Requirement: Idempotente Stammdaten

Master data imports MUST be idempotent. Stammdaten (MeasuringUnit, RetailSection, NutritionalTag, RecipeHint) aus `0_init_data.json` MÜSSEN idempotent importiert werden, damit wiederholte Läufe keine duplizierten Referenzwerte erzeugen.

#### Scenario: MeasuringUnit-Idempotenz

- **WHEN** ein `food.measuringunit` mit `name="EL"` importiert wird und bereits eine `MeasuringUnit` mit `name="EL"` existiert
- **THEN** DARF keine neue `MeasuringUnit` angelegt werden
- **THEN** MUSS der Zähler "skipped" im Summary hochgezählt werden

#### Scenario: RetailSection-Idempotenz

- **WHEN** ein `food.retailsection` mit `(name, rank)` bereits existiert
- **THEN** DARF keine neue `RetailSection` angelegt werden

#### Scenario: NutritionalTag-Idempotenz

- **WHEN** ein `food.nutritionaltag` mit `name` bereits existiert
- **THEN** DARF kein neuer `NutritionalTag` angelegt werden

#### Scenario: RecipeHint-Idempotenz

- **WHEN** ein `food.recipehint` mit `(name, parameter)` bereits existiert
- **THEN** DARF kein neuer `RecipeHint` angelegt werden

### Requirement: MetaInfo-Flattening

Nutritional data MUST be flattened onto the Ingredient row. Nährwertdaten aus `food.metainfo` MÜSSEN flach auf das zugehörige `supply.Ingredient` gemappt werden; es DARF KEIN separates MetaInfo-Model persistiert werden.

#### Scenario: Nährwert-Felder-Mapping

- **WHEN** ein Ingredient mit `meta_info`-Referenz importiert wird
- **THEN** MÜSSEN folgende Felder aus dem referenzierten MetaInfo auf das Ingredient kopiert werden: `energy_kj`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `sodium_mg`, `fruit_factor`, `nutri_class`, `price_per_kg`
- **THEN** MUSS `nutri_score` aus `metainfo.nutri_points` befüllt werden

#### Scenario: Fehlende MetaInfo

- **WHEN** ein Ingredient keine `meta_info`-Referenz hat oder die Referenz ins Leere zeigt
- **THEN** MUSS das Ingredient trotzdem angelegt werden, mit Nährwerten = `None`/`0`
- **THEN** MUSS ein Warning im Output erscheinen

#### Scenario: Verwerfen irrelevanter MetaInfo-Felder

- **WHEN** ein MetaInfo-Eintrag `nutri_points_energy_kj`, `nutri_points_protein_g`, `price_eur`, `volume_ml` enthält
- **THEN** MÜSSEN diese Felder ignoriert werden

### Requirement: Portion-Import mit Gewichtsableitung

Portions MUST derive `weight_g` from their MetaInfo reference. `food.portion`-Einträge MÜSSEN als `supply.Portion` importiert werden; `weight_g` MUSS aus dem per `portion.meta_info` referenzierten MetaInfo übernommen werden.

#### Scenario: Portion mit MetaInfo-Referenz

- **WHEN** eine Portion mit `meta_info`-FK importiert wird
- **THEN** MUSS `Portion.weight_g = metainfo.weight_g` gesetzt werden
- **THEN** MUSS `Portion.ingredient` auf das neu erstellte Ingredient zeigen
- **THEN** MUSS `Portion.measuring_unit` auf die gemappte neue MeasuringUnit-ID zeigen
- **THEN** MUSS `Portion.quantity` und `Portion.rank` unverändert übernommen werden

#### Scenario: Portion ohne MetaInfo

- **WHEN** eine Portion keine MetaInfo-Referenz hat
- **THEN** MUSS `Portion.weight_g = None` gesetzt werden

### Requirement: Recipe-Import als Seed-Daten

Legacy recipes MUST be imported as Inspi seed data. `food.recipe`-Einträge aus `3_food_inspi_import_recipe_old.json` MÜSSEN als `recipe.Recipe` mit `owner=None`, `status=approved` und `visibility=None` importiert werden.

#### Scenario: Recipe-Felder setzen

- **WHEN** ein Legacy-Recipe importiert wird
- **THEN** MUSS `title = legacy.name`, `description = legacy.description or ""`, `owner = None`, `status = "approved"`, `servings = 1` gesetzt werden
- **THEN** MUSS der Slug per `Recipe.save()` neu generiert werden (Legacy-Slugs werden verworfen)

#### Scenario: RecipeItem-Mapping

- **WHEN** ein Legacy-RecipeItem verarbeitet wird
- **THEN** MÜSSEN `recipe`, `ingredient`, `portion`, `measuring_unit`, `quantity`, `sort_order`, `note` über die In-Memory-PK-Map auf neue FKs aufgelöst werden
- **WHEN** das referenzierte Legacy-Ingredient nicht in der PK-Map vorhanden ist
- **THEN** MUSS das RecipeItem übersprungen und im Summary als `skipped` gezählt werden

#### Scenario: Cache-Neuberechnung

- **WHEN** der Recipe-Import abgeschlossen ist
- **THEN** MUSS `recalculate_recipe_caches` für alle importierten Rezepte aufgerufen werden
- **THEN** DÜRFEN die Legacy-MetaInfo-Nährwerte von Rezepten NICHT übernommen werden

### Requirement: PK-Remapping

The import MUST remap all legacy primary keys via in-memory lookup tables. Der Import MUSS Legacy-Primary-Keys durch neu vergebene auto-Inkrement-IDs ersetzen; FK-Referenzen MÜSSEN über In-Memory-Mappings aufgelöst werden.

#### Scenario: FK-Auflösung für Portion

- **WHEN** eine Portion mit `ingredient = <legacy_pk>` importiert wird
- **THEN** MUSS die Portion auf das im selben Lauf neu erstellte Ingredient mit entsprechendem Legacy-PK zeigen (Lookup über Map)

#### Scenario: Self-FK `ingredient_ref`

- **WHEN** ein Ingredient eine nicht-leere `ingredient_ref`-Referenz hat
- **THEN** MUSS die Referenz in einem zweiten Pass (nachdem alle Ingredients erstellt wurden) gesetzt werden

### Requirement: Signal-Disconnect während Import

Recipe cache signals MUST be disconnected during import. Recipe-Cache-Signale aus `recipe/signals.py` MÜSSEN während des Imports temporär deaktiviert werden, um n-fache Cache-Neuberechnungen zu vermeiden.

#### Scenario: Signal-Lifecycle

- **WHEN** das Command startet
- **THEN** MÜSSEN `post_save`/`post_delete`-Handler für `RecipeItem` und `Ingredient` disconnected werden
- **WHEN** das Command endet (erfolgreich oder mit Fehler)
- **THEN** MÜSSEN alle Signale im `finally`-Block rekonnektiert werden

#### Scenario: Cache-Recalc am Ende

- **WHEN** der Import aller Dateien abgeschlossen ist
- **THEN** MUSS das Command `recalculate_recipe_caches` aufrufen (oder die zugrundeliegende Service-Funktion direkt)

### Requirement: Transaktionalität pro Datei

Each file MUST be imported inside its own atomic transaction. Jede Datei MUSS in einer eigenen `transaction.atomic()`-Klammer importiert werden; ein Fehler in einer Datei DARF die bereits committeten Daten anderer Dateien NICHT zurückrollen.

#### Scenario: Datei-Fehler rollt nur die Datei zurück

- **WHEN** `1_data_food_inspi.json` während der Verarbeitung eine Exception wirft
- **THEN** MÜSSEN alle dieser Datei zugeordneten DB-Zeilen rückgängig gemacht werden
- **THEN** DÜRFEN die aus `0_init_data.json` committeten Stammdaten erhalten bleiben

#### Scenario: Dry-Run rollt alles zurück

- **WHEN** `--dry-run` gesetzt ist
- **THEN** MÜSSEN am Ende des Commands alle DB-Änderungen rückgängig gemacht sein

### Requirement: Import-Summary

The command MUST emit a structured summary at the end. Das Command MUSS am Ende eine strukturierte Zusammenfassung ausgeben mit Anzahl erstellter, übersprungener und verworfener Zeilen pro Legacy-Model.

#### Scenario: Summary-Format

- **WHEN** der Import (Dry-Run oder echt) endet
- **THEN** MUSS pro Datei eine Block-Zusammenfassung mit Zählern für `created`, `skipped`, `dropped` ausgegeben werden
- **THEN** MUSS die Gesamt-Laufzeit angezeigt werden
