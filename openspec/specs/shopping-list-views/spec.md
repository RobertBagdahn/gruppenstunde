# shopping-list-views Specification

## Purpose
View modes, print layouts, fallbacks, and regression coverage for shopping lists.

## Requirements

### Requirement: Shopping List View Modes
The system SHALL support three view modes on GET /api/shopping-lists/{id}/items/ via query parameter ?view=detailed|summarized|by_recipe.

#### Scenario: Detailed view (default)
- **WHEN** a client requests items without a view parameter or with ?view=detailed
- **THEN** the system SHALL return items individually as currently implemented

#### Scenario: Summarized view
- **WHEN** a client requests items with ?view=summarized
- **THEN** the system SHALL group items by ingredient, sum quantities (applying unit conversion where needed), and return one entry per ingredient

#### Scenario: By-recipe view
- **WHEN** a client requests items with ?view=by_recipe
- **THEN** the system SHALL group items by their source recipe and return items nested under each recipe

### Requirement: Print View
Das Food-Frontend SHALL für Einkaufslisten eine druckoptimierte Ansicht bereitstellen. Sie wird über „Liste exportieren“ → „Drucken oder als PDF speichern“ geöffnet und nutzt den Druckdialog des Browsers, der auch „Als PDF speichern“ anbietet. Die Druckansicht MUST die Inhalte aus der Anforderung „Inhalt des Exports“ (`shopping-list-export`) zeigen:
- Listenname, Stand, Zähler;
- nur offene Einträge, gruppiert nach Abteilungen mit Überschriften;
- je Eintrag ein leeres Kästchen zum Abhaken auf Papier, Name, Menge mit Packungsbedarf und gegebenenfalls Zuständigkeit.

Navigation, Kopfband, Buttons, Hinweise, Fortschrittsbalken, Mitglieder-, Teilen-, REWE- und Küchenbedarfsbereiche MUST im Druck fehlen. Das Layout MUST auf A4 zweispaltig sein und schwarz auf weiß ohne Schatten oder Hintergrundflächen gedruckt werden. Eine Abteilung MUST nach Möglichkeit nicht über Spalten- oder Seitenumbrüche zerrissen werden. Am Ende MUST ein Abschnitt „Zusätzlich“ mit fünf leeren Zeilen für handschriftliche Ergänzungen stehen. Die Bildschirmansicht MUST durch das Drucken unverändert bleiben.

#### Scenario: Print button triggers print
- **WHEN** ein Nutzer „Liste exportieren“ → „Drucken oder als PDF speichern“ wählt
- **THEN** öffnet der Browser den Druckdialog mit der Druckansicht ohne Navigations- und Bedienelemente

#### Scenario: Print layout structure
- **WHEN** die Druckansicht gedruckt wird
- **THEN** stehen die offenen Einträge nach Abteilungen gruppiert mit Kästchen, Name und Menge in zwei Spalten auf A4
- **AND** am Ende steht „Zusätzlich“ mit fünf leeren Zeilen

#### Scenario: Abgehakte Einträge fehlen im Druck
- **GIVEN** „Milch“ ist abgehakt und „Brot“ offen
- **WHEN** der Nutzer druckt
- **THEN** enthält der Ausdruck „Brot“, aber nicht „Milch“

#### Scenario: Druckblatt nur beim Drucken
- **WHEN** der Nutzer druckt
- **THEN** enthält die Seite das Druckblatt nur während des Druckvorgangs
- **AND** nach dem Druckdialog zeigt die Seite wieder nur die Bildschirmansicht, ohne doppelten Text

#### Scenario: Papier ohne Hintergrund
- **WHEN** die Druckansicht gedruckt wird
- **THEN** erscheinen Seitenhintergrund, Schatten und Kopfband nicht auf dem Papier

#### Scenario: Gast druckt
- **GIVEN** ein Gast mit gültigem Gast-Token
- **WHEN** er „Drucken oder als PDF speichern“ wählt
- **THEN** öffnet sich derselbe Druckdialog mit derselben Druckansicht

### Requirement: Fallback-Anzeige bei fehlender Grammzahl

Zutaten ohne gültige `weight_g` auf der Portion (0 oder null) SHALL mit Menge und Portionsname dargestellt werden statt "0 g".

#### Scenario: Zutat mit weight_g=0
- **WHEN** ein RecipeItem eine Portion mit `weight_g=0` hat
- **THEN** wird die Zutat als `{quantity} x {portion.name}` angezeigt (z.B. "2 EL", "1 Prise")

#### Scenario: Zutat mit gültigem weight_g
- **WHEN** ein RecipeItem eine Portion mit `weight_g > 0` hat
- **THEN** wird die Zutat weiterhin in Gramm angezeigt (z.B. "200 g")

### Requirement: Immer lesbarer Zutatname

Es SHALL niemals "Unbekannt" in der Einkaufsliste oder Zutatenliste angezeigt werden.

#### Scenario: Ingredient nicht verlinkt
- **WHEN** ein RecipeItem weder `ingredient` noch `portion.ingredient` hat
- **THEN** wird als Fallback `portion.name`, dann `note`, dann "Zutat" angezeigt

### Requirement: Aufrundung bei natürlichen Portionen

Bruchzahlen bei natürlichen Portionen (Stück, Zehe, Scheibe etc.) SHALL auf 1 aufgerundet werden.

#### Scenario: Skalierung ergibt Bruchzahl bei natürlicher Portion
- **WHEN** die berechnete Menge einer natürlichen Portion < 1 ist (z.B. 0,3 x Knoblauchzehe)
- **THEN** wird auf 1 aufgerundet

### Requirement: Shopping list views include persistent CRUD and permission regression coverage
The Food E2E suite SHALL verify persistent ShoppingList creation, item addition/checking, owner updates, reload state, deletion, and role-based mutation visibility in addition to view-mode behavior.

#### Scenario: Owner manages a persistent shopping list
- **WHEN** an owner creates a list, adds an item, checks it, renames it, reloads it, and deletes it
- **THEN** the item progress, checked state, renamed title, and deletion result SHALL persist visibly

#### Scenario: Viewer remains read-only
- **WHEN** a viewer opens a shared list
- **THEN** the viewer SHALL see permitted list data but SHALL not see or execute owner/editor mutations

#### Scenario: Failed check mutation rolls back
- **WHEN** an item check request fails
- **THEN** the optimistic checked state SHALL be reverted and a German error message SHALL be visible

#### Scenario: Export provenance is preserved
- **WHEN** a Recipe or MealPlan is exported to a persistent ShoppingList
- **THEN** quantities, source type, and recipe/meal provenance SHALL be visible after reload

### Requirement: Titel im Kopfband bricht nicht mitten im Wort
Der Seitentitel im Kopfband der Einkaufslisten-Detailseite SHALL ganze Wörter zusammenhalten. Bei schmalen Bildschirmen MUST er die Aktionsbuttons in eine eigene Zeile schieben, statt sie neben dem Titel zu quetschen. Ein Wort MUST nur dann umbrechen, wenn es in keine Zeile passt.

#### Scenario: Titel auf 320 px
- **GIVEN** eine Einkaufsliste mit dem Namen „Lagereinkauf“ wird auf 320 px Breite angezeigt
- **THEN** steht „Lagereinkauf“ ungeteilt in einer Zeile
- **AND** die Aktionsbuttons stehen darunter
