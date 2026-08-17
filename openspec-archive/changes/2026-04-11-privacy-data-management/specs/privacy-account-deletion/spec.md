## ADDED Requirements

### Requirement: Konto-Löschung mit Anonymisierung

Das System MUSS authentifizierten Nutzern ermöglichen, ihr Konto vollständig zu löschen. Die Löschung MUSS alle personenbezogenen Daten anonymisieren, wobei die Integrität von Event-Statistiken und veröffentlichten Inhalten erhalten bleibt.

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
10. Alle FK-Referenzen mit `on_delete=SET_NULL` werden automatisch auf NULL gesetzt

Die gesamte Anonymisierung MUSS in einer einzigen Datenbank-Transaktion ausgeführt werden.

#### Scenario: Nutzer mit Passwort löscht Konto
- **WHEN** ein authentifizierter Nutzer `POST /api/auth/privacy/delete-account/` mit korrektem `password` und `confirmation: "KONTO LÖSCHEN"` aufruft
- **THEN** anonymisiert das System alle personenbezogenen Daten, setzt `is_active=False`, beendet die Session und gibt HTTP 200 mit `{success: true}` zurück

#### Scenario: Falsches Passwort wird abgelehnt
- **WHEN** ein Nutzer ein falsches Passwort bei der Konto-Löschung angibt
- **THEN** gibt das System HTTP 400 mit der Fehlermeldung "Falsches Passwort" zurück und führt keine Löschung durch

#### Scenario: Fehlender Bestätigungstext wird abgelehnt
- **WHEN** ein Nutzer die Konto-Löschung ohne `confirmation: "KONTO LÖSCHEN"` aufruft
- **THEN** gibt das System HTTP 400 mit der Fehlermeldung "Bitte bestätige die Löschung mit 'KONTO LÖSCHEN'" zurück

#### Scenario: Guest-Account ohne Passwort löscht Konto
- **WHEN** ein Guest-Account (unusable password) `POST /api/auth/privacy/delete-account/` mit `password: null` und `confirmation: "KONTO LÖSCHEN"` aufruft
- **THEN** anonymisiert das System die Daten ohne Passwort-Prüfung und gibt HTTP 200 zurück

#### Scenario: Nicht authentifizierter Zugriff wird abgelehnt
- **WHEN** ein nicht authentifizierter Nutzer `POST /api/auth/privacy/delete-account/` aufruft
- **THEN** gibt das System HTTP 401 zurück

#### Scenario: Session wird nach Löschung beendet
- **WHEN** ein Nutzer sein Konto erfolgreich löscht
- **THEN** wird die aktive Session invalidiert und nachfolgende API-Aufrufe geben HTTP 401 zurück

### Requirement: Bestätigungsdialog im Frontend

Das Frontend MUSS vor der Konto-Löschung einen mehrstufigen Bestätigungsdialog anzeigen:

1. **Schritt 1**: Warnung mit Auflistung, was gelöscht wird (Profil, Events, Kommentare, etc.)
2. **Schritt 2**: Passwort-Eingabe (oder Hinweis für Guest-Accounts)
3. **Schritt 3**: Bestätigungstext "KONTO LÖSCHEN" eintippen
4. **Schritt 4**: Button "Konto endgültig löschen" (rot, disabled bis alle Felder ausgefüllt)

Nach erfolgreicher Löschung MUSS der Nutzer auf die Startseite weitergeleitet werden mit einem Toast "Dein Konto wurde gelöscht".

#### Scenario: Nutzer durchläuft den Bestätigungsdialog
- **WHEN** ein Nutzer auf "Konto löschen" klickt
- **THEN** öffnet sich ein Dialog mit Warnung, Passwort-Eingabe, Bestätigungstext-Eingabe und einem deaktivierten Lösch-Button

#### Scenario: Lösch-Button wird erst bei vollständiger Eingabe aktiviert
- **WHEN** der Nutzer Passwort und Bestätigungstext "KONTO LÖSCHEN" korrekt eingegeben hat
- **THEN** wird der Lösch-Button aktiviert

#### Scenario: Weiterleitung nach erfolgreicher Löschung
- **WHEN** die Konto-Löschung erfolgreich war
- **THEN** wird der Nutzer auf `/` weitergeleitet und sieht den Toast "Dein Konto wurde gelöscht"

### Requirement: Pydantic-Schema für Konto-Löschung

Das Backend MUSS ein `DeleteAccountRequestSchema` bereitstellen:

```
DeleteAccountRequestSchema:
  password: str | None  (None für Guest-Accounts)
  confirmation: str  (muss exakt "KONTO LÖSCHEN" sein)
```

#### Scenario: Schema validiert korrekten Request
- **WHEN** ein Request mit `password: "test123"` und `confirmation: "KONTO LÖSCHEN"` eingeht
- **THEN** validiert das Schema erfolgreich

#### Scenario: Schema lehnt falschen Bestätigungstext ab
- **WHEN** ein Request mit `confirmation: "löschen"` eingeht
- **THEN** schlägt die Schema-Validierung fehl

### Requirement: Zod-Schema für Konto-Löschung

Das Frontend MUSS ein `deleteAccountRequestSchema` (Zod) bereitstellen, das 1:1 zum Pydantic `DeleteAccountRequestSchema` passt, inklusive der Validierung des Bestätigungstexts.

#### Scenario: Frontend validiert Bestätigungstext
- **WHEN** der Nutzer "KONTO LÖSCHEN" in das Bestätigungsfeld eingibt
- **THEN** validiert das Zod-Schema erfolgreich
