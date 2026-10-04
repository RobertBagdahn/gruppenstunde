# food-loading-states Specification

## Purpose
TBD - created by archiving change food-frontend-friendly-ux. Update Purpose after archive.
## Requirements
### Requirement: Inhaltsförmige Skeletons
Jede Seite und jeder eigenständig ladende Abschnitt im Food-Frontend SHALL während des ersten Ladens ein Skeleton zeigen, das die Form des späteren Inhalts nachbildet (Kopf, Karten, Tabellenzeilen, Formularfelder). Skeletons MUST aus der gemeinsamen Komponente `Skeleton` (`components/ui/skeleton.tsx`) und deren Varianten aufgebaut sein. Ganzseitige Spinner und reine Ladetexte („Laden...“, „Lade …“, „Wird geladen …“) SHALL NOT als Ladezustand eines Inhaltsbereichs verwendet werden. Ein Spinner ist nur innerhalb eines Buttons während einer laufenden Aktion erlaubt.

#### Scenario: Listenseite lädt
- **GIVEN** ein anonymer oder angemeldeter Nutzer
- **WHEN** er `/recipes` oder `/ingredients` öffnet und die erste Seite (`page=1`, `page_size=20`) noch nicht geladen ist
- **THEN** sieht er Seitenkopf, Suchfeld und Filter sofort und an Stelle der Ergebnisse ein Raster aus Karten-Skeletons mit Bild-, Titel- und Metadaten-Bereich

#### Scenario: Admin-Tab lädt
- **GIVEN** ein Admin
- **WHEN** er einen Admin-Tab (z. B. Tags, Ausstattung, Abteilungen) öffnet
- **THEN** sieht er Tabellenzeilen-Skeletons statt des Textes „Laden...“

#### Scenario: Aktion läuft
- **WHEN** der Nutzer auf „Speichern“ klickt
- **THEN** zeigt der Button einen Spinner und ist deaktiviert, der übrige Inhalt bleibt sichtbar

### Requirement: Abschnitte laden unabhängig und erscheinen nacheinander
Seiten mit mehreren Datenquellen SHALL jeden Abschnitt mit eigener Query und eigenem Skeleton rendern, sodass Abschnitte erscheinen, sobald ihre Daten da sind. Der Seitenkopf MUST erscheinen, sobald die Kerndaten der Seite geladen sind; nachrangige Abschnitte SHALL NOT das Rendern des Kopfes blockieren. Neu erscheinende Abschnitte MUST mit einer kurzen Einblende-Animation (≤ 200 ms) erscheinen; bei `prefers-reduced-motion: reduce` MUST die Animation entfallen.

#### Scenario: Zutat-Detail
- **WHEN** ein Nutzer `/ingredients/<slug>` öffnet
- **THEN** erscheinen Zusammenfassung und Nährwerte, sobald die Zutat geladen ist, während „Verwendet in“ und „Packungen“ noch eigene Skeletons zeigen und danach einzeln einblenden

#### Scenario: Reduzierte Bewegung
- **GIVEN** der Nutzer hat im Betriebssystem „Bewegung reduzieren“ aktiviert
- **WHEN** ein Abschnitt fertig geladen ist
- **THEN** erscheint er ohne Animation

### Requirement: Öffentliche Listen warten nicht auf die Anmeldung
Listen-Queries für öffentliche Daten SHALL sofort mit dem Filterstand aus der URL starten und MUST NOT auf das Ergebnis von `/api/auth/me/` warten. Gespeicherte Filter (`usePersistedListState`) SHALL nur übernommen werden, wenn die URL keine Listen-Parameter enthält; in diesem Fall MAY genau eine zweite Anfrage mit dem wiederhergestellten Filter folgen.

#### Scenario: Anonymer Nutzer öffnet Rezeptliste
- **GIVEN** ein nicht angemeldeter Nutzer
- **WHEN** er `/recipes?page=2` öffnet
- **THEN** startet die Anfrage für Seite 2 parallel zu `/api/auth/me/`

#### Scenario: Angemeldeter Nutzer mit gespeichertem Filter
- **GIVEN** ein angemeldeter Nutzer hat zuletzt nach „Frühstück“ gefiltert
- **WHEN** er `/recipes` ohne Parameter öffnet
- **THEN** wird der gespeicherte Filter in die URL übernommen und die Liste mit diesem Filter geladen

### Requirement: Hintergrund-Aktualisierung ohne Flackern
Wenn bereits angezeigte Daten neu geladen werden (Refetch, Filter- oder Seitenwechsel), SHALL der bisherige Inhalt sichtbar bleiben (`placeholderData: keepPreviousData` für paginierte Listen). Ein globaler, dünner Fortschrittsbalken am oberen Rand (`GlobalFetchingBar`) MUST sichtbar sein, solange Queries im Hintergrund laden oder Mutationen laufen. Der Inhalt SHALL NOT zurück auf Skeletons springen.

#### Scenario: Seitenwechsel in der Zutatenliste
- **WHEN** der Nutzer von Seite 1 auf Seite 2 wechselt
- **THEN** bleiben die Karten von Seite 1 sichtbar und leicht abgeblendet, der Fortschrittsbalken läuft, und danach erscheinen die Karten von Seite 2

### Requirement: Hinweis bei langem Laden
Dauert der erste Ladevorgang einer Seite länger als 3 Sekunden, SHALL unter dem Skeleton der Hinweis „Dauert etwas länger – der Server startet gerade.“ erscheinen. Der Hinweis MUST verschwinden, sobald die Daten da sind.

#### Scenario: Kaltstart
- **WHEN** die erste Anfrage nach 3 Sekunden noch nicht beantwortet ist
- **THEN** sieht der Nutzer zusätzlich zum Skeleton den Hinweistext

### Requirement: Routen werden nachgeladen
Seiten-Komponenten in `App.tsx` SHALL per `React.lazy` geladen werden. Der `Suspense`-Fallback MUST ein Seiten-Skeleton (Kopf plus Inhaltsblöcke) innerhalb des bestehenden Layouts sein, sodass Navigation und Kopfzeile stehen bleiben.

#### Scenario: Erste Navigation zum Essensplan
- **WHEN** der Nutzer erstmals auf „Essensplan“ klickt
- **THEN** bleibt die Navigation sichtbar und der Inhaltsbereich zeigt ein Seiten-Skeleton, bis der Code der Seite geladen ist
