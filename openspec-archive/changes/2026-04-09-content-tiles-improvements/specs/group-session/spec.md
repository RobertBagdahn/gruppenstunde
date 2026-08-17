## MODIFIED Requirements

### Requirement: SessionCard Metadaten-Anzeige

Die SessionCard (Gruppenstunde) MUSS Content-Typ-spezifische Metadaten prominent anzeigen.

#### Scenario: Metadaten auf SessionCard
- **WHEN** eine SessionCard in der Listenansicht gerendert wird
- **THEN** MUSS sie folgende Metadaten anzeigen: Dauer (Uhr-Icon + Minuten), Schwierigkeit (Stern-Icons), Altersgruppe/Scout Levels (als kompakte Badges), bis zu 3 Tags als Chips

#### Scenario: Scout Level Badges
- **WHEN** ein GroupSession Content Scout Levels zugeordnet hat
- **THEN** MÜSSEN die Scout Level Namen als kompakte farbige Badges angezeigt werden (max 2 sichtbar, „+N" für Rest)
