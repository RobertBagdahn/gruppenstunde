## ADDED Requirements

### Requirement: Aussagekräftige Fehler beim Anlegen
Das Anlegen einer Zutat SHALL bei Fehlern die Backend-Meldung anzeigen. Existiert der Name bereits, MUST das Backend mit `409` und `existing` (`id`, `slug`, `name`) antworten und das Formular die vorhandene Zutat mit Link nennen.

#### Scenario: Doppelter Name
- **WHEN** der Nutzer „Salz“ speichert und `Salz` existiert
- **THEN** lautet die Meldung „Die Zutat „Salz“ gibt es schon“ mit Link zur vorhandenen Zutat
- **AND** nicht „Fehler beim Erstellen der Zutat“

### Requirement: Pflichtfeld-Fehler am Feld
Pflichtfeld-Fehler (Name der Zutat, Titel des Rezepts im Bearbeiten) SHALL als Inline-Meldung am Feld erscheinen und das Feld fokussieren.

#### Scenario: Leerer Titel
- **WHEN** der Nutzer im Rezept-Bearbeiten den Titel leert und speichert
- **THEN** zeigt das Titelfeld „Titel ist erforderlich“ und erhält den Fokus
