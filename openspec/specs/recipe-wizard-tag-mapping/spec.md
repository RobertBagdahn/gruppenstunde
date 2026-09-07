# Spec: Recipe Wizard Tag Mapping

Dual-sided Tag-Auflösung und -Zuordnung für den RecipeWizard.

## Purpose
Sichert die persistente und fehlerfreie Zuordnung von Tags während der mehrschrittigen Rezept-Erstellung und -Bearbeitung.

## Requirements

### Requirement: Dual-Sided Tag Robustness im RecipeWizard
Das System SHALL sicherstellen, dass bei der Rezepterstellung im Wizard ausgewählte Tags zuverlässig persistiert werden. Das Frontend SHALL konsistent stabile Tag-IDs senden und das Backend SHALL tolerant sowohl UUIDs als auch Tag-Slugs akzeptieren und auflösen.

#### Scenario: Tag-Auswahl und Speichern im Wizard
- **GIVEN** ein Nutzer wählt im Schritt 3 (Metadaten) Tags über den `TagMultiSelect` aus
- **WHEN** der Wizard zum nächsten Schritt wechselt oder das Rezept gespeichert wird
- **THEN** SHALL das Backend alle angegebenen Tags auflösen und mit dem Rezept verknüpfen, ohne einen Validierungsfehler oder HTTP 500 auszulösen
