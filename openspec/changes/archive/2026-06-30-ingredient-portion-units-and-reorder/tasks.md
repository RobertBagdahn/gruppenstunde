## 1. Einheitentyp PIECE

- [x] 1.1 `backend/supply/choices.py`: `MeasuringUnitType.PIECE = "stk"` ergänzen
- [x] 1.2 `backend/supply/signals.py`: System-Einheiten „Stück"/„Packung" mit `PIECE` anlegen
- [x] 1.3 Migration: Enum-Erweiterung + Datenmigration bestehender „Stück"/„Packung"-Einheiten von `MASS` auf `PIECE` — `uv run python manage.py makemigrations supply`
- [x] 1.4 `makemigrations --check` grün, `migrate` lokal verifizieren

## 2. Umrechnung & Symbol

- [x] 2.1 `backend/supply/api/unit_conversions.py`: Quellen-Filter greift nun korrekt (PIECE ausgeschlossen) — prüfen/anpassen
- [x] 2.2 Skalierung vereinheitlichen: Stück→Gramm nur über invertierten Faktor, keine zusätzliche `Portion.weight_g`-Multiplikation (`shopping_service.py` + `frontend-food/src/components/recipe/UnitSwitcher.tsx`)
- [x] 2.3 `backend/supply/services/shopping_service.py` `_format_natural_portion`/`units_without_x`: tolerantes Matching für Stück-/Verpackungsnamen (inkl. „Stück (150g)")

## 3. Drag & Drop

- [x] 3.1 `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` `handleDragEnd`: `g`-Portion aus `orders`-Payload filtern, nur nicht-`g` rank 1..N
- [x] 3.2 Sicherstellen, dass `g`-Portion nicht ziehbar bleibt (`SortablePortionItem.tsx`)

## 4. Schemas

- [x] 4.1 Einheiten-/Conversion-Pydantic-Schemas ggf. um Typ erweitern
- [x] 4.2 `frontend-food/src/schemas/supply.ts` synchronisieren

## 5. Tests

- [x] 5.1 Backend: Stück→Gramm liefert korrekte Gramm (keine Doppelskalierung)
- [x] 5.2 Backend: PIECE nicht als Umrechnungsquelle; g/ml weiterhin als Quelle
- [x] 5.3 Backend: natürliche Portion „Stück (150g)" ohne „x"-Symbol
- [x] 5.4 Backend: Reorder ohne `g` in Payload speichert ohne 422; `g` bleibt 9999
- [x] 5.5 Frontend: handleDragEnd sendet Payload ohne `g`-Portion

## 6. Abschluss

- [x] 6.1 Codepfade prüfen, die `unit in {"g","ml"}` annehmen
- [x] 6.2 Keine `print`/`console.log`; deutsche UI-Texte
