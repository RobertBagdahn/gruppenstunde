## MODIFIED Requirements

### Requirement: Shopping list creation
The system SHALL allow any authenticated user to create a shopping list. The creating user becomes the owner.

#### Scenario: Authenticated user creates shopping list
- **WHEN** an authenticated user sends POST `/api/shopping-lists/` with valid data
- **THEN** a new shopping list is created with the user as owner

#### Scenario: Anonymous user tries to create shopping list
- **WHEN** an unauthenticated user sends POST `/api/shopping-lists/`
- **THEN** the system returns 403 Forbidden

### Requirement: Shopping list visibility
The system SHALL return only shopping lists that the requesting user owns or is a collaborator on. Staff users SHALL see all shopping lists.

#### Scenario: User lists their shopping lists
- **WHEN** an authenticated user requests GET `/api/shopping-lists/`
- **THEN** the system returns only shopping lists where the user is owner or collaborator

#### Scenario: Staff lists all shopping lists
- **WHEN** a staff user requests GET `/api/shopping-lists/`
- **THEN** the system returns all shopping lists

### Requirement: Shopping-Service defensive Normalisierung
Der Shopping-Service SHALL bei der Mengenberechnung defensiv durch `recipe.servings` teilen, um korrekte Einkaufsmengen zu gewährleisten auch wenn ein Rezept `servings != 1` hat.

#### Scenario: Einkaufsliste aus Essensplan mit normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=1` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 1` ergeben (keine Änderung)

#### Scenario: Einkaufsliste aus Essensplan mit nicht-normalisiertem Rezept
- **WHEN** eine Einkaufsliste aus einem Essensplan generiert wird und das Rezept `servings=4` hat
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * factor * scaling / 4` ergeben

#### Scenario: Einkaufsliste aus einzelnem Rezept
- **WHEN** eine Einkaufsliste direkt aus einem Rezept generiert wird
- **THEN** die Berechnung SHALL `quantity * portion.weight_g * servings / recipe.servings` ergeben
