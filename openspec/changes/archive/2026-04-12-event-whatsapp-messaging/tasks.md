## 1. Dependencies und Grundstruktur

- [x] 1.1 `neonize` als Dependency in `backend/pyproject.toml` hinzufuegen und `uv run pip install neonize` ausfuehren
- [x] 1.2 `WHATSAPP_SENT` zu `TimelineActionChoices` in `backend/event/choices.py` hinzufuegen
- [x] 1.3 Django Settings konfigurieren: `WHATSAPP_RATE_LIMIT_PER_HOUR = 50`, neonize PostgreSQL connection string aus bestehender `DATABASE_URL` ableiten

## 2. Backend Models

- [x] 2.1 `phone_number`-Feld (optional, CharField max 20) zum `Person`-Model hinzufuegen (`backend/event/models/core.py`)
- [x] 2.2 `phone_number`-Feld (optional, CharField max 20) zum `Participant`-Model hinzufuegen und `create_from_person()` anpassen, damit es kopiert wird
- [x] 2.3 `WhatsAppConnection`-Model erstellen in `backend/event/models/whatsapp.py` (user FK unique, phone_number, session_db_name, connected_at, is_active, total_messages_sent, privacy_consent_given_at)
- [x] 2.4 `WhatsAppMessage`-Model erstellen in `backend/event/models/whatsapp.py` (connection FK, event FK, participant FK, status enum, sent_at, error_message — kein content-Feld)
- [x] 2.5 `MessageTemplate`-Model erstellen in `backend/event/models/whatsapp.py` (user FK nullable, title, subject optional, body, is_system bool, created_at, updated_at)
- [x] 2.6 Models in `backend/event/models/__init__.py` re-exportieren
- [x] 2.7 Migrationen erstellen und ausfuehren: `uv run python manage.py makemigrations event && uv run python manage.py migrate`

## 3. Backend Services

- [x] 3.1 Placeholder-Logik aus `MailService` in shared Utility extrahieren: `backend/event/services/placeholders.py` mit `replace_placeholders(text, participant, event)`
- [x] 3.2 `MailService.send_mail()` und `MailService.send_registration_confirmation()` auf shared Placeholder-Utility umstellen
- [x] 3.3 `WhatsAppClientManager` erstellen in `backend/event/services/whatsapp.py`: Singleton, neonize-Clients mit PostgreSQL als Session-Store (`database="postgres://..."`) initialisieren, PostgreSQL Advisory Locks (`pg_advisory_lock`) fuer Multi-Instanz-Sicherheit, Graceful Reconnect aus persistierter Session nach Container-Neustart, `get_or_create_client(user)`, `disconnect_client(user)`, `delete_client(user)`, `get_qr_code(user)`, `get_status(user)`, `send_message(user, jid, text)`
- [x] 3.4 `WhatsAppService` erstellen in `backend/event/services/whatsapp.py`: `connect(user)`, `disconnect(user)`, `delete_data(user)`, `get_qr_status(user)`, `send_to_participant(user, event, participant, text)`, `get_stats(user)`, `check_whatsapp_availability(phone_numbers)` — mit Rate-Limiting-Pruefung (50/h) und `is_on_whatsapp()`-Check
- [x] 3.5 `MessagingService` erstellen in `backend/event/services/messaging.py`: `preview(event, channel, body, recipient_type, user, filters, participant_ids)` mit WhatsApp-Verfuegbarkeits-Check in Preview, `send(event, channel, subject, body, recipient_type, user, filters, participant_ids)` — delegiert an MailService oder WhatsAppService
- [x] 3.6 GDPR-Hook: WhatsApp-Daten bei Account-Loeschung automatisch mitloeschen (Signal oder Service-Erweiterung), inkl. neonize-Session-Daten aus PostgreSQL
- [x] 3.7 Seed-Data fuer vordefinierte Nachrichtenvorlagen erstellen (Zahlungserinnerung, Packliste-Erinnerung, Treffpunkt-Info)

## 4. Backend Pydantic Schemas

