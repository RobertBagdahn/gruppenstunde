# comments-emotions Specification

## Purpose

Benutzer-Engagement-Funktionen fuer Ideas: moderierte Kommentare und Emoji-basierte Emotions-Reaktionen. Alle Kommentare erfordern Admin-Moderation bevor sie sichtbar werden. Emotions bieten leichtgewichtiges Feedback ueber Toggle-basierte Reaktionen, die per Session-Key oder Benutzer-ID verfolgt werden.

## Requirements

### Requirement: Kommentare

Das System SHALL Kommentare auf Ideas mit Pflicht-Moderation unterstuetzen. Alle Kommentare (authentifiziert und anonym) werden mit Status "pending" erstellt und erfordern Admin-Freigabe.

#### Scenario: Kommentar eines authentifizierten Benutzers

- GIVEN ein authentifizierter Benutzer auf einer Idea-Detailseite
- WHEN der Benutzer einen Kommentar per POST `/api/ideas/{id}/comments/` absendet (Body: `{ text: string }`)
- THEN wird der Kommentar mit Status "pending" erstellt
- AND der Kommentar wird mit dem Benutzerkonto verknuepft (`user_id` gesetzt)
- AND der Kommentar ist erst nach Admin-Freigabe sichtbar

#### Scenario: Anonymer Kommentar

- GIVEN ein nicht-authentifizierter Benutzer auf einer Idea-Detailseite
- WHEN der Benutzer einen Kommentar mit einem Anzeigenamen absendet (Body: `{ text: string, author_name: string }`)
- THEN wird der Kommentar mit Status "pending" erstellt
- AND `user_id` ist null, `author_name` wird als Anzeigename verwendet
- AND der Kommentar erfordert Admin-Freigabe bevor er sichtbar wird

#### Scenario: Verschachtelte Antworten

- GIVEN ein bestehender freigegebener Kommentar auf einer Idea
- WHEN ein Benutzer auf diesen Kommentar antwortet (`parent_id` angegeben)
- THEN wird die Antwort als Kind des Originalkommentars erstellt
- AND die Antwort erfordert ebenfalls Admin-Freigabe
- AND der Kommentar-Thread wird hierarchisch dargestellt

#### Scenario: Kommentare laden

- GIVEN eine Idea mit freigegebenen Kommentaren
- WHEN ein Benutzer die Idea-Detailseite betrachtet
- THEN liefert GET `/api/ideas/{id}/comments/` alle freigegebenen Kommentare
- AND Kommentare werden chronologisch mit verschachtelten Antworten sortiert
- AND jeder Kommentar enthaelt: `{ id, text, author_name, user_id, created_at, parent_id, status }`

#### Scenario: Spam-Schutz

- GIVEN ein Benutzer (authentifiziert oder anonym)
- WHEN der Benutzer mehr als 5 Kommentare innerhalb von 10 Minuten absendet
- THEN wird HTTP 429 Too Many Requests zurueckgegeben

### Requirement: Emotions-Reaktionen

Das System SHALL Emoji-basierte Reaktionen auf Ideas unterstuetzen. Verfuegbare Emotionstypen (definiert als `EmotionType` TextChoices): `in_love` (Begeistert), `happy` (Gut), `disappointed` (Enttaeuscht), `complex` (Zu komplex).

#### Scenario: Reaktion hinzufuegen

- GIVEN ein Benutzer auf einer Idea-Detailseite
- WHEN der Benutzer einen Emotions-Button klickt per POST `/api/ideas/{id}/emotions/` mit `{ emotion_type: string }`
- THEN wird die Emotion erstellt oder umgeschaltet
- AND der Reaktions-Zaehler fuer diesen Emotionstyp wird erhoeht

#### Scenario: Reaktion entfernen (Toggle aus)

- GIVEN ein Benutzer, der zuvor auf eine Idea reagiert hat
- WHEN der Benutzer den gleichen Emotions-Button erneut klickt
- THEN wird die Reaktion entfernt (ausgeschaltet)
- AND der Reaktions-Zaehler fuer diesen Emotionstyp wird verringert

#### Scenario: Tracking per Session-Key

- GIVEN eine Benutzer-Session
- WHEN der Benutzer auf eine Idea reagiert
- THEN wird die Reaktion per `session_key` (CharField, max 40) oder `created_by` (FK, nullable) zugeordnet
- AND fuer authentifizierte Benutzer wird `created_by` gesetzt
- AND fuer anonyme Benutzer wird der `session_key` aus dem Django-Session-Cookie verwendet

#### Scenario: Eine Reaktion pro Typ pro Session

- GIVEN eine Benutzer-Session
- WHEN der Benutzer auf eine Idea reagiert
- THEN ist nur eine Reaktion pro Emotionstyp pro Session erlaubt
- AND der Benutzer kann gleichzeitig Reaktionen verschiedener Typen haben (z.B. sowohl `in_love` als auch `complex`)

#### Scenario: Reaktionszaehler anzeigen

- GIVEN eine Idea mit Reaktionen
- WHEN ein beliebiger Benutzer die Idea betrachtet
- THEN wird der aktuelle Zaehler fuer jeden Emotionstyp in `emotion_counts: Record<string, number>` angezeigt
- AND die eigene aktive Reaktion des Benutzers wird in `user_emotion: string | null` zurueckgegeben

## Planned Features

Die folgenden Features sind geplant, aber noch nicht implementiert:

### Planned: Kommentar-Rate-Limiting

- Derzeit gibt es keinen Spam-Schutz fuer Kommentare.
- Geplant: Rate-Limiting von 5 Kommentaren pro 10 Minuten pro Session.
