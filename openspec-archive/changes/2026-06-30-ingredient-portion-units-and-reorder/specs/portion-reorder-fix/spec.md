## ADDED Requirements

### Requirement: Drag-&-Drop-Sortierung schließt die g-Portion aus
Das System SHALL beim Sortieren der Portionen per Drag & Drop nur die sortierbaren (nicht-`g`-) Portionen neu durchnummerieren (rank 1..N). Die `g`-Portion SHALL ihren festen rank 9999 behalten und nicht Teil der Reorder-Payload sein.

#### Scenario: Reorder ohne g-Portion in der Payload
- **WHEN** ein Nutzer die Reihenfolge der Portionen einer Zutat mit vorhandener `g`-Portion per Drag & Drop ändert
- **THEN** SHALL die an das Backend gesendete Sortier-Payload die `g`-Portion NICHT enthalten
- **AND** SHALL nur die nicht-`g`-Portionen die Ränge 1..N erhalten

#### Scenario: Erfolgreiches Speichern der Sortierung
- **WHEN** die Reorder-Payload ohne die `g`-Portion gesendet wird
- **THEN** SHALL das Backend die neue Reihenfolge ohne HTTP-422-Fehler speichern
- **AND** SHALL die `g`-Portion weiterhin rank 9999 haben

#### Scenario: g-Portion bleibt nicht ziehbar
- **WHEN** die Portionsliste angezeigt wird
- **THEN** SHALL die `g`-Portion nicht per Drag & Drop verschiebbar sein
