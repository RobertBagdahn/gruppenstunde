# privacy-data-overview Specification

## Purpose

Kategorisierte Datenübersicht für authentifizierte Nutzer, die alle gespeicherten personenbezogenen Daten nach Kategorien gruppiert anzeigt (DSGVO Art. 15 Auskunftsrecht).

## Requirements

### Requirement: Kategorisierte Datenübersicht abrufen

Das System MUSS authentifizierten Nutzern eine vollständige Übersicht aller zu ihrer Person gespeicherten Daten bereitstellen. Die Daten MÜSSEN in folgende Kategorien gruppiert sein:

- **Profildaten**: Email, Name, Pfadfindername, Geschlecht, Geburtstag, About Me, Profilbild-URL, Ernährungs-Tags, Suchpräferenzen
- **Gruppen**: Mitgliedschaften mit Rolle und Beitrittsdatum
- **Event-Teilnahmen**: Registrierungen mit Personen-Daten, Buchungsoptionen, Zahlungen, Custom-Field-Antworten
- **Erstellte Inhalte**: Gruppenstunden, Spiele, Rezepte, Blogs als Autor
- **Kommentare**: Alle vom Nutzer verfassten Kommentare
- **Interaktionen**: Emotionen/Reaktionen auf Inhalte
- **Planung**: Eigene Planner, Packlisten, Einkaufslisten
- **Analytics-Daten**: Anzahl gespeicherter Content-Views und Suchanfragen (keine Einzelauflistung)

Jede Kategorie MUSS die Anzahl der Einträge anzeigen.

#### Scenario: Authentifizierter Nutzer ruft Datenübersicht ab
- **WHEN** ein authentifizierter Nutzer `GET /api/auth/privacy/data-overview/` aufruft
- **THEN** gibt das System HTTP 200 mit einer kategorisierten Auflistung aller personenbezogenen Daten zurück, gruppiert nach Profildaten, Gruppen, Events, Inhalten, Kommentaren, Interaktionen, Planung und Analytics

#### Scenario: Nicht authentifizierter Zugriff wird abgelehnt
- **WHEN** ein nicht authentifizierter Nutzer `GET /api/auth/privacy/data-overview/` aufruft
- **THEN** gibt das System HTTP 401 mit der Fehlermeldung "Nicht authentifiziert" zurück

#### Scenario: Nutzer ohne Daten in einer Kategorie
- **WHEN** ein authentifizierter Nutzer keine Event-Teilnahmen hat
- **THEN** wird die Kategorie "Event-Teilnahmen" mit einer leeren Liste und `count: 0` zurückgegeben

### Requirement: Pydantic-Schema für Datenübersicht

Das Backend MUSS ein `DataOverviewSchema` bereitstellen, das folgende Struktur hat:

```
DataOverviewSchema:
  profile: ProfileDataSchema (email, first_name, last_name, scout_name, gender, birthday, about_me, profile_picture_url, nutritional_tags: list[str], preferences: PreferencesSchema | None)
  groups: CategorySchema (count: int, items: list[GroupMembershipDataSchema])
  events: CategorySchema (count: int, items: list[EventRegistrationDataSchema])
  content: CategorySchema (count: int, items: list[ContentDataSchema])
  comments: CategorySchema (count: int, items: list[CommentDataSchema])
  interactions: CategorySchema (count: int, items: list[InteractionDataSchema])
  planning: CategorySchema (count: int, items: list[PlanningDataSchema])
  analytics: AnalyticsDataSchema (view_count: int, search_count: int)
```

#### Scenario: Schema enthält alle Kategorien
- **WHEN** das `DataOverviewSchema` serialisiert wird
- **THEN** enthält die JSON-Response alle 8 Kategorien mit korrekten Typen und Zählern

### Requirement: Zod-Schema für Datenübersicht

Das Frontend MUSS ein `dataOverviewSchema` (Zod) bereitstellen, das 1:1 zum Pydantic `DataOverviewSchema` passt.

#### Scenario: Frontend validiert API-Response
- **WHEN** das Frontend die Datenübersicht-Response empfängt
- **THEN** MUSS die Response erfolgreich gegen das Zod-Schema validieren


---

# Privacy Data Export

# privacy-data-export Specification

## Purpose

Vollständiger Datenexport als JSON-Download für authentifizierte Nutzer (DSGVO Art. 20 Datenübertragbarkeit).

## Requirements

### Requirement: Vollständiger Datenexport als JSON

Das System MUSS authentifizierten Nutzern ermöglichen, alle zu ihrer Person gespeicherten Daten als JSON-Datei herunterzuladen. Der Export MUSS alle Kategorien aus der Datenübersicht enthalten, ergänzt um Detail-Daten:

- Alle Profil-Felder inklusive Präferenzen
- Vollständige Event-Registrierungsdaten mit Personen, Teilnehmern, Buchungsoptionen, Zahlungen und Custom-Fields
- Alle erstellten Inhalte mit Titel, Typ und Erstellungsdatum
- Alle Kommentare mit Text und Zeitstempel
- Alle Emotionen/Reaktionen
- Planner, Packlisten und Einkaufslisten mit Items
- Analytics-Zusammenfassung (Anzahl Views, Anzahl Suchanfragen)

