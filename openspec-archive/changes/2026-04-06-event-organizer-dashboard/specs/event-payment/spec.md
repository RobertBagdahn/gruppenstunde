## ADDED Requirements

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
