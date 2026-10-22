# Spec Delta

## MODIFIED Requirements

### Requirement: iOS Safari Zoom Prevention

The viewport meta tag of the main frontend (`frontend/`) SHALL include `maximum-scale=1` to prevent iOS Safari from auto-zooming on page load. The Food frontend (`frontend-food/`) SHALL NOT restrict zooming: its viewport meta tag MUST NOT contain `maximum-scale` below 5 or `user-scalable=no`. Instead, every text input, select and textarea in the Food frontend MUST have a font size of at least 16 px on viewports narrower than 768 px, which prevents iOS Safari from auto-zooming on focus.

#### Scenario: Viewport meta includes maximum-scale

- **WHEN** any page in the main frontend loads on iOS Safari
- **THEN** the viewport meta tag SHALL contain `maximum-scale=1`

#### Scenario: Pinch-to-zoom still available via system accessibility

- **WHEN** a user of the main frontend enables Zoom via iOS Settings → Accessibility → Zoom
- **THEN** the system-level zoom SHALL still function despite `maximum-scale=1`

#### Scenario: Food frontend allows zooming

- **WHEN** any page in the Food frontend loads
- **THEN** the viewport meta tag SHALL NOT contain `user-scalable=no` or a `maximum-scale` below 5
- **THEN** pinch-to-zoom SHALL work on that page

#### Scenario: Food frontend inputs do not trigger iOS auto-zoom

- **WHEN** a user taps a text input, select or textarea in the Food frontend on a viewport narrower than 768 px
- **THEN** the control's computed font size SHALL be at least 16 px
- **THEN** iOS Safari SHALL NOT zoom the page

#### Scenario: Accessibility audit passes the viewport rule

- **WHEN** the automated accessibility check (axe) runs against a Food frontend page
- **THEN** the `meta-viewport` rule SHALL pass without an exception
