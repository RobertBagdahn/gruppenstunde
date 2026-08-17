## Tasks

### 1. Mapping-Modul erstellen
- [x] `backend/supply/services/retail_section_mapping.py` erstellen
- [x] Keyword-Mapping Dict mit ~50 REWE-Kategorien → RetailSection-Name
- [x] Funktion `get_retail_section_from_description(description: str) -> RetailSection | None`
- [x] Unit-Tests in `backend/supply/tests/test_retail_section_mapping.py`

### 2. Import-Command fixen
- [x] In `_import_ingredients_and_portions` (Zeile 443-444) das Mapping aufrufen statt `None` zu setzen
- [ ] Testen mit `--data-dir` auf inspi/data/food

### 3. Batch-Nachpflege-Command erstellen
- [x] `backend/core/management/commands/assign_retail_sections.py`
- [x] Iteriert über Ingredients mit `retail_section=None`, wendet Mapping an
- [x] `--dry-run` Flag
- [x] Ausführen auf existierende DB-Daten

### 4. Verifizieren
- [x] `uv run python manage.py assign_retail_sections` ausführen
- [x] Prüfen dass Zutaten wie "Balsamicoessig" nun eine RetailSection haben
- [ ] Einkaufsliste in der App prüfen (Kategorien und Preise vorhanden)
