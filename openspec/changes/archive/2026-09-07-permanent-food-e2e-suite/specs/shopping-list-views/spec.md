## MODIFIED Requirements

### Requirement: Shopping list views include persistent CRUD and permission regression coverage
The Food E2E suite SHALL verify persistent ShoppingList creation, item addition/checking, owner updates, reload state, deletion, and role-based mutation visibility in addition to view-mode behavior.

#### Scenario: Owner manages a persistent shopping list
- **WHEN** an owner creates a list, adds an item, checks it, renames it, reloads it, and deletes it
- **THEN** the item progress, checked state, renamed title, and deletion result SHALL persist visibly

#### Scenario: Viewer remains read-only
- **WHEN** a viewer opens a shared list
- **THEN** the viewer SHALL see permitted list data but SHALL not see or execute owner/editor mutations

#### Scenario: Failed check mutation rolls back
- **WHEN** an item check request fails
- **THEN** the optimistic checked state SHALL be reverted and a German error message SHALL be visible

#### Scenario: Export provenance is preserved
- **WHEN** a Recipe or MealPlan is exported to a persistent ShoppingList
- **THEN** quantities, source type, and recipe/meal provenance SHALL be visible after reload
