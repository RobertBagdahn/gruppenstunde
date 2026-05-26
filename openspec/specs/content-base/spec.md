## ADDED Requirements

### Requirement: Abstract Content Base Class
The system SHALL provide an abstract Django model `Content` that serves as the base class for all content types (GroupSession, Blog, Game, Recipe). The abstract model SHALL include the following shared fields: title (CharField, max 255), slug (SlugField, unique per table), summary (TextField), description (TextField, Markdown), difficulty (TextChoices), costs_rating (TextChoices), execution_time (TextChoices), preparation_time (TextChoices), status (TextChoices: draft/submitted/approved/rejected/archived), image (ImageField), embedding (VectorField 768-dim, nullable), view_count (IntegerField), like_score (IntegerField), created_at (DateTimeField), updated_at (DateTimeField), deleted_at (DateTimeField, nullable), authors (M2M to User), tags (M2M to Tag), scout_levels (M2M to ScoutLevel).

All concrete Content types SHALL support image management operations (upload, delete, set-from-URL) through their respective API routers. The permission check for image management SHALL follow the same pattern: the user MUST be authenticated AND be either staff or an author of the content.

#### Scenario: New content type inherits all base fields
- **WHEN** a developer creates a new concrete model inheriting from `Content`
- **THEN** the model SHALL automatically have all shared fields without additional code

#### Scenario: Each content type has its own database table
- **WHEN** migrations are generated for a Content subclass
- **THEN** a separate table SHALL be created with all Content fields plus type-specific fields

#### Scenario: Image management permission check
- **WHEN** a user attempts to upload, delete, or set an image on any content type
- **THEN** the system SHALL verify the user is authenticated AND is either staff or an author of the content item
- **THEN** if the check fails, the system SHALL return HTTP 403 with "Keine Berechtigung."

### Requirement: Soft Delete for all Content
The system SHALL implement soft delete via a `deleted_at` DateTimeField (nullable) on the abstract `Content` model. A custom manager `objects` SHALL filter out soft-deleted records automatically. A secondary manager `all_objects` SHALL return all records including soft-deleted ones.

#### Scenario: Soft deleting content
- **WHEN** a user or admin soft-deletes a content item
- **THEN** the `deleted_at` field SHALL be set to the current UTC timestamp
- **THEN** the item SHALL no longer appear in default queries via `objects` manager
- **THEN** the item SHALL still be accessible via `all_objects` manager

#### Scenario: Restoring soft-deleted content
- **WHEN** an admin restores a soft-deleted content item
- **THEN** the `deleted_at` field SHALL be set to null
- **THEN** the item SHALL appear in default queries again

### Requirement: Content Type Registry
The system SHALL maintain a registry of all concrete Content types that enables dynamic discovery of content types for search, linking, and admin purposes.

#### Scenario: Discovering all content types
- **WHEN** the search service needs to query all content types
- **THEN** the registry SHALL return all registered concrete Content model classes

#### Scenario: Resolving content type from string
- **WHEN** a content type identifier string (e.g., 'session', 'recipe') is provided
- **THEN** the registry SHALL return the corresponding model class

### Requirement: Author tracking
The system SHALL track one or more authors per content item via a M2M relationship to User. The primary author (first author) SHALL be the creator. Admins SHALL be able to add or change authors.

#### Scenario: Content creation stores author
- **WHEN** an authenticated user creates a content item
- **THEN** the user SHALL be automatically added as the first author

#### Scenario: Admin changes author
- **WHEN** an admin updates the authors of a content item
- **THEN** the authors M2M relationship SHALL be updated accordingly

### Requirement: Slug auto-generation
The system SHALL auto-generate a URL-safe slug from the title using `django.utils.text.slugify`. If a slug collision occurs, a numeric suffix SHALL be appended.

#### Scenario: Slug generated from title
- **WHEN** a content item is created with title "Nachtwanderung im Wald"
- **THEN** the slug SHALL be "nachtwanderung-im-wald"

#### Scenario: Slug collision resolution
- **WHEN** a content item is created with a title that produces an already-existing slug
- **THEN** the system SHALL append a numeric suffix (e.g., "nachtwanderung-im-wald-2")

