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
