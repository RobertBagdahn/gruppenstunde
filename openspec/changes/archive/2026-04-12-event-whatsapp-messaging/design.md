## Context

Das Event-Modul von Inspi bietet derzeit ausschliesslich E-Mail als Kommunikationskanal. Der `MailService` in `backend/event/services/mail.py` sendet manuelle E-Mails und Registrierungsbestaetigungen an Teilnehmer mit Platzhalter-Unterstuetzung und CI-Branding. Im Frontend steuert der `MailTab.tsx` im Event-Dashboard den Versand.

WhatsApp ist der dominante Messaging-Kanal der Zielgruppe (Pfadfindergruppen, Eltern). Die Open-Source-Bibliothek [neonize](https://github.com/krypton-byte/neonize) (Python-Wrapper um Go-basiertes Whatsmeow) ermoeglicht WhatsApp-Automatisierung ueber das Multi-Device-Protokoll. Neonize unterstuetzt synchrone und asynchrone Clients, SQLite/PostgreSQL Session-Storage und laeuft als langlebiger Prozess.

**Infrastruktur-Kontext**: Die App laeuft auf Google Cloud Run (Serverless). Django Channels + Daphne (ASGI) sind bereits eingerichtet. WebSocket-Infrastruktur existiert (fuer Shopping-Listen). Es gibt kein Celery oder Task-Queue-System.

## Goals / Non-Goals

**Goals:**
- Nutzer koennen ihre persoenliche WhatsApp-Nummer ueber QR-Code in der App verbinden
- Event-Organisatoren koennen aus dem Event-Dashboard wahlweise E-Mail oder WhatsApp fuer Nachrichten verwenden
- Jede WhatsApp-Nachricht erfordert explizite Einzelbestaetigung mit Empfaengervorschau
- Vollstaendige Nachvollziehbarkeit: Alle Nachrichten werden in der Event-Timeline protokolliert
- DSGVO-konform: Keine dauerhafte Speicherung von Nachrichteninhalten, verschluesselte Sessions, transparente Datenuebersicht, vollstaendige Loeschbarkeit
- Statistik-Dashboard: Nutzer sehen, wie viele WhatsApp-Nachrichten ueber ihre Verbindung gesendet wurden

**Non-Goals:**
- Kein Empfang/Lesen eingehender WhatsApp-Nachrichten (rein ausgehend)
- Keine automatisierten/zeitgesteuerten Nachrichten (alles manuell mit Bestaetigung)
- Keine WhatsApp-Gruppen erstellen oder verwalten
- Kein Medienversand (nur Textnachrichten)
- Keine Business-API-Integration (nur persoenliche Nummern via neonize)
- Kein Fallback von WhatsApp auf E-Mail (Kanalwahl ist explizit)

## Decisions

### 1. WhatsApp als Event-App-Erweiterung (nicht separate App)

**Entscheidung**: Die WhatsApp-Funktionalitaet wird in die bestehende `event`-App integriert, nicht als separate Django-App.

**Begruendung**: Die WhatsApp-Integration ist eng mit dem Event-Messaging gekoppelt (gleiche Empfaenger, gleiche Platzhalter, gleiche Timeline). Eine separate App wuerde unnoetige Cross-App-Abhaengigkeiten erzeugen. Die `WhatsAppConnection` ist nutzerbezogen, wird aber primaer im Event-Kontext verwendet.

**Alternative verworfen**: Separate `messaging` App — wuerde zwar sauberere Trennung bieten, aber die enge Kopplung an Participants, Timeline und MailService spricht dagegen.

### 2. neonize im synchronen Modus mit Threading

**Entscheidung**: neonize wird im synchronen Modus (`NewClient`) verwendet und in einem Daemon-Thread pro Verbindung gestartet.

**Begruendung**: Django laeuft synchron (Django Ninja ist WSGI-kompatibel). neonize's synchroner Client ist einfacher zu integrieren als der async-Modus. Der Client-Lifecycle (connect, QR-Code, disconnect) laeuft in Hintergrund-Threads. Nachrichtenversand (`send_message`) ist ein synchroner Aufruf. Die neonize-Bibliothek bietet ein Django-Integrationsbeispiel genau mit diesem Pattern (Thread + `connect()`).

**Alternative verworfen**: Async-Client mit Django Channels — waere technisch moeglich (Daphne/ASGI existiert), wuerde aber das gesamte Event-API auf async umstellen muessen. Unverhältnismässiger Aufwand.

### 3. Session-Daten direkt in PostgreSQL

**Entscheidung**: neonize Session-Daten werden direkt in der bestehenden PostgreSQL-Datenbank gespeichert. neonize unterstuetzt PostgreSQL nativ als Session-Store (`database="postgres://..."` Parameter). Pro User wird ein eigener Client-Name verwendet, der als Namespace in den neonize-internen Tabellen dient.

**Begruendung**: Die App laeuft auf Cloud Run — dort gibt es kein persistentes Dateisystem. SQLite-Dateien wuerden bei jedem Container-Neustart verloren gehen und ein Cloud Storage Volume oder NFS-Mount erfordern. PostgreSQL (Cloud SQL) ist bereits vorhanden, persistent und bewaehrt. Alles in einer Datenbank vereinfacht Backups, Deployments und GDPR-Loeschung. neonize erstellt seine eigenen Tabellen automatisch im angegebenen PostgreSQL-Schema.

**Alternative verworfen**: SQLite pro User — wuerde persistentes Dateisystem auf Cloud Run erfordern (Cloud Storage FUSE / NFS), zusaetzliche Infrastruktur-Komplexitaet, und erschwert GDPR-Loeschung (Datei finden + loeschen statt SQL DELETE).

### 4. WhatsApp-Client-Manager als Singleton-Service

**Entscheidung**: Ein `WhatsAppClientManager` verwaltet alle aktiven neonize-Clients als In-Memory-Singleton. Clients werden lazy bei Bedarf gestartet (erster Nachrichtenversand oder QR-Code-Request).

**Begruendung**: neonize-Clients sind langlebige Prozesse. Pro Nutzer existiert maximal ein Client. Der Manager haelt Referenzen und bietet `get_or_create_client(user)`, `disconnect_client(user)` und `get_qr_code(user)`.

**Betroffene Dateien**:
- Neu: `backend/event/services/whatsapp.py` — WhatsAppService + WhatsAppClientManager
- Neu: `backend/event/models/whatsapp.py` — WhatsAppConnection, WhatsAppMessage Models
- Erweitert: `backend/event/models/__init__.py` — Re-exports
- Erweitert: `backend/event/api/` — Neue Endpunkte

### 5. QR-Code-Flow via Polling-API

**Entscheidung**: Der QR-Code-Pairing-Flow wird ueber eine Polling-REST-API implementiert, nicht ueber WebSocket.

**Begruendung**: Das QR-Code-Pairing dauert 20-60 Sekunden. Ein Frontend-Polling alle 2 Sekunden auf `/api/events/whatsapp/qr-status/` ist ausreichend. WebSocket waere eleganter, wuerde aber einen neuen Consumer erfordern und die Komplexitaet erhoehen. Der QR-Code wird als Base64-PNG vom Backend generiert.

**API-Flow**:
1. `POST /api/events/whatsapp/connect/` — Startet neonize-Client, generiert QR-Code
2. `GET /api/events/whatsapp/qr-status/` — Liefert Status (`pending_qr`, `connected`, `failed`) + QR-Code-Base64
3. `POST /api/events/whatsapp/disconnect/` — Trennt Verbindung, loescht Session

### 6. Unified Messaging-Service (Abstraktion ueber MailService)

**Entscheidung**: Ein neuer `MessagingService` wird als Fassade ueber `MailService` und `WhatsAppService` implementiert. Der bestehende `MailService` bleibt unveraendert.

**Begruendung**: Der `MailService` funktioniert und wird weiterhin fuer reine E-Mail-Funktionalitaet verwendet (z.B. Registrierungsbestaetigungen). Der `MessagingService` delegiert basierend auf dem gewaehlten Kanal. Platzhalter-Logik (`_replace_placeholders`) wird aus dem MailService extrahiert und geteilt.

**Betroffene Dateien**:
- Neu: `backend/event/services/messaging.py` — MessagingService
- Bestehend: `backend/event/services/mail.py` — bleibt, Placeholder-Logik wird shared

### 7. Empfaengeraufloesung fuer WhatsApp

**Entscheidung**: WhatsApp-Nummern werden aus dem `Participant`-Model abgeleitet. Da Participants keine Telefonnummer haben, wird ein optionales `phone_number`-Feld zum `Participant`-Model hinzugefuegt. Die Nummer wird aus dem verknuepften `Person`-Model uebernommen (bei `create_from_person` kopiert, wie alle anderen Person-Felder).

**Begruendung**: E-Mail-Adressen sind bereits pro Participant gespeichert. Fuer WhatsApp wird analog eine Telefonnummer benoetigt. Die Nummer wird beim Versand in eine WhatsApp-JID umgewandelt (`build_jid(phone_number)`), aber nicht dauerhaft als JID gespeichert. Person = Elternteil oder erwachsener Teilnehmer, Participant = Kind oder Teilnehmer beim Event. Beide koennen eine eigene Telefonnummer haben — das Feld ist optional.

**Telefonnummer-Erfassung**: Das `phone_number`-Feld wird an drei Stellen im Frontend angeboten:
1. PersonsPage (Personenverwaltung) — fuer Profil-Personen
2. GuestRegistrationPage (Gast-Registrierung) — fuer nicht-eingeloggte Gaeste
3. Beim Bearbeiten von Teilnehmern im Dashboard

**Migration**: Neues optionales Feld `phone_number` auf `Participant` (und `Person`).

### 8. WhatsApp-Verbindung auf Profilseite (nicht Event-Dashboard)

**Entscheidung**: Die WhatsApp-Verbindungsverwaltung (QR-Code, Status, Disconnect, Loeschen, Statistik) wird auf der Profilseite angezeigt, nicht im Event-Dashboard.

**Begruendung**: Die WhatsApp-Verbindung ist nutzerbezogen — ein QR-Code-Pairing gilt fuer alle Events des Nutzers. Im Event-Dashboard Nachrichten-Tab wird lediglich ein Status-Hinweis angezeigt ("WhatsApp verbunden" / "Nicht verbunden") mit Link zur Profilseite.

**Betroffene Dateien**:
- Frontend: Profilseite um WhatsApp-Sektion erweitern
- Frontend: MessagingTab zeigt WhatsApp-Status-Badge mit Link zur Profilseite
- Backend: WhatsApp-API-Endpunkte unter `/api/events/whatsapp/` (nicht event-spezifisch)

### 9. Graceful Reconnect nach Container-Neustart

**Entscheidung**: Der `WhatsAppClientManager` implementiert Graceful Reconnect. Wenn ein Cloud Run Container neu gestartet wird, geht der In-Memory neonize-Client verloren. Beim naechsten API-Request (Nachrichtenversand oder Status-Abfrage) wird der Client automatisch aus der PostgreSQL-Session neu gestartet — ohne erneutes QR-Code-Pairing.

**Begruendung**: Cloud Run Container sind ephemeral und koennen jederzeit herunterfahren (scale-to-zero, Redeployment, Health-Check-Failure). Das ist der Normalfall, nicht die Ausnahme. Da die Session in PostgreSQL persistiert ist, kann neonize den Client ohne QR-Code reconnecten. Der Manager prueft beim `get_or_create_client()` ob eine aktive `WhatsAppConnection` in der DB existiert und startet den Client mit der bestehenden Session.

**Fehlerfall**: Falls die Session in PostgreSQL korrupt ist oder WhatsApp die Session invalidiert hat, wird der Status auf `disconnected` gesetzt und der Nutzer muss erneut pairen.

### 10. WhatsApp-Verfuegbarkeits-Check vor Versand

**Entscheidung**: Vor dem Versand von WhatsApp-Nachrichten wird ueber neonize's `is_on_whatsapp(phone_numbers)` geprueft, ob die Empfaenger-Nummern tatsaechlich auf WhatsApp registriert sind. Das Ergebnis wird in der Preview angezeigt.

**Begruendung**: Nicht jede Telefonnummer ist auf WhatsApp registriert. Ohne Vorab-Check wuerden Nachrichten an nicht-registrierte Nummern fehlschlagen. Der Check verbessert die UX erheblich — Organisatoren sehen vorab, wer erreichbar ist.

**Integration**: Der Check wird im `MessagingService.preview()` ausgefuehrt. Die Preview zeigt pro Empfaenger: "Auf WhatsApp" (gruen), "Nicht auf WhatsApp" (rot/ausgegraut), "Keine Telefonnummer" (grau). Nur erreichbare Empfaenger werden in den Versand-Count einbezogen.

### 11. Nachrichtenvorlagen

**Entscheidung**: Das System bietet vordefinierte und benutzerdefinierte Nachrichtenvorlagen. Vorlagen bestehen aus einem Titel und einem Body-Text mit Platzhaltern. Sie sind kanalunabhaengig (sowohl fuer E-Mail als auch WhatsApp nutzbar). E-Mail-Vorlagen haben zusaetzlich ein Subject-Feld.

**Vordefinierte Vorlagen** (als Seed-Data):
- Zahlungserinnerung: "Hallo {vorname}, fuer {event_name} steht noch ein Restbetrag von {restbetrag} offen..."
- Packliste-Erinnerung: "Hallo {vorname}, denk bitte an deine Packliste fuer {event_name}..."
- Treffpunkt-Info: "Hallo {vorname}, wir treffen uns fuer {event_name} am..."

**Benutzerdefinierte Vorlagen**: Organisatoren koennen eigene Vorlagen erstellen, bearbeiten und loeschen. Vorlagen sind nutzerbezogen (nicht event-bezogen), damit sie ueber Events hinweg wiederverwendbar sind.

**Betroffene Dateien**:
- Neues Model: `MessageTemplate` (user FK, title, subject optional, body, is_system, created_at)
- Neue API: CRUD fuer Vorlagen
- Frontend: Vorlagen-Auswahl im MessageComposer

### 12. Rate-Limiting und Sicherheit

**Entscheidung**: Rate-Limiting auf Anwendungsebene — maximal 50 Nachrichten pro Stunde pro WhatsApp-Verbindung. Jede Nachricht erfordert explizite Bestaetigung. Kein Batch-/Massenversand.

**Begruendung**: WhatsApp hat eigene Rate-Limits und kann Nummern bei Missbrauch sperren. Konservatives App-seitiges Limit schuetzt die Nutzer-Accounts.

**API-Endpunkte (vollstaendig)**:

| Methode | Pfad | Request-Schema | Response-Schema |
|---------|------|----------------|-----------------|
| POST | `/api/events/whatsapp/connect/` | — | `WhatsAppQRResponseSchema` |
| GET | `/api/events/whatsapp/qr-status/` | — | `WhatsAppQRResponseSchema` |
| POST | `/api/events/whatsapp/disconnect/` | — | `{success: bool}` |
| GET | `/api/events/whatsapp/status/` | — | `WhatsAppConnectionStatusSchema` |
| DELETE | `/api/events/whatsapp/delete/` | — | `{success: bool}` |
| GET | `/api/events/whatsapp/stats/` | — | `WhatsAppStatsSchema` |
| POST | `/api/events/{event_id}/messages/preview/` | `SendMessageSchema` | `MessagePreviewSchema` |
| POST | `/api/events/{event_id}/messages/send/` | `SendMessageSchema` | `SendMessageResultSchema` |
| GET | `/api/events/message-templates/` | — | `list[MessageTemplateSchema]` |
| POST | `/api/events/message-templates/` | `MessageTemplateCreateSchema` | `MessageTemplateSchema` |
| PUT | `/api/events/message-templates/{id}/` | `MessageTemplateUpdateSchema` | `MessageTemplateSchema` |
| DELETE | `/api/events/message-templates/{id}/` | — | `{success: bool}` |

**Pydantic-Schemas**:
- `WhatsAppQRResponseSchema`: status (enum), qr_code_base64 (optional), phone_number (optional)
- `WhatsAppConnectionStatusSchema`: is_connected, phone_number, connected_since, total_messages_sent
- `WhatsAppStatsSchema`: total_sent, sent_today, sent_this_week, last_sent_at
- `SendMessageSchema`: channel (email/whatsapp), subject (email only), body, recipient_type, filters, participant_ids
- `MessagePreviewSchema`: recipients (list of name + contact + whatsapp_status), total_count, reachable_count, unreachable_count, channel, sample_message
- `SendMessageResultSchema`: sent_count, failed_count, failed_recipients

**Datenbank-Migrationen**:
1. Neues Model `WhatsAppConnection` (user FK unique, phone_number, session_db_name, connected_at, is_active, total_messages_sent)
2. Neues Model `WhatsAppMessage` (connection FK, event FK, participant FK, status, sent_at, error_message) — kein content-Feld (DSGVO)
3. Neues Model `MessageTemplate` (user FK, title, subject optional, body, is_system bool, created_at, updated_at)
4. Neues Feld `phone_number` auf `Person` und `Participant` (optional, CharField max 20)
5. Neuer TimelineActionChoices-Eintrag: `WHATSAPP_SENT`

## Risks / Trade-offs

**[WhatsApp Account-Sperre]** → WhatsApp kann Nummern sperren, die automatisierte Nachrichten senden. **Mitigation**: Konservatives Rate-Limiting (50/h), einzelne manuelle Bestaetigung, keine Bulk-Versendung, Warnhinweis in der UI.

**[neonize Stabilitaet]** → neonize ist eine Community-Bibliothek (367 Stars, aktive Entwicklung). **Mitigation**: Version pinnen, Session-Fehler graceful behandeln, Disconnect/Reconnect-Logik.

**[Multi-Instance auf Cloud Run]** → Mehrere Cloud Run Instanzen koennten denselben WhatsApp-Client starten. **Mitigation**: Verteiltes Lock via PostgreSQL Advisory Locks (`pg_advisory_lock`). Vor dem Starten eines neonize-Clients wird ein Advisory Lock auf die User-ID genommen. Nur die Instanz, die den Lock haelt, betreibt den Client. Da Sessions bereits in PostgreSQL liegen, ist kein zusaetzlicher Redis noetig.

**[neonize-Tabellen in Haupt-DB]** → neonize erstellt eigene Tabellen im `public`-Schema der PostgreSQL-Datenbank. Diese sind nicht durch Django-Migrationen verwaltet. **Mitigation**: neonize-Tabellen werden automatisch beim ersten Client-Connect erstellt. Bei GDPR-Loeschung muessen die neonize-internen Eintraege direkt via SQL geloescht werden (nach Client-Name/User-ID).

**[Datenschutz-Transparenz]** → Nutzer muessen klar verstehen, dass ihre persoenliche WhatsApp-Nummer fuer den Versand verwendet wird. **Mitigation**: Expliziter Consent-Dialog vor dem Pairing, Datenschutzhinweis, jederzeitige Loeschmoeglichkeit.

## Resolved Questions

1. **Telefonnummern-Erfassung**: Telefonnummer ist ein **optionales Feld** auf `Person` und `Participant`. Zweck: sowohl Kinder als auch Eltern sollen kontaktierbar sein. Wird bei Registrierung optional erfasst und kann spaeter ergaenzt werden.
2. **WhatsApp-Nachrichtenformatierung**: neonize sendet Textnachrichten als String an WhatsApp. WhatsApp unterstuetzt eigene Formatierung: `*fett*`, `_kursiv_`, `~durchgestrichen~`, ` ```Code``` `. Dies ist **kein Standard-Markdown**, sondern WhatsApp-eigene Syntax. Der Message-Editor zeigt einen Hinweis auf die unterstuetzte Formatierung. Kein Markdown-zu-WhatsApp-Konvertierung noetig — der Text wird 1:1 durchgereicht.
3. **Multi-Instanz-Locking**: **PostgreSQL Advisory Locks** (`pg_advisory_lock`) werden verwendet. Da Sessions bereits in PostgreSQL liegen, ist kein Redis noetig. Vor dem Starten eines neonize-Clients wird ein Advisory Lock auf die User-ID genommen.
4. **neonize PostgreSQL-Isolation**: neonize-Tabellen werden im **`public`-Schema** erstellt. Kein separates Schema noetig.
