# Spec Delta: frontend-workspace

## Purpose

Legt fest, wie die vier Frontend-Apps als getrennte Anwendungen in einem gemeinsamen Workspace leben und welche wenigen Bausteine sie über geteilte Pakete nutzen, damit sie unabhängig bleiben und trotzdem einheitlich wirken.

## ADDED Requirements

### Requirement: Vier getrennt baubare Apps
Das Repository SHALL die Apps `apps/konto`, `apps/gruppenstunde`, `apps/anmeldung` und `apps/essensplan` enthalten. Jede App SHALL einzeln startbar, testbar, baubar und deploybar sein.

#### Scenario: Eine App lokal starten
- **WHEN** ein Entwickler `make essensplan` ausführt
- **THEN** startet nur der Dev-Server des Essensplans und leitet `/api/*` an das lokale Backend weiter

#### Scenario: Nur geänderte Apps deployen
- **WHEN** ein Commit auf `main` nur Dateien in `apps/anmeldung` ändert
- **THEN** baut und deployt CI nur die Anmelde-App
- **AND** ändert ein Commit `packages/*`, baut und deployt CI alle vier Apps

#### Scenario: Eine App bauen
- **WHEN** CI das Image der Anmelde-App baut
- **THEN** enthält das Bundle keinen Code aus `apps/gruppenstunde`, `apps/essensplan` oder `apps/konto`

### Requirement: Keine Imports zwischen Apps
Eine App MUST NOT Code aus einer anderen App importieren. Geteilter Code SHALL ausschließlich über `packages/ui` und `packages/platform` bereitgestellt werden. Ein Verstoß SHALL den Lint-Schritt in CI fehlschlagen lassen.

#### Scenario: Unerlaubter Import
- **WHEN** eine Datei in `apps/anmeldung` eine Datei aus `apps/essensplan` importiert
- **THEN** schlägt `npm run lint` mit einer Meldung fehl, die beide Pfade nennt

### Requirement: Geteiltes Paket für die Plattform
`packages/platform` SHALL genau die plattformweiten Bausteine bereitstellen: Abfrage der Session, API-Client mit CSRF, die Login-Seite mit Google, Apple und E-Mail-Link samt Code-Eingabe (pro App mit eigenem Logo und eigener Farbe), den Onboarding-Dialog, den Anstoß des Plattform-Abgleichs, App-Switcher, Benutzermenü sowie die Zod-Schemas für User, Gruppe und Mitgliedschaft. Fachliche Komponenten, Hooks und Schemas eines Produkts MUST NOT in einem geteilten Paket liegen.

#### Scenario: Login-Seite im Design der App
- **WHEN** ein Besucher die Login-Seite im Essensplan und in der Anmelde-App öffnet
- **THEN** zeigen beide dieselben Anbieter und Fehlermeldungen, aber jeweils Logo und Primärfarbe ihrer App

#### Scenario: Session in jeder App gleich
- **WHEN** ein Nutzer in einer beliebigen App angemeldet ist
- **THEN** zeigen Benutzermenü und App-Switcher in allen Apps dieselben Daten und dasselbe Verhalten

#### Scenario: Fachliche Komponente bleibt in ihrer App
- **WHEN** eine Rezeptkarte von Gruppenstunde und Essensplan benötigt wird
- **THEN** zeigt Gruppenstunde einen Deep-Link auf den Essensplan statt eine geteilte Rezeptkarte zu verwenden

### Requirement: Geteiltes UI-Paket
`packages/ui` SHALL Design-Tokens, Tailwind-Basiskonfiguration und produktneutrale Basiskomponenten bereitstellen (z. B. Button, Dialog, Pagination, EmptyState, Skeleton). Jede App MAY ihre Primärfarbe und ihr Logo selbst festlegen.

#### Scenario: Eigene Akzentfarbe
- **WHEN** der Essensplan und die Anmelde-App denselben Button aus `packages/ui` verwenden
- **THEN** erscheint er jeweils in der Primärfarbe der App, mit gleicher Form, Größe und Fokusdarstellung
