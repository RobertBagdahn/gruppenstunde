## Why

Die aktuelle WhatsApp-Integration hat Lücken im Verbindungsmanagement: Es gibt keinen Test-Button um die Verbindung zu verifizieren, der Status "Nicht verbunden" wird nicht zuverlässig erkannt und angezeigt, und es fehlt eine einfache Möglichkeit die Verbindung zu prüfen oder wiederherzustellen. Nutzer können aktuell nicht sicher sein, ob ihre WhatsApp-Verbindung tatsächlich funktioniert, bevor sie Nachrichten an Teilnehmer senden.

## What Changes

- **Test-Nachricht senden**: Neuer "Test senden"-Button auf der Profilseite, der eine Test-WhatsApp-Nachricht an die eigene Nummer des Nutzers sendet und das Ergebnis anzeigt (Erfolg/Fehler)
- **Verbindungsprüfung (Health Check)**: Neuer "Verbindung prüfen"-Button, der aktiv die neonize-Session validiert und den tatsächlichen WhatsApp-Verbindungsstatus zurückmeldet (nicht nur den DB-Flag)
- **Zuverlässige "Nicht verbunden"-Anzeige**: Der Verbindungsstatus wird bei jedem Laden der Profilseite aktiv geprüft, nicht nur aus der DB gelesen. Wenn die neonize-Session ungültig ist, wird `is_active` automatisch auf `False` gesetzt
- **Reconnect-Funktion**: Neuer "Erneut verbinden"-Button, der versucht die bestehende Session wiederherzustellen ohne neuen QR-Code, und bei Fehlschlag automatisch den QR-Pairing-Flow startet
- **Letzte Aktivität anzeigen**: Anzeige wann die letzte erfolgreiche Nachricht gesendet wurde und wann die Verbindung zuletzt aktiv verifiziert wurde
- **Verbindungs-Log**: Einfache Anzeige der letzten Verbindungsereignisse (verbunden, getrennt, Fehler) zur Diagnose

## Capabilities

### New Capabilities
- `whatsapp-health-check`: Aktive Verbindungsprüfung, Test-Nachrichten, Reconnect-Logik und Verbindungsdiagnose

### Modified Capabilities
- `whatsapp-connection`: Erweiterung um Health-Check-Status, Reconnect-Flow und zuverlässigere Status-Erkennung

## Impact

- **Backend (`event` App)**:
  - `WhatsAppClientManager` erweitern: `check_connection_health()`, `send_test_message()`, `reconnect()` Methoden
  - `WhatsAppService` erweitern: Business-Logik für Health Check, Test-Nachricht, Reconnect
  - Neue API-Endpunkte: `POST /api/whatsapp/test/`, `POST /api/whatsapp/health-check/`, `POST /api/whatsapp/reconnect/`
  - `WhatsAppConnection` Model: neues Feld `last_health_check_at` (DateTimeField, nullable)
  - Pydantic-Schemas: `WhatsAppTestResultOut`, `WhatsAppHealthCheckOut`, `WhatsAppReconnectOut`
  - Migration für neues Model-Feld
- **Frontend (`whatsapp` Komponenten)**:
  - `WhatsAppConnectionCard` erweitern: Test-Button, Health-Check-Button, Reconnect-Button, Verbindungs-Log
  - Neue Zod-Schemas: `whatsAppTestResultSchema`, `whatsAppHealthCheckSchema`, `whatsAppReconnectSchema`
  - Neue TanStack Query Hooks: `useWhatsAppTest`, `useWhatsAppHealthCheck`, `useWhatsAppReconnect`
- **Keine Breaking Changes**: Bestehende Funktionalität bleibt erhalten, nur Erweiterungen