Der Export MUSS als Download mit dem Content-Type `application/json` und dem Header `Content-Disposition: attachment; filename="inspi-datenexport-{datum}.json"` ausgeliefert werden.

#### Scenario: Nutzer exportiert alle eigenen Daten
- **WHEN** ein authentifizierter Nutzer `POST /api/auth/privacy/data-export/` aufruft
- **THEN** gibt das System HTTP 200 mit einer JSON-Datei als Download zurück, die alle personenbezogenen Daten des Nutzers enthält

#### Scenario: Export-Dateiname enthält aktuelles Datum
- **WHEN** der Export am 15.03.2025 durchgeführt wird
- **THEN** hat die Datei den Namen `inspi-datenexport-2025-03-15.json`

#### Scenario: Nicht authentifizierter Nutzer kann nicht exportieren
- **WHEN** ein nicht authentifizierter Nutzer `POST /api/auth/privacy/data-export/` aufruft
- **THEN** gibt das System HTTP 401 zurück

### Requirement: Export enthält Metadaten

Jeder Datenexport MUSS einen `metadata`-Block enthalten mit:
- `exported_at`: ISO-8601 Zeitstempel (UTC)
- `user_email`: Email-Adresse des Nutzers
- `platform`: "Inspi (gruppenstunde.de)"
- `data_categories`: Liste der enthaltenen Kategorien

#### Scenario: Metadaten sind im Export enthalten
- **WHEN** ein Nutzer seinen Datenexport öffnet
- **THEN** enthält das JSON-Root-Objekt ein `metadata`-Feld mit `exported_at`, `user_email`, `platform` und `data_categories`

### Requirement: Export-Performance

Der Datenexport MUSS innerhalb von 30 Sekunden abgeschlossen sein. Das System MUSS optimierte Datenbankabfragen mit `select_related` und `prefetch_related` verwenden.

#### Scenario: Export unter 30 Sekunden
- **WHEN** ein Nutzer mit durchschnittlicher Datenmenge (50 Event-Registrierungen, 100 Kommentare, 20 Inhalte) den Export auslöst
- **THEN** ist der Download innerhalb von 30 Sekunden abgeschlossen


---

# Privacy Data Retention

# privacy-data-retention Specification

## Purpose

Automatische Bereinigung veralteter Analytics-Daten zur Einhaltung der DSGVO Art. 5 Speicherbegrenzung.

## Requirements

### Requirement: Management-Command zur Analytics-Bereinigung

Das System MUSS einen Django Management-Command `cleanup_analytics` bereitstellen, der veraltete Analytics-Daten automatisch löscht.

Der Command MUSS folgende Daten löschen:
- `content.ContentView`-Einträge älter als 12 Monate
- `content.SearchLog`-Einträge älter als 12 Monate

Der Retention-Zeitraum MUSS über ein Command-Argument `--retention-months` konfigurierbar sein (Standard: 12).

Der Command MUSS die Anzahl der gelöschten Einträge pro Model ausgeben.

#### Scenario: Cleanup mit Standard-Retention
- **WHEN** der Command `uv run python manage.py cleanup_analytics` ausgeführt wird
- **THEN** werden alle `ContentView`- und `SearchLog`-Einträge gelöscht, die älter als 12 Monate sind, und die Anzahl der gelöschten Einträge wird ausgegeben

#### Scenario: Cleanup mit benutzerdefinierter Retention
- **WHEN** der Command mit `--retention-months 6` ausgeführt wird
- **THEN** werden alle Einträge gelöscht, die älter als 6 Monate sind

#### Scenario: Kein Datenverlust bei aktuellen Einträgen
- **WHEN** der Command ausgeführt wird und alle Einträge jünger als der Retention-Zeitraum sind
- **THEN** werden 0 Einträge gelöscht und der Command gibt "0 ContentView-Einträge gelöscht, 0 SearchLog-Einträge gelöscht" aus

### Requirement: Batch-Löschung für große Datenmengen

Der Cleanup-Command MUSS Batch-Löschung verwenden (max. 10.000 Einträge pro Batch), um Lock-Contention auf der Datenbank zu vermeiden.

#### Scenario: Große Datenmenge wird in Batches gelöscht
- **WHEN** 50.000 veraltete ContentView-Einträge existieren
- **THEN** werden die Einträge in Batches von maximal 10.000 gelöscht, ohne die Datenbank für andere Operationen zu blockieren

### Requirement: Dry-Run-Modus

Der Command MUSS einen `--dry-run`-Modus unterstützen, der die Anzahl der zu löschenden Einträge anzeigt, ohne tatsächlich zu löschen.

#### Scenario: Dry-Run zeigt Vorschau
- **WHEN** der Command mit `--dry-run` ausgeführt wird
- **THEN** wird die Anzahl der betroffenen Einträge pro Model angezeigt, aber keine Daten gelöscht


---

# Privacy Account Deletion

# privacy-account-deletion Specification

## Purpose

Konto-Löschung mit vollständiger Anonymisierung personenbezogener Daten bei Erhalt der Datenintegrität (DSGVO Art. 17 Recht auf Löschung).

## Requirements

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
