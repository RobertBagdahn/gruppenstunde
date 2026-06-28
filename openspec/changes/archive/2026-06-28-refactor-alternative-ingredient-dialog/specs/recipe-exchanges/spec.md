## ADDED Requirements

### Requirement: Alternative-Zutat-Suche nutzt generischen Suchdialog

Die "Alternative hinzufügen"-Funktion im `InlineIngredientEditor` SHALL den generischen Ingredient-Suchdialog (aus `ingredient-detail-search`) verwenden — mit denselben Filter-, Such- und Sortiermöglichkeiten wie beim normalen Zutat-Hinzufügen. Das bisherige separate Inline-Modal SHALL entfernt werden.

#### Scenario: Dialog öffnet sich mit denselben Filtern

- **WHEN** der Nutzer im Edit-Modus auf "Alternative hinzufügen" (swap_horiz-Button) an einem RecipeItem klickt
- **THEN** SHALL der generische Suchdialog geöffnet werden
- **THEN** SHALL die gleichen Filter-Pills (Abteilung, Diät-Tags, Sortierung) wie beim normalen Zutat-Hinzufügen verfügbar sein
- **THEN** SHALL die gleiche paginierte Ergebnisliste mit Nutri-Score, Nährwerten und Preis/kg angezeigt werden

#### Scenario: Suche ohne Ergebnisse

- **WHEN** die Suche im Alternative-Dialog keine Treffer liefert
- **THEN** SHALL der Text "Keine Zutaten gefunden" angezeigt werden

#### Scenario: API-Endpoint ist korrekt

- **WHEN** der Nutzer im Alternative-Dialog sucht
- **THEN** SHALL `GET /api/ingredients/?name=<query>&retail_section=<id>&nutritional_tag=<id>&ordering=<sort>&page=<n>&page_size=<n>` aufgerufen werden (nicht `/api/supplies/`)

### Requirement: Alternative ohne Mengenauswahl hinzufügen

Nach Auswahl einer Zutat im Alternative-Dialog SHALL direkt die Exchange-Gruppen-Logik ausgeführt werden, ohne den `IngredientQuantityDialog` zwischenzuschalten. Die Menge wird automatisch auf `quantity=1` und die beste Portion (höchste Priorität mit weight_g > 0) gesetzt.

#### Scenario: Alternative direkt hinzufügen

- **WHEN** der Nutzer im Alternative-Dialog auf eine Zutat klickt
- **THEN** SHALL der Dialog geschlossen werden
- **THEN** SHALL die Portionen der gewählten Zutat geladen werden (`GET /api/ingredients/<slug>/portions/`)
- **THEN** SHALL die beste Portion automatisch gewählt werden (höchste `priority` mit `weight_g > 0`, fallback erste Portion)
- **THEN** SHALL die Zutat als Alternative mit `quantity=1` zur Exchange-Gruppe hinzugefügt werden

#### Scenario: Keine Portion gefunden

- **WHEN** die gewählte Zutat keine Portionen hat
- **THEN** SHALL ein Toast "Keine Portion für diese Zutat gefunden" erscheinen
- **THEN** SHALL keine Alternative hinzugefügt werden
- **THEN** SHALL der Suchdialog geöffnet bleiben

## MODIFIED Requirements

### Requirement: Rezeptautor kann Exchange-Gruppen anlegen

Der Autor eines Rezepts SHALL Exchange-Gruppen anlegen können, die austauschbare Zutaten zusammenfassen. Der "Alternative hinzufügen"-Dialog SHALL den generischen Ingredient-Suchdialog verwenden (wie in `ingredient-detail-search` spezifiziert) statt eines separaten Inline-Modals.

#### Scenario: Exchange-Gruppe mit zwei Gliedern anlegen

- **WHEN** der Autor auf "Alternative hinzufügen" an einer Zutat klickt
- **THEN** SHALL der generische Suchdialog geöffnet werden
- **WHEN** der Autor im Suchdialog eine Zutat auswählt
- **THEN** SHALL eine `RecipeItemExchangeGroup` angelegt werden
- **THEN** SHALL beide `RecipeItem`-Einträge `exchange_group=<gruppe>` und `exchange_position` 0 bzw. 1 erhalten
