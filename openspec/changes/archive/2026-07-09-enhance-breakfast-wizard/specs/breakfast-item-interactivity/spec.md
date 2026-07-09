## ADDED Requirements

### Requirement: Items are clickable and open detail pages
Zutaten, Rezepte und Extras im Frühstückassistenten sind clickable. Beim Klick öffnet sich eine neue Browser-Tab mit der Detail-Seite des Items (Vollseite mit Nährwerten, Beschreibung, Tags, etc.).

#### Scenario: User clicks on ingredient name
- **WHEN** user in Frühstückassistent Step 1 (Basis) auf "Vollkornbrot" klickt
- **THEN** öffnet sich eine neue Browser-Tab zu `/ingredients/vollkornbrot` (oder ähnliche URL)
- **AND** die Detail-Seite zeigt: Beschreibung, Nährwerte (pro 100g), Scores, Tags, Creator-Info

#### Scenario: User clicks on recipe name
- **WHEN** user in Step 5 (Getränke) auf "Smoothie-Rezept" klickt
- **THEN** öffnet sich eine neue Browser-Tab zu `/recipes/smoothie-rezept`
- **AND** die Detail-Seite zeigt: Rezept-Zutaten, Zubereitung, Nährwerte, Schwierigkeit, Dauer

#### Scenario: User clicks on extra
- **WHEN** user in Step 4 (Extras) auf "Marmelade" klickt
- **THEN** öffnet sich eine neue Browser-Tab zur Zutat "/ingredients/marmelade"

### Requirement: Detail pages are read-only in wizard context
Die Detail-Seiten, die aus dem Wizard geöffnet werden, sind read-only (keine Bearbeitung). Ein "Bearbeiten" Button kann vorhanden sein (öffnet Edit-Seite), aber im Default ist readonly.

#### Scenario: Detail page opened from wizard is read-only
- **WHEN** user öffnet Detail-Seite via Wizard-Click
- **THEN** Detail-Seite hat kein Formular, nur Anzeige
- **AND** "Bearbeiten" Button öffnet die Edit-Seite (neue Tab)

### Requirement: User can return to wizard after viewing details
Nach dem Anschauen der Detail-Seite kann der User zurück zum Wizard navigieren (Browser "Zurück"-Button oder expliziter Link).

#### Scenario: User navigates back to wizard
- **WHEN** user auf Detail-Seite aus Wizard kommt
- **THEN** Browser "Zurück"-Button kehrt zum Wizard zurück
- **AND** Wizard-State (aktuelle Auswahl) bleibt erhalten
