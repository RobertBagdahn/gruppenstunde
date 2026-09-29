## MODIFIED Requirements

### Requirement: Bestätigungsdialog im Frontend

Das Frontend MUSS (SHALL) vor der Konto-Löschung einen mehrstufigen Bestätigungsdialog anzeigen:

1. **Schritt 1**: Warnung mit Auflistung, was gelöscht wird (Profil, Events, Kommentare, verknüpfte Anmeldungen etc.)
2. **Schritt 2**: Bestätigungstext "KONTO LÖSCHEN" eintippen
3. **Schritt 3**: Button "Konto endgültig löschen" (rot, disabled bis der Bestätigungstext korrekt ist)

Antwortet das Backend mit `reauth_required`, MUSS der Dialog die erneute Anmeldung beim zuletzt genutzten Anbieter anbieten, mit Rücksprung auf den Löschdialog. Nach erfolgreicher Löschung MUSS der Nutzer auf die Startseite weitergeleitet werden, mit einem Toast "Dein Konto wurde gelöscht".

#### Scenario: Nutzer durchläuft den Bestätigungsdialog
- **WHEN** ein Nutzer auf "Konto löschen" klickt
- **THEN** öffnet sich ein Dialog mit Warnung, Bestätigungstext-Eingabe und einem deaktivierten Lösch-Button, ohne Passwortfeld

#### Scenario: Lösch-Button wird erst bei vollständiger Eingabe aktiviert
- **WHEN** der Nutzer den Bestätigungstext "KONTO LÖSCHEN" korrekt eingegeben hat
- **THEN** wird der Lösch-Button aktiviert

#### Scenario: Erneute Anmeldung erforderlich
- **WHEN** das Backend `reauth_required` meldet
- **THEN** zeigt der Dialog „Bitte melde dich zur Sicherheit noch einmal an.“ mit dem Button des zuletzt genutzten Anbieters
- **AND** nach der Anmeldung öffnet sich der Löschdialog erneut

#### Scenario: Weiterleitung nach erfolgreicher Löschung
- **WHEN** die Konto-Löschung erfolgreich war
- **THEN** wird der Nutzer auf `/` weitergeleitet und sieht den Toast "Dein Konto wurde gelöscht"

### Requirement: Pydantic-Schema für Konto-Löschung

Das Backend MUSS (SHALL) ein `DeleteAccountRequestSchema` bereitstellen:

```text
DeleteAccountRequestSchema:
  confirmation: str  (muss exakt "KONTO LÖSCHEN" sein)
```

#### Scenario: Schema validiert korrekten Request
- **WHEN** ein Request mit `confirmation: "KONTO LÖSCHEN"` eingeht
- **THEN** validiert das Schema erfolgreich

#### Scenario: Schema lehnt falschen Bestätigungstext ab
- **WHEN** ein Request mit `confirmation: "löschen"` eingeht
- **THEN** schlägt die Schema-Validierung fehl

## ADDED Requirements

### Requirement: Konto-Löschung per Social Login mit Anonymisierung

Das System MUSS authentifizierten Nutzern ermöglichen, ihr Konto vollständig zu löschen. Die Löschung MUSS alle personenbezogenen Daten anonymisieren, wobei die Integrität von Event-Statistiken und veröffentlichten Inhalten erhalten bleibt. Da die Anmeldung ausschließlich per Social Login erfolgt, SHALL die Löschung statt eines Passworts eine frische Anmeldung verlangen: Der letzte Login der Session darf höchstens 15 Minuten zurückliegen.

