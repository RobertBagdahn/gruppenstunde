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
