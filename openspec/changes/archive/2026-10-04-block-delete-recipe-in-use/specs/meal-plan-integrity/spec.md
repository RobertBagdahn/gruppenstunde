## ADDED Requirements

### Requirement: Gelöschte Rezepte zählen nicht in Plänen
Berechnungen eines Essensplans (Kosten, Nährwerte, Einkaufsliste) und das Kopieren eines Plans SHALL Einträge mit soft-gelöschtem Rezept ignorieren, sodass Kosten und Einkaufsliste konsistent bleiben.

#### Scenario: Bestandsplan mit gelöschtem Rezept
- **WHEN** ein Plan einen Eintrag mit soft-gelöschtem Rezept enthält
- **THEN** enthalten Plankosten und kcal diesen Eintrag nicht
- **AND** Einkaufsliste und Plankosten weisen dieselben Zutaten aus

#### Scenario: Plan kopieren
- **WHEN** ein Plan mit einem Eintrag mit soft-gelöschtem Rezept kopiert wird
- **THEN** enthält die Kopie diesen Eintrag nicht

### Requirement: Bereinigung gelöschter Rezepte in Plänen
Das System SHALL ein Management-Command bereitstellen, das Plan-Einträge mit soft-gelöschtem Rezept auflistet und nur mit `--apply` entfernt.

#### Scenario: Dry-Run
- **WHEN** das Command ohne `--apply` läuft
- **THEN** werden betroffene Einträge aufgelistet und nichts verändert