### Requirement: Pydantic Base Schema
The system SHALL provide base Pydantic schemas (`ContentBaseOut`, `ContentCreateIn`, `ContentUpdateIn`) that all content-type-specific schemas extend. The base output schema SHALL include all shared fields plus computed fields (author_names, tag_names, content_type). The detail output schema SHALL include both `can_edit: bool` and `can_delete: bool` computed permission fields. The list output schema SHALL also include `can_edit: bool` and `can_delete: bool` per item.

#### Scenario: Content type API response (detail)
- **WHEN** any content item is returned via a detail API endpoint
- **THEN** the response SHALL include all `ContentDetailOut` fields plus type-specific fields
- **THEN** the response SHALL include a `content_type` discriminator field (e.g., "session", "recipe", "blog", "game")
- **THEN** the response SHALL include `can_edit: bool` and `can_delete: bool`

#### Scenario: Content type API response (list)
- **WHEN** content items are returned via a list API endpoint
- **THEN** each item SHALL include all `ContentListOut` fields plus type-specific fields
- **THEN** each item SHALL include `can_edit: bool` and `can_delete: bool`

### Requirement: Zod Base Schema
The system SHALL provide a base Zod schema (`ContentBaseSchema`) in the frontend that all content-type-specific Zod schemas extend. The base schema SHALL match the Pydantic `ContentBaseOut` schema 1:1. The detail schema SHALL include `can_edit` and `can_delete` boolean fields. The list item schema SHALL also include `can_edit` and `can_delete` boolean fields.

#### Scenario: Frontend type safety (detail)
- **WHEN** a content detail API response is parsed
- **THEN** the Zod schema SHALL validate all base fields including `can_edit` and `can_delete`
- **THEN** TypeScript types SHALL be inferred from the Zod schema

#### Scenario: Frontend type safety (list)
- **WHEN** a content list API response is parsed
- **THEN** each item SHALL be validated against the Zod schema including `can_edit` and `can_delete`
- **THEN** TypeScript types SHALL be inferred from the Zod schema

### Requirement: Content-Grid-Layout

Das Content-Grid-Layout MUSS 5 Kacheln pro Zeile auf Desktop-Bildschirmen anzeigen.

#### Scenario: Desktop-Ansicht (xl, >= 1280px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 1280px Breite gerendert wird
- **THEN** MUSS das Grid 5 Spalten verwenden (`xl:grid-cols-5`)

#### Scenario: Large-Ansicht (lg, >= 1024px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 1024px und < 1280px gerendert wird
- **THEN** MUSS das Grid 4 Spalten verwenden (`lg:grid-cols-4`)

#### Scenario: Medium-Ansicht (md, >= 768px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 768px und < 1024px gerendert wird
- **THEN** MUSS das Grid 3 Spalten verwenden (`md:grid-cols-3`)

#### Scenario: Small-Ansicht (sm, >= 640px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 640px und < 768px gerendert wird
- **THEN** MUSS das Grid 2 Spalten verwenden (`sm:grid-cols-2`)

#### Scenario: Mobile-Ansicht (< 640px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm < 640px gerendert wird
- **THEN** MUSS das Grid 1 Spalte verwenden

### Requirement: Content-Card Tag-Anzeige

Alle Content-Cards MÜSSEN mehr Tags anzeigen als aktuell.

#### Scenario: Tags auf der Card
- **WHEN** eine Content-Card gerendert wird
- **THEN** MÜSSEN bis zu 3 Tags als kompakte Chips sichtbar sein
- **THEN** MUSS bei mehr als 3 Tags ein "+N"-Indikator angezeigt werden

### Requirement: Content-Card Summary

Content-Cards MÜSSEN eine kurze Zusammenfassung anzeigen wenn verfügbar.

#### Scenario: Summary auf der Card
- **WHEN** eine Content-Card gerendert wird und der Content ein `summary`-Feld hat
- **THEN** MUSS die Zusammenfassung als einzeiliger, abgeschnittener Text unter dem Titel angezeigt werden (max 2 Zeilen, `line-clamp-2`)

### Requirement: Autor-Position auf Detailseiten

