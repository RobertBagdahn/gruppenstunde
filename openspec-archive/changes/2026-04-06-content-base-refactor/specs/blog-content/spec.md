## ADDED Requirements

### Requirement: Blog Content Type
The system SHALL provide a `Blog` model inheriting from `Content` for knowledge articles (Wissensbeiträge). Additional fields: blog_type (TextChoices), reading_time_minutes (IntegerField, auto-calculated), show_table_of_contents (BooleanField, default True).

#### Scenario: Creating a Blog
- **WHEN** a user creates a new Blog via the stepper
- **THEN** the Blog SHALL be stored with all Content base fields plus blog-specific fields
- **THEN** reading_time_minutes SHALL be auto-calculated from word count (average 200 words/minute)

#### Scenario: Viewing Blog detail
- **WHEN** a user navigates to `/blogs/:slug`
- **THEN** the page SHALL display the full article with Markdown rendering
- **THEN** if show_table_of_contents is True, a table of contents SHALL be generated from Markdown headings
- **THEN** a "Lesezeit" badge SHALL show estimated reading time (e.g., "5 Min. Lesezeit")
- **THEN** related content sections SHALL show "Passende Ideen", "Passende Spiele", "Passende Rezepte"

### Requirement: Blog Subtypes
Blog SHALL support the following subtypes as TextChoices: tutorial (Tutorial), guide (Ratgeber), experience (Erfahrungsbericht), background (Hintergrundwissen), methodology (Methodik), legal (Recht & Versicherung).

#### Scenario: Filtering by blog type
- **WHEN** a user filters search results by blog_type='tutorial'
- **THEN** only Blogs with that blog type SHALL be returned

#### Scenario: Blog type badge display
- **WHEN** a Blog card is displayed in search results
- **THEN** the blog type SHALL be shown as a colored badge

### Requirement: Blog Table of Contents
The frontend SHALL generate an automatic table of contents from the Markdown description's heading structure (## and ### headings). The TOC SHALL be displayed as a sticky sidebar on desktop and collapsible section on mobile.

#### Scenario: Auto-generated TOC
- **WHEN** a Blog has show_table_of_contents=True and the description contains Markdown headings
- **THEN** a table of contents SHALL be generated from ## and ### headings
- **THEN** each TOC entry SHALL be a clickable anchor link that scrolls to the heading

#### Scenario: TOC disabled
- **WHEN** a Blog has show_table_of_contents=False
- **THEN** no table of contents SHALL be displayed

### Requirement: Blog does not have Material or Ingredients
Blog content type SHALL NOT support Material or Ingredient assignments. The material/ingredient sections SHALL be hidden in the Blog stepper and detail view.

#### Scenario: Blog stepper without material step
- **WHEN** creating a Blog via the stepper
- **THEN** no "Material" or "Zutaten" step SHALL be shown

### Requirement: Blog API
The system SHALL provide CRUD API endpoints for Blog under `/api/blogs/`.

#### Scenario: List blogs
- **WHEN** GET `/api/blogs/?page=1&page_size=20`
- **THEN** the system SHALL return paginated, approved Blogs
- **THEN** results SHALL be filterable by blog_type, tags, scout_level

#### Scenario: Get blog by slug
- **WHEN** GET `/api/blogs/by-slug/{slug}/`
- **THEN** the system SHALL return the full Blog detail including TOC data, comments, emotions, related content
