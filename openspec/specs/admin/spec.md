# admin Specification

## Purpose

Admin-Dashboard und Verwaltungswerkzeuge fuer Plattform-Administratoren. Bietet Moderationsfaehigkeiten, Inhaltsverwaltung, Benutzerverwaltung, Plattformstatistiken und Material-/Einheiten-CRUD-Operationen. Nur fuer Benutzer mit `is_staff=true` zugaenglich.

## Requirements

### Requirement: Admin-Zugriffskontrolle

Das System MUST alle Admin-Endpunkte unter `/api/admin/` auf Benutzer mit `is_staff=true` beschraenken.

#### Scenario: Admin-Zugriff

- GIVEN ein authentifizierter Benutzer mit `is_staff=true`
- WHEN der Benutzer einen `/api/admin/`-Endpunkt aufruft
- THEN wird die Anfrage normal verarbeitet

#### Scenario: Nicht-Admin-Zugriff verweigert

- GIVEN ein authentifizierter Benutzer ohne `is_staff=true`
- WHEN der Benutzer versucht einen `/api/admin/`-Endpunkt aufzurufen
- THEN wird HTTP 403 Forbidden zurueckgegeben

#### Scenario: Nicht-authentifizierter Zugriff verweigert

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN der Benutzer einen `/api/admin/`-Endpunkt aufruft
- THEN wird HTTP 401 Unauthorized zurueckgegeben

### Requirement: Idee der Woche

Das System SHALL die Hervorhebung von Ideas als "Idee der Woche" unterstuetzen. Mehrere Eintraege koennen existieren (mit Veroeffentlichungsdatum).

#### Scenario: Idee der Woche setzen

- GIVEN ein Admin-Benutzer
- WHEN der Admin eine Idea per POST `/api/admin/idea-of-the-week/` mit `{ idea_id, description?, release_date? }` setzt
- THEN wird ein IdeaOfTheWeek-Eintrag erstellt
- AND die Idea wird auf der Startseite hervorgehoben

#### Scenario: Idee der Woche entfernen

- GIVEN ein bestehender IdeaOfTheWeek-Eintrag
- WHEN der Admin DELETE `/api/admin/idea-of-the-week/{entryId}/` aufruft
- THEN wird der Eintrag entfernt

#### Scenario: Oeffentlicher Zugriff auf Idee der Woche

- GIVEN IdeaOfTheWeek-Eintraege existieren
- WHEN ein beliebiger Benutzer GET `/api/admin/idea-of-the-week/` aufruft
- THEN werden die aktuellen IdeaOfTheWeek-Eintraege zurueckgegeben

### Requirement: Kommentar-Moderation

Das System SHALL eine Kommentar-Moderationswarteschlange fuer Administratoren bereitstellen. Alle Kommentare (sowohl von authentifizierten als auch von anonymen Benutzern) erfordern Admin-Moderation bevor sie sichtbar werden.

#### Scenario: Ausstehende Kommentare anzeigen

- GIVEN Kommentare mit Status "pending" im System
- WHEN ein Admin GET `/api/admin/moderation/` aufruft
- THEN werden alle ausstehenden (nicht freigegebenen) Kommentare zurueckgegeben

#### Scenario: Kommentar freigeben

- GIVEN ein ausstehender Kommentar
- WHEN ein Admin POST `/api/admin/moderation/` mit `{ comment_id: number, action: "approve" }` sendet
- THEN wird der Kommentar-Status auf "approved" geaendert
- AND der Kommentar wird auf der Idea-Detailseite sichtbar

#### Scenario: Kommentar ablehnen/loeschen

- GIVEN ein ausstehender oder freigegebener Kommentar
- WHEN ein Admin POST `/api/admin/moderation/` mit `{ comment_id: number, action: "reject" }` sendet
- THEN wird der Kommentar aus dem System entfernt

### Requirement: Benutzerverwaltung

Das System SHALL Admins das Anzeigen und Verwalten von Benutzerkonten ermoeglichen.

#### Scenario: Benutzer auflisten

- GIVEN ein Admin-Benutzer
- WHEN der Admin GET `/api/admin/users/` aufruft
- THEN werden registrierte Benutzer mit `{ id, email, first_name, last_name, is_staff, is_active, date_joined }` zurueckgegeben

