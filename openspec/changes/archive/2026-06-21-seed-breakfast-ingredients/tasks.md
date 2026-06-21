## 1. seed_all.py erweitern

- [x] 1.1 Fehlende RetailSections prüfen und ggf. ergänzen (z.B. "Brotaufstriche & Konserven", "Backwaren & Cerealien") in der `retail_sections`-Liste in `seed_all.py`
- [x] 1.2 Die 13 fehlenden Frühstückszutaten in die `ingredients_data`-Liste eintragen: Nutella, Marmelade, Wurst (Aufschnitt), Erdnussbutter, Leberwurst, Lachs (Räucherlachs), Avocado, Hummus, Cornflakes, Obst (gemischt), Kakaopulver, Orangensaft, Kaffee — jeweils mit `name`, `slug`, `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`, `price_per_kg`, `physical_density`, `physical_viscosity`, `retail_section`

## 2. Verifizierung

- [x] 2.1 `uv run python manage.py seed_all` ausführen und prüfen, dass alle 13 neuen Zutaten ohne Fehler angelegt werden
- [x] 2.2 `uv run python manage.py seed_breakfast_recipes` ausführen und prüfen, dass keine WARNING-Meldungen für fehlende Zutaten erscheinen und alle 26 Rezepte vollständige RecipeItems haben
- [x] 2.3 Idempotenz prüfen: `seed_all` ein zweites Mal ausführen und sicherstellen, dass keine Duplikate entstehen
