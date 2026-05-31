## ADDED Requirements

### Requirement: Küchenbedarf-Erinnerungen anzeigen
Alle veröffentlichten Küchenbedarf-Artikel werden am Ende jeder Einkaufsliste gruppiert nach Kategorie angezeigt. Zusätzlich sieht ein eingeloggter User seine eigenen unveröffentlichten Vorschläge.

#### Scenario: Einkaufsliste öffnen
- **WHEN** ein User eine Einkaufsliste im Detail öffnet
- **THEN** erscheint unterhalb der Zutaten eine Sektion "Küchenbedarf – Erinnerung" mit allen veröffentlichten Artikeln, gruppiert nach Kategorie und sortiert nach `sort_order`

#### Scenario: Eigene Vorschläge sichtbar
- **WHEN** ein eingeloggter User einen unveröffentlichten Vorschlag hat
- **THEN** erscheint dieser Vorschlag zusätzlich in der Liste (markiert als "Dein Vorschlag")

### Requirement: Vorschlag einreichen
Jeder eingeloggte User kann eigene Küchenbedarf-Artikel vorschlagen.

#### Scenario: Vorschlag erstellen
- **WHEN** ein User einen Artikelnamen eingibt und absendet
- **THEN** wird ein `KitchenReminder` mit `is_published=False` und `suggested_by=User` erstellt
- **THEN** erscheint der Artikel sofort in der eigenen Liste des Users

#### Scenario: Vorschlag ohne Kategorie
- **WHEN** ein User einen Vorschlag einreicht
- **THEN** wird keine Kategorie zugewiesen (null) — der Admin ordnet sie später zu

### Requirement: Admin-Verwaltung
Kategorien und Artikel sind über das Django Admin Interface verwaltbar.

#### Scenario: Vorschlag veröffentlichen
- **WHEN** ein Admin einen Vorschlag sichtet und `is_published=True` setzt
- **THEN** wird der Artikel für alle User sichtbar

#### Scenario: Kategorien verwalten
- **WHEN** ein Admin eine neue Kategorie anlegt oder die Sortierung ändert
- **THEN** wird die Gruppierung in der Frontend-Anzeige entsprechend aktualisiert

### Requirement: Initiale Daten
Das System wird mit 20 vordefinierten Artikeln in 5 Kategorien ausgeliefert.

#### Scenario: Nach Migration
- **WHEN** die Data-Migration ausgeführt wurde
- **THEN** existieren 5 Kategorien (Reinigung, Hygiene, Kochen, Aufbewahrung, Entsorgung) und 20 veröffentlichte Artikel
