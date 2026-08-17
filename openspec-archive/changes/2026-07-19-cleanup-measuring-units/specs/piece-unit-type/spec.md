## REMOVED Requirements

### Requirement: Eigener Einheitentyp für zählbare Einheiten

**Reason**: Die Einheiten „Stück" und „Packung" werden aus dem MeasuringUnit-System entfernt, da sie keine Messeinheiten mit definiertem Umrechnungsfaktor sind, sondern Form-/Verpackungsbeschreibungen.

**Migration**: Portionen, die „Stück" oder „Packung" als MeasuringUnit referenzierten, werden auf „Gramm" migriert. Neue Portionen verwenden „Gramm" mit passender `quantity` und `weight_g`.

### Requirement: Zuverlässiger Quellen-Filter bei Umrechnungen

**Reason**: Da Stück und Packung nicht mehr als MeasuringUnit existieren, entfällt die Notwendigkeit, PIECE-Einheiten von der Umrechnung auszuschließen. Es gibt keine PIECE-Einheiten mehr.

**Migration**: Der Quellen-Filter kann auf `unit IN ('g', 'ml')` vereinfacht werden. Keine PIECE-Fallback-Logik mehr nötig.

### Requirement: Korrekte Gramm bei Stück→Gramm

**Reason**: Ohne Stück als MeasuringUnit entfällt dieser Spezialfall. Gewichtsberechnung läuft immer über `compute_weight_g(quantity, measuring_unit, ingredient)`.

**Migration**: Bestehende Portionen, die zuvor Stück als FK hatten, verwenden jetzt Gramm mit quantity=1.0. Das `compute_weight_g`-Ergebnis ändert sich nicht (1.0 × 1.0 = 1.0), aber das war vorher schon falsch — diese Portionen hatten immer `weight_g=1.0`. Korrekte Gewichte müssen bei diesen Portionen manuell gesetzt werden.

### Requirement: Korrektes Symbol für Stück-/Verpackungsnamen

**Reason**: Da Stück und Packung nicht mehr als MeasuringUnit existieren, entfällt die Sonderlogik für das „x"-Symbol bei diesen Einheiten.

**Migration**: Die `UNIT_SHORT`-Map und `GRAM_UNIT_NAMES` in `IngredientList.tsx` werden auf die 10 verbleibenden Einheiten aktualisiert. Keine Sonderbehandlung für Stück-/Packungsnamen mehr nötig.