Der Autor-Bereich MUSS auf allen Content-Detailseiten am unteren Ende positioniert sein.

#### Scenario: Autor unten auf Detailseite
- **WHEN** eine Content-Detailseite gerendert wird
- **THEN** MUSS der Autor-Bereich (Name, Avatar, Profil-Link) nach der Beschreibung und vor den Kommentaren positioniert sein
- **THEN** DARF der Autor NICHT in der oberen Info-Box erscheinen


---

# Content Linking

## ADDED Requirements

### Requirement: Generic ContentLink Model
The system SHALL provide a `ContentLink` model that enables linking between any two content items across all content types. The model SHALL use Django's ContentType framework for polymorphic source and target references. Fields: source_content_type (FK to ContentType), source_object_id (PositiveIntegerField), target_content_type (FK to ContentType), target_object_id (PositiveIntegerField), link_type (TextChoices: manual/embedding/ai_suggested), relevance_score (FloatField, nullable), is_rejected (BooleanField), created_by (FK to User, nullable), created_at (DateTimeField).

#### Scenario: Manual content linking
- **WHEN** an author or admin links a GroupSession to a Recipe
- **THEN** a ContentLink SHALL be created with link_type='manual' and the current user as created_by

#### Scenario: Embedding-based linking
- **WHEN** the embedding service finds similar content across types
- **THEN** ContentLinks SHALL be created with link_type='embedding' and the cosine similarity as relevance_score

#### Scenario: Rejecting a link suggestion
- **WHEN** an admin marks a ContentLink as not relevant
- **THEN** the is_rejected field SHALL be set to True
- **THEN** the rejected link SHALL not appear in content recommendations

### Requirement: Content Link Display Sections
The system SHALL display related content in dedicated sections on each content detail page. Sections SHALL be grouped by target content type (e.g., "Passende Spiele", "Passende Rezepte", "Passende Wissensbeiträge"). Each section SHALL show a maximum of 6 related items as cards.

#### Scenario: Viewing related content on a GroupSession page
- **WHEN** a user views a GroupSession detail page
- **THEN** the page SHALL display sections for related Games, Recipes, and Blogs
- **THEN** each section SHALL show only non-rejected ContentLinks sorted by relevance_score descending

#### Scenario: No related content found
- **WHEN** no ContentLinks exist for a content item
- **THEN** the related content sections SHALL be hidden (not shown as empty)

### Requirement: Content Link CRUD API
The system SHALL provide API endpoints for managing ContentLinks: listing links for a content item, creating manual links, and rejecting links (admin only).

#### Scenario: Listing links for content
- **WHEN** GET `/api/content-links/?source_type=session&source_id=1`
- **THEN** the system SHALL return all non-rejected ContentLinks for that source, grouped by target type

#### Scenario: Creating a manual link
- **WHEN** POST `/api/content-links/` with source and target identifiers
- **THEN** a ContentLink SHALL be created with link_type='manual'
- **THEN** duplicate links (same source+target) SHALL be prevented

#### Scenario: Rejecting a link (admin)
- **WHEN** PATCH `/api/content-links/{id}/reject/` by an admin
- **THEN** the ContentLink's is_rejected SHALL be set to True

### Requirement: EmbeddingFeedback Model
The system SHALL provide an `EmbeddingFeedback` model for tracking quality issues with embedding-based recommendations. Fields: content_link (FK to ContentLink), feedback_type (TextChoices: not_relevant/wrong_category/offensive), notes (TextField), created_by (FK to User), created_at (DateTimeField).

#### Scenario: Admin submits embedding feedback
- **WHEN** an admin marks an embedding-based recommendation as "not relevant"
- **THEN** an EmbeddingFeedback record SHALL be created
- **THEN** the associated ContentLink SHALL be marked as is_rejected=True

#### Scenario: Viewing feedback in admin
- **WHEN** an admin views the EmbeddingFeedback admin page
- **THEN** all feedback entries SHALL be listed with the source and target content titles


---

# Content Embeddings

## ADDED Requirements

