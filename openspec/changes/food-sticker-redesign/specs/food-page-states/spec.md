# Spec Delta

## Purpose

Legt die vier Zustände fest, die jede Seite des Food-Frontends kennt (Laden, Leer, Fehler, Offline), und wie sie aussehen. Sie folgen der Zustände-Seite der Referenz; der Offline-Zustand ist ausdrücklich nicht Teil dieses Changes.

## ADDED Requirements

### Requirement: Ladezustand in Seitenform
Während Daten laden SHALL die Seite ihren Seitenkopf, die Suchleiste und Platzhalter in der Form des späteren Inhalts zeigen (Kartenraster oder Listenzeilen). Der Platzhalter MUST dieselbe Höhe wie der Inhalt annähernd einhalten, damit beim Laden kein Springen entsteht.

#### Scenario: Rezeptliste lädt
- **WHEN** die Rezeptliste die Daten noch nicht hat
- **THEN** sieht der Nutzer Kopf, Suche und Filter sofort und an Stelle der Karten Karten-Skelette mit Bild-, Titel- und Metadatenbereich

#### Scenario: Nur Ladeanzeigen bewegen sich
- **WHEN** ein Skelett angezeigt wird
- **THEN** darf es schimmern, und bei „Bewegung reduzieren“ MUST es statisch sein

### Requirement: Leerzustand mit einem nächsten Schritt
Ein leerer Bereich SHALL eine Überschrift, einen Satz zur Erklärung und höchstens eine Hauptaktion zeigen. Vorlagen DÜRFEN nur aus vorhandenen Referenzplänen stammen und MUST entfallen, wenn keine existieren.

#### Scenario: Keine Essenspläne
- **WHEN** ein angemeldeter Nutzer keinen Essensplan hat
- **THEN** zeigt die Seite „Noch kein Essensplan“, den Satz zur Erklärung, die Hauptaktion „Ersten Essensplan erstellen“ und darunter die vorhandenen Referenzpläne als Vorlagen

#### Scenario: Keine Referenzpläne vorhanden
- **WHEN** es keine Referenzpläne gibt
- **THEN** entfällt der Vorlagen-Block vollständig und nur die Hauptaktion bleibt

### Requirement: Fehler im Abschnitt statt Seitenabbruch
Schlägt das Laden eines Abschnitts fehl, SHALL nur dieser Abschnitt eine Fehlermeldung mit „Erneut versuchen“ zeigen; der übrige Inhalt bleibt sichtbar. Eine nicht gefundene Ressource SHALL als eigene Seite mit Suchvorschlägen erscheinen.

#### Scenario: Zutatenmengen fehlen
- **WHEN** die Mengenberechnung eines Rezepts fehlschlägt
- **THEN** zeigt nur der Abschnitt „Zutaten“ den Fehler mit „Erneut versuchen“, und Zubereitung und Kopf bleiben sichtbar

#### Scenario: Rezept nicht gefunden
- **WHEN** ein Rezept nicht existiert
- **THEN** zeigt die Seite „Rezept nicht gefunden“, den Hinweis auf Umbenennung oder Löschung, „Meintest du …“ mit Treffern der vorhandenen Suche und „Alle Rezepte ansehen“

### Requirement: Offline-Zustand ist nicht Teil dieses Changes
Die Referenz zeigt einen Offline-Zustand des Einkaufsmodus. Dieser Zustand SHALL in diesem Change NICHT ausgeliefert werden; er gehört zum Folge-Change „Offline-Einkaufsmodus“. Die Referenz MUST ihn als Zukunft kennzeichnen.

#### Scenario: Kein Offline-Code in diesem Change
- **WHEN** der Change umgesetzt ist
- **THEN** enthält der Code keinen Netzstatus-Hinweis und keine Warteschlange für Änderungen im Einkaufsmodus
