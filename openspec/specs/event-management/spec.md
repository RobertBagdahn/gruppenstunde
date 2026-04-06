# event-management Specification

## Purpose

Vollstaendiges Event-Management-System fuer Pfadfinder-Gruppenaktivitaeten. Umfasst Event-Erstellung, Buchungsoptionen mit Preisgestaltung, Benutzer-Registrierung mit Teilnehmerverwaltung, Einladungsverteilung an Gruppen und einzelne Benutzer, sowie Event-Standort-Verwaltung. Verwendet ein Snapshot-Muster, bei dem Personendaten zum Zeitpunkt der Registrierung als Participant geklont werden.

## Requirements

### Requirement: Event CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Events ueber `/api/events/` bereitstellen. Events werden per Slug identifiziert (nicht per ID).

#### Scenario: Event erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer POST `/api/events/` mit Name, Beschreibung, Daten und Sichtbarkeitseinstellungen absendet
- THEN wird das Event mit einem URL-sicheren Slug erstellt
- AND der Ersteller wird als verantwortliche Person gesetzt

#### Scenario: Event erstellen (nicht authentifiziert)

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN der Benutzer POST `/api/events/` aufruft
- THEN wird HTTP 401 Unauthorized zurueckgegeben

#### Scenario: Event per Slug abrufen

- GIVEN ein oeffentliches Event mit Slug "sommerlager-2025"
- WHEN ein beliebiger Benutzer GET `/api/events/sommerlager-2025/` aufruft
- THEN werden die vollstaendigen Event-Details inkl. Buchungsoptionen und Standort zurueckgegeben
- AND fuer den Event-Ersteller enthaelt die Antwort `is_manager: true` und `all_registrations`
- AND fuer registrierte Benutzer enthaelt die Antwort `is_registered: true` und `my_registration`

#### Scenario: Event aktualisieren (nur Ersteller oder Admin)

- GIVEN der Event-Ersteller oder ein Admin
- WHEN der Benutzer PATCH `/api/events/{slug}/` absendet
- THEN wird das Event mit neuen Daten aktualisiert

#### Scenario: Event loeschen

- GIVEN der Event-Ersteller oder ein Admin
- WHEN der Benutzer DELETE `/api/events/{slug}/` aufruft
- THEN werden das Event und alle zugehoerigen Registrierungen und Participants per CASCADE entfernt

### Requirement: Event-Sichtbarkeit

Das System SHALL zwei Sichtbarkeitsstufen fuer Events unterstuetzen, gesteuert ueber das Feld `is_public` (BooleanField).

#### Scenario: Oeffentliches Event

- GIVEN ein Event mit `is_public=true`
- WHEN ein beliebiger Benutzer Events durchsucht
- THEN ist das Event in der oeffentlichen Event-Liste sichtbar

#### Scenario: Nur-Einladung-Event

- GIVEN ein Event mit `is_public=false`
- WHEN ein nicht-eingeladener Benutzer Events durchsucht
- THEN ist das Event fuer ihn nicht sichtbar
- AND eingeladene Benutzer koennen das Event weiterhin sehen und sich registrieren

#### Scenario: Direktzugriff auf privates Event per Slug

- GIVEN ein Event mit `is_public=false`
- WHEN ein nicht-eingeladener Benutzer den Event-Slug direkt aufruft
- THEN wird HTTP 403 Forbidden oder HTTP 404 Not Found zurueckgegeben

### Requirement: Buchungsoptionen

Das System SHALL mehrere Buchungsoptionen pro Event mit individueller Preisgestaltung und Kapazitaetsbegrenzung unterstuetzen.

#### Scenario: Buchungsoption erstellen

- GIVEN ein Event wird erstellt oder bearbeitet
- WHEN der Organisator eine Buchungsoption mit Name, Beschreibung, Preis und `max_participants` per POST `/api/events/{slug}/booking-options/` hinzufuegt
- THEN wird die BookingOption mit dem Event verknuepft
- AND die Antwort enthaelt `current_participant_count` und `is_full`

#### Scenario: Buchungsoption-Kapazitaetspruefung

- GIVEN eine Buchungsoption mit `max_participants = 20` und 19 registrierten Teilnehmern
- WHEN ein neuer Teilnehmer fuer diese Option registriert wird
- THEN wird die Registrierung akzeptiert
- AND `is_full` zeigt `true` an

#### Scenario: Buchungsoption ausgebucht

- GIVEN eine Buchungsoption bei der `max_participants` erreicht ist
- WHEN ein neuer Teilnehmer versucht sich zu registrieren
- THEN wird die Registrierung mit einer passenden Meldung abgelehnt

#### Scenario: Buchungsoption loeschen

- GIVEN eine Buchungsoption ohne zugeordnete Teilnehmer
- WHEN der Organisator DELETE `/api/events/{slug}/booking-options/{id}/` aufruft
- THEN wird die Buchungsoption entfernt

### Requirement: Event-Registrierung

Das System MUST Benutzer-Registrierung fuer Events mit Teilnehmer-Zuweisung unterstuetzen.

#### Scenario: Fuer Event registrieren

- GIVEN ein authentifizierter Benutzer mit bestehenden Person-Datensaetzen
- WHEN der Benutzer eine Registrierung per POST `/api/events/{slug}/register/` absendet (Body: `{ persons: [{ person_id, booking_option_id? }] }`)
- THEN wird ein Registration-Datensatz erstellt, der den Benutzer mit dem Event verknuepft
- AND ausgewaehlte Personen werden als Participant-Datensaetze geklont (Snapshot-Muster)
- AND Teilnehmerdaten (Name, Adresse, Ernaehrungs-Tags) werden zum Registrierungszeitpunkt eingefroren

