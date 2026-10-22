# Spec Delta

## REMOVED Requirements

### Requirement: Section-based list layout
**Reason**: Die Leinwand zeigt die Liste als Reiter „Anstehend“ und „Vergangen“ mit Karten, nicht als vier Abschnitte. Die Vorlagen sind in den Leerzustand gewandert.
**Migration**: Siehe „Tab-basierte Essensplan-Liste“.

### Requirement: Hero card for top-5 plans
**Reason**: Die Leinwand kennt keine Hero-Karten. Jeder Plan ist eine gleichwertige Karte mit Fortschritt, Termin und Kosten.
**Migration**: Siehe „Plan-Karte mit Fortschritt“.

### Requirement: Ampel (traffic light) readiness indicator
**Reason**: Eine reine Farb-Ampel verletzt die Regel „Status nie nur Farbe“. Der Fortschritt steht jetzt als Text und Balken.
**Migration**: Siehe „Plan-Karte mit Fortschritt“ und `food-design-system` (Statusdarstellung).

## ADDED Requirements

### Requirement: Tab-basierte Essensplan-Liste
Die Liste unter `/meal-plans/app` SHALL zwei Reiter zeigen: „Anstehend“ mit der Anzahl der Pläne, deren Enddatum nicht in der Vergangenheit liegt, und „Vergangen“ mit den übrigen. Der Reiter „Anstehend“ ist vorausgewählt. Im Reiter „Vergangen“ bietet jeder Plan „Als Vorlage nutzen“ an.

#### Scenario: Anstehende Pläne
- **WHEN** der Nutzer `/meal-plans/app` öffnet und Pläne hat
- **THEN** zeigt der Reiter „Anstehend“ die Pläne nach nächstem Termin sortiert und die Anzahl im Reiter

#### Scenario: Vergangene Pläne als Vorlage
- **WHEN** der Nutzer den Reiter „Vergangen“ öffnet
- **THEN** erscheint jeder Plan mit „Als Vorlage nutzen“, das den vorhandenen Kopier-Ablauf startet

### Requirement: Plan-Karte mit Fortschritt
Jede Plan-Karte SHALL Name, Zeitraum mit Anzahl Tage und Personen, den Fortschritt als Text („12 von 13 Mahlzeiten“) mit Balken, die Kosten pro Person und Tag (über den Kostenendpunkt je Karte) und den Hinweis zum Termin zeigen. Fehlt der Preis (`cost_per_person_per_day` ist `null`), MUST die Kostenzeile entfallen statt eine Schätzung anzuzeigen.

#### Scenario: Plan mit Fortschritt und Kosten
- **WHEN** ein Plan 12 von 13 Mahlzeiten gefüllt hat und Kosten je Person und Tag bekannt sind
- **THEN** zeigt die Karte „12 von 13 Mahlzeiten“, einen Balken mit 92 % und „5,80 € pro Person/Tag“

#### Scenario: Plan ohne vollständige Preise
- **WHEN** Zutaten ohne Preis im Plan sind
- **THEN** zeigt die Karte keine Kostenzeile

#### Scenario: Fortschritt ohne Farbe lesbar
- **WHEN** der Fortschritt niedrig ist
- **THEN** steht der Stand als Text und als Hinweis „Mahlzeit fehlt“ mit Warn-Icon da, nicht nur als Farbe