### Requirement: Embedding Generation Pipeline
The system SHALL generate 768-dimensional text embeddings for all content items using Gemini text-embedding-001. Embeddings SHALL be generated from a concatenation of title, summary, description, and tag names. Embeddings SHALL be stored as pgvector VectorField(768) in each content table.

#### Scenario: Embedding generated on content creation
- **WHEN** a new content item is created with status 'approved' or 'submitted'
- **THEN** an embedding SHALL be generated and stored in the embedding field
- **THEN** the embedding_updated_at field SHALL be set to the current UTC timestamp

#### Scenario: Embedding updated on content modification
- **WHEN** a content item's title, summary, description, or tags are modified
- **THEN** the embedding SHALL be regenerated
- **THEN** old ContentLinks with link_type='embedding' SHALL be refreshed

#### Scenario: Embedding not generated for drafts
- **WHEN** a content item is in 'draft' status
- **THEN** no embedding SHALL be generated (to save API costs)

### Requirement: Cross-Type Similarity Search
The system SHALL find similar content items across all content types using cosine similarity on embeddings. The system SHALL query all content tables and merge results by similarity score.

#### Scenario: Finding similar content
- **WHEN** GET `/api/content/{type}/{id}/similar/` is called
- **THEN** the system SHALL return the top 12 most similar content items across all content types
- **THEN** results SHALL be sorted by cosine similarity descending
- **THEN** results SHALL exclude soft-deleted and non-approved content

### Requirement: Embedding Admin UI
The system SHALL provide an admin interface for viewing and managing embeddings. The admin SHALL display: embedding vector visualization (first 20 dimensions as bar chart), embedding_updated_at timestamp, similarity to a reference item, bulk regeneration action.

#### Scenario: Viewing embeddings in admin
- **WHEN** an admin navigates to the embedding admin page
- **THEN** the page SHALL list all content items with their embedding status (has_embedding, embedding_updated_at)
- **THEN** the admin SHALL be able to filter by content type and embedding status

#### Scenario: Filtering by embedding similarity
- **WHEN** an admin selects a reference content item and clicks "Find Similar"
- **THEN** the admin SHALL see a sorted list of content items ranked by cosine similarity
- **THEN** each item SHALL show its similarity score (0.0 - 1.0)

#### Scenario: Bulk regenerate embeddings
- **WHEN** an admin selects multiple content items and clicks "Embeddings neu generieren"
- **THEN** embeddings SHALL be regenerated for all selected items
- **THEN** a progress indicator SHALL show the regeneration status

### Requirement: Embedding Quality Feedback
The system SHALL allow admins to mark embedding-based recommendations as "not relevant" and store this feedback for quality improvement. The admin SHALL be able to view all feedback entries and filter by content type.

#### Scenario: Marking a recommendation as not relevant
- **WHEN** an admin views a content detail page and sees an irrelevant embedding recommendation
- **THEN** the admin SHALL be able to click a "Nicht passend" button on the recommendation
- **THEN** the system SHALL create an EmbeddingFeedback record and reject the ContentLink

#### Scenario: Viewing embedding feedback in admin
- **WHEN** an admin navigates to the embedding feedback admin page
- **THEN** all feedback entries SHALL be listed with source, target, feedback type, and creation date
- **THEN** the admin SHALL be able to filter by feedback type and date range


---

# Content Approval

## ADDED Requirements

### Requirement: Content Approval Status Flow
The system SHALL implement a status-based approval workflow for all content types. Status transitions: draft → submitted → approved/rejected. Rejected content MAY be resubmitted after editing. Only content with status 'approved' SHALL appear in the global search and public listings.

#### Scenario: Submitting content for approval
- **WHEN** an author clicks "Zur Freigabe einreichen" on their draft content
- **THEN** the status SHALL change from 'draft' to 'submitted'
- **THEN** an ApprovalLog entry SHALL be created with action='submitted'

#### Scenario: Required fields for submission
- **WHEN** an author attempts to submit content for approval
- **THEN** the system SHALL validate that required fields are filled: title, summary, description, at least one tag, at least one scout_level, difficulty
- **THEN** if validation fails, the system SHALL show which fields are missing

