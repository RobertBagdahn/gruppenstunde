## MODIFIED Requirements

### Requirement: Events Landing Page Sandbox
Die EventsLandingPage MUSS "Aktionen" als Label verwenden statt "Veranstaltungen". Alle Beschreibungstexte MÜSSEN aktualisiert werden.

#### Scenario: Landing Page zeigt Aktionen-Branding
- **WHEN** ein Nutzer die `/events`-Landing-Page besucht
- **THEN** MUSS der Hero-Titel "Aktionen" enthalten
- **THEN** MÜSSEN alle Beschreibungstexte "Aktionen" statt "Veranstaltungen" verwenden

#### Scenario: Landing Page Features aktualisiert
- **WHEN** ein Nutzer die Feature-Liste der Events-Landing-Page sieht
- **THEN** MÜSSEN alle Feature-Beschreibungen "Aktionen" statt "Veranstaltungen" verwenden
- **THEN** MUSS "Veranstaltungsort" als zusammengesetztes Wort erhalten bleiben (kein Umbenennen zu "Aktionsort")

#### Scenario: Landing Page FAQ aktualisiert
- **WHEN** ein Nutzer die FAQ-Section der Events-Landing-Page sieht
- **THEN** MÜSSEN alle Fragen und Antworten "Aktionen" statt "Veranstaltungen" verwenden
