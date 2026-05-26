## Why

Event-Organisatoren können derzeit nur per E-Mail mit Teilnehmern kommunizieren. Viele Pfadfinder-Gruppenführer erreichen ihre Teilnehmer und Eltern jedoch effektiver über WhatsApp — besonders bei zeitkritischen Nachrichten wie Erinnerungen, Zahlungsaufforderungen oder kurzfristigen Änderungen. Durch die Integration von WhatsApp als zusätzlichen Kanal über die Open-Source-Bibliothek [neonize](https://github.com/krypton-byte/neonize) (basierend auf Whatsmeow) können Organisatoren ihre persönliche WhatsApp-Nummer verknüpfen und Nachrichten direkt aus dem Event-Dashboard versenden — ohne externe Dienste oder Kosten.

## What Changes

- **WhatsApp-Verbindungsverwaltung auf Profilseite**: Nutzer können ihre persönliche WhatsApp-Nummer über einen QR-Code-Flow auf der Profilseite verknüpfen, den Verbindungsstatus einsehen und die Verbindung jederzeit trennen/löschen (inkl. Session-Daten). Die Verbindung ist nutzerbezogen und gilt fuer alle Events.
- **Unified Message Module**: Der bestehende Mail-Tab im Event-Dashboard wird zu einem allgemeinen "Nachrichten"-Modul erweitert, das sowohl E-Mail als auch WhatsApp als Kanal unterstützt. Im Event-Dashboard wird der WhatsApp-Verbindungsstatus angezeigt mit Link zu den Profileinstellungen.
- **Nachrichtenvorlagen**: Vordefinierte und benutzerdefinierte Nachrichtenvorlagen (z.B. Zahlungserinnerung, Packliste-Erinnerung, Treffpunkt-Info) mit vorausgefuelltem Text und Platzhaltern, nutzbar fuer beide Kanaele.
- **WhatsApp-Verfuegbarkeits-Check**: Vor dem Versand prueft das System ueber neonize `is_on_whatsapp()`, ob die Empfaenger-Nummern tatsaechlich auf WhatsApp registriert sind. Die Preview zeigt den Verfuegbarkeitsstatus pro Empfaenger.
- **Einzelbestätigung jeder Nachricht**: Vor dem Versand wird eine Vorschau mit allen Empfängern und der Nachrichtenanzahl angezeigt. Jede Nachricht muss einzeln bestätigt werden — kein Massenversand ohne explizite Zustimmung.
- **Nachrichten-Log und Statistik**: Vollständige Protokollierung aller gesendeten WhatsApp-Nachrichten in der Timeline. Der Nutzer sieht, wie viele Nachrichten über seine Verbindung gesendet wurden.
- **Datenschutz (DSGVO)**: Keine Speicherung von WhatsApp-Nachrichteninhalten nach Versand. Session-Daten in PostgreSQL gespeichert. Transparente Darstellung, welche Daten verarbeitet werden. Möglichkeit, alle WhatsApp-Daten vollständig zu löschen. Telefonnummern der Empfänger werden nicht dauerhaft gespeichert — nur für den Versandzeitpunkt aufgelöst.
- **Sicherheit**: WhatsApp-Sessions sind nutzerbezogen und nicht teilbar. Rate-Limiting verhindert Missbrauch. Verbindung kann jederzeit widerrufen werden. Keine automatisierten Nachrichten ohne manuelle Bestätigung. Graceful Reconnect nach Cloud Run Container-Neustart.
- **Backend-Integration via neonize**: Die Python-Bibliothek `neonize` wird als Dependency hinzugefügt. Ein Django-Service verwaltet den WhatsApp-Client-Lifecycle (connect, disconnect, send). Die WhatsApp-Session-Daten werden direkt in der bestehenden PostgreSQL-Datenbank gespeichert (neonize unterstuetzt PostgreSQL nativ als Session-Store).

## Capabilities

### New Capabilities
- `whatsapp-connection`: WhatsApp-Kontoverwaltung auf Profilseite — QR-Code-Pairing, Verbindungsstatus, Disconnect, Session-Löschung, Nachrichtenstatistik, Graceful Reconnect nach Container-Neustart. Datenschutz- und Sicherheitsanforderungen für die WhatsApp-Integration.
- `event-messaging`: Unified Messaging-Modul für Events — kanalübergreifender Nachrichtenversand (E-Mail + WhatsApp), Nachrichtenvorlagen, WhatsApp-Verfuegbarkeits-Check via `is_on_whatsapp()`, Empfängervorschau mit Einzelbestätigung, Nachrichtenprotokollierung, Template-Platzhalter für beide Kanäle, Telefonnummer in Person/Participant/Gast-Registrierung.

### Modified Capabilities
- `event-mail`: Erweitert um WhatsApp als alternativen Versandkanal. Die bestehende MailService-Logik bleibt erhalten, wird aber in ein kanalübergreifendes Messaging-Konzept eingebettet. Der Mail-Tab wird zum Nachrichten-Tab.

## Impact

**Backend (Django)**:
- Neue App oder Erweiterung der `event`-App um WhatsApp-Models: `WhatsAppConnection` (pro User), `WhatsAppMessage` (Log)
- Neuer Service: `WhatsAppService` (neonize Client-Lifecycle, send, QR-Code-Generierung)
- Erweiterung des bestehenden `MailService` oder neuer `MessagingService` als Abstraktion
- Neue API-Endpunkte: QR-Code abrufen, Verbindungsstatus prüfen, Verbindung trennen, Nachrichten senden, Statistik abrufen
- Neue Dependency: `neonize` in `pyproject.toml`
- Neue Pydantic-Schemas: `WhatsAppConnectionSchema`, `WhatsAppMessageSchema`, `SendMessageSchema`
- Migration für neue Models erforderlich

**Frontend (React)**:
- Neuer Bereich auf der Profilseite: WhatsApp-Verbindungsverwaltung mit QR-Code-Anzeige
- Im Event-Dashboard Nachrichten-Tab: WhatsApp-Verbindungsstatus-Hinweis mit Link zur Profilseite
- Umgestaltung des `MailTab.tsx` zu einem `MessagingTab.tsx` mit Kanalauswahl
- Neue Komponenten: QR-Code-Anzeige, Verbindungsstatus, Nachrichtenvorlagen-Auswahl, Nachrichtenbestätigungs-Dialog
- Neue Zod-Schemas: synchron zu Backend-Schemas
- Neue TanStack Query Hooks für WhatsApp-Endpunkte
- Telefonnummer-Feld in PersonsPage, GuestRegistrationPage

**Infrastruktur**:
- neonize Session-Daten werden direkt in der bestehenden PostgreSQL-Datenbank (Cloud SQL) gespeichert — kein separates Dateisystem noetig, ideal fuer Cloud Run
- WhatsApp-Client muss als langlebiger Prozess laufen (nicht per Request) — Hintergrund-Thread im Django-Prozess
- Rate-Limiting für WhatsApp-Nachrichten (WhatsApp hat eigene Limits)

**Datenschutz/Sicherheit**:
- Session-Daten in PostgreSQL (Cloud SQL ist encrypted at rest)
- Kein Logging von Nachrichteninhalten
- DSGVO-konforme Löschung aller WhatsApp-bezogenen Daten bei Account-Löschung
- Transparente Darstellung in Datenschutz-Übersicht