- [x] 4.1 `WhatsAppQRResponseSchema` erstellen (status enum: pending_qr/connected/failed/timeout, qr_code_base64 optional, phone_number optional)
- [x] 4.2 `WhatsAppConnectionStatusSchema` erstellen (is_connected, phone_number, connected_since, total_messages_sent)
- [x] 4.3 `WhatsAppStatsSchema` erstellen (total_sent, sent_today, sent_this_week, last_sent_at)
- [x] 4.4 `SendMessageSchema` erstellen (channel enum email/whatsapp, subject optional, body, recipient_type, filters optional, participant_ids optional, template_id optional)
- [x] 4.5 `MessagePreviewSchema` erstellen (recipients list mit name + contact + whatsapp_status, total_count, reachable_count, unreachable_count, channel, sample_message)
- [x] 4.6 `SendMessageResultSchema` erstellen (sent_count, failed_count, failed_recipients list)
- [x] 4.7 `MessageTemplateSchema`, `MessageTemplateCreateSchema`, `MessageTemplateUpdateSchema` erstellen
- [x] 4.8 `PersonSchema` und `ParticipantSchema` um `phone_number` Feld erweitern
- [x] 4.9 `GuestRegistrationPersonSchema` um optionales `phone_number` Feld erweitern

## 5. Backend API Endpunkte

- [x] 5.1 WhatsApp-Connection-Router erstellen unter `/api/events/whatsapp/`: `POST connect/`, `GET qr-status/`, `POST disconnect/`, `GET status/`, `DELETE delete/`, `GET stats/`
- [x] 5.2 Messaging-Router erstellen unter `/api/events/{event_slug}/messages/`: `POST preview/`, `POST send/`
- [x] 5.3 MessageTemplate-Router erstellen unter `/api/events/message-templates/`: `GET list`, `POST create`, `PUT {id}/update`, `DELETE {id}/delete`
- [x] 5.4 Auth-Guards: Alle WhatsApp-Endpunkte erfordern authentifizierten User. Messaging-Endpunkte erfordern Event-Management-Berechtigung
- [x] 5.5 Privacy-Consent-Check: `POST connect/` erfordert `privacy_consent: true` im Request Body
- [x] 5.6 Bestehende Person-API um `phone_number`-Feld erweitern
- [x] 5.7 Bestehende Guest-Registration-API um `phone_number`-Feld erweitern

## 6. Frontend Zod Schemas (sync mit Backend)

- [x] 6.1 `WhatsAppQRResponseSchema` Zod-Schema erstellen
- [x] 6.2 `WhatsAppConnectionStatusSchema` Zod-Schema erstellen
- [x] 6.3 `WhatsAppStatsSchema` Zod-Schema erstellen
- [x] 6.4 `SendMessageSchema` Zod-Schema erstellen
- [x] 6.5 `MessagePreviewSchema` Zod-Schema erstellen (inkl. whatsapp_status pro Empfaenger)
- [x] 6.6 `SendMessageResultSchema` Zod-Schema erstellen
- [x] 6.7 `MessageTemplateSchema` Zod-Schema erstellen
- [x] 6.8 `PersonSchema` und `ParticipantSchema` um `phone_number` erweitern
- [x] 6.9 `GuestRegistrationPersonSchema` um `phone_number` erweitern

## 7. Frontend API Hooks

- [x] 7.1 TanStack Query Hooks fuer WhatsApp-Connection: `useWhatsAppConnect`, `useWhatsAppQRStatus` (mit 2s Polling via refetchInterval), `useWhatsAppDisconnect`, `useWhatsAppStatus`, `useWhatsAppDelete`, `useWhatsAppStats`
- [x] 7.2 TanStack Query Hooks fuer Messaging: `useMessagePreview`, `useSendMessage`
- [x] 7.3 TanStack Query Hooks fuer Vorlagen: `useMessageTemplates`, `useCreateMessageTemplate`, `useUpdateMessageTemplate`, `useDeleteMessageTemplate`
- [x] 7.4 API-Funktionen in `frontend/src/api/` erstellen (fetchJson/postJson Pattern)

## 8. Frontend Komponenten — WhatsApp-Verbindung (Profilseite)

