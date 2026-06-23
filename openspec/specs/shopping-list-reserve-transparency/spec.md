## Requirements

### Requirement: Reserve-Aufschlüsselung in der Einkaufsliste

Die Einkaufsliste SHALL optional anzeigen wie viel der Gesamtmenge aus dem Reserve-Anteil stammt.

#### Scenario: Reserve-Anteil eingeblendet

- **WHEN** der Nutzer die Reserve-Aufschlüsselung aktiviert hat
- **THEN** zeigt jede Zeile der Einkaufsliste: `1.300g (inkl. 10% Reserve = 130g)`
- **THEN** die Nettomenge (ohne Reserve) ist ebenfalls erkennbar

#### Scenario: Reserve-Anteil ausgeblendet (Standard)

- **WHEN** der Nutzer die Reserve-Aufschlüsselung nicht aktiviert hat
- **THEN** wird nur die Gesamtmenge inklusive Reserve angezeigt (bisheriges Verhalten)

### Requirement: Reserve-Prozentsatz pro Essensplan konfigurierbar

Das System SHALL ein `reserve_percent` Feld auf `MealPlan` haben mit dem der Reserve-Anteil pro Plan eingestellt werden kann.

#### Scenario: Standard-Reserve

- **WHEN** ein neuer Essensplan angelegt wird
- **THEN** ist `reserve_percent = 10` (10%) der Standard

#### Scenario: Reserve anpassen

- **WHEN** der Nutzer `reserve_percent` auf 15 setzt
- **THEN** werden alle Einkaufslisten-Mengen dieses Plans mit Faktor 1.15 berechnet

#### Scenario: Reserve = 0

- **WHEN** der Nutzer `reserve_percent = 0` setzt
- **THEN** wird keine Reserve aufgeschlagen (Nettomenge = Gesamtmenge)
