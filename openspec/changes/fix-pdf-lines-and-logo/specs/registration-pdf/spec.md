## MODIFIED Requirements

### Requirement: PDF generation with reportlab
The system SHALL generate a PDF file using reportlab Platypus with the following block structure in order: Header (title + logo), Greeting, Details (key-value list), Additional Info, Packlist, Signup Note, Form Fields, Consent Text, Signature Line.

#### Scenario: Logo placement
- **WHEN** `group.logo` path points to a valid PNG file
- **THEN** the logo is rendered top-right in the header area, scaled proportionally to a default height of 35mm

#### Scenario: Logo size configurable
- **WHEN** `LayoutParams.logo_height` is set to a custom value (e.g., 40.0)
- **THEN** the logo SHALL be rendered at that height in mm, scaled proportionally

#### Scenario: Form field rendering - text_line
- **WHEN** a form field has `type: text_line` and `label: "Name"`
- **THEN** the PDF renders `"Name: _______________"` with a horizontal underline that MUST NOT exceed the available page width. The underline width SHALL be calculated using `pdfmetrics.stringWidth` for the configured font.

#### Scenario: Form field rendering - text_line label offset
- **WHEN** a form field has `type: text_line` and a label of varying length
- **THEN** the underline SHALL fill only the remaining space after the label text, not the full page width

#### Scenario: Form field rendering - same_line_with
- **WHEN** a form field has `same_line_with: "Geburtsdatum"`
- **THEN** both fields render side-by-side on the same line, each with underlines that fit within their column width

#### Scenario: Form field rendering - checkboxes
- **WHEN** a form field has `type: checkboxes` with `options: ["vegetarisch", "Vegan"]` and `has_other: true`
- **THEN** the PDF renders `"[ ] vegetarisch; [ ] Vegan; [ ] sonstiges: ___________"` followed by an underline that MUST NOT exceed the available page width

#### Scenario: Form field rendering - text_area
- **WHEN** a form field has `type: text_area` with `lines: 2`
- **THEN** the PDF renders the label followed by 2 horizontal underlines, each MUST NOT exceed the available page width

#### Scenario: Signature line
- **WHEN** the signature block is rendered
- **THEN** the underline above "Datum, Unterschrift..." MUST NOT exceed the available page width
