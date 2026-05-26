## Context

Das Event-Modul von Inspi unterstuetzt aktuell nur authentifizierte Registrierungen: Nutzer muessen einen Account haben, um sich oder ihre Kinder fuer Events anzumelden. In der Realitaet wollen viele Eltern (besonders bei einmaligen Veranstaltungen) keinen Account anlegen. Organisatoren greifen daher auf manuelle Wege zurueck (E-Mail, Telefon), die nicht im System erfasst werden.

**Aktueller Stand:**
- `Registration` Model verknuepft immer `user` + `event` (FK, unique_together)
- `Person` Model gehoert immer einem `user` (FK, CASCADE)
- `Participant` wird per `create_from_person()` aus einer Person geklont
- `BookingOption` hat keine zeitliche Einschraenkung (kein `bookable_from`/`bookable_till`)
- Event-Erstellung im 4-Step Wizard ohne intelligente Defaults
- Admin-Registrierung (`register-admin`) erfordert existierende Persons + User IDs
- System BookingOption ("Kostenlos (Organisator)") existiert bereits mit `is_system=True`

**Stakeholder:** Organisatoren (Stammesleitung), Eltern (registrieren Kinder), Teilnehmer (aeltere Pfadfinder mit eigenem Account)

## Goals / Non-Goals

**Goals:**
- Eltern koennen Kinder ohne eigenen Account per Link registrieren
- Organisatoren koennen Personen manuell direkt im System erfassen (Inline-Formular)
- Buchungsoptionen haben Ablaufdaten fuer Fruehbucherrabatt
- Event-Erstellung wird durch intelligente Defaults beschleunigt
- Registrierungen koennen soft-deleted werden (Stornierung mit Begruendung)
- Bestaetigungs-E-Mail bei jeder Registrierung

**Non-Goals:**
- Bezahlung/Payment-Flow (bleibt manuell durch Organisator)
- OAuth/Social Login fuer Gaeste
- Wartelisten-Management
- Automatische E-Mail-Erinnerungen (nur manuelle E-Mails ueber bestehenden MailService)
- Multi-Schritt-Registrierungsformular (Gast-Registrierung ist ein einziges Formular)

## Decisions

### 1. Gast-Registrierung: Separater oeffentlicher Endpunkt

**Entscheidung:** Neuer Endpunkt `POST /api/events/{slug}/register-guest/` ohne Auth-Requirement.

**Alternativen:**
- (a) Token-basierter Einladungslink mit eigenem Auth-Mechanismus → zu komplex
- (b) Bestehenden `register` Endpunkt fuer unauthentifizierte Nutzer oeffnen → wuerde bestehende Auth-Logik brechen

**Rationale:** Ein separater Endpunkt haelt die bestehende Auth-Logik intakt und ist einfacher zu sichern (Rate Limiting, CAPTCHA spaeter). Das Event muss `guest_registration_enabled=True` haben.

**Betroffene Dateien:**
- `backend/event/api/events.py` — neuer Endpunkt
- `backend/event/schemas/core.py` — neues `GuestRegistrationIn` Schema
- `backend/event/services/guest_registration.py` — neuer Service (Account-Erstellung + Registration)

### 2. Auto-Account-Erstellung per E-Mail

**Entscheidung:** Bei Gast-Registrierung wird ein User-Account mit der angegebenen E-Mail erstellt. Falls die E-Mail bereits existiert, wird die Registration dem bestehenden Account zugeordnet (nach Pruefung, dass der User eingeladen ist oder das Event oeffentlich).

**Alternativen:**
- (a) Kein Account erstellen, reine "Gast-Registrierung" ohne User-Verknuepfung → verliert Zuordnung, keine spaetere Verwaltung moeglich
- (b) Pflicht-Account mit E-Mail-Verifikation vor Registrierung → zu viel Friction

**Rationale:** Automatische Account-Erstellung ermoeglicht spaeteres Login (Passwort-Reset), Zuordnung mehrerer Registrierungen, und E-Mail-Kommunikation. Kein automatisches Login nach Erstellung (kein Session-Cookie), da der Gast die Plattform nicht nutzen will.

**Betroffene Dateien:**
- `backend/event/services/guest_registration.py` — `create_or_get_user()`, `create_guest_registration()`

### 3. Inline-Personen-Erstellung bei Admin-Registrierung

**Entscheidung:** `register-admin` akzeptiert entweder `person_id` (bestehende Person) ODER inline `person_data` (Objekt mit first_name, last_name, email, etc.). Bei Inline wird erst eine Person erstellt, dann ein Participant daraus.

**Alternativen:**
- (a) Separater 2-Schritt-Prozess: erst Person erstellen, dann registrieren → zu umstaendlich fuer Organisatoren
- (b) Participant direkt erstellen ohne Person-Template → verliert wiederverwendbare Personen-Daten