#### Scenario: Snapshot-Muster-Durchsetzung

- GIVEN ein Benutzer, der fuer ein Event registriert ist mit geklonten Teilnehmerdaten
- WHEN der Benutzer spaeter sein Person-Profil aktualisiert
- THEN bleiben die Participant-Daten fuer vergangene Registrierungen unveraendert
- AND nur neue Registrierungen verwenden die aktualisierten Person-Daten

#### Scenario: Registrierung mit Buchungsoptionswahl

- GIVEN ein Event mit mehreren Buchungsoptionen
- WHEN der Benutzer sich registriert
- THEN wird jeder Teilnehmer einer bestimmten Buchungsoption zugewiesen
- AND der `current_participant_count` der Buchungsoption wird erhoeht

#### Scenario: Registrierung stornieren

- GIVEN ein Benutzer, der fuer ein Event registriert ist
- WHEN ein Teilnehmer per DELETE `/api/events/{slug}/participants/{participantId}/` entfernt wird
- THEN wird der Participant-Datensatz geloescht
- AND der `current_participant_count` der Buchungsoption wird verringert

### Requirement: Anmeldefrist

Das System SHALL Anmeldefristen fuer Events durchsetzen. Events haben die Felder `registration_start` und `registration_deadline` (beide DateTimeField, nullable).

#### Scenario: Anmeldung vor Fristende

- GIVEN ein Event mit `registration_deadline` in der Zukunft
- WHEN ein Benutzer versucht sich anzumelden
- THEN wird die Registrierung akzeptiert

#### Scenario: Anmeldung nach Fristende

- GIVEN ein Event dessen `registration_deadline` abgelaufen ist
- WHEN ein Benutzer versucht sich anzumelden
- THEN wird die Registrierung mit einer Frist-abgelaufen-Meldung abgelehnt

#### Scenario: Anmeldung vor Registrierungsstart

- GIVEN ein Event mit `registration_start` in der Zukunft
- WHEN ein Benutzer versucht sich anzumelden
- THEN wird die Registrierung mit einer Meldung abgelehnt, dass die Anmeldung noch nicht geoeffnet ist

### Requirement: Teilnehmerverwaltung

Das System SHALL Event-Organisatoren die Verwaltung von Teilnehmern ermoeglichen.

#### Scenario: Teilnehmerliste anzeigen

- GIVEN ein Event mit Registrierungen
- WHEN der Organisator die Event-Detailseite aufruft (als Manager)
- THEN enthaelt die Antwort `all_registrations` mit allen Registrierungen und deren Participants

#### Scenario: Zahlungsverfolgung

- GIVEN Teilnehmer, die fuer ein Event registriert sind
- WHEN der Organisator einen Teilnehmer per PATCH `/api/events/{slug}/participants/{participantId}/` als bezahlt markiert (`{ is_paid: true }`)
- THEN wird der Zahlungsstatus des Participants aktualisiert

### Requirement: Event-Einladungen

Das System SHALL das Einladen von Gruppen und einzelnen Benutzern zu Events unterstuetzen.

#### Scenario: Gruppe zu Event einladen

- GIVEN ein Event und eine UserGroup
- WHEN der Organisator die Gruppe per POST `/api/events/{slug}/invite-group/` einlaedt (Body: `{ group_slug: string }`)
- THEN koennen alle Mitglieder der Gruppe das Event in ihrer "Eingeladene Events"-Liste sehen

#### Scenario: Einzelne Benutzer einladen

- GIVEN ein Event und bestimmte Benutzer
- WHEN der Organisator die Benutzer per POST `/api/events/{slug}/invite-users/` einlaedt (Body: `number[]` mit User-IDs)
- THEN sehen die Benutzer das Event in ihrer "Eingeladene Events"-Liste

#### Scenario: Eingeladene Events anzeigen

- GIVEN ein authentifizierter Benutzer, der zu Events eingeladen wurde
- WHEN der Benutzer GET `/api/events/my-invited/` aufruft
- THEN werden alle Events zurueckgegeben, zu denen er eingeladen wurde (direkt oder ueber Gruppe)

#### Scenario: Eigene registrierte Events anzeigen

- GIVEN ein authentifizierter Benutzer, der fuer Events registriert ist
- WHEN der Benutzer GET `/api/events/my-registered/` aufruft
- THEN werden alle Events zurueckgegeben, fuer die der Benutzer Registrierungen hat

### Requirement: Event-Standort-Verwaltung

Das System SHALL wiederverwendbare Event-Standorte als `EventLocation`-Datensaetze unterstuetzen.

#### Scenario: Standort erstellen

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer einen Standort per POST `/api/locations/` erstellt
- THEN wird der EventLocation mit den Feldern `name`, `street`, `zip_code`, `city`, `state`, `country`, `description` gespeichert

#### Scenario: Standorte auflisten

- GIVEN bestehende EventLocations
- WHEN ein Benutzer GET `/api/locations/` aufruft
- THEN werden alle Standorte zurueckgegeben (staleTime: 5 Minuten)

#### Scenario: Standort fuer Event verwenden

- GIVEN ein bestehender EventLocation
- WHEN ein neues Event erstellt wird
- THEN kann der Benutzer einen bestehenden Standort per `event_location_id` waehlen oder einen neuen erstellen

## Planned Features

Die folgenden Features sind geplant, aber noch nicht implementiert:

### Planned: E-Mail-Benachrichtigungen

- Derzeit gibt es keine E-Mail-Benachrichtigungen bei Event-Einladungen, Registrierungen oder Anmeldefrist-Erinnerungen.
- Geplant: E-Mail-Service mit Templates fuer Einladungen und Registrierungsbestaetigungen.
