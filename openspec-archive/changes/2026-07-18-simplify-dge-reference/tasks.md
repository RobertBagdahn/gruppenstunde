## 1. Backend: Datenmodell entfernen

- [x] 1.1 `DgeReference` Model aus `backend/supply/models/reference.py` entfernen (Z. 88-126)
- [x] 1.2 `DgeGenderChoices` aus `backend/supply/models/reference.py` entfernen (Z. 82-85)
- [x] 1.3 `DgeReference` und `DgeGenderChoices` aus `backend/supply/models/__init__.py` entfernen
- [x] 1.4 Migration erstellen: `uv run python manage.py makemigrations supply`
- [x] 1.5 Migration prüfen: `uv run python manage.py showmigrations supply`

## 2. Backend: Admin entfernen

- [x] 2.1 `DgeReferenceAdmin` und `@admin.register(DgeReference)` aus `backend/supply/admin.py` entfernen (Z. 191-218)
- [x] 2.2 Import `DgeReference` aus `backend/supply/admin.py` entfernen

## 3. Backend: API und Schemas entfernen

- [x] 3.1 `backend/supply/api/dge_references.py` komplett löschen
- [x] 3.2 `dge_reference_router` Import und Export aus `backend/supply/api/__init__.py` entfernen
- [x] 3.3 `dge_reference_router` Import und `add_router` aus `backend/inspi/urls.py` entfernen
- [x] 3.4 `DgeReferenceOut` aus `backend/supply/schemas/reference.py` entfernen (Z. 80-99)
- [x] 3.5 `DgeReferenceOut` aus `backend/supply/schemas/__init__.py` entfernen (Import + `__all__`)

## 4. Backend: Nutrition API umstellen

- [x] 4.1 `recipe/api/nutrition.py` DGE-Coverage-Berechnung (Z. 253-293) umstellen: `from supply.data.dge_reference import get_dge_reference` verwenden statt DB-Query
- [x] 4.2 `import` von `supply.models.DgeReference` entfernen
- [x] 4.3 DGE-Coverage nur für Felder berechnen die in statischen Daten vorhanden sind (`energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `fibre_g`)

## 5. Backend: Export-Skripte bereinigen

- [x] 5.1 `DgeReference` aus `backend/bin/export_prod_data.py` entfernen (Z. 49)
- [x] 5.2 `DgeReference` aus `backend/bin/export_prod_data.sh` entfernen (Z. 72)

## 6. Backend: Seed bereinigen

- [x] 6.1 Auskommentierten DgeReference-Seed-Code aus `backend/core/management/commands/seed_all.py` entfernen

## 7. Backend: Tests aktualisieren

- [x] 7.1 `TestDgeReferenceModel` Klasse aus `backend/recipe/tests/test_extended_nutrition.py` entfernen
- [x] 7.2 `DgeReference`-bezogene `import`s und `baker.make`-Aufrufe aus Tests entfernen
- [x] 7.3 Tests ausführen: `uv run pytest recipe/tests/test_extended_nutrition.py -xvs`

## 8. Frontend: Ungenutzte Schemas/Hooks entfernen

- [x] 8.1 `DgeReferenceSchema` und `DgeReference` Type aus `frontend-food/src/schemas/normPerson.ts` entfernen
- [x] 8.2 `useDgeReference` Hook aus `frontend-food/src/api/normPerson.ts` entfernen

## 9. Verifikation

- [x] 9.1 `uv run python manage.py check` — keine Fehler
- [x] 9.2 `uv run python manage.py makemigrations --check` — "No changes detected"
- [x] 9.3 `uv run pytest recipe/tests/ -x --no-header -q` — alle Tests grün
- [x] 9.4 `uv run pytest supply/tests/ -x --no-header -q` — alle Tests grün
- [x] 9.5 Frontend build prüfen: `cd frontend-food && npm run typecheck`
