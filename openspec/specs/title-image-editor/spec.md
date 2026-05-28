## Requirements

### Requirement: TitleImageEditor component on content detail pages

The system SHALL display a `TitleImageEditor` component on all content detail pages (Session, Blog, Game, Recipe) when the current user has edit permission (`can_edit === true`). The editor SHALL overlay the existing hero image with an edit button. Non-authenticated users and users without edit permission SHALL see only the static hero image.

#### Scenario: Author sees edit overlay on hero image
- **WHEN** an authenticated author views a content detail page they own
- **THEN** the hero image SHALL display a semi-transparent edit overlay with an edit button (camera/pencil icon)
- **THEN** clicking the edit button SHALL open a dropdown with three options: "Bild hochladen", "Bild mit KI generieren", "Bild entfernen"

#### Scenario: Non-author sees no edit overlay
- **WHEN** an unauthenticated user or non-author views a content detail page
- **THEN** the hero image SHALL render without any edit overlay or buttons

#### Scenario: Staff user sees edit overlay
- **WHEN** a staff user views any content detail page
- **THEN** the hero image SHALL display the edit overlay (staff can edit all content)

### Requirement: Image upload via file picker

The system SHALL allow authors to upload a new title image via a native file picker dialog. The upload SHALL accept image files (JPEG, PNG, WebP) with a maximum size of 500KB. After successful upload, the hero image SHALL update immediately without page reload.

#### Scenario: Successful image upload
- **WHEN** the user selects "Bild hochladen" from the dropdown
- **THEN** a native file picker dialog SHALL open, filtered to image file types
- **WHEN** the user selects a valid image file (< 500KB)
- **THEN** the system SHALL upload the file via `POST /api/{content-type}/{id}/image/`
- **THEN** the hero image SHALL update to show the new image
- **THEN** a success toast SHALL display "Bild erfolgreich hochgeladen"

#### Scenario: File exceeds size limit
- **WHEN** the user selects a file larger than 500KB
- **THEN** the system SHALL NOT upload the file
- **THEN** an error toast SHALL display "Das Bild darf maximal 500KB gross sein"

#### Scenario: Upload fails
- **WHEN** the upload API returns an error
- **THEN** an error toast SHALL display "Bild konnte nicht hochgeladen werden"

### Requirement: AI image generation with preview selection

The system SHALL allow authors to generate title images using AI. A modal dialog SHALL present a prompt input and display generated images for selection. The system SHALL use the existing `/api/content/ai/generate-image/` endpoint.

#### Scenario: Opening AI generation modal
- **WHEN** the user selects "Bild mit KI generieren" from the dropdown
- **THEN** a modal dialog SHALL open with a text input for the image prompt
- **THEN** the prompt input SHALL be pre-filled with a content-type-specific template:
  - `recipe`: "Ein appetitliches Foto von {title}"
  - `session`: "Eine Illustration einer Pfadfinder-Aktivität: {title}"
  - `game`: "Eine Illustration eines Spiels: {title}"
  - `blog`: "Eine Illustration zum Thema: {title}"
  - fallback: "{title} - {summary}"

#### Scenario: Generating images
- **WHEN** the user clicks "Generieren" in the modal
- **THEN** a loading indicator SHALL display while images are being generated
- **THEN** the generated images SHALL display in a grid (up to 4 images)
- **THEN** each image SHALL be clickable for selection

#### Scenario: Selecting a generated image
- **WHEN** the user clicks on a generated image in the preview grid
- **THEN** the system SHALL set the selected image as the content's title image via `POST /api/{content-type}/{id}/image-from-url/`
- **THEN** the modal SHALL close
- **THEN** the hero image SHALL update to show the selected image
- **THEN** a success toast SHALL display "KI-Bild wurde gesetzt"

#### Scenario: AI generation fails
- **WHEN** the AI generation API returns an error
- **THEN** an error message SHALL display in the modal
- **THEN** the user SHALL be able to retry or close the modal

#### Scenario: User cancels AI generation
- **WHEN** the user closes the modal without selecting an image
- **THEN** no changes SHALL be made to the title image

### Requirement: Image removal

The system SHALL allow authors to remove the current title image. After removal, the content SHALL display the default fallback image.

