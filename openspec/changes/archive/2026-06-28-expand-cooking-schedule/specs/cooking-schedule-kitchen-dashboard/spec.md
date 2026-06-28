## ADDED Requirements

### Requirement: Küchen-Dashboard als eigenständige Seite

Das System SHALL eine neue Route `/meal-plans/:id/cooking-schedule/kitchen` bereitstellen, die eine für den Bildschirm optimierte, interaktive Kochplan-Ansicht anzeigt.

Die Seite SHALL eine vertikale Timeline-Darstellung verwenden: Rezepte werden chronologisch mit Zeit-Markern (`06:30`, `07:00`, etc.) entlang einer vertikalen Linie angeordnet.

#### Scenario: Dashboard öffnen

- **WHEN** ein Nutzer `/meal-plans/:id/cooking-schedule/kitchen` aufruft
- **THEN** wird das Küchen-Dashboard mit vertikaler Timeline angezeigt
- **AND** die Seite verwendet das FoodLayout mit Navigation

#### Scenario: Dashboard bei leerem Kochplan

- **WHEN** ein Essensplan keine Rezepte im Kochplan hat
- **THEN** zeigt das Dashboard einen leeren Zustand mit Hinweis

### Requirement: Vertikale Timeline-Darstellung

Das Küchen-Dashboard SHALL die Rezepte vertikal anordnen:
- Linke Seite: vertikale Linie mit Zeit-Markern
- Rechte Seite: Rezept-Karten mit Titel, Mahlzeit-Typ, Dauer
- Jede Mahlzeit (Frühstück, Mittag, etc.) SHALL als visuelle Gruppe erkennbar sein (Hintergrundfarbe oder Abstand)

#### Scenario: Timeline-Struktur

- **WHEN** ein Tag Rezepte um 06:30, 07:00 und 10:30 hat
- **THEN** zeigt die Timeline drei Einträge in chronologischer Reihenfolge
- **AND** die ersten beiden sind unter "🌅 FRÜHSTÜCK" gruppiert, der dritte unter "☀️ MITTAGESSEN"

### Requirement: Aufklappbare Rezept-Details

Jede Rezept-Karte im Dashboard SHALL aufklappbar sein und dann Zutaten (mit skalierten Mengen und Notizen) sowie strukturierte Zubereitungsschritte anzeigen.

#### Scenario: Rezept aufklappen

- **WHEN** ein Nutzer auf eine Rezept-Karte klickt
- **THEN** klappt die Karte auf und zeigt Zutaten + Schritte
- **AND** ein erneuter Klick klappt sie wieder zu

### Requirement: Personenanzahl und Allergene im Header

Das Dashboard SHALL einen Fix-Header haben mit:
- Personenanzahl (aus MealPlan.norm_portions)
- Essensplan-Name
- Tages-Datum
- Allergen-Badges des Tages (wenn vorhanden)

#### Scenario: Fix-Header

- **WHEN** ein Nutzer im Dashboard scrollt
- **THEN** bleibt der Header mit Personenanzahl und Allergen-Warnungen sichtbar

### Requirement: Mobile-Optimierung

Das Dashboard SHALL auf Mobilgeräten (320px+): die Timeline vertikal bleiben, Rezept-Karten kompakt darstellen, aufklappbare Details als Vollbreiten-Accordion.

#### Scenario: Mobile Ansicht

- **WHEN** das Dashboard auf einem 375px breiten Bildschirm angezeigt wird
- **THEN** sind alle Inhalte lesbar, die Timeline passt sich an, kein horizontales Scrollen nötig
