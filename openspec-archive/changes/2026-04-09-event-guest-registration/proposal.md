## Why

Aktuell erfordert die Event-Registrierung immer einen authentifizierten Account. In der Praxis wollen viele Eltern sich nicht extra auf der Plattform anmelden, nur um ihre Kinder fuer ein Wochenendlager zu registrieren. Organisatoren muessen dann telefonisch oder per E-Mail Anmeldungen entgegennehmen und haben keine einfache Moeglichkeit, diese im System zu erfassen. Ausserdem fehlen Komfortfeatures bei der Event-Erstellung (intelligente Standardwerte, automatische Datumsvorschlaege) und bei den Buchungsoptionen (Ablaufdaten fuer Fruehbucherrabatt, Standard-Preisberechnung).

## What Changes

### Gast-Registrierung (ohne Account)
- Oeffentlicher Registrierungslink pro Event, ueber den Eltern ihre Kinder direkt anmelden koennen — ohne eigenen Account
- Das Gast-Registrierungsformular enthaelt alle Teilnehmer-Felder plus eine E-Mail-Abfrage am Ende
- Nach Absenden wird automatisch ein User-Account erstellt (mit der angegebenen E-Mail) und die Person + Registration zugeordnet
- Der Organisator kann den Registrierungslink teilen (z.B. per E-Mail, WhatsApp, Aushang)

### Manuelle Registrierung durch Organisator
- **BREAKING**: Der bestehende `register-admin` Endpunkt wird erweitert, sodass Organisatoren Personen-Daten direkt inline eingeben koennen (ohne vorherige Person-Erstellung)
- Organisatoren koennen immer ALLE Buchungsoptionen auswaehlen — inklusive system BookingOption ("Kostenlos") und abgelaufene Optionen
- Organisatoren koennen bestehende Registrierungen vollstaendig bearbeiten und Teilnehmer wieder abmelden

### Buchungsoptionen mit Ablaufdatum
- **BREAKING**: BookingOption erhaelt neue Felder `bookable_from` und `bookable_till` fuer zeitgesteuerte Verfuegbarkeit (z.B. Fruehbucherrabatt)
- Regulaere User sehen nur aktuell gueltige Buchungsoptionen; Organisatoren sehen und koennen immer alle auswaehlen
- Standard-Buchungsoption wird beim Event-Erstellen automatisch vorberechnet: Preis = Anzahl Tage x 10 EUR

### Intelligente Event-Erstellungs-Defaults
- Nach Auswahl des Startdatums: Enddatum automatisch auf den naechsten Sonntag setzen
- Anmeldeschluss automatisch auf den Sonntag VOR dem Startdatum setzen
- Standard-Buchungsoption "Standard" wird automatisch mit berechnetem Preis (Tage x 10 EUR) vorausgefuellt
- Alle Defaults koennen vom Organisator ueberschrieben werden

### Weitere Features (inspiriert vom Referenz-Projekt anmelde_tool)
- Soft-Delete fuer Registrierungen mit Begruendung (Duplikat, Fehler, Stornierung, Sonstiges)
- Bestaetigungs-E-Mail bei erfolgreicher Registrierung (auch bei Gast-Registrierung)
- Registrierungstyp-Konfiguration: Einzel- vs. Gruppen-Registrierung

## Capabilities

### New Capabilities
- `event-guest-registration`: Oeffentliche Gast-Registrierung ohne Account per Link, automatische Account-Erstellung mit E-Mail, Registrierungsformular fuer nicht-authentifizierte Nutzer
- `event-smart-defaults`: Intelligente Standardwerte bei Event-Erstellung (Datums-Autofill, Standard-Buchungsoption mit Preisberechnung)
- `event-registration-lifecycle`: Soft-Delete fuer Registrierungen, Bestaetigungs-E-Mails, erweiterte Admin-Registrierung mit Inline-Personen-Erstellung

### Modified Capabilities
- `auto-free-booking-option`: BookingOption-Model erhaelt `bookable_from`/`bookable_till` Felder fuer zeitgesteuerte Verfuegbarkeit. Organisatoren koennen immer alle Optionen (inkl. abgelaufener) auswaehlen.
- `event-member-view`: Registration-Tab wird um Gast-Registrierungs-Link-Anzeige fuer Organisatoren erweitert. Registrierungsformular zeigt nur aktuell gueltige Buchungsoptionen.

## Impact

### Backend (Django, `event` App)
- **Models**: `BookingOption` erhaelt `bookable_from`, `bookable_till` Felder. `Registration` erhaelt Soft-Delete Felder (`deleted_at`, `deleted_by`, `deleted_reason`). Neues Feld `Event.guest_registration_enabled` (Boolean).
- **Schemas**: Neue Pydantic-Schemas fuer Gast-Registrierung (`GuestRegistrationIn`), erweiterte `BookingOptionOut`/`BookingOptionCreateIn` mit Ablaufdatum-Feldern, erweiterte `AdminRegisterIn` mit Inline-Personen-Daten.
- **API**: Neuer oeffentlicher Endpunkt `POST /api/events/{slug}/register-guest/` (keine Auth noetig). Erweiterung von `register-admin` fuer Inline-Personen-Erstellung. Neuer Endpunkt fuer Gast-Registrierungslink-Generierung.
- **Services**: Neuer `GuestRegistrationService` fuer Account-Erstellung + Registrierung. Erweiterung `MailService` fuer Bestaetigungs-E-Mails.
- **Migrations**: 2-3 neue Migrationen fuer BookingOption + Registration + Event Model-Aenderungen.

### Frontend (React, `event` Komponenten)
- **Schemas**: Zod-Schemas fuer `BookingOptionSchema` (neue Felder), `GuestRegistrationSchema`, erweiterte Admin-Registration.
- **Pages**: Neue oeffentliche Seite `/events/{slug}/register` fuer Gast-Registrierung.
- **Components**: Erweiterung `NewEventPage.tsx` (Step 0) mit Smart-Defaults-Logik. Erweiterung `SettingsTab.tsx` fuer Gast-Registrierungslink. Erweiterung `RegistrationTab.tsx` fuer zeitbasierte Buchungsoptionen. Erweiterung `ParticipantsTab.tsx` fuer erweiterte Admin-Registrierung.
- **Hooks**: Neue TanStack Query Hooks fuer Gast-Registrierung.

### Auth
- Automatische Account-Erstellung per E-Mail bei Gast-Registrierung (Django Allauth Integration).
- Session wird nach Account-Erstellung NICHT automatisch gestartet (Gast bleibt unangemeldet, erhaelt nur Bestaetigungs-E-Mail).
