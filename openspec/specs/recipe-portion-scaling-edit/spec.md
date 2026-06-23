## ADDED Requirements

### Requirement: Proportional scaling on display portion change

When the user changes the displayed portion count in the recipe detail view or InlineIngredientEditor, all ingredient quantities are scaled proportionally. The database always stores per-1-person quantities (servings=1). Scaling is for display purposes and does not change stored values unless explicitly saving in edit mode.

#### Scenario: User views recipe for 4 persons

- **WHEN** User selects "4 Portionen" in the portion scaler
- **THEN** All ingredient quantities are multiplied by 4 for display (e.g., 62.5g → 250g, 0.75 Stück → 3 Stück)

#### Scenario: User views recipe for 1 person (default)

- **WHEN** User views recipe with default portion scaler (1 Portion)
- **THEN** All ingredient quantities are shown as stored in DB (per-person values)

#### Scenario: Quantities are rounded for display

- **WHEN** Scaling produces fractional values
- **THEN** Quantities are rounded according to quantity-display-formatting rules (< 2 → 0.1, 2-10 → 1, etc.)

### Requirement: Visual feedback after scaling

#### Scenario: Quantities change after scaling

- **WHEN** Servings value is changed and quantities are recalculated
- **THEN** All quantity inputs are marked as dirty and a brief visual highlight indicates the change

### Requirement: Improved ingredient row layout

#### Scenario: Unit label display

- **WHEN** An ingredient row is displayed in edit mode
- **THEN** The unit label has sufficient width to display common units (Gramm, Stück, Teelöffel, Esslöffel) without truncation

### Requirement: Scale factor merged into PortionScaler (MODIFIED)
The standalone `ScaleIngredientsDialog` component SHALL be removed. Its scaling-by-factor functionality (0.5×, 2×) SHALL be integrated into the `PortionScaler` component as a quick-select option. The PortionScaler SHALL offer both absolute portion input and factor shortcuts.

#### Scenario: Factor quick-select in PortionScaler (ADDED)
- **WHEN** user opens the PortionScaler on desktop
- **THEN** he sees factor shortcuts "0.5×", "1.5×", "2×" next to the portion input
- **WHEN** user clicks "2×"
- **THEN** the absolute portion value doubles
- **THEN** all ingredient quantities update accordingly

#### Scenario: ScaleIngredientsDialog removed (REMOVED)
**Reason**: Merged into PortionScaler
**Migration**: All references to `ScaleIngredientsDialog` replaced by `PortionScaler` with factor quick-select. The `showScaleDialog` state and `ScaleIngredientsDialog` component removed from RecipeDetailPage.

### Requirement: Edit-Modus zeigt skalierte Mengen, Portionszahl gesperrt

Im Bearbeitungsmodus eines Rezepts SHALL die Portionszahl vor dem Öffnen des Edit-Modus wählbar sein. Sobald der Edit-Modus aktiv ist, ist die Portionszahl gesperrt. Die Eingabefelder zeigen die skalierten Werte (×N). Beim Speichern werden die Werte durch N dividiert und als 1-Personen-Werte gespeichert.

#### Scenario: Edit-Modus mit 4 Personen öffnen

- **WHEN** der Nutzer „4 Portionen" wählt und dann den Edit-Modus öffnet
- **THEN** zeigen alle Mengenfelder die ×4 Werte (z.B. 400g statt 100g)
- **THEN** ist der Portionszahl-Wähler deaktiviert (gesperrt während Edit aktiv)

#### Scenario: Portionszahl während Edit ändern nicht möglich

- **WHEN** der Nutzer versucht die Portionszahl zu ändern während der Edit-Modus aktiv ist
- **THEN** ist der Portionszahl-Wähler deaktiviert und zeigt einen Hinweis „Portionszahl während Bearbeitung gesperrt"

#### Scenario: Speichern teilt durch Portionszahl

- **WHEN** der Nutzer im Edit-Modus für 4 Personen eine Menge auf 480g ändert und speichert
- **THEN** wird 480 ÷ 4 = 120g in der Datenbank gespeichert
- **THEN** zeigt die Ansicht nach dem Speichern wieder die ×4 Darstellung (480g) da die Portionszahl noch auf 4 steht

#### Scenario: Direkt nach Speichern: skalierte Anzeige bleibt

- **WHEN** nach dem Speichern die gleiche Portionszahl (z.B. 4) noch aktiv ist
- **THEN** zeigt die Ansicht die gespeicherten Werte multipliziert mit der aktiven Portionszahl
