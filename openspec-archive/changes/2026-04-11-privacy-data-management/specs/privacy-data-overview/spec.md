## ADDED Requirements

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
