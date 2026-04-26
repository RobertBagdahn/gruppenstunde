## 1. Command-Skelett

- [x] 1.1 Management-Command-Datei anlegen: `backend/core/management/commands/import_legacy_food.py`
- [x] 1.2 `BaseCommand`-Subklasse mit `add_arguments`: `--data-dir` (default `/Users/robertbagdahn/code/inspi/data/food`), `--files` (CSV, default `0,1,2,3`), `--dry-run`, `--batch-size` (default 500)
- [x] 1.3 `handle()` strukturieren: Verzeichnis-Existenz prüfen, Datei-Filter anwenden, Dispatcher nach Dateiname aufrufen, am Ende Summary drucken
- [x] 1.4 `CommandError` mit deutscher Nachricht, wenn `--data-dir` nicht existiert oder eine ausgewählte Datei fehlt
- [x] 1.5 Typ-Hints für alle Funktionen; keine `print`-Statements außerhalb `self.stdout`

## 2. Infrastruktur: Legacy-Map, Signal-Disconnect, Transaktion

- [x] 2.1 Helper-Klasse `LegacyPkMap` mit `add(model_key, legacy_pk, new_pk)` und `get(model_key, legacy_pk)`; fehlende Lookups geben `None` zurück und zählen im Summary
- [x] 2.2 Context-Manager `disabled_recipe_signals()` in `recipe/signals.py` exportieren (oder lokal im Command definieren); disconnected `post_save`/`post_delete` für `RecipeItem`/`Ingredient`
- [x] 2.3 `try/finally` im `handle()`: Signale im `finally` reconnecten
- [x] 2.4 Pro Datei eigenen `transaction.atomic()`-Block; `--dry-run` wrappt den äußeren `atomic()` + finale `transaction.set_rollback(True)`

## 3. Datei 0: Stammdaten (idempotent)

- [x] 3.1 Loader für `food.measuringunit` → `supply.MeasuringUnit` per `get_or_create(name=...)`, Mapping merken
- [x] 3.2 Loader für `food.retailsection` → `supply.RetailSection` per `get_or_create(name=..., rank=...)`, Mapping merken
- [x] 3.3 Loader für `food.nutritionaltag` → `supply.NutritionalTag` per `get_or_create(name=...)`, Mapping merken
- [x] 3.4 Loader für `food.recipehint` → `recipe.RecipeHint` per `get_or_create(name=..., parameter=...)`; Felder `description`, `min_value`, `max_value`, `hint_level`, `recipe_type` mappen
- [x] 3.5 Zähler für `created`/`skipped` pro Model; Ergebnisblock ins Summary

## 4. Datei 1 & 2: Ingredients + Portions

