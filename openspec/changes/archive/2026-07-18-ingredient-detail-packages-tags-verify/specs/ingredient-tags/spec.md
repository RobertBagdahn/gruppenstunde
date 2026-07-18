## ADDED Requirements

### Requirement: IngredientDetailOut SHALL include tags
Das `IngredientDetailOut`-Schema SHALL ein `tags: list[TagOut]`-Feld enthalten mit allen content.Tags der Zutat.

#### Scenario: Tags returned in API response
- **WHEN** `GET /api/ingredients/{slug}/` aufgerufen wird
- **THEN** enthält die Antwort ein `tags`-Array mit `id`, `name`, `slug`, `icon`, `group`, `sort_order`

#### Scenario: Tags prefetched to avoid N+1 queries
- **WHEN** die Zutatendetail-API aufgerufen wird
- **THEN** werden Tags via `prefetch_related("tags")` geladen

### Requirement: Tag display on ingredient detail page
Die Zutatendetailseite SHALL die Tags der Zutat als Badges/Chips anzeigen.

#### Scenario: Tag badges are displayed
- **WHEN** ein Nutzer die Zutatendetailseite öffnet
- **THEN** werden alle Tags der Zutat als klickbare Badges mit Tag-Icon und Name angezeigt

#### Scenario: No tags state
- **WHEN** eine Zutat keine Tags hat
- **THEN** wird "Keine Tags" als Platzhaltertext angezeigt

### Requirement: Add and remove tags on ingredient detail page
Berechtigte Nutzer SHALL Tags zu einer Zutat hinzufügen und entfernen können.

#### Scenario: Add tag via autocomplete
- **WHEN** ein berechtigter Nutzer im Tag-Picker einen Tag-Namen eingibt und auswählt
- **THEN** wird der Tag zur Zutat hinzugefügt und als Badge angezeigt

#### Scenario: Remove tag via badge click
- **WHEN** ein berechtigter Nutzer auf das X-Icon eines Tag-Badges klickt
- **THEN** wird der Tag von der Zutat entfernt

#### Scenario: Unauthorized user cannot modify tags
- **WHEN** ein nicht-berechtigter Nutzer die Seite öffnet
- **THEN** werden Tags nur angezeigt, ohne Add/Remove-Controls
