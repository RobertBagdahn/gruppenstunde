## ADDED Requirements

### Requirement: Connect WhatsApp account via QR code
The system SHALL allow authenticated users to connect their personal WhatsApp account by scanning a QR code displayed on the profile page. The QR code SHALL be generated server-side by the neonize library and displayed as a Base64-encoded PNG image. The system SHALL poll for connection status every 2 seconds until the pairing is complete or times out.

#### Scenario: Initiate QR code pairing
- **WHEN** an authenticated user requests to connect their WhatsApp account
- **THEN** the system SHALL start a neonize client in a background thread, generate a QR code, and return it as Base64-encoded PNG with status `pending_qr`

#### Scenario: QR code polling until connected
- **WHEN** the frontend polls `/api/events/whatsapp/qr-status/` every 2 seconds
- **THEN** the system SHALL return the current status (`pending_qr` with QR code, `connected` with phone number, `failed` with error, or `timeout`)

#### Scenario: Successful pairing
- **WHEN** the user scans the QR code with their WhatsApp app and confirms pairing
- **THEN** the system SHALL store the connection details (phone number, session path, connected timestamp) in a `WhatsAppConnection` record and return status `connected`

#### Scenario: QR code timeout
- **WHEN** the QR code is not scanned within 120 seconds
- **THEN** the system SHALL return status `timeout` and the user can request a new QR code

#### Scenario: User already has a connection
- **WHEN** a user who already has an active WhatsApp connection requests to connect
- **THEN** the system SHALL return an error indicating that a connection already exists and MUST be disconnected first

### Requirement: View WhatsApp connection status
The system SHALL display the current WhatsApp connection status to the authenticated user, including whether they are connected, the connected phone number (partially masked), and the connection date.

#### Scenario: Connected status display
- **WHEN** a user with an active WhatsApp connection views their profile page
- **THEN** the system SHALL display the partially masked phone number (e.g., `+49 170 ***4567`), connection date, and a green connected indicator

#### Scenario: Not connected status display
- **WHEN** a user without a WhatsApp connection views their profile page
- **THEN** the system SHALL display a prompt to connect with a "WhatsApp verbinden" button and a data privacy notice

### Requirement: Disconnect WhatsApp account
The system SHALL allow users to disconnect their WhatsApp account at any time. Disconnecting SHALL log out the WhatsApp session on the server but preserve the connection record for statistics.

#### Scenario: Disconnect active connection
- **WHEN** a user clicks "Verbindung trennen" for their active WhatsApp connection
- **THEN** the system SHALL disconnect the neonize client, mark the connection as inactive, and confirm the disconnection to the user

#### Scenario: Reconnect after disconnect
- **WHEN** a user who previously disconnected wants to reconnect
- **THEN** the system SHALL allow initiating a new QR code pairing flow

### Requirement: Delete WhatsApp data completely
The system SHALL allow users to permanently delete all WhatsApp-related data, including session files, connection records, and message logs. This is separate from disconnect and is irreversible.

#### Scenario: Delete all WhatsApp data
- **WHEN** a user clicks "WhatsApp-Daten loeschen" and confirms the action
- **THEN** the system SHALL delete the neonize session data from PostgreSQL (by client name), the `WhatsAppConnection` record, all associated `WhatsAppMessage` records, and disconnect any active client

#### Scenario: Confirmation required before deletion
- **WHEN** a user requests deletion of WhatsApp data
- **THEN** the system SHALL display a confirmation dialog explaining that this action is irreversible and all message history will be lost

#### Scenario: GDPR account deletion includes WhatsApp data
- **WHEN** a user deletes their entire account via the GDPR data deletion flow
- **THEN** the system SHALL automatically delete all WhatsApp-related data as part of the account deletion process

### Requirement: View WhatsApp message statistics
The system SHALL provide message statistics for the user's WhatsApp connection, showing how many messages were sent in total, today, this week, and the timestamp of the last sent message.

#### Scenario: Statistics for active connection
- **WHEN** a user views their WhatsApp connection statistics
- **THEN** the system SHALL display total messages sent, messages sent today, messages sent this week, and the last message timestamp

#### Scenario: Statistics after disconnect
- **WHEN** a user who has disconnected views their statistics
- **THEN** the system SHALL still display historical statistics from the previous connection

### Requirement: Secure WhatsApp session data at rest
The system SHALL store neonize session data (containing WhatsApp encryption keys and device credentials) in the PostgreSQL database via neonize's native PostgreSQL session store. Internal session identifiers and database-level details SHALL NOT be exposed via any API endpoint.

#### Scenario: Session data stored in PostgreSQL
- **WHEN** a WhatsApp session is created
- **THEN** the neonize client SHALL use the existing PostgreSQL database as session store, with a unique client name per user as namespace

#### Scenario: Session data not in API responses
- **WHEN** any WhatsApp-related API endpoint returns data
- **THEN** the response SHALL NOT contain session identifiers, encryption keys, database connection strings, or any internal neonize session data

### Requirement: Rate-limit WhatsApp messages
The system SHALL enforce a rate limit of 50 WhatsApp messages per hour per connection to prevent account suspension by WhatsApp.

#### Scenario: Rate limit not exceeded
- **WHEN** a user sends WhatsApp messages and the hourly count is below 50
- **THEN** the system SHALL allow the message to be sent

#### Scenario: Rate limit exceeded
- **WHEN** a user attempts to send a WhatsApp message and 50 messages have been sent in the last hour
- **THEN** the system SHALL reject the send request with an error message "Nachrichtenlimit erreicht. Bitte warte bis {time} bevor du weitere Nachrichten senden kannst."

### Requirement: Display data privacy notice for WhatsApp
The system SHALL display a clear data privacy notice before a user connects their WhatsApp account, explaining what data is processed, stored, and how it can be deleted.

#### Scenario: Privacy notice before pairing
- **WHEN** a user initiates the WhatsApp connection flow on the profile page
- **THEN** the system SHALL display a notice explaining: (1) the user's personal WhatsApp number is used to send messages on their behalf, (2) session data is stored encrypted in the database, (3) message content is NOT stored after sending, (4) recipient phone numbers are only used at send time and not permanently stored, (5) all data can be deleted at any time

#### Scenario: Consent required
- **WHEN** a user reads the privacy notice
- **THEN** the user MUST explicitly accept the terms before the QR code is generated

### Requirement: Graceful reconnect after container restart
The system SHALL automatically reconnect the neonize WhatsApp client from the persisted PostgreSQL session when the server process restarts (e.g., Cloud Run scale-to-zero, redeployment). No new QR code pairing SHALL be required if the session is still valid.

#### Scenario: Reconnect after container restart
- **WHEN** a server process starts and a user with an active `WhatsAppConnection` record makes an API request (status check or message send)
- **THEN** the `WhatsAppClientManager` SHALL lazily recreate the neonize client from the PostgreSQL session without requiring QR code pairing

#### Scenario: Session invalidated by WhatsApp
- **WHEN** the persisted session has been invalidated by WhatsApp (e.g., user logged out from phone, session expired)
- **THEN** the system SHALL mark the connection as `disconnected`, notify the user on next status check, and require a new QR code pairing

#### Scenario: Corrupt session data
- **WHEN** the neonize client fails to start due to corrupt session data in PostgreSQL
- **THEN** the system SHALL delete the corrupt session data, mark the connection as `disconnected`, and return a clear error message to the user
