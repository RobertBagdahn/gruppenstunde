# reliable-pdf-exports Specification

## Purpose
Define runtime reliability and resource bounds for server-generated PDF exports.

## Requirements

### Requirement: Bounded PDF rendering resources
The backend SHALL render PDFs without allowing concurrent rendering to exhaust a Cloud Run instance. The production container SHALL have at least 1 GiB of memory and SHALL admit at most one concurrent request per instance while PDF rendering is synchronous.

#### Scenario: PDF export under production limits
- **WHEN** an authenticated user requests any backend PDF export
- **THEN** the request SHALL be processed within the configured Cloud Run memory limit
- **THEN** no second request SHALL execute concurrently on the same instance
- **THEN** Cloud Run SHALL remain able to scale additional instances for parallel requests

### Requirement: WeasyPrint runtime validation
The backend image SHALL install WeasyPrint's native runtime libraries and SHALL validate PDF generation during image build.

#### Scenario: Missing or incompatible native library
- **WHEN** the backend image is built without a required WeasyPrint dependency
- **THEN** the image build SHALL fail at the PDF smoke test rather than deploying a broken renderer

### Requirement: Shared PDF rendering behavior
All WeasyPrint PDF exports SHALL use a shared rendering helper that sets a filesystem base URL, enables image/font optimization, and logs rendering exceptions with export context. A rendering failure SHALL return the existing German HTTP 500 message `PDF-Generierung fehlgeschlagen`.

#### Scenario: Local PDF asset resolution
- **WHEN** HTML references a local asset relative to the backend root
- **THEN** WeasyPrint SHALL resolve that asset using the configured base URL

#### Scenario: Rendering failure
- **WHEN** WeasyPrint raises an exception during rendering
- **THEN** the backend SHALL log the exception with its export type
- **THEN** the API SHALL return HTTP 500 with `PDF-Generierung fehlgeschlagen`

### Requirement: Bounded recipe PDF image assets
Recipe PDF exports SHALL resize embedded recipe photos to no more than 1600 by 1200 pixels and encode them using JPEG quality 82 before embedding, without mutating the stored source image.

#### Scenario: Large recipe photo
- **WHEN** the recipe photo exceeds the configured print resolution
- **THEN** the PDF SHALL embed a resized and compressed derivative
- **THEN** the stored recipe image SHALL remain unchanged

#### Scenario: Missing or unreadable photo
- **WHEN** the recipe image cannot be opened or converted
- **THEN** the recipe PDF SHALL still render without the photo

### Requirement: Avoid unnecessary meal-plan export work
Meal-plan PDF generation SHALL skip shopping-list, nutrition, and allergen-matrix calculations when those sections are excluded. Before invoking WeasyPrint, it SHALL release raw ORM result graphs that are no longer needed by the template.

#### Scenario: Optional sections excluded
- **WHEN** shopping list, nutrition, or allergen matrix output is disabled
- **THEN** the corresponding section data SHALL NOT be computed

#### Scenario: Meal-plan page tree preparation
- **WHEN** meal data has been transformed into template context
- **THEN** raw prefetched meal objects SHALL NOT be retained while WeasyPrint renders the PDF

### Requirement: Consistent paper size
Every configurable food PDF export SHALL apply the requested supported page format, defaulting to A4.

#### Scenario: Meal-plan Letter export
- **WHEN** the meal-plan PDF is requested with `page_format=letter`
- **THEN** its generated pages SHALL use US Letter dimensions

#### Scenario: Default meal-plan export
- **WHEN** no page format is supplied
- **THEN** the meal-plan PDF SHALL use A4 dimensions