**Rationale:** Union-Type im Schema (entweder `person_id` oder `person_data`) ist flexibel. Organisatoren koennen schnell neue Teilnehmer erfassen, ohne die Person-Verwaltung zu benutzen.

**Betroffene Dateien:**
- `backend/event/api/participants.py` — Endpunkt `register-admin` erweitern
- `backend/event/schemas/core.py` — `AdminRegisterIn` Schema erweitern

### 4. BookingOption Ablaufdatum

**Entscheidung:** Zwei neue Felder `bookable_from` (DateTimeField, nullable) und `bookable_till` (DateTimeField, nullable) auf `BookingOption`. Null = keine Einschraenkung.

**API-Aenderungen:**
- `BookingOptionOut` erhaelt `bookable_from`, `bookable_till`, `is_bookable` (computed boolean)
- `BookingOptionCreateIn` / `BookingOptionUpdateIn` erhalten `bookable_from`, `bookable_till`
- Regulaere Registrierung prueft `is_bookable`; Admin-Registrierung ueberspringt die Pruefung

**Betroffene Dateien:**
- `backend/event/models/core.py` — 2 neue Felder auf `BookingOption`
- `backend/event/schemas/core.py` — Schema-Erweiterungen
- `backend/event/api/events.py` — Validierung bei `register_for_event`
- `frontend/src/schemas/event.ts` — Zod-Schema Erweiterung

**Migration:** `uv run python manage.py makemigrations event`

### 5. Smart Defaults bei Event-Erstellung (Frontend-only)

**Entscheidung:** Reine Frontend-Logik in `NewEventPage.tsx`. Kein Backend-Endpunkt noetig.

- Startdatum gesetzt → Enddatum = naechster Sonntag (via date-fns `nextSunday()`)
- Startdatum gesetzt → Anmeldeschluss = Sonntag VOR Startdatum (via date-fns `previousSunday()`)
- Start + Enddatum gesetzt → Standard-BookingOption mit Preis = Anzahl Tage x 10 EUR

**Rationale:** Defaults sind UI-Logik, keine Business-Logik. Alle Werte koennen ueberschrieben werden.

**Betroffene Dateien:**
- `frontend/src/pages/NewEventPage.tsx` — `useEffect`-Hooks fuer Auto-Fill

### 6. Soft-Delete fuer Registrierungen

**Entscheidung:** `Registration` erhaelt `deleted_at` (DateTimeField, nullable), `deleted_by` (FK User, nullable), `deleted_reason` (CharField choices). Bestehende QuerySets werden mit `.filter(deleted_at__isnull=True)` eingeschraenkt via Custom Manager.

**Alternativen:**
- (a) Hard-Delete beibehalten → verliert Audit-Trail
- (b) Separates Archiv-Model → zu komplex

**Rationale:** Soft-Delete mit Begruendung gibt Organisatoren Transparenz ueber Stornierungen und ermoeglicht spaetere Statistiken.

**Betroffene Dateien:**
- `backend/event/models/core.py` — 3 neue Felder + Custom Manager auf `Registration`
- `backend/event/api/participants.py` — Delete-Endpunkt setzt `deleted_at` statt `.delete()`

**Migration:** `uv run python manage.py makemigrations event`

### 7. Bestaetigungs-E-Mail

**Entscheidung:** Erweiterung des bestehenden `MailService` um eine Template-basierte Bestaetigungs-E-Mail. Wird automatisch nach jeder erfolgreichen Registrierung (auch Gast) gesendet.

**Betroffene Dateien:**
- `backend/event/services/mail.py` — neue Methode `send_confirmation_email()`
- `backend/event/api/events.py` — Aufruf nach Registration

## Risks / Trade-offs

**[Spam bei Gast-Registrierung]** → Mitigation: Rate-Limiting auf IP-Basis (Django Ratelimit), Event muss `guest_registration_enabled=True` haben, spaeter optional CAPTCHA.

**[Doppel-Accounts bei Gast-Registrierung]** → Mitigation: E-Mail-Deduplizierung (case-insensitive). Falls E-Mail existiert, wird bestehender Account verwendet.

**[Soft-Delete Komplexität]** → Mitigation: Custom Manager `ActiveRegistrationManager` als Default-Manager, damit bestehender Code automatisch nur aktive Registrierungen sieht.

**[Migration existierender Daten]** → Mitigation: Alle neuen Felder sind nullable/optional. Keine Daten-Migration noetig, nur Schema-Migration.

**[Frontend Bundle-Groesse durch neue Gast-Seite]** → Mitigation: Lazy-Loading der Gast-Registrierungsseite via React.lazy().
