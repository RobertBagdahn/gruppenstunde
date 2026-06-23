# Recipe AI Ingredient Suggestions — Spec

## Overview

KI-Button im InlineIngredientEditor, der passende Zutaten vorschlägt und nach Bestätigung hinzufügt.

## Requirements

### Functional

1. Im Bearbeitungsmodus erscheint ein Button mit Sparkles-Icon in der Toolbar
2. Klick auf den Button ruft `POST /api/recipes/{id}/ai-suggest-ingredients/` auf
3. Während der KI-Anfrage zeigt der Button einen Loading-Spinner
4. Bei Fehler wird ein Error-Toast angezeigt

### Confirmation Flow

1. Ergebnisse werden in einem modalen Dialog angezeigt (nicht direkt angewendet)
2. Dialog zeigt: Zutatname, Portion, Menge pro Vorschlag
3. Jeder Vorschlag hat eine Checkbox (standardmäßig aktiviert)
4. "Alle auswählen" Checkbox im Header
5. Button "Übernehmen (N)" wendet nur die ausgewählten Vorschläge an
6. Button "Verwerfen" schließt den Dialog ohne Änderungen
7. Nach Übernehmen: `POST /api/recipes/{id}/ai-apply-ingredients/` mit gewählten Items, dann Query-Invalidierung und Toast

## API (bestehend)

```
POST /api/recipes/{recipe_id}/ai-suggest-ingredients/
Response: [{ ingredient_id, ingredient_name, portion_id, portion_name, quantity, is_new_ingredient }]

POST /api/recipes/{recipe_id}/ai-apply-ingredients/
Body: [{ ingredient_id, portion_id, quantity }]
Response: [RecipeItemOut]
```

## UI

- Button-Label: Tooltip "KI-Vorschläge"
- Icon: `Sparkles` aus lucide-react
- Position: In der Toolbar neben "Mengen schätzen"

## Additional Requirements

### Requirement: Bereits enthaltene Zutaten aus AI-Vorschlägen ausschließen

Die AI-Zutaten-Vorschläge SHALL keine Zutaten vorschlagen die bereits im Rezept enthalten sind. Das Matching berücksichtigt Singular/Plural-Varianten über die Synonymtabelle.

#### Scenario: Vorhandene Zutat erscheint nicht im Vorschlag

- **WHEN** ein Rezept bereits „Zwiebel" als Zutat enthält
- **AND** die AI Zutaten-Vorschläge generiert
- **THEN** erscheint „Zwiebeln" NICHT in den Vorschlägen
- **THEN** erscheint „Zwiebel" NICHT in den Vorschlägen

#### Scenario: Singular/Plural-Matching über Synonymtabelle

- **WHEN** die Synonymtabelle „Zwiebeln" als Synonym von „Zwiebel" enthält
- **THEN** werden beide Formen beim Ausschluss als identisch behandelt

#### Scenario: Spezifische vs. generische Zutaten

- **WHEN** ein Rezept „Fusilli trocken" enthält
- **THEN** erscheint „Nudeln" in den Vorschlägen als neuer (anderer) Begriff
- **WHEN** ein Rezept „Nudeln" enthält (generisch)
- **THEN** erscheinen spezifische Formen wie „Fusilli trocken" weiterhin als Vorschlag
