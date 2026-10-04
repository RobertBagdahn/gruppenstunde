## ADDED Requirements

### Requirement: Stabiler Schritt-Zähler
Der Rezept-Wizard SHALL die Gesamtzahl der Schritte innerhalb eines Pfads nicht ändern. Vor der Wahl des Pfads MUST der Pfad mit Zutaten-Review (7 Schritte) gezählt werden, der manuelle Pfad zählt 6 Schritte ab Wahl.

#### Scenario: KI-Pfad
- **WHEN** der Nutzer im Schritt 1 „Rezept analysieren“ wählt
- **THEN** lautet der Zähler in Schritt 1 „von 7“ und in Schritt 2 weiterhin „von 7“

#### Scenario: Manueller Pfad
- **WHEN** der Nutzer „Ohne KI manuell beginnen“ wählt
- **THEN** zeigt der Zähler ab dort „von 6“ und ändert sich nicht mehr
