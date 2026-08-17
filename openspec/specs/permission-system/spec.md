# permission-system Specification

## Purpose

This specification defines transitive read visibility without extending mutation permissions.
## Requirements
### Requirement: Transitive visibility for referenced content
The system SHALL grant detail read access to content referenced by a resource the user can read, but this access SHALL not grant edit, delete, fork, export, or new-reference rights. Private Ingredients remain owner-/Staff-only unless they are exposed as an existing authorized reference in a detail response. Public catalogs and list endpoints SHALL exclude resources visible only through transitive access.

#### Scenario: Shared MealPlan reveals Recipe detail
- **WHEN** User B can read a MealPlan containing a Recipe
- **THEN** User B SHALL be able to read the referenced Recipe detail
- **THEN** User B SHALL receive `can_edit: false` and `can_delete: false` unless independently authorized

#### Scenario: Transitive access cannot mutate
- **WHEN** User B can read a Recipe only through a shared MealPlan
- **THEN** User B SHALL not be able to edit, delete, fork, export, or add the Recipe to another MealPlan solely because of transitive access

#### Scenario: Transitive resources stay out of lists
- **WHEN** User B requests a global Recipe or Ingredient list
- **THEN** resources visible only through a detail relation SHALL not appear
