## ADDED Requirements

### Requirement: Robuste Mengen- und Einheitenextraktion für Smart Input
Das System SHALL beim Verarbeiten von kopierten Rezepttexten oder Zutatenlisten die angegebenen Mengen und Einheiten exakt übernehmen. Es SHALL keine zusätzlichen Zutaten hinzuerfinden, wenn eine reine Zutatenliste eingegeben wird.

#### Scenario: Reine Zutatenliste ohne Hinzuerfinden von Kräutern oder Gewürzen
- **WHEN** ein Nutzer eine reine Zutatenliste (ohne Zubereitungsschritte) in das Smart-Input-Feld eingibt
- **THEN** SHALL das System ausschließlich die im Text genannten Zutaten extrahieren
- **THEN** SHALL keine zusätzliche Zutat (wie Petersilie oder Salz) in den Rezept-Draft aufgenommen werden, die nicht in der Eingabe enthalten war

#### Scenario: Pluralformen in Klammern werden nicht als Notiz interpretiert
- **WHEN** eine Zutat mit Pluralendung in Klammern wie `Möhre(n)` oder `Kartoffel(n)` eingegeben wird
- **THEN** SHALL der Zutatentext zu `Möhre` bzw. `Kartoffel` ohne Notiz aufgelöst werden
- **THEN** SHALL das Feld `note` nicht den Buchstaben `n` oder `s` enthalten

#### Scenario: Zutatenduplikate verhindern bei bestehendem Match
- **WHEN** für eine Zutat bereits ein oder mehrere Einträge mit identischem Namen in der Datenbank existieren
- **THEN** SHALL das System die bestehende Zutat referenzieren
- **THEN** SHALL kein neuer Zutatendraft in der Datenbank angelegt werden
