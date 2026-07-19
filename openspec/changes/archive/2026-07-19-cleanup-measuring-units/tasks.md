## 1. Backend Data Migration

- [x] 1.1 Django data migration erstellen (`supply/migrations/XXXX_cleanup_measuring_units.py`): FK-Referenzen von gelöschten Units auf Ziel-Units migrieren (g→Gramm, ml→Milliliter, Stück→Gramm, Packung→Gramm, Portion→Gramm, Scheibe→Gramm, Dose→Gramm, Glas→Gramm, Becher→Gramm, Bund→Gramm)
- [x] 1.2 In derselben Migration: MeasuringUnit-Records löschen (PKs: 101, 102, 65, 73, 105, 72, 70, 74, 71, 75, 97)
- [x] 1.3 In derselben Migration: EL (PK 67) auf unit="ml", quantity=15.0 aktualisieren; TL (PK 66) auf unit="ml", quantity=5.0; Tasse (PK 68) auf unit="ml", quantity=250.0; Becher (PK 71) auf unit="ml" (wird aber gelöscht — nur für safety, falls Delete fehlschlägt)
- [x] 1.4 In derselben Migration: Neue MeasuringUnit „Schuss" (unit="ml", quantity=10.0, description="ca. 10 ml Flüssigkeit") anlegen
- [x] 1.5 UnitConversion-Records prüfen: alle Records löschen, deren from_unit_id oder to_unit_id auf eine gelöschte Unit verweist
- [x] 1.6 Reverse-Migration (`migrate backwards`) implementieren: alte Units wiederherstellen, FK-Referenzen NICHT zurücksetzen (irreversibel, dokumentiert)

## 2. Backend Seed Data & Fixtures

- [x] 2.1 `backend/data/masterdata/supply_measuringunit.json` aktualisieren: 10 Einträge mit korrigierten Werten, gelöschte Einträge entfernen, „Schuss" hinzufügen
- [x] 2.2 `import_prod_data`-Kommando prüfen: stellt sicher, dass es mit der neuen MeasuringUnit-Anzahl (10) und den korrigierten PKs funktioniert

## 3. Backend API & Schema

- [x] 3.1 `supply/api/materials.py`: `list_measuring_units` Endpunkt mit statischer Sortierung (Case/When nach Küchenrelevanz) versehen
- [x] 3.2 API-Response testen: `GET /api/supplies/measuring-units/` liefert 10 Einträge in korrekter Reihenfolge mit korrekten Werten

## 4. KI-Knowledge Cleanup

- [x] 4.1 `supply/services/portion_knowledge.py`: `TYPICAL_UNIT_WEIGHTS` bereinigen — „Spitzer", „Schuss", „Ei" entfernen; nur noch existierende MeasuringUnit-Namen behalten (Gramm, Milliliter, Esslöffel, Teelöffel, Prise, Messerspitze)
- [x] 4.2 `supply/services/unit_resolution.py`: `SYNONYMS`-Map aktualisieren — Verweise auf gelöschte Einheiten entfernen (g, ml, Stück, Spitzer, n.b., Handvoll, Tropfen); Schuss-Synonyme hinzufügen („schuss")

## 5. Frontend Dropdown

- [x] 5.1 `IngredientDetailPage.tsx`: Dropdown-Rendering ändern — Option-Text aus `{name} ({formatted_quantity} {unit_abbrev})` zusammensetzen; Base-Units (Gramm, Milliliter) ohne Faktor; deutsches Komma als Dezimaltrennzeichen
- [x] 5.2 Helper-Funktion `formatMeasuringUnitLabel(unit: MeasuringUnit): string` in `frontend-food/src/lib/units.ts` auslagern
- [x] 5.3 Dropdown-Sortierung: API-seitig (Task 3.1) oder client-seitig nach fester Reihenfolge sortieren

## 6. Frontend Cleanup

- [x] 6.1 `IngredientList.tsx`: `UNIT_SHORT`-Map auf verbleibende 10 Einheiten aktualisieren; gelöschte Einheiten entfernen (Stück, Portion, Packung, Spitzer-Referenzen)
- [x] 6.2 `IngredientList.tsx`: `GRAM_UNIT_NAMES`-Set bereinigen — „g" entfernen (existiert nicht mehr); prüfen ob „kg" noch referenziert wird
- [x] 6.3 `frontend-food/src/api/supplies.ts`: `MeasuringUnitSchema` prüfen — enthält bereits `unit` und `quantity`, keine Schema-Änderung nötig
- [x] 6.4 Alle Vorkommen von gelöschten Unit-Namen („Stück", „Scheibe", etc.) in Frontend-Strings prüfen und durch sinnvolle Alternativen ersetzen oder löschen

## 7. Tests

- [x] 7.1 Backend-Test für Data-Migration: `uv run pytest supply/tests/test_measuring_unit_cleanup.py` — prüft FK-Migration, Unit-Delete, EL/TL/Tasse-Korrektur, Schuss-Erstellung
- [x] 7.2 Backend-Test für API: `list_measuring_units` liefert 10 sortierte Einträge
- [x] 7.3 Backend-Test für `compute_weight_g` mit korrigierten EL/TL/Tasse-Werten (ml-basiert mit density)
- [x] 7.4 Backend-Test für `unit_resolution.py`: Synonyme lösen nur noch auf existierende MeasuringUnits auf
- [x] 7.5 Backend-Test für `portion_knowledge.py`: `TYPICAL_UNIT_WEIGHTS` enthält keine Phantom-Einheiten

## 8. Verifikation

- [x] 8.1 Migration lokal ausführen: `uv run python manage.py migrate`
- [x] 8.2 `uv run python manage.py test supply` — alle Tests grün
- [x] 8.3 Produktions-DB lokal importieren (`import_prod_data --only food`), dann Migration ausführen, Ergebnisse prüfen
- [x] 8.4 Frontend-Food dev starten, Ingredient-Detail-Seite aufrufen, Dropdown visuell prüfen
- [x] 8.5 UnitSwitcher testen: Rezept-Detailseite, Umschalter nur bei g/ml-Einheiten verfügbar