Anonymisierungs-Regeln:
1. `auth.User`: `email` → `deleted-{uuid}@anon.local`, `first_name`/`last_name` → `""`, `username` → `deleted-{uuid}`, `is_active` → `False`, Passwort wird unbrauchbar gesetzt
2. `profiles.UserProfile`: Alle Felder leeren, Profilbild aus Cloud Storage löschen
3. `profiles.UserPreference`: Alle Felder auf Default-Werte zurücksetzen
4. `event.Person` (wo `user=deleted_user`): `first_name`/`last_name` → `"Gelöscht"`, `email`/`address`/`zip_code`/`city` → `""`, `birthday` → `None`
5. `event.Participant` (verknüpft über Person/Registration): Gleiche Anonymisierung wie Person
6. `content.ContentComment` (wo `user=deleted_user`): `author_name` → `"Gelöscht"`, Text bleibt erhalten
7. `content.ContentView`/`content.SearchLog`: Einträge des Nutzers direkt löschen
8. `content.ContentEmotion`: Einträge des Nutzers direkt löschen
9. `profiles.GroupMembership`/`GroupJoinRequest`: Direkt löschen
10. `socialaccount.SocialAccount` und `socialaccount.SocialToken` des Nutzers sowie `account.EmailAddress`: Direkt löschen
11. Alle FK-Referenzen mit `on_delete=SET_NULL` werden automatisch auf NULL gesetzt

Die gesamte Anonymisierung MUSS in einer einzigen Datenbank-Transaktion ausgeführt werden.

#### Scenario: Frisch angemeldeter Nutzer löscht Konto
- **GIVEN** der letzte Login des Nutzers liegt höchstens 15 Minuten zurück
- **WHEN** der Nutzer `POST /api/auth/privacy/delete-account/` mit `confirmation: "KONTO LÖSCHEN"` aufruft
- **THEN** anonymisiert das System alle personenbezogenen Daten, entfernt alle verknüpften Social-Accounts, setzt `is_active=False`, beendet die Session und gibt HTTP 200 mit `{success: true}` zurück

#### Scenario: Anmeldung liegt zu lange zurück
- **GIVEN** der letzte Login des Nutzers liegt mehr als 15 Minuten zurück
- **WHEN** der Nutzer `POST /api/auth/privacy/delete-account/` mit korrektem Bestätigungstext aufruft
- **THEN** gibt das System HTTP 401 mit `code: "reauth_required"` und der Meldung „Bitte melde dich zur Sicherheit noch einmal an.“ zurück und führt keine Löschung durch

#### Scenario: Fehlender Bestätigungstext wird abgelehnt
- **WHEN** ein Nutzer die Konto-Löschung ohne `confirmation: "KONTO LÖSCHEN"` aufruft
- **THEN** gibt das System HTTP 400 mit der Fehlermeldung "Bitte bestätige die Löschung mit 'KONTO LÖSCHEN'" zurück

#### Scenario: Erneute Anmeldung mit gelöschtem Anbieterkonto
- **GIVEN** ein Nutzer hat sein Konto gelöscht
- **WHEN** er sich erneut mit demselben Google-Konto anmeldet
- **THEN** legt das System ein neues, leeres Konto an und verknüpft nicht mit dem anonymisierten Konto

#### Scenario: Nicht authentifizierter Zugriff wird abgelehnt
- **WHEN** ein nicht authentifizierter Nutzer `POST /api/auth/privacy/delete-account/` aufruft
- **THEN** gibt das System HTTP 401 mit `code: "auth_required"` zurück

#### Scenario: Session wird nach Löschung beendet
- **WHEN** ein Nutzer sein Konto erfolgreich löscht
- **THEN** wird die aktive Session invalidiert und `GET /api/auth/me/` liefert `{ is_authenticated: false, user: null }`

## REMOVED Requirements

### Requirement: Konto-Löschung mit Anonymisierung
**Reason**: Die Anmeldung erfolgt ausschließlich per Social Login; Passwörter gibt es nicht mehr, daher entfällt die Passwortbestätigung (inklusive der Szenarien für falsches Passwort und Guest-Accounts).
**Migration**: Ersetzt durch „Konto-Löschung per Social Login mit Anonymisierung“ – Bestätigungstext plus frische Anmeldung (höchstens 15 Minuten alt), sonst `reauth_required`.