#### Scenario: Admin approving content
- **WHEN** an admin approves a submitted content item
- **THEN** the status SHALL change to 'approved'
- **THEN** an ApprovalLog entry SHALL be created with action='approved' and the admin as reviewer
- **THEN** the content SHALL become visible in search and public listings

#### Scenario: Admin rejecting content
- **WHEN** an admin rejects a submitted content item with a reason
- **THEN** the status SHALL change to 'rejected'
- **THEN** an ApprovalLog entry SHALL be created with action='rejected', the admin as reviewer, and the reason text
- **THEN** the content SHALL NOT appear in search

### Requirement: Approval E-Mail Notifications
The system SHALL send email notifications at key points in the approval workflow.

#### Scenario: E-Mail to admins on submission
- **WHEN** content status changes to 'submitted'
- **THEN** an email SHALL be sent to all staff users
- **THEN** the email SHALL contain: content title, content type, author name, link to the admin review page

#### Scenario: E-Mail to author on approval
- **WHEN** content status changes to 'approved'
- **THEN** an email SHALL be sent to the content author
- **THEN** the email SHALL contain: content title, congratulations message, link to the published content

#### Scenario: E-Mail to author on rejection
- **WHEN** content status changes to 'rejected'
- **THEN** an email SHALL be sent to the content author
- **THEN** the email SHALL contain: content title, rejection reason, encouragement to revise and resubmit

### Requirement: Admin Approval Queue
The admin interface SHALL provide an approval queue showing all content with status 'submitted'. The queue SHALL be sortable by submission date and content type.

#### Scenario: Viewing the approval queue
- **WHEN** an admin navigates to the approval queue
- **THEN** the page SHALL list all submitted content items
- **THEN** each item SHALL show: title, content type (with icon), author, submission date, preview link

#### Scenario: Reviewing content from queue
- **WHEN** an admin clicks on a submitted content item
- **THEN** a detail view SHALL open showing the full content
- **THEN** the admin SHALL see "Genehmigen" and "Ablehnen" buttons
- **THEN** the "Ablehnen" button SHALL require entering a reason text

### Requirement: ApprovalLog Model
The system SHALL maintain an ApprovalLog for audit trail purposes. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), action (TextChoices: submitted/approved/rejected), reviewer (FK to User, nullable), reason (TextField, blank), created_at (DateTimeField).

#### Scenario: Viewing approval history
- **WHEN** an admin views the approval log for a content item
- **THEN** all status transitions SHALL be listed chronologically
- **THEN** each entry SHALL show action, reviewer name, reason (if rejection), and timestamp


---

# Content Permissions

## ADDED Requirements

### Requirement: can_delete permission field in API responses
The system SHALL return a `can_delete` boolean field alongside `can_edit` in all content API responses (both detail and list endpoints). The `can_delete` field SHALL be `true` when the authenticated user is staff (`is_staff=True`), and `false` otherwise.

#### Scenario: Staff user views content detail
- **WHEN** a staff user (`is_staff=True`) requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: true` and `can_delete: true`

#### Scenario: Author views own content detail
- **WHEN** an author of the content requests the content detail endpoint
- **THEN** the response SHALL include `can_edit: true` and `can_delete: false`

#### Scenario: Anonymous user views content detail
- **WHEN** an unauthenticated user requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: false` and `can_delete: false`

#### Scenario: Regular authenticated user views content detail
- **WHEN** an authenticated non-staff, non-author user requests a content detail endpoint
- **THEN** the response SHALL include `can_edit: false` and `can_delete: false`

### Requirement: Permission fields in list responses
The system SHALL include `can_edit` and `can_delete` boolean fields on each item in paginated content list responses for all content types (Session, Blog, Game, Recipe).

#### Scenario: Staff user views content list
- **WHEN** a staff user requests a content list endpoint
- **THEN** every item in the `items` array SHALL include `can_edit: true` and `can_delete: true`

#### Scenario: Author views content list containing own items
- **WHEN** an author requests a content list endpoint
- **THEN** items authored by the user SHALL include `can_edit: true` and `can_delete: false`
- **THEN** items not authored by the user SHALL include `can_edit: false` and `can_delete: false`

