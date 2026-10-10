## ADDED Requirements

### Requirement: Frühstücksbasis erforderlich
Der Frühstücks-Wizard MUST eine aktive Basis-Zutat verlangen, bevor der Nutzer den Basis-Schritt verlassen oder das Frühstück speichern kann. Bei leerem erforderlichem Basiskatalog MUST die UI den leeren Zustand erklären und eine Aktion zum Erstellen einer Basis anbieten. Fehlende Nährwertdaten MUST als nicht verfügbar statt als belastbare Summe dargestellt werden.

#### Scenario: Leerer Basiskatalog
- **WHEN** der Frühstückskatalog keine Basis-Zutaten enthält
- **THEN** kann der Nutzer nicht fortfahren und kann eine Basis-Zutat anlegen.
