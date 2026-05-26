## MODIFIED Requirements

### Requirement: View WhatsApp connection status
The system SHALL display the current WhatsApp connection status to the authenticated user, including whether they are connected, the connected phone number (partially masked), the connection date, and the last health check timestamp. The status SHALL be actively verified against the neonize session when the user triggers a health check.

#### Scenario: Connected status display
- **WHEN** a user with an active WhatsApp connection views their profile page
- **THEN** the system SHALL display the partially masked phone number (e.g., `+49 170 ***4567`), connection date, last health check timestamp, a green connected indicator, and action buttons for "Verbindung pruefen", "Test senden", "Verbindung trennen", and "Daten loeschen"

#### Scenario: Not connected status display
- **WHEN** a user without a WhatsApp connection views their profile page
- **THEN** the system SHALL display a prompt to connect with a "WhatsApp verbinden" button, a data privacy notice, and if a previous connection existed, an "Erneut verbinden" button that attempts session reconnect before showing the QR code dialog

#### Scenario: Connection status auto-correction
- **WHEN** a health check reveals that the neonize session is invalid but `WhatsAppConnection.is_active` is `true`
- **THEN** the system SHALL automatically set `is_active` to `false` and update the UI to show "Nicht verbunden" with a reconnect option

### Requirement: Delete WhatsApp data completely
The system SHALL allow users to permanently delete all WhatsApp-related data, including session files, connection records, message logs, and connection event logs. This is separate from disconnect and is irreversible.

#### Scenario: Delete all WhatsApp data
- **WHEN** a user clicks "WhatsApp-Daten loeschen" and confirms the action
- **THEN** the system SHALL delete the neonize session data from PostgreSQL (by client name), the `WhatsAppConnection` record, all associated `WhatsAppMessage` records, all `WhatsAppConnectionLog` entries, and disconnect any active client

#### Scenario: Confirmation required before deletion
- **WHEN** a user requests deletion of WhatsApp data
- **THEN** the system SHALL display a confirmation dialog explaining that this action is irreversible and all message history will be lost

#### Scenario: GDPR account deletion includes WhatsApp data
- **WHEN** a user deletes their entire account via the GDPR data deletion flow
- **THEN** the system SHALL automatically delete all WhatsApp-related data including connection logs as part of the account deletion process