#### Scenario: Anonymous user views content list
- **WHEN** an unauthenticated user requests a content list endpoint
- **THEN** every item SHALL include `can_edit: false` and `can_delete: false`

### Requirement: Consistent delete permission across content types
The system SHALL enforce staff-only (`is_staff=True`) delete permission for all content types (Session, Blog, Game, Recipe). Non-staff users, including content authors, SHALL NOT be able to delete content via the API.

#### Scenario: Staff deletes any content
- **WHEN** a staff user sends a DELETE request for any content type
- **THEN** the system SHALL soft-delete the content (set `deleted_at`)
- **THEN** the system SHALL return HTTP 204

#### Scenario: Author attempts to delete own content
- **WHEN** a non-staff author sends a DELETE request for their own content
- **THEN** the system SHALL return HTTP 403

#### Scenario: Anonymous user attempts to delete content
- **WHEN** an unauthenticated user sends a DELETE request for any content
- **THEN** the system SHALL return HTTP 403

### Requirement: Delete button on content detail pages
The frontend SHALL display a delete button on all content detail pages (Session, Blog, Game, Recipe) when `can_delete` is `true` in the API response.

#### Scenario: Staff user sees delete button
- **WHEN** a staff user views a content detail page
- **THEN** a delete button (trash icon) SHALL be visible in the page header area
- **THEN** clicking the delete button SHALL open a confirmation dialog

#### Scenario: Confirmation dialog before delete
- **WHEN** a user clicks the delete button on a content detail page
- **THEN** a `ConfirmDialog` SHALL appear with a warning message in German
- **THEN** confirming SHALL call the DELETE API endpoint
- **THEN** on success, the user SHALL be redirected to the content list page with a success toast
- **THEN** on error, an error toast SHALL be shown

#### Scenario: Non-staff user does not see delete button
- **WHEN** a non-staff user views a content detail page
- **THEN** no delete button SHALL be displayed

### Requirement: Edit and delete icons on content cards
The frontend SHALL display edit (pencil) and delete (trash) icon buttons on `ContentCard` and `RecipeCard` components when the user has the respective permissions.

#### Scenario: Staff user sees action icons on content cards
- **WHEN** a staff user views a content list page
- **THEN** each content card SHALL display edit and delete icon buttons
- **THEN** on desktop, the icons SHALL appear on hover
- **THEN** on mobile, the icons SHALL always be visible

#### Scenario: Edit icon navigates to edit page
- **WHEN** a user clicks the edit icon on a content card
- **THEN** the user SHALL be navigated to the content detail page (where inline editing is available)

#### Scenario: Delete icon triggers confirmation
- **WHEN** a user clicks the delete icon on a content card
- **THEN** a `ConfirmDialog` SHALL appear
- **THEN** confirming SHALL call the DELETE API endpoint
- **THEN** on success, the card SHALL be removed from the list (query invalidation)
- **THEN** on success, a success toast SHALL be shown

#### Scenario: Non-authorized user does not see action icons
- **WHEN** a user without edit/delete permissions views a content list page
- **THEN** no action icons SHALL be displayed on the content cards


---

# Content Stepper

## ADDED Requirements

### Requirement: Multi-Step Content Creation Stepper
The system SHALL provide a multi-step stepper component for creating all content types. The stepper SHALL guide users through content creation step by step with a progress indicator. Only the title field SHALL be required at creation time.

#### Scenario: Starting content creation
- **WHEN** a user navigates to `/create`
- **THEN** the system SHALL show a Create Hub with content type selection (GroupSession, Recipe, Game, Blog)
- **THEN** each type SHALL be displayed as a card with icon, name, and description

#### Scenario: Step 1 — Basic info and mode selection
- **WHEN** a user selects a content type and begins creation
- **THEN** Step 1 SHALL show: title input (required), subtype selection (type-specific), and mode toggle (KI-Erstellung / Manuell)

#### Scenario: KI-Erstellung mode
- **WHEN** a user selects "KI-Erstellung" mode
- **THEN** Step 2 SHALL show a large textarea for unstructured text input
- **THEN** a "Analysieren" button SHALL send the text to the AI service
- **THEN** the AI SHALL parse the text into structured fields and pre-fill subsequent steps
- **THEN** the user SHALL be able to review and edit each pre-filled field

