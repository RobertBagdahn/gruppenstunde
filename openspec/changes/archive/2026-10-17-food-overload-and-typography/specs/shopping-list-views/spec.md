## ADDED Requirements

### Requirement: Titel im Kopfband bricht nicht mitten im Wort
Der Seitentitel im Kopfband der Einkaufslisten-Detailseite SHALL ganze Wörter zusammenhalten. Bei schmalen Bildschirmen MUST er die Aktionsbuttons in eine eigene Zeile schieben, statt sie neben dem Titel zu quetschen. Ein Wort MUST nur dann umbrechen, wenn es in keine Zeile passt.

#### Scenario: Titel auf 320 px
- **GIVEN** eine Einkaufsliste mit dem Namen „Lagereinkauf“ wird auf 320 px Breite angezeigt
- **THEN** steht „Lagereinkauf“ ungeteilt in einer Zeile
- **AND** die Aktionsbuttons stehen darunter