#### Scenario: Removing an image with confirmation
- **WHEN** the user selects "Bild entfernen" from the dropdown
- **THEN** a confirmation dialog SHALL appear asking "Titelbild wirklich entfernen?"
- **WHEN** the user confirms
- **THEN** the system SHALL call `DELETE /api/{content-type}/{id}/image/`
- **THEN** the hero image SHALL revert to the fallback image
- **THEN** a success toast SHALL display "Titelbild entfernt"

#### Scenario: Content without image shows no remove option
- **WHEN** the content has no title image (`image_url` is null)
- **THEN** the "Bild entfernen" option SHALL be disabled or hidden in the dropdown

### Requirement: Upload image API endpoint for all content types

Each content type (Session, Blog, Game, Recipe) SHALL have a `POST /api/{content-type}/{id}/image/` endpoint that accepts multipart image uploads. The endpoint SHALL require authentication and author/staff permission.

#### Scenario: Authenticated author uploads image
- **WHEN** `POST /api/sessions/{id}/image/` with a valid image file
- **THEN** the image SHALL be saved to the content's `image` field
- **THEN** the response SHALL return `{ "image_url": "<url>" }` with HTTP 200

#### Scenario: Unauthenticated user attempts upload
- **WHEN** `POST /api/sessions/{id}/image/` without authentication
- **THEN** the response SHALL return HTTP 403

#### Scenario: Non-author attempts upload
- **WHEN** an authenticated non-author, non-staff user calls `POST /api/sessions/{id}/image/`
- **THEN** the response SHALL return HTTP 403 with "Keine Berechtigung."

### Requirement: Delete image API endpoint for all content types

Each content type SHALL have a `DELETE /api/{content-type}/{id}/image/` endpoint that removes the title image. The endpoint SHALL require authentication and author/staff permission.

#### Scenario: Author deletes image
- **WHEN** `DELETE /api/sessions/{id}/image/` by an authenticated author
- **THEN** the content's `image` field SHALL be set to null
- **THEN** the response SHALL return `{ "image_url": null }` with HTTP 200

#### Scenario: Deleting image from content without image
- **WHEN** `DELETE /api/sessions/{id}/image/` on content that has no image
- **THEN** the response SHALL return HTTP 200 with `{ "image_url": null }` (idempotent)

### Requirement: Set image from URL API endpoint for all content types

Each content type SHALL have a `POST /api/{content-type}/{id}/image-from-url/` endpoint that accepts a JSON body with an `image_url` field. The endpoint SHALL download the image from the provided URL and save it to the content's `image` field. The endpoint SHALL validate that the URL points to the application's own storage.

#### Scenario: Setting image from valid URL
- **WHEN** `POST /api/sessions/{id}/image-from-url/` with `{ "image_url": "https://storage.googleapis.com/gruppenstunde-media/content/ai_xxx.webp" }`
- **THEN** the image SHALL be downloaded and saved to the content's `image` field
- **THEN** the response SHALL return `{ "image_url": "<new-url>" }` with HTTP 200

#### Scenario: Invalid URL rejected
- **WHEN** `POST /api/sessions/{id}/image-from-url/` with a URL pointing to an external domain
- **THEN** the response SHALL return HTTP 400 with an error message

### Requirement: Frontend upload and delete hooks for all content types

The frontend SHALL provide TanStack Query mutation hooks for image upload, deletion, and URL-setting for all content types. Each hook SHALL invalidate the relevant query caches on success.

#### Scenario: Session image hooks
- **WHEN** the `useUploadSessionImage` hook is used
- **THEN** it SHALL POST a FormData with `image` to `/api/sessions/{id}/image/`
- **THEN** on success it SHALL invalidate `['session']` and `['sessions']` query keys

#### Scenario: Blog image hooks
- **WHEN** the `useUploadBlogImage` hook is used
- **THEN** it SHALL POST a FormData with `image` to `/api/blogs/{id}/image/`
- **THEN** on success it SHALL invalidate `['blog']` and `['blogs']` query keys

#### Scenario: Game image hooks
- **WHEN** the `useUploadGameImage` hook is used
- **THEN** it SHALL POST a FormData with `image` to `/api/games/{id}/image/`
- **THEN** on success it SHALL invalidate `['game']` and `['games']` query keys

#### Scenario: Delete hooks invalidate cache
- **WHEN** any `useDelete{ContentType}Image` hook succeeds
- **THEN** it SHALL invalidate the relevant content query caches
