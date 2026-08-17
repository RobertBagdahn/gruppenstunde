# food-list-page-layout Delta Specification

## MODIFIED Requirements

### Requirement: Filter-Sidebar (wo sinnvoll)
Rezepte und Zutaten MUST eine Filter-Sidebar links vom Grid haben. Essensplan und Einkaufslisten haben keine Sidebar. Stattdessen verwendet die Essensplan-Seite ein Sektionslayout mit Filter-Chips oberhalb der Sektionen (Ampel-Filter und Zeitraum-Filter).

#### Scenario: Essensplan-Filter
- **WHEN** der Benutzer die Essensplan-Seite oeffnet
- **THEN** zeigt die Seite Filter-Chips fuer Ampel-Status und Zeitraeume anstelle einer Sidebar

#### Scenario: Zutaten-Filter
- **WHEN** der Benutzer die Zutatenseite oeffnet
- **THEN** zeigt eine Sidebar Filter fuer Retail-Section und Status

## ADDED Requirements

### Requirement: Sektionslayout fuer Essensplan
Die Essensplan-Listenseite SHALL ein viergeteiltes Sektionslayout mit aufklappbaren Bereichen verwenden. Jede Sektion hat einen Header mit Titel, Icon und Item-Count. Die Top-5-Sektion ist immer expandiert, alle anderen Sektionen sind standardmaessig zugeklappt.

#### Scenario: Sektions-Header
- **WHEN** eine Sektion gerendert wird
- **THEN** zeigt der Header ein Chevron-Icon (rechts/runter), den Sektionstitel, und die Item-Anzahl in Klammern

#### Scenario: Expandierte Sektion
- **WHEN** eine Sektion expandiert ist
- **THEN** wird der Inhalt (Hero-Cards oder Compact-Card-Grid) unterhalb des Headers dargestellt

#### Scenario: Zugeklappte Sektion
- **WHEN** eine Sektion zugeklappt ist
- **THEN** wird nur der Header angezeigt, der Inhalt ist ausgeblendet

### Requirement: Zwei Kartengroessen im Essensplan
Die Essensplan-Seite SHALL zwei Kartengroessen unterstuetzen: Hero-Cards (gross, volle Breite im Grid, fuer Top-5) und Compact-Cards (kleiner, 2-3 spaltig im Grid, fuer sekundaere Sektionen).

#### Scenario: Hero-Card Layout
- **WHEN** eine Hero-Card im Top-5-Bereich gerendert wird
- **THEN** beansprucht sie die volle Grid-Breite und zeigt erweiterte Informationen (Fortschrittsbalken, Countdown, Quick-Actions)

#### Scenario: Compact-Card Layout
- **WHEN** eine Compact-Card in "Weitere", "Referenzpläne" oder "Vergangene" gerendert wird
- **THEN** wird sie im 2-3-spaltigen Grid mit reduzierter Informationsdichte dargestellt
