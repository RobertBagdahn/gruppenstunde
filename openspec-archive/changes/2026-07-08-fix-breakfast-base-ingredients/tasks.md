## 1. Export-Skript fixen

- [x] 1.1 `tags` zur M2M-Feldliste von `Ingredient` in `backend/bin/export_prod_data.py` Zeile 52 hinzufügen (`["nutritional_tags"]` → `["nutritional_tags", "tags"]`)
- [x] 1.2 Export erneut laufen lassen und prüfen, ob `supply_ingredient.json` jetzt Tags enthält
- [x] 1.3 Kurz prüfen: existiert ein separater Export für die Junction-Table `supply_ingredient_tags`? Wenn nein, Export-Mechanismus prüfen (liest er die Through-Tabelle automatisch aus den M2M-Feld-Infos?) — Mechanismus ist generic (Z. 185-204), konstruiert Tabellennamen automatisch als `{db_table}_{m2m_field}`, funktioniert identisch zu Recipe.

## 2. Seed-Befehl erweitern

- [x] 2.1 `backend/supply/management/commands/seed_breakfast_catalog.py` um `--tag-existing` Flag erweitern
- [x] 2.2 Whitelist existierender generischer Brot-Slugs definieren: `["brot", "brotchen", "brot-vollkorn", "toastbrot", "vollkorn-toast", "koernerbrot", "roggenbrot", "weissbrot", "ciabatta"]`
- [x] 2.3 Logik implementieren: wenn `--tag-existing` gesetzt, durchlaufe Whitelist, finde Ingredients per Slug, füge `breakfast-base` Tag hinzu (falls noch nicht vorhanden)
- [x] 2.4 Tests in `backend/supply/tests/test_breakfast_catalog.py` ergänzen: prüfen, dass bestehende generische Zutaten nach `--tag-existing` den Tag haben

## 3. Seed auf Produktion ausführen

- [x] 3.1 Cloud SQL Proxy starten (war bereits aktiv)
- [x] 3.2 `seed_breakfast_catalog --tag-existing` via raw SQL + psycopg auf Prod ausgeführt (4 breads tagged + is_standalone_food gesetzt; Django ORM scheiterte an fehlenden Migrationen)
- [x] 3.3 DB-Query bestätigt: `base_count = 4` (Brot, Brötchen, Brot Vollkorn, Vollkorn-Toast)
- [ ] 3.4 Visuelle Prüfung im Frühstücksassistenten (muss menschlich checken — bitte im Browser öffnen)

## 4. Lokale Daten neu exportieren

- [x] 4.1 Cloud SQL Proxy starten (war bereits aktiv)
- [x] 4.2 `uv run python bin/export_prod_data.py --only food` ausführen (41398 Einträge exportiert)
- [x] 4.3 `supply_ingredient.json` enthält jetzt 4 Ingredients mit `tags=[71]`
- [x] 4.4 `git diff` prüfen und committen (commit dc9393a)
