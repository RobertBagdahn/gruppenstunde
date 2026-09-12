## ADDED Requirements

### Requirement: Unveränderliche physikalische Basiseinheiten
Das System MUSS sicherstellen, dass Portionen mit der Messeinheit Gramm (`g`, `Gramm`) oder Milliliter (`ml`, `Milliliter`) immer das physikalisch korrekte Einheitsgewicht (`weight_g = 1.0` für Gramm) besitzen. Geschätzte Portionsgewichte dürfen niemals als `weight_g` für die Einheit Gramm eingetragen werden.

#### Scenario: Portion-Resolution für Gramm erzwingt 1g Gewicht
- **WHEN** `_resolve_portion` für eine Zutat mit der Einheit `Gramm` oder `g` aufgerufen wird
- **THEN** MUSS die aufgelöste Portion `weight_g = 1.0` (oder `None` für 1g = 1g) haben
- **THEN** DARF keine Portion mit Name `"g (<Gewicht> g)"` und abweichendem `weight_g` neu erzeugt werden

#### Scenario: Portion-Resolution für Milliliter verhindert Phantasiegewichte
- **WHEN** `_resolve_portion` für eine Zutat mit der Einheit `Milliliter` oder `ml` aufgerufen wird
- **THEN** MUSS das Portionsgewicht 1.0 g pro ml (oder die physikalische Dichte) betragen
- **THEN** DARF kein willkürliches geschätztes Portionsgewicht (wie 250g pro ml) als `weight_g` gespeichert werden
