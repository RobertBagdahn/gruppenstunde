## MODIFIED Requirements

### Requirement: Detailsuche-Dialog öffnen

Der Detail-Suchdialog SHALL als generische Komponente implementiert sein, die an verschiedenen Stellen im `InlineIngredientEditor` geöffnet werden kann — sowohl für "Neue Zutat hinzufügen" als auch für "Alternative hinzufügen".

#### Scenario: Dialog öffnen für neue Zutat

- **WHEN** ein Nutzer im Edit-Modus des Rezepts auf den [⚙]-Button neben "Zutat hinzufügen..." klickt
- **THEN** SHALL der generische Ingredient-Suchdialog als Vollbild-Dialog (max-w-3xl) geöffnet werden
- **THEN** SHALL nach Auswahl einer Zutat der `IngredientQuantityDialog` erscheinen

#### Scenario: Dialog öffnen für Alternative

- **WHEN** ein Nutzer im Edit-Modus auf "Alternative hinzufügen" (swap_horiz) an einem RecipeItem klickt
- **THEN** SHALL derselbe generische Ingredient-Suchdialog geöffnet werden
- **THEN** SHALL nach Auswahl einer Zutat direkt die Exchange-Gruppen-Logik ausgeführt werden (ohne `IngredientQuantityDialog`)

#### Scenario: Dialog schließen

- **WHEN** der Nutzer den Dialog abbricht (✕-Button oder Escape-Taste)
- **THEN** SHALL kein Ingredient hinzugefügt oder verändert werden und der Dialog SHALL geschlossen sein

## ADDED Requirements

### Requirement: Konfigurierbarer onSelect-Callback

Der generische Suchdialog SHALL über einen konfigurierbaren `onSelect`-Callback gesteuert werden, der bestimmt, was nach Auswahl einer Zutat passiert.

#### Scenario: Callback für neue Zutat (mit QuantityDialog)

- **WHEN** der Dialog mit `onSelect` für "neue Zutat hinzufügen" geöffnet wird
- **THEN** SHALL nach Klick auf eine Zutat der `IngredientQuantityDialog` erscheinen
- **THEN** SHALL nach Bestätigung der Menge der `onSelect`-Callback mit `{ ingredientId, portionId, quantity }` aufgerufen werden

#### Scenario: Callback für Alternative (ohne QuantityDialog)

- **WHEN** der Dialog mit `onSelect` für "Alternative hinzufügen" geöffnet wird
- **THEN** SHALL nach Klick auf eine Zutat direkt der `onSelect`-Callback mit `{ ingredientId, name, slug }` aufgerufen werden (ohne QuantityDialog)
- **THEN** SHALL der aufrufende Code die Exchange-Gruppen-Logik ausführen

### Requirement: showQuantityDialog-Prop

Der Dialog SHALL eine optionale Bool-Prop `showQuantityDialog` (default: `true`) erhalten, die steuert, ob nach Auswahl einer Zutat der `IngredientQuantityDialog` erscheint.

#### Scenario: showQuantityDialog=true (Default)

- **WHEN** `showQuantityDialog` nicht gesetzt oder `true` ist
- **THEN** SHALL nach Auswahl einer Zutat der `IngredientQuantityDialog` geöffnet werden (bisheriges Verhalten)

#### Scenario: showQuantityDialog=false

- **WHEN** `showQuantityDialog` explizit auf `false` gesetzt ist
- **THEN** SHALL nach Auswahl einer Zutat direkt der `onSelect`-Callback aufgerufen werden
- **THEN** SHALL der Dialog nach dem Callback geschlossen werden
