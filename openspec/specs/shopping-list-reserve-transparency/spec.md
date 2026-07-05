## Requirements

### Requirement: Reserve-Aufschlüsselung in der Einkaufsliste

Die Einkaufsliste SHALL optional anzeigen, wie viel der Gesamtmenge aus dem Reserve-Anteil stammt. Das System SHALL pro Einkaufslisten-Item die Nettomenge (ohne Reserve) und den Reserve-Anteil aus `reserve_factor` berechnen und im Item-Schema bereitstellen (`net_quantity_g`, `reserve_quantity_g`).

#### Scenario: Reserve-Anteil eingeblendet

- **WHEN** der Nutzer die Reserve-Aufschlüsselung aktiviert hat
- **THEN** zeigt jede Zeile der Einkaufsliste die Gesamtmenge inkl. ausgewiesenem Reserve-Anteil (z.B. `1.300 g (inkl. Reserve 130 g)`)
- **THEN** ist die Nettomenge (ohne Reserve) ebenfalls erkennbar

#### Scenario: Reserve-Anteil ausgeblendet (Standard)

- **WHEN** der Nutzer die Reserve-Aufschlüsselung nicht aktiviert hat
- **THEN** wird nur die Gesamtmenge inklusive Reserve angezeigt (bisheriges Verhalten)

#### Scenario: Item-Schema enthält Netto und Reserve

- **WHEN** ein authentifizierter Nutzer die Einkaufsliste eines Plans abruft
- **THEN** SHALL jedes Item `net_quantity_g` und `reserve_quantity_g` enthalten
- **THEN** SHALL `net_quantity_g + reserve_quantity_g` der Gesamtmenge entsprechen

### Requirement: Reserve-Faktor pro Essensplan konfigurierbar

Das System SHALL das Feld `reserve_factor` auf `MealPlan` verwenden, mit dem der Reserve-Anteil pro Plan eingestellt wird (1.0 = keine Reserve, 1.1 = 10 % Reserve).

#### Scenario: Standard-Reserve

- **WHEN** ein neuer Essensplan angelegt wird
- **THEN** ist `reserve_factor = 1.1` (entspricht 10 % Reserve) der Standard

#### Scenario: Reserve anpassen

- **WHEN** der Nutzer `reserve_factor` auf 1.15 setzt
- **THEN** werden alle Einkaufslisten-Mengen dieses Plans mit Faktor 1.15 berechnet
- **THEN** wird der Reserve-Anteil entsprechend als `total − total/1.15` ausgewiesen

#### Scenario: Reserve = 0

- **WHEN** der Nutzer `reserve_factor = 1.0` setzt
- **THEN** wird keine Reserve aufgeschlagen (Nettomenge = Gesamtmenge)
- **THEN** SHALL `reserve_quantity_g = 0` sein
