## MODIFIED Requirements

### Requirement: Admin Dashboard Statistics
The admin dashboard SHALL include statistics for all content types, not just Ideas. Admin users (`is_staff=True`) SHALL have full edit and delete access to all content across the platform, with edit and delete UI elements visible on both list and detail views in the public-facing frontend.

#### Scenario: Content statistics overview
- **WHEN** an admin views the dashboard
- **THEN** statistics SHALL show: total content per type, pending approvals count, total embeddings, total content links, recent activity across all types

#### Scenario: Admin sees edit/delete on all content list pages
- **WHEN** an admin views any content list page (Sessions, Blogs, Games, Recipes)
- **THEN** each content card SHALL display edit and delete icon buttons
- **THEN** the admin SHALL be able to edit or delete any content item regardless of authorship

#### Scenario: Admin sees edit/delete on all content detail pages
- **WHEN** an admin views any content detail page
- **THEN** inline editing SHALL be enabled (`can_edit: true`)
- **THEN** a delete button SHALL be visible (`can_delete: true`)
- **THEN** the admin SHALL be able to delete any content item regardless of authorship
