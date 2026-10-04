# food-error-presentation Specification

## Purpose
TBD - created by archiving change food-frontend-friendly-ux. Update Purpose after archive.
## Requirements
### Requirement: Alle Fehlertexte sind deutsch und verständlich
`apiFetch` und `parseApiResponse` in `lib/api.ts` SHALL Netzwerkfehler (`TypeError` von `fetch`) in einen `ApiError` mit Status 0 und Text „Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.“ übersetzen und Schema-Fehler (`ZodError`) in einen `ApiError` mit Text „Die Antwort des Servers konnte nicht gelesen werden.“. Englische Systemtexte („Failed to fetch“, Zod-Meldungen, „Internal Server Error“) MUST NOT in UI-Texten erscheinen. Schema-Fehler MUST zusätzlich mit URL und Zod-Pfad über `console.error` protokolliert werden (nicht `console.log`). 422-Validierungsfehler des Backends (`detail: [{ loc, msg }]`) MUST als „Feld: deutscher Text“ formatiert werden, nie als „[object Object]“.

#### Scenario: Offline speichern
- **WHEN** ein angemeldeter Nutzer ohne Netz ein Rezept speichert
- **THEN** zeigt der Fehler-Toast „Rezept konnte nicht gespeichert werden“ mit Beschreibung „Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.“

#### Scenario: Unerwartete Antwortform
- **WHEN** die API eine Antwort liefert, die nicht zum Zod-Schema passt
- **THEN** sieht der Nutzer „Die Antwort des Servers konnte nicht gelesen werden.“ statt der Zod-Meldung

### Requirement: Fehler am richtigen Ort
Validierungsfehler in Formularen SHALL am betroffenen Feld angezeigt werden (Backend-`fields` werden den Feldern zugeordnet) und zusätzlich einen kurzen Fehler-Toast auslösen. Ladefehler eines Abschnitts SHALL inline im Abschnitt mit dem Button „Erneut versuchen“ angezeigt werden, während die übrige Seite bedienbar bleibt. Ladefehler der Kerndaten einer Seite SHALL über `ErrorDisplay` mit passendem Titel (Nicht gefunden, Keine Berechtigung, Keine Verbindung, Serverfehler) erscheinen.

#### Scenario: Nährwert-Validierung
- **WHEN** das Backend beim Speichern einer Zutat `fields: ["fat"]` meldet
- **THEN** ist das Feld „Fett“ rot markiert mit der Meldung darunter, und ein Toast nennt den Fehler

#### Scenario: Abschnitt „Verwendet in“ schlägt fehl
- **WHEN** die Anfrage für die Rezepte einer Zutat fehlschlägt
- **THEN** zeigt nur dieser Abschnitt „Rezepte konnten nicht geladen werden“ mit „Erneut versuchen“, Nährwerte und Portionen bleiben sichtbar

#### Scenario: Gesperrter Essensplan
- **GIVEN** ein nicht angemeldeter Nutzer
- **WHEN** er einen privaten Essensplan öffnet und die API 403 liefert
- **THEN** sieht er „Keine Berechtigung“ mit Anmelde-Hinweis

### Requirement: Fehlergrenzen pro Route und Abschnitt
Jede Route SHALL in einem ErrorBoundary liegen, das bei einem Render-Fehler die Navigation erhält und „Diese Seite konnte nicht angezeigt werden“ mit „Neu laden“ zeigt. Große, unabhängige Abschnitte (Analyse, Diagramme, Vorschläge, Kochplan) SHALL in einem `SectionBoundary` liegen, sodass ein Absturz nur diesen Abschnitt ersetzt.

#### Scenario: Diagramm stürzt ab
- **WHEN** ein Diagramm auf der Rezept-Detailseite einen Render-Fehler wirft
- **THEN** zeigt nur der Diagramm-Abschnitt einen Fehlerhinweis, der Rest der Rezeptseite bleibt nutzbar

### Requirement: Leerzustand und Fehler sind getrennt
Komponenten SHALL einen Ladefehler nie als Leerzustand („Keine Daten“, „Keine Ergebnisse“) darstellen. Leerzustände MUST über `EmptyState` mit einer passenden nächsten Aktion erscheinen, Fehler über `ErrorDisplay` oder den Abschnitts-Fehler.

#### Scenario: Statistik-Fehler
- **WHEN** eine Verteilungs-Anfrage auf `/data-distributions` mit 500 endet
- **THEN** zeigt das Diagramm „Daten konnten nicht geladen werden“ mit „Erneut versuchen“ statt „Keine Daten“

#### Scenario: Leere Suche
- **WHEN** eine Rezeptsuche keine Treffer hat
- **THEN** zeigt die Liste „Keine Rezepte gefunden“ mit dem Button „Filter zurücksetzen“
