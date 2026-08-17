## ADDED Requirements

### Requirement: Wizard stepper icon visibility
The event creation wizard stepper SHALL display clearly visible step icons at all viewport sizes.

#### Scenario: Icons visible on mobile (320px)
- **WHEN** the user views the wizard stepper on a 320px viewport
- **THEN** each step SHALL display either a step number (inactive) or a Material Symbol icon (active/completed) in a circle of at least 40x40px
- **THEN** step labels SHALL be hidden on viewports below `sm` (640px)

#### Scenario: Icons visible on desktop
- **WHEN** the user views the wizard stepper on a desktop viewport (>= 640px)
- **THEN** each step SHALL display a Material Symbol icon in a circle of at least 48x48px
- **THEN** step labels SHALL be visible below each icon

#### Scenario: Active step highlight
- **WHEN** a step is the current active step
- **THEN** the step circle SHALL have a visible ring highlight (`ring-2 ring-primary`) in addition to the gradient background
- **THEN** the active step SHALL be visually distinguishable from completed and inactive steps

#### Scenario: Completed step appearance
- **WHEN** a step is completed (valid and before the current step)
- **THEN** the step circle SHALL display a check icon
- **THEN** the circle SHALL use the primary gradient background

#### Scenario: Step touch target
- **WHEN** the user taps a step circle on mobile
- **THEN** the touch target SHALL be at least 40x40px to meet accessibility guidelines
