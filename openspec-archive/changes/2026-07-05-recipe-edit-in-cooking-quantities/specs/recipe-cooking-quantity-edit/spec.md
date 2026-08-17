## ADDED Requirements

### Requirement: Auffindbarer Einstieg zur Bearbeitung in Kochmengen
Das System SHALL einen sichtbaren Einstiegspunkt bereitstellen, mit dem ein Rezept in Kochmengen (für eine wählbare Personenzahl) bearbeitet werden kann, unabhängig von der aktuellen Anzeige-Skalierung.

#### Scenario: Einstieg sichtbar
- **WHEN** ein berechtigter Nutzer die Rezept-Detailseite ansieht
- **THEN** SHALL eine Option „Für mehrere Personen bearbeiten" (oder gleichwertig) sichtbar sein

#### Scenario: Bearbeiten in Kochmengen aktivierbar bei Anzeige 1 Portion
- **WHEN** die Anzeige auf 1 Portion steht und der Nutzer die Bearbeitung in Kochmengen startet
- **THEN** SHALL der Editor in der gewählten Personenzahl (z.B. 4) geöffnet werden und Mengen entsprechend hochskaliert anzeigen

### Requirement: Personenzahl im Editor wählbar
Das System SHALL im Bearbeitungs-Modus erlauben, die Personenzahl zu wählen/zu ändern; alle Zutatenmengen SHALL daraufhin live entsprechend skaliert angezeigt werden.

#### Scenario: Personenzahl ändern
- **WHEN** der Nutzer im Editor die Personenzahl von 4 auf 8 ändert
- **THEN** SHALL jede angezeigte Zutatenmenge live verdoppelt werden

### Requirement: Normierung auf 1 Portion beim Speichern
Das System SHALL die in Kochmengen eingegebenen Mengen beim Speichern auf 1 Portion normieren, sodass das Backend das Rezept weiterhin auf 1 Portion speichert.

#### Scenario: Speichern normiert auf 1 Portion
- **WHEN** der Nutzer Mengen für 4 Personen eingibt und speichert
- **THEN** SHALL jede gespeicherte Zutatenmenge dem Wert für 1 Portion entsprechen (eingegebener Wert / 4)
- **AND** SHALL die gespeicherte Portionszahl des Rezepts 1 sein

#### Scenario: Unberechtigter Nutzer
- **WHEN** ein Nutzer ohne Bearbeitungsrecht das Rezept ansieht
- **THEN** SHALL der Einstieg zur Bearbeitung in Kochmengen nicht verfügbar sein
