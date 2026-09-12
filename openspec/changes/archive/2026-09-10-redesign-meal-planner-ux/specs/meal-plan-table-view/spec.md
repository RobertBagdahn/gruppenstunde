## MODIFIED Requirements

### Requirement: Tabellarisches Grid

Die Detailseite SHALL die Tabelle als Sub-View innerhalb des Haupt-Tabs „Planen“ über den Header-Switch [ Tagesplan | Tabelle ] anbieten: geplante Tage als Spalten, alle aktiven Mahlzeittypen einschließlich `drinks` als Zeilen. Mehrere Snacks eines Tages stehen untereinander. Auf schmalen Bildschirmen ist die Tabelle horizontal scrollbar und die erste Spalte bleibt sticky. Spaltenbreiten SHALL mindestens 260px betragen und Textüberläufe oder Textkollisionen durch elastische Grids und sauberen Zeilenumbruch ausschließen.

#### Scenario: Umschalten auf Tabelle im Planen-Bereich
- **WHEN** der Nutzer im Planen-Bereich den Switch auf „Tabelle“ stellt
- **THEN** wird das tabellarische Grid angezeigt, ohne den Haupt-Tab zu verlassen

#### Scenario: Getränkezeile
- **WHEN** ein Plan einen Getränke-Slot enthält
- **THEN** zeigt die Tabelle eine lokalisierte Getränkezeile

#### Scenario: Responsive Spalten und Viewport
- **WHEN** die Tabelle auf einem Tablet oder schmalen Viewport betrachtet wird
- **THEN** sind Spalten horizontal scrollbar, ohne dass letzte Tage oder Kopfzeilen abgeschnitten werden
