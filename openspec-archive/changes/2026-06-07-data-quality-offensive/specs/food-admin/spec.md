## MODIFIED Requirements

### Requirement: Staff-only Admin-Bereich

Das food-frontend MUST einen Admin-Bereich unter `/admin` bereitstellen, der nur für authentifizierte Staff-User zugänglich ist. Der Admin-Bereich SHALL zusätzlich zu den bestehenden Tabs einen neuen Navigationspunkt "Datenqualität" enthalten, der zu `/admin/data-quality` führt.

#### Scenario: Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=true` auf `/admin` navigiert
- **THEN** wird die Admin-Seite mit Tab-Navigation angezeigt
- **THEN** SHALL die Tab-Navigation den Eintrag "Datenqualität" enthalten

#### Scenario: Nicht-Staff-User greift auf Admin zu
- **WHEN** ein authentifizierter User mit `is_staff=false` auf `/admin` navigiert
- **THEN** wird der User auf `/recipes` weitergeleitet

#### Scenario: Nicht-authentifizierter User greift auf Admin zu
- **WHEN** ein nicht-authentifizierter User auf `/admin` navigiert
- **THEN** wird der User auf `/login` weitergeleitet

#### Scenario: Datenqualität direkt aufrufbar
- **WHEN** Staff-User auf `/admin/data-quality` navigiert
- **THEN** SHALL das Datenqualität-Dashboard mit Zutaten/Rezepte-Auswahl geladen werden
