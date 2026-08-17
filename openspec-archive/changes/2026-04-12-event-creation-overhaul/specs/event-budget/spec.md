## ADDED Requirements

### Requirement: BudgetItem model
An optional BudgetItem model SHALL be created to track manual budget line items for an event.

#### Scenario: BudgetItem model fields
- **WHEN** the BudgetItem model is defined
- **THEN** it SHALL have the following fields:
  - `event` — ForeignKey to Event (on_delete=CASCADE, related_name="budget_items")
  - `description` — CharField (max_length=255)
  - `amount` — DecimalField (max_digits=10, decimal_places=2)
  - `category` — CharField with choices: `material`, `food`, `transport`, `venue`, `other`
  - `is_expense` — BooleanField (default=True)
  - `created_at` — DateTimeField (auto_now_add=True)
  - `updated_at` — DateTimeField (auto_now=True)

#### Scenario: BudgetItem string representation
- **WHEN** a BudgetItem is converted to string
- **THEN** it SHALL return `"{description} ({amount} €)"`

### Requirement: Budget summary API endpoint
A `GET /api/events/{slug}/budget/` endpoint SHALL return a computed budget summary.

#### Scenario: Budget summary response
- **WHEN** GET `/api/events/{slug}/budget/`
- **THEN** the response SHALL include:
  - `total_income` — Decimal: sum of all Payment amounts for this event
  - `expected_income` — Decimal: sum of (Participant count × BookingOption.price) across all booking options
  - `total_expenses` — Decimal: sum of BudgetItem amounts where `is_expense=True`
  - `total_revenue` — Decimal: sum of BudgetItem amounts where `is_expense=False`
  - `balance` — Decimal: `total_income + total_revenue - total_expenses`
  - `expected_balance` — Decimal: `expected_income + total_revenue - total_expenses`
  - `items_by_category` — list of `{category, total}` grouped sums for expense items

#### Scenario: Budget summary with no data
- **WHEN** GET `/api/events/{slug}/budget/` for an event with no payments, participants, or budget items
- **THEN** all monetary values SHALL be `0.00`
- **THEN** `items_by_category` SHALL be an empty list

#### Scenario: Only managers can access budget summary
- **WHEN** GET `/api/events/{slug}/budget/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: BudgetItem CRUD endpoints
Managers SHALL be able to create, update, and delete budget items.

#### Scenario: Create a budget item
- **WHEN** POST `/api/events/{slug}/budget-items/` with body `{description, amount, category, is_expense}`
- **THEN** a BudgetItem SHALL be created linked to the event
- **THEN** the response SHALL return 201 Created with the budget item data

#### Scenario: Create validation — description required
- **WHEN** POST `/api/events/{slug}/budget-items/` with an empty `description`
- **THEN** the response SHALL return 422 with validation error "Beschreibung ist erforderlich."

#### Scenario: Create validation — amount must be positive
- **WHEN** POST `/api/events/{slug}/budget-items/` with `amount` ≤ 0
- **THEN** the response SHALL return 422 with validation error "Betrag muss größer als 0 sein."

#### Scenario: Update a budget item
- **WHEN** PATCH `/api/events/{slug}/budget-items/{id}/` with partial body
- **THEN** the BudgetItem SHALL be updated with the provided fields
- **THEN** the response SHALL return 200 OK with the updated item

#### Scenario: Delete a budget item
- **WHEN** DELETE `/api/events/{slug}/budget-items/{id}/`
- **THEN** the BudgetItem SHALL be deleted
- **THEN** the response SHALL return 204 No Content

#### Scenario: List budget items
- **WHEN** GET `/api/events/{slug}/budget-items/?page=1&page_size=20`
- **THEN** the response SHALL return paginated budget items in standard format: `{items, total, page, page_size, total_pages}`
- **THEN** each item SHALL include: `id`, `description`, `amount`, `category`, `is_expense`, `created_at`

#### Scenario: Only managers can manage budget items
- **WHEN** a non-manager attempts POST, PATCH, or DELETE on budget-items endpoints
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Budget summary card in Overview tab
The Overview tab SHALL display a budget summary card for managers.

#### Scenario: Budget card display
- **WHEN** a manager views the Overview tab
- **THEN** a "Budget" card SHALL be displayed showing:
  - "Einnahmen" with the `total_income` value formatted as currency (e.g., "1.234,56 €")
  - "Ausgaben" with the `total_expenses` value formatted as currency
  - "Saldo" with the `balance` value, displayed in green if positive or red if negative

#### Scenario: Income vs expense bar
- **WHEN** a manager views the budget card
- **THEN** a horizontal bar SHALL visualize income vs expenses as proportional segments
- **THEN** income SHALL be displayed in green and expenses in red

#### Scenario: Link to detailed budget view
- **WHEN** a manager clicks the budget card or a "Details" link within it
- **THEN** navigation SHALL occur to the detailed budget section

#### Scenario: Budget card not shown to non-managers
- **WHEN** a non-manager views the Overview tab
- **THEN** the "Budget" card SHALL NOT be displayed

### Requirement: Detailed budget view
A detailed budget page or section SHALL allow managers to view and manage all budget items.

#### Scenario: Category-grouped display
- **WHEN** a manager views the detailed budget page
- **THEN** budget items SHALL be grouped by category
- **THEN** each category group SHALL display a subtotal
- **THEN** categories SHALL use German labels: "Material", "Verpflegung", "Transport", "Unterkunft", "Sonstiges"

#### Scenario: Add budget item from detail view
- **WHEN** a manager clicks "Posten hinzufügen" in the detailed budget view
- **THEN** an inline form or dialog SHALL appear with fields: description (text), amount (number), category (select), is_expense (toggle with label "Ausgabe"/"Einnahme")
- **THEN** submitting SHALL call POST `/api/events/{slug}/budget-items/`

#### Scenario: Expected vs actual income comparison
- **WHEN** a manager views the detailed budget page
- **THEN** a summary section SHALL show `expected_income` (labeled "Erwartete Einnahmen") alongside `total_income` (labeled "Tatsächliche Einnahmen")
- **THEN** if `total_income` < `expected_income`, a note "Offene Zahlungen vorhanden" SHALL be displayed
