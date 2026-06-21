# recipe-portion-scaling-edit Specification

## MODIFIED Requirements

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
