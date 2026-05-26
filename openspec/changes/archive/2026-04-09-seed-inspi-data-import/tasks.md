## 1. Command-Grundgerüst

- [x] 1.1 Datei `backend/core/management/commands/import_inspi_data.py` erstellen mit `BaseCommand`, `--data-dir` Argument und `transaction.atomic()` Wrapper
- [x] 1.2 Helper-Funktion `_load_fixture(path)` implementieren: JSON laden, nach `model`-Key gruppiert zurückgeben
- [x] 1.3 Helper-Funktion `_html_to_markdown(html)` implementieren: `<p>`, `<br>`, `<b>`, `<i>`, `<ul>`, `<li>`, `<h1>`-`<h6>`, `<a>` konvertieren
- [x] 1.4 PK-Mapping-Dicts anlegen (Inspi-PK → Gruppenstunde-Objekt) für alle Entitäten die referenziert werden

## 2. Master-Daten Import

- [x] 2.1 `_import_measuring_units()` — 11 MeasuringUnits aus `food/0_init_data.json` importieren
- [x] 2.2 `_import_retail_sections()` — 30 RetailSections aus `food/0_init_data.json` importieren
- [x] 2.3 `_import_nutritional_tags()` — 27 NutritionalTags aus `food/0_init_data.json` importieren
- [x] 2.4 `_import_tags()` — 30 Topics aus `activity/master-data/1_topic.json` als Tags importieren
- [x] 2.5 `_import_scout_levels()` — 3 ScoutLevels aus `activity/master-data/3_scout_level_choice.json` importieren
- [x] 2.6 `_import_recipe_hints()` — 20 RecipeHints aus `food/0_init_data.json` als RecipeHint/HealthRule importieren

## 3. Zutaten-Import

- [x] 3.1 `_import_ingredients_rewe()` — ~6.319 Ingredients aus `food/1_data_food_inspi.json` importieren: MetaInfo-Felder auf Ingredient mappen, Preis auf `price_per_kg`, NutritionalTags verknüpfen
- [x] 3.2 `_import_portions_rewe()` — ~6.319 Portions aus derselben Datei importieren mit `weight_g`, `measuring_unit`, `ingredient` Verknüpfung
- [x] 3.3 `_import_ingredients_legacy()` — ~221 Legacy-Ingredients aus `food/2_food_inspi_import_old.json` importieren (FDC-basiert)
- [x] 3.4 `_import_portions_legacy()` — ~372 Legacy-Portions aus derselben Datei importieren

## 4. Rezept-Import

- [x] 4.1 `_import_recipes()` — ~203 Rezepte aus `food/3_food_inspi_import_recipe_old.json` importieren: `name` → `title`, `slug`, `description`, `status=approved`, `recipe_type` bestimmen
- [x] 4.2 `_import_recipe_items()` — ~639 RecipeItems aus derselben Datei importieren mit `ingredient`, `quantity`, `measuring_unit` Verknüpfung
- [x] 4.3 Cache-Berechnung für alle importierten Rezepte via `recalculate_recipe_cache()` aufrufen

## 5. Material-Import

- [x] 5.1 `_import_materials()` — ~660 MaterialNames aus `activity/test-data/1_material_name.json` als `Material` importieren, `material_category` als Default `other` setzen

## 6. Activity-Import

- [x] 6.1 `_import_activities()` — ~239 Activities aus `activity/test-data/3_activity.json` importieren: Nach `activity_type` auf `Game` oder `GroupSession` mappen
- [x] 6.2 Activity-Felder mappen: `title`, `summary` (HTML→MD), `description` (HTML→MD), `difficulty`, `execution_time`, `costs_rating`, `status`
- [x] 6.3 M2M-Verknüpfungen setzen: `tags` (aus topics), `scout_levels` (aus scout_levels)
- [x] 6.4 Game-spezifische Felder setzen: `game_type`, `play_area` basierend auf Location-Choices
- [x] 6.5 GroupSession-spezifische Felder setzen: `session_type`, `location_type`

## 7. Material-Zuordnungen

- [x] 7.1 `_import_material_items()` — ~553 MaterialItems aus `activity/test-data/4_materialitem.json` als `ContentMaterialItem` importieren mit GenericFK-Verknüpfung zum entsprechenden Content-Objekt

## 8. Fortschritt und Zusammenfassung

- [x] 8.1 Counter-Dict für importierte/übersprungene Records pro Typ implementieren
- [x] 8.2 Fortschrittsausgabe pro Phase mit `self.stdout.write()`
- [x] 8.3 Abschluss-Zusammenfassung mit Gesamtanzahlen ausgeben

## 9. Testen

- [x] 9.1 Command manuell ausführen: `uv run python manage.py import_inspi_data`
- [x] 9.2 Idempotenz prüfen: Command erneut ausführen, keine Duplikate
- [x] 9.3 Spot-Check: Stichproben in Django Admin / API prüfen (Ingredients mit Nährwerten, Recipes mit Items, Games/Sessions mit Tags)
