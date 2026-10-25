# food-canvas-layout Specification

## Purpose
TBD - created by archiving change food-canvas-layout. Update Purpose after archive.

## Requirements

### Requirement: Rezepttyp-Chips folgen der Chip-Regel
Die Rezepttyp-Chips auf der Rezeptübersicht MUST der Chip-Regel aus `food-category-colour-usage` folgen: weiße Fläche, feiner Rand, ein Farbpunkt in der Tönung des jeweiligen Rezepttyps. Der aktive Chip MUST über Rand und Schrift in der Hauptfarbe Petrol markiert sein und SHALL NOT als gefüllte Fläche erscheinen. Auf dem Handy MUST jeder Chip mindestens 44 px hoch sein.

#### Scenario: Inaktiver Typ-Chip
- **WHEN** die Rezeptübersicht die Typ-Chips anzeigt und kein Typ gewählt ist
- **THEN** hat jeder Chip eine weiße Fläche, einen feinen Rand und einen Farbpunkt in der Tönung seines Rezepttyps

#### Scenario: Aktiver Typ-Chip
- **WHEN** ein Rezepttyp über einen Chip gewählt ist
- **THEN** trägt der Chip einen Petrol-Rand und Petrol-Schrift, ohne gefüllte Fläche, und `aria-pressed` ist `true`

#### Scenario: Auswahl ändert nur die URL
- **WHEN** ein Typ-Chip angeklickt wird
- **THEN** wird der Filter `recipe_type` in der URL gesetzt oder entfernt, und die Chip-Klasse ändert sich ohne weitere Logik

### Requirement: Keine neuen Design-Token für das Canvas-Layout
Das Canvas-Layout SHALL nur vorhandene Token aus `frontend-food/src/index.css` verwenden. Hex-Werte aus den Entwürfen MUST NOT in den Code übernommen werden. Jede Entwurfsfarbe MUST auf das nächste vorhandene Token abgebildet sein, wie in `design.md` dokumentiert.

#### Scenario: Entwurfsfarbe ohne Token
- **WHEN** ein Entwurf eine Farbe zeigt, die kein vorhandenes Token trifft
- **THEN** wird die Farbe nicht übernommen, und der Fall steht in `design.md` unter Konflikten

### Requirement: Neutrale Schatten
Karten und Flächen des Canvas-Layouts MUST nur die neutralen Schatten `shadow-card`, `shadow-soft` oder `shadow-raised` verwenden. Farbige Schatten aus den Entwürfen SHALL NOT übernommen werden.

#### Scenario: Entwurf mit farbigem Schatten
- **WHEN** ein Entwurf eine Karte mit farbigem Schatten zeigt
- **THEN** verwendet die App `shadow-card` und dokumentiert den Konflikt in `design.md`

### Requirement: Kategorie-Tönungen nur für Rezepttypen
Das Canvas-Layout MUST Kategorie-Tönungen ausschließlich für Rezepttypen verwenden. Kacheln, Kennzahlen, Abteilungen, Plan-Typen und Hinweise außerhalb der Rezepttypen SHALL NOT farbig getönt werden.

#### Scenario: Bereichskachel auf der Startseite
- **WHEN** die Startseite die Bereichskacheln zeigt
- **THEN** hat jede Kachel eine weiße Fläche mit Petrol-Icon ohne Tönung

### Requirement: Nicht umgesetzte Entwurfselemente sind dokumentiert
Jedes Element eines Entwurfs, das in der App keine Datenquelle hat oder eine neue Funktion wäre, MUST in `design.md` unter „Nicht umgesetzt“ stehen. Es SHALL NOT ohne eigene Spezifikation gebaut werden.

#### Scenario: Tagesübersicht auf der Startseite
- **WHEN** der Entwurf Tageszeilen für den nächsten Plan zeigt
- **THEN** wird das Element nicht gebaut und steht in `design.md` unter „Nicht umgesetzt“
