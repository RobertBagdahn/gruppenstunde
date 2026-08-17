## 1. Fixture-Datei aktualisieren

- [x] 1.1 Aktuelle Fixture-Datei `backend/data/masterdata/supply_nutritionaltag.json` lesen und bestehende PKs identifizieren
- [x] 1.2 Old→New Mapping-Tabelle erstellen (alter name → neuer name, name_opposite, rank, is_dangerous, description)
- [x] 1.3 Neue Fixture-Datei mit 30 Einträgen schreiben: bestehende PKs für gemappte Einträge behalten, neue PKs für Milchallergie und Schalentierallergie
- [x] 1.4 description-Felder für alle 30 Einträge formulieren (erklärt das menschliche Merkmal)

## 2. Model-Dokumentation aktualisieren

- [x] 2.1 `help_text` von `name` in `backend/supply/models/reference.py` auf neue Semantik anpassen (z.B. "Vegan", "Eiallergie", "Laktoseunverträglichkeit")
- [x] 2.2 `help_text` von `name_opposite` auf neue Semantik anpassen (z.B. "Tierische Produkte", "Ei und Eierzeugnisse", "Laktose")

## 3. Prod-Update-Skript

- [x] 3.1 Management Command `update_nutritional_tags` in `backend/core/management/commands/` erstellen
- [x] 3.2 Skript mappt bestehende Tags anhand ihres aktuellen `name`-Werts auf die neuen Werte und führt `update()` aus
- [x] 3.3 Neue Tags (Milchallergie, Schalentierallergie) werden per `get_or_create(name=...)` angelegt
- [x] 3.4 Tags ohne Mapping (Halal, Koscher, nussfrei/Schalenfrüchte-Duplikat) werden per `filter(name=...).delete()` gelöscht

## 4. Lokal testen

- [x] 4.1 `uv run python manage.py import_prod_data --flush` ausführen und prüfen, dass 30 NutritionalTags importiert werden
- [x] 4.2 `GET /api/nutritional-tags/` aufrufen und verifizieren: 30 Einträge, korrekte name/name_opposite-Semantik, korrekte is_dangerous-Flags
- [x] 4.3 Prüfen, dass M2M-Verknüpfungen zu Ingredients/Recipes intakt sind (bestehende Rezepte haben noch ihre Tags)
- [x] 4.4 `uv run python manage.py import_legacy_food` ausführen und prüfen, dass keine Duplikate entstehen

## 5. Prod ausführen

- [x] 5.1 Cloud SQL Proxy starten: `cloud-sql-proxy inspi-441320:europe-west1:inspi-db-west1 --port 5433 &`
- [x] 5.2 Update-Skript auf Prod ausführen: `uv run python manage.py update_nutritional_tags`
- [x] 5.3 Verbliebene Halal/Koscher-Einträge per Django Admin löschen (falls vom Skript nicht erfasst)
- [x] 5.4 `GET /api/nutritional-tags/` auf Prod prüfen: 30 Einträge mit korrekten Namen
