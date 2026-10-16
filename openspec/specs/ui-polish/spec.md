# ui-polish Specification

## Purpose
Visuelle Überarbeitung der Essensplan-Listenseite: Karten mit Akzent, zweispaltiges Desktop-Layout, aggregierte Kennzahlen im Kopfbereich und Anlegen über einen Dialog.

## Requirements
### Requirement: Karten der Essensplan-Liste
Die Karten der Essensplan-Liste SHALL `border-l-4 border-l-primary` als visuellen Akzent verwenden. Karten-Aktionen wie Löschen MUST in einem DropdownMenu (⋮) liegen und nicht direkt auf der Karte stehen.

#### Scenario: Karte mit Aktionen
- **WHEN** die Essensplan-Liste angezeigt wird
- **THEN** hat jede Karte einen linken Akzentrand in der Primärfarbe
- **AND** Löschen ist nur über das ⋮-Menü erreichbar

### Requirement: Zweispaltiges Desktop-Layout
Auf Desktop SHALL die Liste ein zweispaltiges Grid (`md:grid-cols-2`) mit reduzierten vertikalen Abständen zeigen.

#### Scenario: Desktop-Breite
- **WHEN** die Seite ab der Breite `md` angezeigt wird
- **THEN** stehen die Karten in zwei Spalten mit kompakten Abständen

### Requirement: Aggregierte Kennzahlen im Kopfbereich
Der Kopfbereich SHALL die Anzahl der Pläne, die Gesamtzahl der Mahlzeiten und die Gesamtzahl der Portionen anzeigen.

#### Scenario: Kennzahlen
- **WHEN** die Essensplan-Liste Pläne enthält
- **THEN** zeigt der Kopfbereich Anzahl Pläne, Gesamtmahlzeiten und Gesamtportionen

### Requirement: Anlegen über Dialog
Das Formular zum Anlegen eines Essensplans SHALL ein shadcn-Dialog sein und MUST NOT als inline aufklappender Bereich erscheinen.

#### Scenario: Neuen Plan anlegen
- **WHEN** der Nutzer einen neuen Essensplan anlegen will
- **THEN** öffnet sich ein Dialog mit dem Formular
