## Why

Event-Organisatoren muessen derzeit manuell eine kostenlose Buchungsoption anlegen, wenn sie Teilnehmer ohne Kosten registrieren wollen. Gleichzeitig gibt es keinen einheitlichen Weg, Teilnehmer als "organisator-vergeben" zu kennzeichnen. Ein automatisch angelegter, kostenloser Buchungstyp (0 EUR) pro Event wuerde den Workflow fuer Organisatoren vereinfachen und sicherstellen, dass es immer eine "Gratis"-Option gibt -- die ausschliesslich von Organisatoren ausgewaehlt werden kann, nicht von regulaeren Teilnehmern bei der Selbstregistrierung.

## What Changes

- **Automatische "Kostenlos"-BookingOption**: Bei jedem Event wird automatisch eine System-BookingOption mit Preis 0 EUR angelegt (Name: "Kostenlos (Organisator)"). Diese wird beim Erstellen des Events automatisch erzeugt.
- **Nur fuer Organisatoren sichtbar**: Die System-BookingOption wird bei der oeffentlichen Registrierung (Self-Service) ausgefiltert. Nur Organisatoren/Admins sehen und koennen sie bei der Teilnehmer-Verwaltung auswaehlen.
- **Neues Flag auf BookingOption**: Ein `is_system` Boolean-Feld kennzeichnet die automatisch erzeugte Option. System-Optionen koennen nicht geloescht oder umbenannt werden.
- **Bestehende Events**: Eine Migration legt die System-BookingOption fuer alle bestehenden Events an.
- **API-Filterung**: Listen-Endpunkte fuer BookingOptions filtern `is_system=True` Optionen fuer nicht-privilegierte Nutzer heraus.
- **Abgelaufene Buchungsoptionen**: Der Organisator hat immer die Moeglichkeit, auch abgelaufene Buchungstypen manuell zu vergeben.

## Capabilities

### New Capabilities
- `auto-free-booking-option`: Automatische Erstellung und Verwaltung einer System-BookingOption (0 EUR) pro Event, nur fuer Organisatoren sichtbar und auswaehlbar.

### Modified Capabilities
- `event-management`: Registrierungs-Flow muss System-BookingOptions fuer regulaere Nutzer ausfiltern; Organisator-Registrierung muss sie einschliessen.

## Impact

- **Backend Django Apps**: `event` (Models, API, Schemas)
  - `BookingOption` Model: Neues `is_system` BooleanField
  - Neue Data-Migration: System-BookingOption fuer bestehende Events
  - API-Endpunkte: Filterlogik fuer `is_system` bei Registrierung und Listen
  - Pydantic Schemas: `BookingOptionOut` um `is_system` erweitern, `BookingOptionCreateIn` darf `is_system` nicht setzen
- **Frontend React**: `event` Features
  - Zod Schema: `BookingOptionSchema` um `is_system` erweitern
  - `RegisterForm`: System-Optionen nur fuer Organisatoren anzeigen
  - `BookingOptionsSection` (Dashboard): System-Optionen als nicht-loeschbar/nicht-editierbar kennzeichnen
  - `NewEventPage`: Kein manuelles Anlegen der System-Option noetig
- **Migrationen**: 1 Schema-Migration (is_system Feld) + 1 Data-Migration (bestehende Events)
