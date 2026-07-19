## Why

Das MeasuringUnit-System enthält Duplikate (g ↔ Gramm, ml ↔ Milliliter), semantisch falsche Einheiten-Typen (Esslöffel als Masse statt Volumen) und konzeptionell fragwürdige Einheiten (Stück, Packung, Portion, Scheibe, Dose, Glas, Becher, Bund — alles nur Formen von „ein Exemplar von etwas"). Das Dropdown zeigt alle 21 Einheiten ungefiltert und unsortiert an. Die KI-Knowledge referenziert Einheiten (Spitzer, Schuss, Ei), die nicht als MeasuringUnit existieren. Die Kombination ergibt eine verwirrende, ungepflegte UX.

## What Changes

- **BREAKING**: 11 MeasuringUnit-Records gelöscht (g, ml, Stück, Packung, Portion, Scheibe, Dose, Glas, Becher, Bund, Sp). Alle FK-Referenzen (~65.500 Portionen) auf Gramm/Milliliter migriert
- **BREAKING**: EL, TL, Tasse von Masseneinheit (`unit="g"`) auf Volumeneinheit (`unit="ml"`) mit korrekten Mengen (EL=15ml, TL=5ml, Tasse=250ml) umgestellt — bestehende Portions-Gewichte können sich ändern
- Neue MeasuringUnit „Schuss" (10 ml) als universale Volumeneinheit hinzugefügt
- Dropdown zeigt nur noch 10 echte Messeinheiten, sortiert nach Relevanz, mit deutschem Zahlenformat (0,3 g), Base-Units ohne redundanten Faktor
- KI-Knowledge (`portion_knowledge.py`) konsolidiert: referenziert nur noch existierende MeasuringUnits
- UnitConversion-Records vor dem Löschen der Units geprüft und bereinigt
- Master-Fixture aktualisiert

## Capabilities

### New Capabilities
- `measuring-unit-cleanup`: Bereinigung des MeasuringUnit-Systems auf 10 echte Küchenmesseinheiten mit korrekten Typen und Mengen

### Modified Capabilities
- `piece-unit-type`: Anforderungen an Stück/Packung als PIECE-Typ werden obsolet, da diese Units gelöscht werden
- `kitchen-unit-display`: Referenzen auf nicht mehr existierende Units (Stück, Scheibe) entfernt
- `unit-conversion`: EL/TL/Tasse-Typ-Änderung (g→ml) betrifft Umrechnungssemantik; Seed-Data-Anforderung für Handvoll/Tropfen entfällt

## Impact

- **Backend**: `supply/models/reference.py` (MeasuringUnit), `supply/choices.py` (MeasuringUnitType), `supply/services/portion_knowledge.py`, `supply/services/unit_resolution.py`, `supply/api/unit_conversions.py`, Data-Migration + Fixture
- **Frontend**: `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` (Dropdown-Rendering), `frontend-food/src/components/supply/IngredientList.tsx` (UNIT_SHORT, GRAM_UNIT_NAMES), `frontend-food/src/api/supplies.ts` (MeasuringUnitSchema)
- **Daten**: ~65.500 FK-Updates in `supply_portion`, 11 MeasuringUnit-Records gelöscht, 1 hinzugefügt, 3 geändert
- **UnitConversion**: Prüfung und Bereinigung von Records, die auf gelöschte Units verweisen
