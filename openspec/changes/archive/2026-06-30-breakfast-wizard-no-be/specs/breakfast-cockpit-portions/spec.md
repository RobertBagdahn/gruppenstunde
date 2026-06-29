## REMOVED Requirements

### Requirement: Cockpit zeigt Portionen statt Gramm

**Reason**: Die Anzeige von BE-abgeleiteten Portionen ("×2,64 Scheibe" aus bePerPerson × sharePercent) entfällt, da BE als Recheneinheit entfernt wurde. Das Cockpit zeigt jetzt Gramm + natürliche Einheiten direkt an (z.B. "158g (2,64 Scheibe)").

**Migration**: Ersetzt durch neue Anzeigelogik basierend auf Gramm + natürlichen Einheiten.

### Requirement: Cockpit hat Summenzeilen pro Kategorie

Das System SHALL nach jeder Kategorie-Gruppe (Basis, Belag) eine Summenzeile einfügen.

Die Brot-Summenzeile SHALL die **Gesamt-Gramm** Brot anzeigen: `sum(gramsPerPerson × sharePercent/100)`.
Die Belag-Summenzeile SHALL die **Gesamt-Gramm** Belag anzeigen: `sum(belagGramsPerPerson × sharePercent/totalShare)`.

Die Gesamt-Summenzeile (Brot+Belag+Extras, ohne Getränke) bleibt erhalten.

#### Scenario: Summenzeilen in Gramm
- **WHEN** zwei Brote mit insgesamt 158g und drei Beläge mit insgesamt 42g
- **THEN** gibt es eine Zeile "Brote gesamt: 158g" und eine Zeile "Belag gesamt: 42g"
