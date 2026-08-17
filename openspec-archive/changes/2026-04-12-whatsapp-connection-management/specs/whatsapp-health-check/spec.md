## ADDED Requirements

### Requirement: Send test message to own number
The system SHALL allow authenticated users to send a test WhatsApp message to their own phone number to verify the connection is working. The test message SHALL use a predefined text and SHALL NOT count against the regular message rate limit.

#### Scenario: Successful test message
- **WHEN** an authenticated user with an active WhatsApp connection clicks "Test senden"
- **THEN** the system SHALL send a message "Inspi WhatsApp-Test: Deine Verbindung funktioniert!" to the user's own phone number stored in `WhatsAppConnection.phone_number` and return `success: true` with message "Test-Nachricht erfolgreich gesendet"

#### Scenario: Test message with no active connection
- **WHEN** an authenticated user without an active WhatsApp connection requests a test message
- **THEN** the system SHALL return `success: false` with message "WhatsApp ist nicht verbunden. Bitte zuerst verbinden."

#### Scenario: Test message rate limit
- **WHEN** an authenticated user sends a test message and has already sent a test message within the last 60 seconds
- **THEN** the system SHALL return `success: false` with message "Bitte warte eine Minute zwischen Test-Nachrichten."

#### Scenario: Test message send failure
- **WHEN** the neonize client fails to deliver the test message (network error, session invalid)
- **THEN** the system SHALL return `success: false` with the error description and log a `test_failed` event in the connection log

### Requirement: Active connection health check
The system SHALL allow authenticated users to actively verify their WhatsApp connection by checking the actual neonize session status, not just the database flag. The health check SHALL attempt to reconnect from the persisted session if the client is not in memory.

#### Scenario: Health check on healthy connection
- **WHEN** an authenticated user triggers a health check and the neonize client is connected
- **THEN** the system SHALL return `is_healthy: true`, `status: "connected"`, update `WhatsAppConnection.last_health_check_at`, and log a `health_check_ok` event

#### Scenario: Health check discovers disconnected session
- **WHEN** an authenticated user triggers a health check and the neonize session is no longer valid
- **THEN** the system SHALL set `WhatsAppConnection.is_active` to `false`, return `is_healthy: false`, `status: "session_invalid"`, and log a `health_check_failed` event

#### Scenario: Health check with reconnect
- **WHEN** an authenticated user triggers a health check and the neonize client is not in memory but the session data exists in PostgreSQL
- **THEN** the system SHALL attempt to recreate the client from the persisted session, and return the resulting status

#### Scenario: Health check with no connection record
- **WHEN** an authenticated user without a `WhatsAppConnection` record triggers a health check
- **THEN** the system SHALL return `is_healthy: false`, `status: "disconnected"`, with message "Keine WhatsApp-Verbindung vorhanden"

### Requirement: Reconnect WhatsApp session
The system SHALL allow authenticated users to attempt reconnecting their WhatsApp session without requiring a new QR code pairing, falling back to QR pairing only when the persisted session is invalid.

#### Scenario: Successful session reconnect
- **WHEN** an authenticated user triggers reconnect and the persisted neonize session in PostgreSQL is still valid
- **THEN** the system SHALL recreate the neonize client, establish the connection, return `success: true`, `needs_qr: false`, `status: "connected"`, and log a `reconnect_success` event

#### Scenario: Reconnect requires QR pairing
- **WHEN** an authenticated user triggers reconnect and the persisted session has been invalidated by WhatsApp
- **THEN** the system SHALL return `success: false`, `needs_qr: true`, `status: "pending_qr"`, and the frontend SHALL automatically open the QR code pairing dialog

#### Scenario: Reconnect when already connected
- **WHEN** an authenticated user triggers reconnect and the connection is already active
- **THEN** the system SHALL return `success: true`, `needs_qr: false`, `status: "connected"`, with message "WhatsApp ist bereits verbunden"

#### Scenario: Reconnect failure
- **WHEN** an authenticated user triggers reconnect and the system encounters an error (advisory lock, neonize unavailable)
- **THEN** the system SHALL return `success: false`, `needs_qr: false`, `status: "failed"`, with the error description and log a `reconnect_failed` event

### Requirement: View connection event log
The system SHALL maintain a log of WhatsApp connection events (connect, disconnect, health checks, reconnects, test messages) and display the most recent entries to the user for diagnostics.

#### Scenario: View connection log
- **WHEN** an authenticated user views their WhatsApp connection details on the profile page
- **THEN** the system SHALL display the last 10 connection events with event type, human-readable message, and timestamp

#### Scenario: Log event types
- **WHEN** a WhatsApp connection event occurs
- **THEN** the system SHALL log one of the following event types: `connected`, `disconnected`, `health_check_ok`, `health_check_failed`, `reconnect_success`, `reconnect_failed`, `test_sent`, `test_failed`

#### Scenario: Log auto-cleanup
- **WHEN** a new log entry is created and the user has more than 50 log entries
- **THEN** the system SHALL delete the oldest entries to keep at most 50 per user

#### Scenario: Log included in GDPR data deletion
- **WHEN** a user deletes their WhatsApp data or their entire account
- **THEN** the system SHALL delete all connection log entries for that user

### Requirement: Display last health check timestamp
The system SHALL display when the WhatsApp connection was last verified on the profile page, giving users confidence in the displayed status.

#### Scenario: Show last verified timestamp
- **WHEN** a user views their active WhatsApp connection with a previous health check
- **THEN** the system SHALL display "Zuletzt geprueft: {relative_time}" (e.g., "vor 5 Minuten") below the connection status

#### Scenario: No previous health check
- **WHEN** a user views their active WhatsApp connection without a previous health check
- **THEN** the system SHALL display "Noch nicht geprueft" with a prompt to run a health check
