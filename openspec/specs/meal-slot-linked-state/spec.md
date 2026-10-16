# meal-slot-linked-state Specification

## Purpose
Anforderungen an meal slot linked state: Verknüpfte Meals sind read-only; Visueller Hinweis auf Referenz-Herkunft; Link-Icon zeigt korrekten Zustand.

## Requirements
### Requirement: Verknüpfte Meals sind read-only
Wenn eine Mahlzeit mit einer Referenz-Mahlzeit verknüpft ist (`is_synced = true`), MUST NOT der User die Items bearbeiten können.

#### Scenario: Verknüpftes Meal zeigt keine Editier-Controls
- **WHEN** `meal.is_synced === true`
- **THEN** Add-Recipe-Button (+), Item-Delete-Buttons (×) und Factor-Inputs werden nicht gerendert

#### Scenario: Nicht verknüpftes Meal bleibt editierbar
- **WHEN** `meal.is_synced === false` und `canEdit === true`
- **THEN** Alle Editier-Controls werden normal angezeigt

### Requirement: Visueller Hinweis auf Referenz-Herkunft
Verknüpfte Meals SHALL klar anzeigen, dass ihre Inhalte aus einer Referenz-Mahlzeit stammen.

#### Scenario: Label "Referenz-Mahlzeit" wird angezeigt
- **WHEN** `meal.is_synced === true` und Items vorhanden
- **THEN** Über den Items erscheint ein Label "Referenz-Mahlzeit" in blauer Schrift (text-xs text-blue-500)

#### Scenario: Items werden gedämpft dargestellt
- **WHEN** `meal.is_synced === true`
- **THEN** Alle Meal-Items werden in `text-muted-foreground` dargestellt

### Requirement: Link-Icon zeigt korrekten Zustand
Das Link-Icon SHALL die mögliche Aktion kommunizieren (nicht den aktuellen Zustand).

#### Scenario: Verknüpft zeigt Entkoppeln-Icon
- **WHEN** `meal.is_synced === true`
- **THEN** Icon ist `link_off` in blauer Farbe mit Tooltip "Vom RefMeal entkoppeln"

#### Scenario: Nicht verknüpft zeigt Verknüpfen-Icon
- **WHEN** `meal.is_synced === false`
- **THEN** Icon ist `link` in grauer Farbe mit Tooltip "Mit RefMeal verknüpfen"

### Requirement: Emoji-Indikator wird entfernt
Das redundante 🔗-Emoji neben dem Mahlzeit-Titel MUST NOT mehr angezeigt werden.

#### Scenario: Kein Emoji im Header
- **WHEN** `meal.is_synced === true`
- **THEN** Kein 🔗 Emoji wird angezeigt (Label + Icon reichen als Indikator)
