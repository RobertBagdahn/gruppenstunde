## ADDED Requirements

### Requirement: Eindeutige Reihenfolge paginierter Food-Listen
Jeder paginierte Listen-Endpunkt des Food-Bereichs (`GET /api/recipes/`, `GET /api/shopping-lists/`, `GET /api/meal-plans/`, `GET /api/ingredients/`) MUST seine Ergebnisse vollständig und eindeutig sortieren. Jede Sortierung MUST mit dem Primärschlüssel als letztem Sortierkriterium enden. Beim Durchblättern aller Seiten mit `page=1..total_pages` und gleichem `page_size` MUST jeder Eintrag genau einmal erscheinen.

#### Scenario: Rezepte nach Likes durchblättern
- **GIVEN** ein angemeldeter Nutzer und 267 sichtbare Rezepte, von denen viele denselben `like_score` haben
- **WHEN** er `GET /api/recipes/?sort=most_liked&page_size=20` für alle Seiten 1 bis 14 abruft
- **THEN** enthalten die Seiten zusammen 267 verschiedene Rezepte ohne Dublette

#### Scenario: Anonymer Nutzer blättert Rezepte
- **GIVEN** ein nicht angemeldeter Besucher
- **WHEN** er `GET /api/recipes/?sort=popular&page=2&page_size=20` zweimal hintereinander abruft
- **THEN** liefern beide Antworten dieselben Rezepte in derselben Reihenfolge

### Requirement: Reproduzierbarer Zufall
Die Rezeptsortierung `random` MUST einen ganzzahligen Parameter `seed` akzeptieren und bei gleichem Seed über alle Seiten dieselbe Permutation liefern. Fehlt `seed`, MUST das Backend einen erzeugen und im Antwortfeld `seed` zurückgeben. Das Frontend MUST den Seed im URL-Zustand der Rezeptliste halten und beim Blättern mitsenden. Eine erneute Auswahl von „Zufällig“ MUST einen neuen Seed erzeugen.

#### Scenario: Zufällige Liste durchblättern
- **GIVEN** `sort=random&seed=42`
- **WHEN** der Nutzer alle Seiten mit `page_size=20` abruft
- **THEN** erscheint jedes der 267 Rezepte genau einmal

#### Scenario: Neuer Zufall
- **WHEN** der Nutzer „Zufällig“ erneut im Sortiermenü wählt
- **THEN** enthält die URL einen neuen `seed` und Seite 1 zeigt eine andere Reihenfolge

### Requirement: Serverseitiges Sortieren und Filtern der Einkaufslisten
`GET /api/shopping-lists/` MUST die Parameter `page` (Standard 1), `page_size` (Standard 20), `q`, `sort` (`newest` | `oldest` | `name_asc`, Standard `newest`) und `mine` (bool, Standard `false`) unterstützen und die Antwort `{ items, total, page, page_size, total_pages }` liefern. `newest` MUST nach `updated_at` absteigend sortieren, `oldest` aufsteigend, `name_asc` nach Namen ohne Groß- und Kleinschreibung. `mine=true` MUST nur Listen mit `owner = request.user` liefern; `total` MUST sich auf die gefilterte Menge beziehen. Das Frontend DARF NICHT innerhalb einer Seite nachsortieren oder filtern.

#### Scenario: Neu erstellte Liste steht oben
- **GIVEN** ein angemeldeter Nutzer mit 76 Listen
- **WHEN** er eine Einkaufsliste aus einem Essensplan erstellt und die Übersicht mit „Neueste“ öffnet
- **THEN** steht die neue Liste auf Seite 1 an erster Stelle

#### Scenario: Nur eigene Listen
- **GIVEN** ein Nutzer ist Mitglied in 3 fremden Listen und besitzt 10 eigene
- **WHEN** er „Meine Daten“ aktiviert
- **THEN** zeigt die Übersicht „10 Listen“ und nur eigene Listen auf allen Seiten

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Besucher `GET /api/shopping-lists/` aufruft
- **THEN** antwortet die API mit HTTP 401
