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

## Payment

### Requirement: Payment Model
The system SHALL store payments as a `Payment` model with: participant (FK to Participant), amount (DecimalField, max_digits=7, decimal_places=2), method (CharField choices: bar, paypal, ueberweisung, sonstige), received_at (DateTimeField), location (CharField, blank — where the money was received), note (TextField, blank), created_by (FK to User), created_at (auto timestamp).

#### Scenario: Record a cash payment
- **WHEN** POST `/api/events/{slug}/payments/` with `{participant_id, amount: 50.00, method: "bar", received_at: "2026-07-15T10:00:00Z", location: "Zeltplatz Kasse"}`
- **THEN** a Payment record SHALL be created
- **THEN** the response SHALL include the full payment details with id

#### Scenario: Record a PayPal payment
- **WHEN** POST `/api/events/{slug}/payments/` with `{participant_id, amount: 30.00, method: "paypal", received_at: "2026-07-10T14:00:00Z"}`
- **THEN** a Payment record SHALL be created with method "paypal"

#### Scenario: Record a bank transfer payment
- **WHEN** POST `/api/events/{slug}/payments/` with `{participant_id, amount: 45.00, method: "ueberweisung", received_at: "2026-07-08T00:00:00Z", note: "Verwendungszweck: Sommerlager Max"}`
- **THEN** a Payment record SHALL be created with method "ueberweisung"

### Requirement: Payment list endpoint
The system SHALL provide a paginated payment list for event managers.

#### Scenario: List all payments for an event
- **WHEN** GET `/api/events/{slug}/payments/?page=1&page-size=20`
- **THEN** the system SHALL return all payments across all participants of the event
- **THEN** payments SHALL be ordered by `received_at` descending
- **THEN** each payment SHALL include: id, participant (name), amount, method, received_at, location, note, created_by (name), created_at

#### Scenario: Payments require manager permission
- **WHEN** a non-manager user requests GET `/api/events/{slug}/payments/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Delete payment
The system SHALL allow managers to delete a payment.

#### Scenario: Delete a payment
- **WHEN** DELETE `/api/events/{slug}/payments/{id}/`
- **THEN** the payment SHALL be deleted
- **THEN** the participant's payment status SHALL be recalculated

#### Scenario: Delete requires manager permission
- **WHEN** a non-manager attempts DELETE `/api/events/{slug}/payments/{id}/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: No update/patch for payments
Payments SHALL be immutable after creation. There SHALL be no PATCH or PUT endpoint for payments. If a payment was recorded incorrectly, the manager SHALL delete it and create a new one.

#### Scenario: Correcting a wrong payment amount
- **WHEN** a manager needs to correct a payment amount
- **THEN** the manager SHALL delete the incorrect payment via DELETE `/api/events/{slug}/payments/{id}/`
- **THEN** the manager SHALL create a new payment with the correct amount via POST `/api/events/{slug}/payments/`

#### Scenario: No PATCH endpoint exists
- **WHEN** a client sends PATCH `/api/events/{slug}/payments/{id}/`
- **THEN** the system SHALL return 405 Method Not Allowed

### Requirement: Computed payment status on participant
The `Participant` model SHALL expose a computed `is_paid` property and `total_paid` amount based on linked Payment records.

#### Scenario: Participant fully paid
- **WHEN** the sum of all Payment.amount for a participant >= the BookingOption.price
- **THEN** `is_paid` SHALL be True
- **THEN** `total_paid` SHALL equal the sum of payments
- **THEN** `remaining_amount` SHALL be 0

#### Scenario: Participant partially paid
- **WHEN** the sum of all Payment.amount for a participant < the BookingOption.price
- **THEN** `is_paid` SHALL be False
- **THEN** `remaining_amount` SHALL equal (price - total_paid)

#### Scenario: Participant with no payments
- **WHEN** a participant has no Payment records
- **THEN** `is_paid` SHALL be False
- **THEN** `total_paid` SHALL be 0

#### Scenario: Participant with no booking option (free)
- **WHEN** a participant has no booking option (price = 0)
- **THEN** `is_paid` SHALL be True regardless of payments

### Requirement: Payment method choices
The system SHALL support the following payment methods: `bar` (Bar), `paypal` (PayPal), `ueberweisung` (Überweisung), `sonstige` (Sonstige).

#### Scenario: Payment method choices available via API
- **WHEN** GET `/api/events/choices/payment-methods/`
- **THEN** the system SHALL return all payment method choices as value/label pairs

### Requirement: Payment summary in participant list
The participant list response SHALL include payment information.

#### Scenario: Participant response includes payment data
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** each participant SHALL include `is_paid`, `total_paid`, and `remaining_amount`
- **THEN** the `payments` list SHALL NOT be included inline (use the dedicated payments endpoint instead)