- [x] 8.1 `WhatsAppConnectionCard` erstellen: Zeigt Verbindungsstatus, maskierte Telefonnummer, Verbinden/Trennen-Buttons, Statistik
- [x] 8.2 `WhatsAppQRCodeDialog` erstellen: Modal mit QR-Code-Anzeige, Datenschutzhinweis, Consent-Checkbox, Auto-Polling bis connected
- [x] 8.3 `WhatsAppPrivacyNotice` erstellen: Datenschutz-Hinweistext (was wird gespeichert, was nicht, wie loeschen)
- [x] 8.4 `WhatsAppStatsDisplay` erstellen: Nachrichtenstatistik (total, heute, diese Woche)
- [x] 8.5 `WhatsAppDeleteDialog` erstellen: Bestaetigungsdialog fuer irreversible Datenloeschung
- [x] 8.6 WhatsApp-Sektion auf der Profilseite integrieren

## 9. Frontend Komponenten — Unified Messaging

- [x] 9.1 `MailTab.tsx` zu `MessagingTab.tsx` umbenennen/umbauen mit Kanal-Selektor (E-Mail / WhatsApp) und WhatsApp-Status-Badge (verlinkt zur Profilseite)
- [x] 9.2 `ChannelSelector` Komponente erstellen (Radio-Buttons oder Segmented Control fuer E-Mail/WhatsApp)
- [x] 9.3 `MessageComposer` Komponente erstellen: Subject-Feld (nur E-Mail), Body-Feld mit WhatsApp-Formatierungshinweis (`*fett*`, `_kursiv_`, `~durchgestrichen~`, ` ```Code``` `), Platzhalter-Hilfe, Empfaengertyp-Auswahl, Vorlagen-Auswahl
- [x] 9.4 `TemplateSelector` Komponente erstellen: Dropdown/Liste mit System- und User-Vorlagen, Vorlagen-Verwaltung (erstellen, bearbeiten, loeschen)
- [x] 9.5 `MessagePreviewDialog` erstellen: Liste aller Empfaenger mit Name + Kontaktinfo (maskiert) + WhatsApp-Verfuegbarkeitsstatus (gruen/rot/grau), nicht erreichbare markiert, Gesamtanzahl, Beispielnachricht
- [x] 9.6 `SendConfirmationDialog` erstellen: Finale Bestaetigung "{count} Nachrichten per {channel} senden?"
- [x] 9.7 `SendResultDisplay` erstellen: Erfolgs-/Fehlermeldung mit Details zu fehlgeschlagenen Empfaengern
- [x] 9.8 Tab-Referenz im Event-Dashboard von "E-Mail"/"MailTab" auf "Nachrichten"/"MessagingTab" aktualisieren
- [x] 9.9 Phone-Number-Eingabefeld in PersonsPage PersonForm hinzufuegen (internationales Format mit Validierung)
- [x] 9.10 Phone-Number-Eingabefeld in GuestRegistrationPage PersonForm hinzufuegen (optional, mit WhatsApp-Hinweis)

## 10. Datenschutz und Sicherheit

- [x] 10.1 Rate-Limiting in WhatsAppService implementieren (50 Nachrichten/Stunde, Pruefung via WhatsAppMessage count der letzten Stunde)
- [x] 10.2 GDPR Data-Export um WhatsApp-Daten erweitern (Verbindungsstatus, Nachrichtenanzahl — keine Inhalte)
- [x] 10.3 GDPR Data-Overview um WhatsApp-Sektion erweitern
- [x] 10.4 GDPR Account-Deletion um WhatsApp-Datenloeschung erweitern (inkl. neonize-Session-Daten aus PostgreSQL loeschen)

## 11. Tests

- [x] 11.1 Backend-Tests: `WhatsAppConnection`, `WhatsAppMessage`, `MessageTemplate` Model-Tests
- [x] 11.2 Backend-Tests: Placeholder-Utility Tests (extrahierte Logik)
- [x] 11.3 Backend-Tests: MessagingService Tests (Delegation an Mail/WhatsApp, Preview-Logik, is_on_whatsapp Mock)
- [x] 11.4 Backend-Tests: WhatsApp API-Endpunkte (Auth-Guards, Validation, Error Cases)
- [x] 11.5 Backend-Tests: MessageTemplate CRUD API-Tests
- [x] 11.6 Backend-Tests: Rate-Limiting Tests
- [x] 11.7 Backend-Tests: Phone-Number-Validierung
- [x] 11.8 Backend-Tests: Graceful Reconnect Logik (Mock neonize Client)
- [x] 11.9 Frontend-Tests: Zod-Schema-Validierung
- [x] 11.10 Frontend-Tests: API-Hook Tests (Mock-Responses)
