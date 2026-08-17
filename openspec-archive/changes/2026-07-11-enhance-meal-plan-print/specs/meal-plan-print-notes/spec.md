## ADDED Requirements

### Requirement: Hybrid notes area integration

The print view SHALL provide two types of notes areas: inline notes boxes beside meals and line areas at the end of each day.

#### Scenario: Inline meal notes box
- **WHEN** rendering a meal
- **THEN** a small notes box (3–4cm wide) appears beside the meal content
- **AND** the box is visually labeled or has border to indicate notes space

#### Scenario: Day-end notes lines
- **WHEN** finishing meals for a day section
- **THEN** 2–3 horizontal lines appear below the last meal
- **AND** lines are evenly spaced and clearly printable

#### Scenario: Multiple meals with notes areas
- **WHEN** a day has multiple meals
- **THEN** each meal displays its own notes box beside it

### Requirement: Notes area visual design

Notes areas SHALL have clear visual definition so users understand they are for writing notes.

#### Scenario: Notes box styling
- **WHEN** rendering inline notes box
- **THEN** the box has:
  - Light grey background or border (subtle, not distracting)
  - Text label "Notizen" or similar
  - Sufficient space for handwriting (at least 2–3cm vertical)

#### Scenario: Notes lines styling
- **WHEN** rendering day-end notes lines
- **THEN** lines are:
  - Light grey or black (0.5pt width)
  - Evenly spaced (0.5rem apart)
  - Clearly visible when printed

### Requirement: Notes area placement

Notes boxes SHALL be positioned beside meals; notes lines SHALL appear at day end.

#### Scenario: Layout with notes box
- **WHEN** rendering meal with notes area
- **THEN** layout is:
  - Meal content on left (main area)
  - Notes box on right (narrow column, 3–4cm)
  - Both aligned at top

#### Scenario: Day-end notes placement
- **WHEN** finishing a day's meals
- **THEN** notes lines appear in main content area, below last meal
- **AND** lines span full content width

### Requirement: Notes areas do not break content flow

Notes areas SHALL be supplementary and not affect meal or day layout significantly.

#### Scenario: Content priority
- **WHEN** rendering meals with notes areas
- **THEN** if space is constrained:
  - Meal content remains fully visible
  - Notes box may be reduced or notes lines shortened
  - No meal content is hidden or cut off due to notes areas
