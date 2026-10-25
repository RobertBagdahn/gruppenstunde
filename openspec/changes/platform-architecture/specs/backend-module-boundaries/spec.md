# Spec Delta: backend-module-boundaries

## Purpose

Hält das gemeinsame Backend als modularen Monolithen beherrschbar: klare Schichten aus Plattform, Shared Kernel und Produkten, erlaubte Abhängigkeitsrichtungen und eine nach Produkt gegliederte API, damit sich die drei Produkte unabhängig weiterentwickeln lassen.

## ADDED Requirements

### Requirement: Modulschichten
Das Backend SHALL jede Django-App genau einer Schicht zuordnen:
- **Plattform:** `core`, `profiles`
- **Shared Kernel:** `content`, `supply`
- **Produkt Gruppenstunde:** `session`, `blog`, `game`, `packinglist`, Stundenplaner
- **Produkt Anmeldung:** `event`
- **Produkt Essensplan:** `recipe`, `shopping`, Essensplan

Die Zuordnung SHALL im Repository maschinenlesbar hinterlegt sein.

#### Scenario: Neue App ohne Zuordnung
- **WHEN** eine neue Django-App in `INSTALLED_APPS` aufgenommen wird, ohne einer Schicht zugeordnet zu sein
- **THEN** schlägt der Architektur-Check in CI fehl

### Requirement: Erlaubte Abhängigkeitsrichtungen
Plattform-Module MUST NOT Shared-Kernel- oder Produktmodule importieren. Shared-Kernel-Module MUST NOT Produktmodule importieren. Ein Produkt MUST NOT Models, Schemas oder interne Services eines anderen Produkts importieren, sondern SHALL ausschließlich dessen öffentliche Service-Schnittstelle nutzen. Signale und Registries SHALL Plattformfunktionen ohne Rückwärtsimport um Produktdaten erweitern, z. B. bei Datenexport oder Kontolöschung.

#### Scenario: Plattform importiert Produkt
- **WHEN** ein neues Modul in `core` aus `recipe` importiert
- **THEN** schlägt der Architektur-Check in CI fehl und nennt den Importpfad

#### Scenario: Produkt nutzt fremde Schnittstelle
- **WHEN** `event` den verknüpften Essensplan über die öffentliche Service-Schnittstelle des Essensplans abfragt
- **THEN** besteht der Architektur-Check

#### Scenario: Kontolöschung löscht Produktdaten
- **GIVEN** ein Nutzer hat Rezepte, Aktionen und Packlisten
- **WHEN** er in der Konto-App sein Konto löscht
- **THEN** werden die Daten aller Produkte nach deren eigenen Regeln gelöscht oder anonymisiert
- **AND** `profiles` importiert dafür keines der Produktmodule

### Requirement: Verknüpfungen zwischen Produkten
Jede Verknüpfung zwischen Objekten zweier Produkte (z. B. Aktion ↔ Essensplan, Einkaufstouren einer Aktion) SHALL genau einem Produkt gehören. Das andere Produkt SHALL Daten und Rechte dazu nur über die öffentliche Schnittstelle des besitzenden Produkts lesen. Wird ein Objekt gelöscht, SHALL die Verknüpfung entfernt werden, ohne das Objekt des anderen Produkts zu löschen.

#### Scenario: Aktion wird gelöscht
- **GIVEN** eine Aktion ist mit einem Essensplan verknüpft
- **WHEN** die Aktion gelöscht wird
- **THEN** bleibt der Essensplan bestehen und zeigt keinen Link „Zur Aktion“ mehr

#### Scenario: Einkaufstouren lesen das Aktionsteam
- **WHEN** der Essensplan prüft, wer die Einkaufstouren einer Aktion planen darf
- **THEN** fragt er das Aktionsteam über die öffentliche Schnittstelle der Anmeldung ab und importiert keine Models aus `event`

### Requirement: Bestehende Verstöße nur abbauen
Bestehende Verstöße SHALL in einer Ausnahmeliste stehen. Der Architektur-Check MUST fehlschlagen, wenn ein neuer Verstoß hinzukommt, und SHALL einen Hinweis ausgeben, wenn ein gelisteter Verstoß nicht mehr existiert und aus der Liste entfernt werden kann.

#### Scenario: Neuer Verstoß
- **GIVEN** die Ausnahmeliste enthält `core.services.x -> supply`
- **WHEN** ein Commit `core.services.y -> supply` hinzufügt
- **THEN** schlägt der Architektur-Check fehl

#### Scenario: Verstoß behoben
- **WHEN** der Import `core.services.x -> supply` entfernt wird
- **THEN** besteht der Check und meldet, dass der Eintrag entfernt werden kann

### Requirement: API-Präfixe pro Produkt
Alle API-Endpunkte SHALL unter einem Präfix ihrer Schicht liegen:
- `/api/auth/`, `/api/platform/`, `/api/account/` für Plattform und Konto
- `/api/content/`, `/api/supply/` für den Shared Kernel
- `/api/gruppenstunde/`, `/api/events/`, `/api/food/` für die Produkte

Jedes Präfix SHALL eine eigene OpenAPI-Dokumentation erhalten. Bestehende Pfade dürfen geändert werden; Frontends werden im selben Schritt angepasst.

#### Scenario: OpenAPI pro Produkt
- **WHEN** ein Entwickler die OpenAPI-Doku des Essensplans öffnet
- **THEN** enthält sie nur Endpunkte unter `/api/food/` und keine Endpunkte von Aktionen oder Gruppenstunden

#### Scenario: Anonymer Aufruf eines geschützten Produkt-Endpunkts
- **WHEN** ein nicht angemeldeter Client `GET /api/food/meal-plans/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

### Requirement: Stundenplaner und Essensplan getrennt
Stundenplaner und Essensplan SHALL in getrennten Modulen der jeweiligen Produktschicht liegen. Bei der Trennung MUST alle bestehenden Pläne, Mahlzeiten, Buffets und Referenzmahlzeiten erhalten bleiben.

#### Scenario: Daten nach der Trennung
- **GIVEN** vor der Migration existieren N Essenspläne und M Stundenpläne
- **WHEN** die Migration ausgeführt wurde
- **THEN** existieren weiterhin N Essenspläne mit allen Mahlzeiten und M Stundenpläne mit allen Einträgen
