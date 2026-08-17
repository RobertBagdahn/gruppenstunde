## ADDED Requirements

### Requirement: Kochbuch-Layout in der Druckansicht

Die Druckansicht `/meal-plans/:id/cooking-schedule/print` SHALL ein Kochbuch-Layout verwenden mit:
- A4-optimiert (max-width 21cm, Ränder 6-8mm)
- Seitenumbrüche: `page-break-before: always` vor jedem Rezept
- Serifen-Schriftart für Fließtext, serifenlos für Überschriften

#### Scenario: Seitenumbruch pro Rezept

- **WHEN** ein Tag drei Rezepte enthält
- **THEN** beginnt jedes Rezept auf einer neuen Seite
- **AND** der Tag-Kopf (Datum, Personen, Allergene) wird auf jeder Seite des Tages wiederholt

#### Scenario: DIN A4 optimiert

- **WHEN** die Druckansicht gerendert wird
- **THEN** beträgt die maximale Breite 21cm (A4) mit ausreichenden Rändern

### Requirement: Rezeptkarten-Struktur

Jede Rezeptkarte in der Druckansicht SHALL enthalten:
- Rezepttitel als H2
- Zutatenliste als Bullet-Liste mit skalierten Mengen, Einheiten, Namen und ggf. Notizen
- Strukturierte Zubereitungsschritte als nummerierte Liste
- Allergen-Badges als kompakte Tags
- Kostenzeile (wenn verfügbar)
- Nährwertzeile (wenn verfügbar)

Optional-Markierungen (`is_optional`) SHALL kursiv und mit "(optional)" gekennzeichnet sein.

#### Scenario: Vollständige Rezeptkarte

- **WHEN** ein Rezept alle Datenfelder hat
- **THEN** zeigt die Karte: Titel, Zutaten (skaliert), Schritte (nummeriert), Allergene, Kosten, Nährwerte
- **AND** alles ist auf einer Seite (kein Seitenumbruch mitten im Rezept)

### Requirement: Tages-Kopf

Jeder Tag in der Druckansicht SHALL einen Kopfbereich haben mit:
- Datum (format: "Montag, 14. Juli 2026")
- Personenanzahl
- Tägliche Gesamt-Kochzeit (z.B. "06:30 – 14:00 Uhr · 7h 30min")
- Allergen-Zusammenfassung des Tages (wenn vorhanden)
- Gesamtkosten des Tages (wenn vorhanden)

#### Scenario: Tages-Kopf mit Allergenen

- **WHEN** ein Tag Rezepte mit den Allergenen Nüsse und Laktose enthält
- **THEN** zeigt der Tages-Kopf einen Warnhinweis "⚠ Enthält: Nüsse · Laktose"

### Requirement: Deckblatt

Die Druckansicht SHALL ein Deckblatt enthalten mit:
- Titel "Kochplan"
- Essensplan-Name
- Datumsbereich
- Personenanzahl
- Gesamtkosten (mit Reserve)
- Allergen-Zusammenfassung des gesamten Plans

#### Scenario: Deckblatt vor dem ersten Tag

- **WHEN** die Druckansicht geladen wird
- **THEN** erscheint zuerst das Deckblatt, dann Seite 1 beginnt mit Tag 1
