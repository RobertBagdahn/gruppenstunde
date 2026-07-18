## 1. Backend — `is_default` zu `PortionOut` hinzufügen

- [x] 1.1 `is_default: bool` Feld zu `PortionOut` in `backend/supply/schemas/ingredients.py` hinzufügen
- [x] 1.2 `resolve_is_default`-Static-Method in `PortionOut` implementieren (Dict- und ORM-Objekt-Support)

## 2. Backend — Test für `resolve_is_default` schreiben

- [x] 2.1 `backend/supply/tests/test_schemas.py` erstellen mit Test für `resolve_is_default`: rank=1 → true, rank>1 → false, dict mit rank → true

## 3. Backend — `is_default` aus `resolve_ingredient_portions` entfernen

- [x] 3.1 `"is_default": p.rank == 1` aus dem Dict in `resolve_ingredient_portions()` in `backend/recipe/schemas/items.py` entfernen

## 4. Backend — `test_portion_redesign.py` kaputte Tests löschen

- [x] 4.1 `test_system_portions_have_correct_ranks` löschen (lines 155-165)
- [x] 4.2 `test_g_portion_is_system` löschen (lines 167-171)
- [x] 4.3 `test_g_portion_not_draggable` löschen (lines 173-185)

## 5. Backend — `test_display_utils.py` auf `Package`-Modell umstellen

- [x] 5.1 `_make_package_portion`-Helper umbauen: `Portion` → `Package`, `measuring_unit`/`quantity`/`is_system` entfernen
- [x] 5.2 `_make_unit`-Helper entfernen (nicht mehr benötigt)
- [x] 5.3 `test_no_package_portions_returns_empty` reparieren: `is_system`-Filter und veraltete Kommentare entfernen (lines 200-206)
- [x] 5.4 `test_multiple_package_sizes`: Kommentar "Smallest non-system portion wins" aktualisieren (line 221)
- [x] 5.5 `Package`-Import zu den Imports hinzufügen, `MeasuringUnit`-Import entfernen (falls sonst ungenutzt)

## 6. Backend — `is_system` aus `test_rewe_export.py` entfernen

- [x] 6.1 `is_system=False` aus zwei `make_portion`-Aufrufen entfernen (lines 78-79)

## 7. Frontend — `is_default` zu `PortionSchema` hinzufügen

- [x] 7.1 `is_default: z.boolean()` zu `PortionSchema` in `frontend-food/src/schemas/supply.ts` hinzufügen

## 8. Verifikation

- [x] 8.1 `uv run python manage.py makemigrations --check` — muss "No changes detected" melden
- [x] 8.2 Betroffene Tests ausführen: `uv run pytest supply/tests/test_portion_redesign.py supply/tests/test_display_utils.py supply/tests/test_schemas.py shopping/tests/test_rewe_export.py -xvs`
- [x] 8.3 `uv run pytest recipe/tests/ -xvs` — sicherstellen dass Rezept-Schema-Änderung keine Tests bricht
- [x] 8.4 Frontend-Food Build: `npm run build` in `frontend-food/`