#### Scenario: Manual creation mode
- **WHEN** a user selects "Manuell" mode
- **THEN** the stepper SHALL proceed directly to the description step
- **THEN** all fields SHALL be empty (except title)

#### Scenario: Step — Description and metadata
- **WHEN** the user is on the description step
- **THEN** the step SHALL show: summary (textarea), description (MarkdownEditor), difficulty, costs_rating, execution_time, preparation_time
- **THEN** each field SHALL have an optional "KI-Vorschlag" button that generates content based on the title and existing fields

#### Scenario: Step — Tags and scout levels
- **WHEN** the user is on the tags step
- **THEN** the step SHALL show: tag selection from existing tags (hierarchical tree), scout level checkboxes
- **THEN** a "Tags vorschlagen" button SHALL use AI to suggest relevant tags
- **THEN** the AI MAY suggest new tags that don't exist yet; these SHALL be created as unapproved TagSuggestions

### Requirement: Content-Type-Specific Stepper Steps
Each content type SHALL have additional type-specific steps in the creation stepper.

#### Scenario: GroupSession — Material step
- **WHEN** creating a GroupSession
- **THEN** there SHALL be a "Material" step after description
- **THEN** the step SHALL show a Supply search field (searching Materials)
- **THEN** if no matching Material is found, the user SHALL be prompted to create a new Material entry
- **THEN** quantities SHALL be per person (pro Person)

#### Scenario: Recipe — Ingredients step
- **WHEN** creating a Recipe
- **THEN** there SHALL be a "Zutaten" step after description
- **THEN** the step SHALL show a Supply search field (searching Ingredients)
- **THEN** quantities SHALL be per NormPerson
- **THEN** there SHALL be a separate "Küchengeräte" step for Material (knife, cutting board, oven, etc.)

#### Scenario: Game — Game-specific step
- **WHEN** creating a Game
- **THEN** there SHALL be a "Spieldetails" step with: min/max player count, play area (indoor/outdoor/both), estimated duration, game rules (Markdown)

#### Scenario: Blog — Blog-specific step
- **WHEN** creating a Blog
- **THEN** there SHALL be a reading time auto-calculation based on word count
- **THEN** there SHALL be a toggle for auto-generated table of contents

### Requirement: AI-Assisted Field Completion
The system SHALL provide AI-assisted completion for individual fields during content creation. Each field in the stepper SHALL have an optional "KI-Vorschlag" button.

#### Scenario: AI suggests description
- **WHEN** a user clicks "KI-Vorschlag" on the description field
- **THEN** the system SHALL send the title and existing fields to the AI service
- **THEN** the AI SHALL return a suggested description in Markdown format
- **THEN** the user SHALL be able to accept, edit, or reject the suggestion

#### Scenario: AI suggests materials/ingredients
- **WHEN** a user clicks "KI-Vorschlag" on the material/ingredients step
- **THEN** the AI SHALL suggest relevant materials or ingredients with quantities
- **THEN** suggestions SHALL reference existing Supply entries where possible
- **THEN** new Supply entries SHALL be suggested for items not in the database

### Requirement: AI Image Generation
The system SHALL provide AI-generated title images for all content types. Image generation SHALL use Gemini's image generation capability. Generated images SHALL be saved as WebP format.

#### Scenario: Generating a title image
- **WHEN** a user clicks "Bild generieren" on the image step
- **THEN** the system SHALL generate a title image based on the title and description
- **THEN** the generated image SHALL be previewed before saving
- **THEN** the user SHALL be able to regenerate or upload a custom image instead

### Requirement: Inline Editing in Detail View
Content editing SHALL NOT use the stepper. Instead, each section in the detail view SHALL have an edit button (pencil icon) visible to authors and admins. Clicking the edit button SHALL open a dialog or inline editor for that section.

#### Scenario: Editing a section inline
- **WHEN** an author clicks the pencil icon on a section
- **THEN** a dialog SHALL open with the editable fields for that section
- **THEN** the dialog SHALL include a "KI-Vorschlag" button
- **THEN** saving SHALL PATCH the content via API and invalidate the TanStack Query cache

