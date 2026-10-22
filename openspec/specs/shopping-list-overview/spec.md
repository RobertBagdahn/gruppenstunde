# shopping-list-overview Specification

## Purpose
Startseite der Einkaufslisten. Sie führt zuerst über das Event zu dessen Einkäufen und zeigt darunter die Einkaufslisten ohne Event (freie Listen und Rezept-Einkäufe).

## Requirements

### Requirement: Event-Auswahl als Einstieg
Die Seite `/shopping-lists` SHALL oben „Für welches Event kaufst du ein?“ mit den Events zeigen, die mindestens einen Essensplan haben und auf die der Nutzer Planungs- oder Leserecht hat (siehe `shopping-trip-planning`). Jede Karte MUST Eventname, Zeitraum, Zahl der Einkäufe und den nächsten anstehenden Einkauf (Laden und Zeitpunkt) zeigen und zu `/shopping-lists/events/:eventSlug` führen.

#### Scenario: Event mit Einkäufen
- **GIVEN** der Nutzer ist im Team des „Sommerlagers“ mit 3 Einkäufen, der nächste ist „Rewe · Sa 10:00“
- **WHEN** er `/shopping-lists` öffnet
- **THEN** zeigt die Karte „Sommerlager“, den Zeitraum, „3 Einkäufe“ und „Nächster: Rewe · Sa 10:00“

#### Scenario: Keine Events
- **WHEN** der Nutzer kein Event mit Essensplan hat
- **THEN** erscheint „Noch kein Event mit Essensplan“ mit einem Link zu den Essensplänen

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Besucher `/shopping-lists` öffnet
- **THEN** erscheint „Melde dich an, um deine Einkaufslisten zu sehen.“ mit „Kostenlos anmelden“, und die API antwortet mit 401

### Requirement: Event-Liste der Einkaufsplanung
`GET /api/shopping-events/` SHALL die Events für die Auswahl paginiert liefern (`page`, `page_size` 10/20/50, Standard 20; Antwort `{items, total, page, page_size, total_pages}`). Die Reihenfolge MUST laufende vor kommenden vor vergangenen Events sein, innerhalb der Gruppen nach Beginn. Vergangene Events SHALL nur mit `include_past=true` erscheinen. Die Antwort MUST ohne eine Abfrage pro Event berechnet werden.

#### Scenario: Reihenfolge
- **GIVEN** ein laufendes, ein kommendes und ein vergangenes Event
- **WHEN** die Liste ohne `include_past` abgerufen wird
- **THEN** stehen das laufende und danach das kommende Event in der Antwort, das vergangene fehlt

#### Scenario: Vergangene einblenden
- **WHEN** der Nutzer „Vergangene Events zeigen“ wählt
- **THEN** wird `include_past=true` in die URL übernommen und das vergangene Event erscheint am Ende

### Requirement: Einkaufslisten ohne Event
Unter der Event-Auswahl SHALL die Seite „Einkaufslisten ohne Event“ zeigen: freie Listen und Rezept-Einkäufe, auf die der Nutzer als Besitzer oder Mitglied Zugriff hat. Der Abschnitt nutzt `GET /api/shopping-lists/?without_event=true` mit Suche, Sortierung und Paginierung wie bisher („Mehr laden“). Einkäufe von Events MUST dort nicht erscheinen.

#### Scenario: Freie Liste
- **GIVEN** der Nutzer hat die freie Liste „Grillabend“
- **WHEN** er die Startseite öffnet
- **THEN** steht „Grillabend“ unter „Einkaufslisten ohne Event“

#### Scenario: Event-Einkauf
- **WHEN** der Nutzer Mitglied der Liste „Rewe · Sa 10:00“ eines Events ist
- **THEN** erscheint sie nicht unter „Einkaufslisten ohne Event“

### Requirement: Eingeladene Einkäufe von Events
Einkäufe von Events, zu denen der Nutzer nur als Mitglied der Liste eingeladen ist (ohne Recht auf den Einkaufsplan), SHALL in einem eigenen Abschnitt „Einkäufe, zu denen du eingeladen bist“ mit Eventname, Laden und Zeitpunkt erscheinen. Ein Klick MUST direkt zur Liste führen.

#### Scenario: Mitkäufer
- **GIVEN** Ben ist nur zur Liste „Rewe · Sa 10:00“ des Sommerlagers eingeladen
- **WHEN** er die Startseite öffnet
- **THEN** sieht er sie unter „Einkäufe, zu denen du eingeladen bist“ mit „Sommerlager“

### Requirement: Neue Liste ohne Event
Die Startseite SHALL zwei Aktionen zum Anlegen ohne Event bieten: „Freie Liste“ (nur Name) und „Einkauf aus Rezepten“ (Laden, Zeitpunkt und ein erstes Rezept mit Portionen). Ein Rezept-Einkauf MUST nach dem Anlegen weitere Rezepte aufnehmen können (siehe `shopping-list`).

#### Scenario: Einkauf aus Rezepten
- **WHEN** der Nutzer „Einkauf aus Rezepten“ wählt, „Rewe“, Do 16:00 und „Stockbrot“ für 12 Portionen angibt
- **THEN** entsteht die Liste „Rewe · Do 16:00“ mit den Zutaten für 12 Portionen und öffnet sich