#### Scenario: Benutzerdetails anzeigen

- GIVEN ein Admin-Benutzer
- WHEN der Admin GET `/api/admin/users/{userId}/` aufruft
- THEN werden vollstaendige Details zurueckgegeben: `{ id, email, first_name, last_name, is_staff, is_active, date_joined, last_login, ideas: AdminUserIdea[], comments: AdminUserComment[] }`

### Requirement: Material- und Einheiten-Verwaltung

Das System SHALL Admins die Verwaltung des MaterialName- und MeasuringUnit-Katalogs ermoeglichen.

#### Scenario: CRUD MaterialName

- GIVEN ein Admin-Benutzer
- WHEN der Admin einen MaterialName erstellt, aktualisiert oder loescht
- THEN wird der Material-Katalog aktualisiert
- AND bestehende Ideas, die das Material referenzieren, bleiben unberuehrt (ON DELETE SET NULL)

#### Scenario: CRUD MeasuringUnit

- GIVEN ein Admin-Benutzer
- WHEN der Admin eine MeasuringUnit erstellt, aktualisiert oder loescht
- THEN wird der Einheiten-Katalog aktualisiert

### Requirement: Plattform-Statistiken

Das System SHALL aggregierte Statistiken fuer das Admin-Dashboard ueber GET `/api/admin/statistics/` bereitstellen.

#### Scenario: Dashboard-Statistiken

- GIVEN ein Admin-Benutzer
- WHEN der Admin GET `/api/admin/statistics/` aufruft
- THEN werden folgende Zaehler zurueckgegeben:
  - `total_ideas`: Gesamt-Anzahl Ideas
  - `published_ideas`: Anzahl veroeffentlichter Ideas
  - `total_users`: Gesamt-Anzahl Benutzer
  - `total_comments`: Gesamt-Anzahl Kommentare
  - `pending_comments`: Anzahl ausstehender Kommentare
  - `views_last_30_days`: Views der letzten 30 Tage
  - `top_ideas`: Liste der meistgesehenen Ideas mit `{ id, title, slug, view_count, like_score }`

#### Scenario: Aktuelle Aktivitaet

- GIVEN ein Admin-Benutzer
- WHEN der Admin GET `/api/admin/recent-activity/` aufruft
- THEN werden zurueckgegeben:
  - `recent_views`: Letzte Views mit Idea-Titel und Benutzer-Email
  - `recent_searches`: Letzte Suchanfragen mit Query und Ergebnis-Anzahl
  - `recent_ideas`: Zuletzt erstellte Ideas mit Status und Autor

#### Scenario: Trending

- GIVEN ein Admin-Benutzer
- WHEN der Admin GET `/api/admin/trending/` aufruft
- THEN werden zurueckgegeben:
  - `most_viewed`: Meistgesehene Ideas der letzten 7 Tage
  - `most_liked`: Meistgelikte Ideas der letzten 7 Tage

### Requirement: Autorenwechsel

Das System SHALL Admins das Umzuweisen der Idea-Autorenschaft ermoeglichen.

#### Scenario: Idea-Autor aendern

- GIVEN ein Admin-Benutzer und eine bestehende Idea
- WHEN der Admin den Autor auf einen anderen Benutzer aendert
- THEN wird der Autor der Idea aktualisiert
- AND die Idea erscheint im Profil des neuen Autors

### Requirement: Instagram-Export

Das System SHALL teilbare Bilder fuer Social-Media-Promotion von Ideas generieren.

#### Scenario: Instagram-Slides generieren

- GIVEN ein Admin-Benutzer und eine veroeffentlichte Idea
- WHEN der Admin POST `/api/admin/instagram-export/` mit der Idea-ID aufruft
- THEN werden 3 Slide-Bilder generiert (Titel-Slide, Beschreibungs-Slide, Meta-Slide)
- AND die Bilder werden als Base64-kodierte PNGs in `{ slides: string[] }` zurueckgegeben
- AND die Bilder verwenden die Plattform-Farbpalette (Sky/Teal-Primaerfarben, Source Sans 3 Schrift)