- [x] 4.1 Zwei-Pass-Loader-Funktion schreiben: Pass A baut MetaInfo-Lookup (`pk → dict`); Pass B legt Ingredients und Portions an
- [x] 4.2 Mapping-Funktion `build_ingredient_from_legacy(ing_row, metainfo_lookup, rs_map, mu_map) -> Ingredient` (noch nicht gespeichert); füllt Nährwertfelder aus `ing_row.meta_info` MetaInfo
- [x] 4.3 `price_per_kg` aus MetaInfo in `Decimal` konvertieren (nicht `float`), bei `None` leer lassen
- [x] 4.4 `ean` normalisieren (String, leere/`null` → `""`), `fdc_id` als Integer oder `None`
- [x] 4.5 `retail_section`-FK via `rs_map` auflösen; bei fehlendem Mapping `None` setzen
- [x] 4.6 `status = IngredientStatusChoices.USER_CONTENT` hart setzen
- [x] 4.7 Ingredients in Batches à `--batch-size` via `bulk_create` persistieren (Slug: Django's `save()` wird bei `bulk_create` NICHT aufgerufen → Slug vor `bulk_create` deterministisch berechnen, Uniqueness durch In-Memory-Set + Counter-Suffix)
- [x] 4.8 Nach `bulk_create` neu gesetzte PKs einsammeln und in `LegacyPkMap` hinterlegen
- [x] 4.9 Zweiter Pass für `ingredient_ref` (Self-FK): nach Basis-Insert einmalig `filter().update()` pro Legacy-Ref, oder Objekt-Liste per `bulk_update(fields=["ingredient_ref"])`
- [x] 4.10 Loader für `food.portion` → `Portion` mit `measuring_unit_id` (über `mu_map`), `ingredient_id` (über `LegacyPkMap`), `weight_g` aus referenziertem MetaInfo, `quantity`, `rank`; per `bulk_create`
- [x] 4.11 `food.price`-Rows explizit zählen und als `dropped` im Summary ausweisen

## 5. Datei 3: Recipes + RecipeItems

- [x] 5.1 MetaInfo-Lookup für Recipe-Datei aufbauen (wird nicht in DB persistiert, nur optional für Spot-Check-Logging)
- [x] 5.2 Recipe-Loader: pro Legacy-Recipe ein `Recipe` via `.save()` erzeugen (wegen Slug-Generierung über `Content.save()`); `title = legacy.name`, `description = legacy.description or ""`, `owner = None`, `status = "approved"`, `visibility = None`, `servings = 1`
- [x] 5.3 Neu erstellte Recipe-PKs in `LegacyPkMap` eintragen
- [x] 5.4 RecipeItem-Loader: FKs für `recipe`, `ingredient`, `portion`, `measuring_unit` via `LegacyPkMap` auflösen; `quantity`, `sort_order`, `note` übernehmen
- [x] 5.5 RecipeItems mit nicht auflösbarer `ingredient`-FK überspringen und als `skipped` zählen (Reason im Verbose-Log)
- [x] 5.6 RecipeItems per `bulk_create` persistieren
- [x] 5.7 Nach Abschluss aller Dateien `recalculate_recipe_cache(recipe)` für alle neu importierten Rezepte aufrufen (Schleife mit tqdm)

## 6. Fortschritt & Summary

- [x] 6.1 `tqdm` für die drei großen Schleifen (Ingredients Datei 1, Portions Datei 1, RecipeItems)
- [x] 6.2 Pro Datei Block-Zusammenfassung mit Model-Zählern (`created`/`skipped`/`dropped`) und Dauer
- [x] 6.3 Gesamt-Laufzeit und Summenzeile am Ende
- [x] 6.4 Warning-Ausgabe bei unaufgelösten FKs oder fehlenden MetaInfos (aggregiert, nicht pro Zeile)

## 7. Tests

- [x] 7.1 Test-Fixture: kleine JSON-Snippets (je Datei 5-10 Zeilen) unter `backend/core/tests/fixtures/legacy_food/` ablegen
- [x] 7.2 `test_import_legacy_food_master_data`: Datei 0 importiert korrekt, zweiter Lauf erzeugt keine Duplikate
- [x] 7.3 `test_import_legacy_food_ingredients_with_duplicates`: Zwei Läufe → Ingredient-Anzahl verdoppelt sich, keine `IntegrityError`
- [x] 7.4 `test_import_legacy_food_ingredient_metainfo_flattening`: Nährwerte korrekt übernommen, `price_per_kg` als Decimal
- [x] 7.5 `test_import_legacy_food_portion_weight_g`: `Portion.weight_g` aus MetaInfo
- [x] 7.6 `test_import_legacy_food_recipe_seed`: Recipe mit `owner=None`, `status=approved`, neuer Slug
- [x] 7.7 `test_import_legacy_food_orphan_recipe_item`: RecipeItem mit fehlender Ingredient-Ref wird übersprungen, nicht importiert
- [x] 7.8 `test_import_legacy_food_signal_lifecycle`: Nach Command-Ende sind `recipe/signals` wieder connected (z. B. via `receivers`-Prüfung)
- [x] 7.9 `test_import_legacy_food_dry_run`: `--dry-run` → keine DB-Zeilen nach Ende
- [x] 7.10 `test_import_legacy_food_file_filter`: `--files 0` → nur Stammdaten importiert
- [x] 7.11 `test_import_legacy_food_missing_data_dir`: `CommandError` mit deutscher Nachricht

## 8. Dokumentation

- [x] 8.1 `backend/AGENTS.md`: Abschnitt "Management Commands" um `import_legacy_food` ergänzen (Flags, Default-Verhalten, Unterschied zu `import_inspi_data`)
- [x] 8.2 Docstring im Command: Überblick, Eingabedateien, Ziel-Models, Nicht-Deduplizierung explizit erwähnen
- [ ] 8.3 README-Eintrag (optional) unter `backend/core/management/commands/README.md` falls vorhanden

## 9. Verifikation

- [ ] 9.1 `uv run python manage.py import_legacy_food --dry-run` lokal ausführen, Summary prüfen
- [ ] 9.2 Echter Lauf gegen Dev-DB; Stichprobe: 10 zufällige Ingredients im Django-Admin auf Nährwerte/Preis prüfen
- [ ] 9.3 Stichprobe: 3 zufällige Rezepte im Frontend öffnen, RecipeItems sichtbar, Nutri-Cache neu berechnet
- [ ] 9.4 `openspec validate import-legacy-food-data --strict` grün
- [ ] 9.5 `uv run pytest backend/core/tests/test_import_legacy_food.py` grün
