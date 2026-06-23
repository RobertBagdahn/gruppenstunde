## Requirements

### Requirement: Dedizierte Druckansicht für Essensplan

Das System SHALL eine dedizierte `/meal-plans/:id/print`-Route bereitstellen, die eine druckoptimierte Ansicht des Essensplans rendert.

#### Scenario: Druckansicht öffnen

- **WHEN** ein Nutzer `/meal-plans/:id/print` aufruft
- **THEN** wird eine druckoptimierte Seite gerendert ohne Navigation, Header oder Footer
- **THEN** alle Sektionen (Tage, Mahlzeiten, Rezepte, Einkaufsliste) sind ausgeklappt und sichtbar
- **THEN** die Seite ist A4-Format optimiert

#### Scenario: Drucken-Button im Essensplan

- **WHEN** ein Nutzer die Essensplan-Detailseite aufruft
- **THEN** gibt es einen „Drucken"-Button der `/meal-plans/:id/print` in einem neuen Tab öffnet

#### Scenario: Inhalt der Druckansicht

- **WHEN** die Druckansicht eines Essensplans gerendert wird
- **THEN** enthält sie: Planname, Zeitraum, Personenanzahl, alle Tage mit Mahlzeiten und Rezepten, die Einkaufsliste mit Mengen
- **THEN** alle Sektionen sind standardmäßig ausgeklappt (kein Accordion-Zustand)

#### Scenario: Geteilter Link zur Druckansicht

- **WHEN** ein Nutzer den Druckansicht-Link teilt
- **THEN** kann jeder mit dem Link die Druckansicht sehen (public read-only, kein Login erforderlich für öffentliche Pläne)