#### Scenario: Edit visibility
- **WHEN** a user who is not the author or an admin views a content detail page
- **THEN** no edit pencil icons SHALL be visible

#### Scenario: KI suggestion in inline editor
- **WHEN** an author clicks "KI-Vorschlag" in an inline editor dialog
- **THEN** the AI SHALL generate an improved version of the current field value
- **THEN** the user SHALL see a diff or side-by-side comparison before applying


---

# Comments & Emotions

## MODIFIED Requirements

### Requirement: Generic ContentComment Model
The system SHALL provide a single `ContentComment` model that works with all content types via Django ContentType framework. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), parent (FK to self, nullable for nesting), text (TextField), author_name (CharField for anonymous), user (FK to User, nullable), status (TextChoices: pending/approved/rejected), created_at, updated_at.

#### Scenario: Adding a comment to any content type
- **WHEN** POST `/api/content/{type}/{id}/comments/` with comment text
- **THEN** a ContentComment SHALL be created linked to the specified content item
- **THEN** anonymous comments SHALL have status='pending' (moderation required)
- **THEN** authenticated user comments SHALL have status='approved'

#### Scenario: Listing comments for content
- **WHEN** GET `/api/content/{type}/{id}/comments/`
- **THEN** only approved comments SHALL be returned
- **THEN** comments SHALL be nested by parent_id

### Requirement: Generic ContentEmotion Model
The system SHALL provide a single `ContentEmotion` model for reactions across all content types. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), emotion_type (TextChoices: in_love/happy/disappointed/complex), user (FK to User, nullable), session_key (CharField for anonymous), created_at.

#### Scenario: Adding an emotion to any content type
- **WHEN** POST `/api/content/{type}/{id}/emotions/` with emotion_type
- **THEN** a ContentEmotion SHALL be created or toggled (remove if same emotion exists)
- **THEN** the content's like_score SHALL be recalculated

#### Scenario: Emotion counts on content
- **WHEN** content is retrieved via API
- **THEN** emotion counts SHALL be included (in_love_count, happy_count, disappointed_count, complex_count)

### Requirement: Generic ContentView Model
The system SHALL provide a single `ContentView` model for bot-free view tracking. Fields: content_type (FK to ContentType), object_id (PositiveIntegerField), session_key (CharField), ip_hash (CharField, SHA256), user_agent (CharField), user (FK to User, nullable), created_at.

#### Scenario: Recording a view
- **WHEN** a user views a content detail page
- **THEN** the system SHALL check the User-Agent against known bot patterns (bot, crawl, spider, slurp, headless, selenium, puppeteer, playwright, curl, wget, python-requests, httpx, aiohttp, scrapy)
- **THEN** if the User-Agent matches a bot pattern or is empty, the view SHALL NOT be recorded
- **THEN** if the user is not a bot and no ContentView exists for the same session_key within 24 hours, a ContentView record SHALL be created
- **THEN** the content object's `view_count` field SHALL be atomically incremented using a database-level `F()` expression

#### Scenario: Recording a view for Recipe content
- **WHEN** a user views a Recipe detail page via `GET /api/recipes/{id}/` or `GET /api/recipes/by-slug/{slug}/`
- **THEN** the system SHALL record the view using the same `record_view` mechanism as GroupSession, Blog, and Game

#### Scenario: Duplicate view within 24 hours
- **WHEN** a ContentView already exists for the same content object and session_key within the last 24 hours
- **THEN** no new ContentView SHALL be created
- **THEN** the `view_count` SHALL NOT be incremented

## REMOVED Requirements

### Requirement: Comment Model (content app)
**Reason**: Replaced by generic ContentComment
**Migration**: Existing data migrated to ContentComment

### Requirement: Emotion Model (content app)
**Reason**: Replaced by generic ContentEmotion
**Migration**: Existing data migrated to ContentEmotion

### Requirement: RecipeComment Model
**Reason**: Replaced by generic ContentComment
**Migration**: Existing data migrated to ContentComment

### Requirement: RecipeEmotion Model
**Reason**: Replaced by generic ContentEmotion
**Migration**: Existing data migrated to ContentEmotion
