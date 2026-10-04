## ADDED Requirements

### Requirement: Keine veralteten Plan-Summen
Nach dem Entfernen eines Eintrags oder dem Ändern von Faktor oder Menge SHALL der Plan sofort angepasste Werte für Mahlzeit-Totals, Kachelwerte und Plan-Header (Budget pro Person, kcal) zeigen, bevor die Server-Antwort vorliegt. Schlägt die Änderung fehl, MUST der vorherige Stand wiederhergestellt werden.

#### Scenario: Rezept entfernt
- **WHEN** der Nutzer das einzige Rezept einer Mahlzeit entfernt
- **THEN** zeigt der Header nie „Noch nichts geplant“ zusammen mit dem alten Betrag

#### Scenario: Faktor geändert
- **WHEN** der Faktor eines Rezepts von 1 auf 2 geändert wird
- **THEN** zeigen Kachel und Header sofort das Doppelte der Kosten und kcal des Eintrags

#### Scenario: Änderung schlägt fehl
- **WHEN** der Server die Änderung ablehnt
- **THEN** stellen Kachel und Header den vorherigen Stand wieder her
