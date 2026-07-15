## ADDED Requirements

### Requirement: Content-Tag baking-ingredient

Das System SHALL einen Content-Tag mit slug `baking-ingredient` bereitstellen. Zutaten mit diesem Tag SHALL bei der KI-Portions-Anreicherung als Backzutat behandelt werden und zusätzliche Backmengen-Portionsvorschläge erhalten.

#### Scenario: Tag existiert nach Seed

- **WHEN** das Seed-Kommando für den `baking-ingredient`-Tag ausgeführt wird
- **THEN** SHALL ein Tag mit slug `baking-ingredient` und name `baking-ingredient` existieren

#### Scenario: Zutat mit Tag löst Backmengen-Vorschläge aus

- **WHEN** eine Zutat den Tag `baking-ingredient` trägt und der Zauberstab-Endpoint aufgerufen wird
- **THEN** SHALL das Antwortschema mindestens einen `backmenge`-Portionsvorschlag enthalten

#### Scenario: Zutat ohne Tag erhält keine Backmengen-Vorschläge

- **WHEN** eine Zutat den Tag `baking-ingredient` nicht trägt
- **THEN** SHALL das `backmengen`-Array in der KI-Antwort leer sein

#### Scenario: Tag ist manuell zuweisbar

- **WHEN** ein Nutzer mit Bearbeitungsrechten eine Zutat wie „Mehl" oder „Hefe" bearbeitet
- **THEN** SHALL der Tag `baking-ingredient` in der Tag-Auswahl der Zutat verfügbar sein und zuweisbar sein
