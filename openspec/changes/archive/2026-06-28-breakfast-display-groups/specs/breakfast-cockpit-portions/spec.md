## ADDED Requirements

### Requirement: Cockpit zeigt Portionen statt Gramm

Das System SHALL in der Cockpit-Zusammenfassungstabelle (Schritt 5) für Basis- und Belag-Items die Spalte "Menge/P" in Portionen anzeigen, nicht in Gramm.

Brot-Items SHALL als `×{bePerPerson × sharePercent/100} Scheibe` angezeigt werden.
Belag-Items SHALL als `×{bePerPerson × sharePercent/totalShare} Portion` angezeigt werden.
Getränke SHALL als `×{mlPerPerson/200} Tasse` angezeigt werden.
Milch SHALL als `×{totalMilkMl/30} Schuss` angezeigt werden.

#### Scenario: Basis-Item zeigt Portionen
- **WHEN** bePerPerson=4, sharePercent=66% für Brötchen
- **THEN** zeigt die Tabelle "×2,64 Scheibe" statt "175g"

#### Scenario: Belag-Item zeigt Portionen
- **WHEN** bePerPerson=4, sharePercent=21%, totalShare=100% für Edamer
- **THEN** zeigt die Tabelle "×0,84 Portion" statt "21g"

### Requirement: Cockpit hat Summenzeilen pro Kategorie

Das System SHALL nach jeder Kategorie-Gruppe (Basis, Belag) eine Summenzeile einfügen.

Die Brot-Summenzeile SHALL die Gesamtzahl Scheiben anzeigen: `sum(bePerPerson × sharePercent/100)`.
Die Belag-Summenzeile SHALL die Gesamtzahl Portionen anzeigen: `sum(bePerPerson × sharePercent/totalShare)`.

Die Gesamt-Summenzeile (Brot+Belag+Extras, ohne Getränke) bleibt erhalten.

#### Scenario: Summenzeilen sichtbar
- **WHEN** zwei Brote mit insgesamt 4,0 Scheiben und drei Beläge mit insgesamt 1,0 Portionen
- **THEN** gibt es eine Zeile "Brote gesamt: 4,0 Scheiben" und eine Zeile "Belag gesamt: 1,0 Portionen"

### Requirement: Kein BE-Begriff in der Anzeige

Das System SHALL den Begriff "BE" oder "Broteinheit" nirgendwo in der Cockpit-Anzeige verwenden. Die Berechnung läuft weiterhin intern über BE, aber die Anzeige zeigt nur die natürlichen Portionseinheiten.

#### Scenario: Cockpit ohne BE
- **WHEN** der Nutzer im Cockpit ist
- **THEN** wird "Broteinheit", "BE" oder ähnliches nirgendwo angezeigt
