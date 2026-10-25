# food-category-colour-usage Specification

## Purpose
Regelt, wo im Food-Frontend Farbe erscheint: Kategorie-Tönungen nur für Rezepttypen, Filter-Chips mit Farbpunkt statt Farbfläche und Kennzahlen mit farbiger Beschriftung auf neutraler Fläche. So bleibt die Farbe ruhig und eindeutig.

## Requirements

### Requirement: Filter-Chip-Zeilen sind weiß mit feinem Rand
Die Chip-Zeilen zur Rezeptfilterung MUST auf weißem Grund mit feinem Rand erscheinen. Farbe trägt nur ein Punkt oder ein Icon je Rezepttyp. Der aktive Chip MUST über Rand und Schrift in der Hauptfarbe Petrol markiert werden und SHALL NOT als gefüllte Fläche erscheinen. Chips sind vollrund und mindestens 44 px hoch auf dem Handy.

#### Scenario: Inaktiver Chip
- **WHEN** die Rezeptübersicht Filter-Chips anzeigt
- **THEN** hat jeder inaktive Chip weiße Fläche, feinen Rand und einen Farbpunkt in der Kategorie-Farbe des Rezepttyps

#### Scenario: Aktiver Chip
- **WHEN** ein Rezepttyp-Filter gesetzt ist
- **THEN** erscheint der Chip mit Petrol-Rand und Petrol-Schrift auf weißer Fläche, ohne gefüllte Fläche

#### Scenario: Alle-Chip
- **WHEN** kein Typfilter gesetzt ist
- **THEN** ist der Chip „Alle“ aktiv im selben Stil ohne Farbpunkt

### Requirement: Kennzahlen auf neutraler Fläche mit farbiger Beschriftung
Kennzahlen auf der Rezeptdetailseite MUST als neutrale Kacheln (weiße Fläche, `shadow-card`, feine Linie) dargestellt werden. Die Beschriftung jeder Kennzahl MUST klein, in Großbuchstaben und in der Akzentfarbe Petrol stehen. Kategorie-Tönungen SHALL NOT als Kachelfläche verwendet werden.

#### Scenario: Kennzahl-Kacheln
- **WHEN** die Rezeptdetailseite die Kennzahlen Gesamtkosten, Pro Portion, Nutri-Score, Energie und Beliebtheit zeigt
- **THEN** hat jede Kachel weiße Fläche, und die Beschriftung ist in Großbuchstaben und Petrol gesetzt

### Requirement: Kategorie-Tönungen nur für Rezepttypen
Die Kategorie-Tönungen MUST ausschließlich Rezepttypen kennzeichnen (Bildfläche, Rezepttyp-Marke, Filterpunkt, Mahlzeit-Eintrag mit dem Rezepttyp seines Rezepts). Sie SHALL NOT als Flächen von Startseiten-Kacheln, Kennzahlen zu Zutaten, Hinweisbannern oder anderen Bereichen erscheinen. Bereichskacheln und Hinweise erhalten stattdessen eine Icon-Farbe in Petrol auf weißer Fläche.

#### Scenario: Startseiten-Kachel
- **WHEN** die Startseite die Bereichskacheln Rezepte, Essenspläne, Einkaufen und Zutaten zeigt
- **THEN** hat jede Kachel weiße Fläche mit Petrol-Icon, ohne Kategorie-Tönung

#### Scenario: Zutaten-Kennzahlen
- **WHEN** die Zutatendetailseite die Nährwertkennzahlen zeigt
- **THEN** sind die Kennzahlen neutral gestaltet und tragen keine Kategorie-Tönung

#### Scenario: Hinweisbanner in der Einkaufsliste
- **WHEN** die Einkaufsliste einen Hinweis zeigt
- **THEN** ist der Hinweis neutral mit Petrol-Icon, ohne Kategorie-Tönung
