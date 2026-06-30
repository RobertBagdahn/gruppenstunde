## Context

**Stück→Gramm**: `MeasuringUnitType` hat nur `VOLUME = "ml"` und `MASS = "g"` (`backend/supply/choices.py:26-28`); es gibt keinen Stück-Typ. Die System-Einheit „Stück" wird mit `unit=MASS` (`"g"`) angelegt (`backend/supply/signals.py:65-67`). Der Umrechnungsschutz `convertible_types = {"g","ml"}` in `unit_conversions.py:122-125` filtert auf das `unit`-Feld — da „Stück" `unit="g"` trägt, besteht es die Prüfung fälschlich. Falsche Gramm entstehen durch Doppelskalierung: `shopping_service.py:165-167` rechnet Gramm aus `Portion.weight_g`, parallel multipliziert `UnitSwitcher.tsx:60` `c.quantity * weightG`, wobei `c.quantity` bereits den `UnitConversion.factor` enthält (`unit_conversions.py:154/167`). Das falsche „x"-Symbol stammt aus `_format_natural_portion` (`shopping_service.py:331-388`): die `units_without_x`-Liste deckt zusammengesetzte/abgekürzte Stück-Namen nicht ab, sodass „ca. {n} x {name}" entsteht.

**Drag & Drop**: `IngredientDetailPage.tsx:504-528` — `sortedPortions` enthält die `g`-Portion; `handleDragEnd` vergibt `rank = idx+1` an **alle**, also auch an die `g`-Portion (statt 9999). Backend `ingredients.py:392-396` lehnt das mit HTTP 422 ab. Resultat: jeder Reorder schlägt fehl.

Constraints: Keine Rückwärtskompatibilität nötig. `uv run`. Migrationen niemals in-place ändern, immer neu.

## Goals / Non-Goals

**Goals:**
- Zählbare Einheiten (Stück/Packung) haben einen eigenen Typ, sodass der Umrechnungsschutz zuverlässig greift.
- Stück→Gramm wird über genau eine Skalierungsquelle berechnet (korrekte Gramm).
- Stück-/Verpackungsnamen erhalten kein falsches „x"-Symbol.
- Drag & Drop sortiert die nicht-`g`-Portionen, `g` behält rank 9999.

**Non-Goals:**
- Keine Neugestaltung des gesamten Portions-/Einheiten-Systems über diese Bugs hinaus.
- Keine Änderung an der grundsätzlichen Portion-Datenstruktur (nur Einheitentyp + Skalierungspfad).

## Decisions

### D1: `MeasuringUnitType.PIECE` einführen
`choices.py` erhält `PIECE = "stk"`. System-Einheiten „Stück" und „Packung" werden mit `unit=PIECE` angelegt (`signals.py`). `unit_conversions.py` filtert Quellen weiterhin auf `{"g","ml"}` — Stück/Packung sind damit korrekt ausgeschlossen.

- **Warum**: behebt die Wurzel (getarnte Einheit), statt Namens-Sonderfälle zu pflegen.
- **Alternative (verworfen)**: Namens-/ID-basierter Ausschluss in `unit_conversions.py` — brüchig, dupliziert Wissen.
- **Migration**: Datenmigration stellt bestehende „Stück"/„Packung"-Einheiten von `MASS` auf `PIECE` um.

### D2: Eine Skalierungsquelle für Gramm
Stück→Gramm läuft über den invertierten `UnitConversion.factor`; `Portion.weight_g` und Conversion-Faktor repräsentieren dieselbe Information und dürfen nicht beide multipliziert werden. Im `UnitSwitcher`/Shopping-Pfad wird ein konsistenter Weg gewählt: Gramm als Basis, Stück nur über den invertierten Faktor; `weightG` darf nicht zusätzlich aus `Portion.weight_g` skaliert werden, wenn der Conversion-Faktor bereits angewendet ist.

- **Warum**: beseitigt Doppelskalierung.
- **Hinweis**: `RecipeDetailPage.tsx:164` setzt `from_unit_id` hart auf „g"; dieser Pfad bleibt Gramm-basiert, die Korrektur betrifft die Zielseite/Reverse-Conversion.

### D3: Tolerantes „x"-Symbol-Matching
`_format_natural_portion`/`units_without_x` matchen Stück-/Verpackungsnamen tolerant (z.B. Regex `^stück\b`, Berücksichtigung von Klammer-Suffixen „Stück (150g)"), sodass kein „x" vorangestellt wird.

### D4: Reorder schließt `g`-Portion aus
`handleDragEnd` filtert die `g`-Portion aus der `orders`-Payload heraus; nur nicht-`g`-Portionen erhalten rank 1..N. `g` bleibt serverseitig 9999. Backend-Validierung (`ingredients.py:395`) passt dann.

- **Warum**: minimaler, gezielter Fix; Backend-Constraint bleibt als Schutz erhalten.

### Betroffene Dateien
- Backend: `supply/choices.py`, `supply/signals.py`, `supply/api/unit_conversions.py`, `supply/services/shopping_service.py`, `supply/api/ingredients.py`, neue `supply`-Migration (Typ + Datenmigration).
- Frontend: `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx`, `frontend-food/src/components/recipe/UnitSwitcher.tsx`, `frontend-food/src/lib/unitConversion.ts`, ggf. `frontend-food/src/schemas/supply.ts`.

### API-Änderungen
- Keine neuen Endpoints. Conversion-/Einheiten-Responses können den neuen Typ exponieren (Zod-Sync). Reorder-Endpoint unverändert (Frontend sendet korrekte Payload).

## Risks / Trade-offs

- **Datenmigration übersieht abweichend benannte Stück-Einheiten** → Migration über Name + Verwendung identifizieren; Test mit Bestandsdaten.
- **Skalierungs-Umbau bricht andere Anzeigen** (Rezeptmengen, Einkaufsliste) → gemeinsame Tests für Recipe-Detail + Shopping; eine klar dokumentierte Skalierungsregel.
- **`PIECE`-Wert kollidiert mit Annahmen, dass nur g/ml existieren** → Codepfade prüfen, die `unit in {"g","ml"}` annehmen.

## Migration Plan

1. `choices.py` `PIECE` ergänzen, `signals.py` System-Einheiten anpassen.
2. Migration: Feldwert-Erweiterung + Datenmigration bestehender Stück/Packung-Einheiten — `uv run python manage.py makemigrations supply` + `migrate`, `--check` grün.
3. `unit_conversions.py`/`shopping_service.py` Skalierung + Symbol fixen, Tests.
4. Frontend Reorder-Filter + Skalierung, Zod-Sync.
5. Rollback: Migration rückwärts (PIECE→MASS), code-seitig revertierbar.

## Open Questions

- (geklärt) Enum-Wert für `PIECE` = `"stk"`.
