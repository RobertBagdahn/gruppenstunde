## ADDED Requirements

### Requirement: Plannamen bleiben in Karten lesbar
Die Plankarten SHALL den Namen des Plans mit Vorrang vor dem Herkunfts-Badge darstellen. Der Name MUST bei schmaler Karte auf bis zu zwei Zeilen umbrechen und darf nicht auf einzelne Zeichen gekürzt werden. Der vollständige Name MUST als Tooltip verfügbar sein.

#### Scenario: Schmale Karte mit Badge
- **WHEN** eine Karte mit dem Badge „Mein Plan“ bei 1024 px Viewport dargestellt wird
- **THEN** sind mindestens 12 Zeichen des Namens sichtbar oder der Name umbricht auf zwei Zeilen
- **AND** das Badge steht in einer eigenen Zeile oder als Icon

### Requirement: Lösch-Dialog nennt den Plan
Der Bestätigungsdialog zum Löschen eines Essensplans SHALL den Namen des betroffenen Plans enthalten.

#### Scenario: Dialog öffnen
- **WHEN** der Nutzer bei „ZZ-TEST Plan“ Löschen wählt
- **THEN** lautet der Titel „Essensplan „ZZ-TEST Plan“ löschen?“

### Requirement: Monatsgruppen sind eindeutig
Bei der Sortierung „Demnächst“ (`date_upcoming`) SHALL die Planliste aktuelle und kommende Pläne im Abschnitt „Aktuell & kommend“ und vergangene Pläne im Abschnitt „Vergangen“ zeigen, jeweils nach Monat gruppiert. Ein Monat MUST innerhalb eines Abschnitts genau einmal erscheinen; Pläne ohne Datum stehen unter „Ohne Datum“.

#### Scenario: Kommende und vergangene Pläne im selben Monat
- **GIVEN** heute ist der 11.10.2026, ein Plan läuft vom 16.10. bis 18.10.2026 und ein Plan lief vom 02.10. bis 04.10.2026
- **WHEN** der Nutzer die Planliste mit „Demnächst“ öffnet
- **THEN** steht „Oktober 2026“ einmal im Abschnitt „Aktuell & kommend“ und einmal im Abschnitt „Vergangen“
- **AND** die Konsole meldet keine doppelten React-Keys
