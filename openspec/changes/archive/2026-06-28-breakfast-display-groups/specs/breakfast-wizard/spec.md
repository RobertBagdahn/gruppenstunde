## MODIFIED Requirements

### Requirement: Abschluss-Cockpit und Speichern

Das System SHALL vor dem Speichern ein Cockpit mit allen Doppelchecks und einer vollständigen Transparenz-Tabelle anzeigen. Die Tabelle MUSS Brot, Belag, warme Gerichte/Extras und Getränke enthalten — jeweils mit Position, **Portionsmenge pro Person** (nicht Gramm), kcal pro Person und prozentualem Anteil am Gesamt (ohne Getränke).

Brot-Items SHALL als `×{bePerPerson × sharePercent/100} Scheibe` angezeigt werden.
Belag-Items SHALL als `×{bePerPerson × sharePercent/totalShare} Portion` angezeigt werden.

Nach jeder Kategorie (Brot, Belag) SHALL eine Summenzeile stehen (z.B. "Brote gesamt: ×4,0 Scheiben").

Der Begriff "BE" oder "Broteinheit" darf in der gesamten Cockpit-Anzeige nicht vorkommen.

#### Scenario: Cockpit zeigt Portionen statt Gramm
- **WHEN** Brot mit bePerPerson=4, sharePercent=66% konfiguriert ist
- **THEN** zeigt die Tabelle "×2,64 Scheibe" statt "175g"

#### Scenario: Summenzeile nach Brot-Gruppe
- **WHEN** zwei Brote mit 2,5 und 1,5 Scheiben
- **THEN** erscheint "Brote gesamt: 4,0 Scheiben" als letzte Zeile der Brot-Gruppe
