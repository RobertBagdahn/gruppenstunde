## MODIFIED Requirements

### Requirement: GameCard Metadaten-Anzeige

Die GameCard MUSS Content-Typ-spezifische Metadaten prominent anzeigen.

#### Scenario: Metadaten auf GameCard
- **WHEN** eine GameCard in der Listenansicht gerendert wird
- **THEN** MUSS sie folgende Metadaten anzeigen: Dauer (Uhr-Icon + Minuten), Schwierigkeit (Stern-Icons), bis zu 3 Tags als Chips

#### Scenario: Kompakte Darstellung
- **WHEN** die GameCard bei 5 Spalten gerendert wird
- **THEN** MÜSSEN Metadaten als kompakte Icon+Text-Kombination dargestellt werden
