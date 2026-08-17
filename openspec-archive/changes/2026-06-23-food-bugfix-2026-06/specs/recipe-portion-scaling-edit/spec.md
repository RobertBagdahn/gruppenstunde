## ADDED Requirements

### Requirement: Edit-Modus zeigt skalierte Mengen, Portionszahl gesperrt

Im Bearbeitungsmodus eines Rezepts SHALL die Portionszahl vor dem Öffnen des Edit-Modus wählbar sein. Sobald der Edit-Modus aktiv ist, ist die Portionszahl gesperrt. Die Eingabefelder zeigen die skalierten Werte (×N). Beim Speichern werden die Werte durch N dividiert und als 1-Personen-Werte gespeichert.

#### Scenario: Edit-Modus mit 4 Personen öffnen

- **WHEN** der Nutzer „4 Portionen" wählt und dann den Edit-Modus öffnet
- **THEN** zeigen alle Mengenfelder die ×4 Werte (z.B. 400g statt 100g)
- **THEN** ist der Portionszahl-Wähler deaktiviert (gesperrt während Edit aktiv)

#### Scenario: Portionszahl während Edit ändern nicht möglich

- **WHEN** der Nutzer versucht die Portionszahl zu ändern während der Edit-Modus aktiv ist
- **THEN** ist der Portionszahl-Wähler deaktiviert und zeigt einen Hinweis „Portionszahl während Bearbeitung gesperrt"

#### Scenario: Speichern teilt durch Portionszahl

- **WHEN** der Nutzer im Edit-Modus für 4 Personen eine Menge auf 480g ändert und speichert
- **THEN** wird 480 ÷ 4 = 120g in der Datenbank gespeichert
- **THEN** zeigt die Ansicht nach dem Speichern wieder die ×4 Darstellung (480g) da die Portionszahl noch auf 4 steht

#### Scenario: Direkt nach Speichern: skalierte Anzeige bleibt

- **WHEN** nach dem Speichern die gleiche Portionszahl (z.B. 4) noch aktiv ist
- **THEN** zeigt die Ansicht die gespeicherten Werte multipliziert mit der aktiven Portionszahl
