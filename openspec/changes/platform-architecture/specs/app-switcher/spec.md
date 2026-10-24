# Spec Delta: app-switcher

## Purpose

Verbindet die Konto-App und die drei Produkt-Apps zu einer Plattform: ein einheitlicher Wechsel zwischen den Apps und Deep-Links zwischen fachlich verknüpften Objekten, ohne fremde Seiten einzubetten.

## ADDED Requirements

### Requirement: App-Switcher im Kopfbereich
Jede App SHALL im Kopfbereich einen App-Switcher anzeigen. Er SHALL Gruppenstunde, Anmeldung, Essensplan und Konto mit Name, Icon und Kurzbeschreibung auflisten und die aktuelle App markieren. Er MUST ab 320 px Breite bedienbar sein.

#### Scenario: Wechsel von Gruppenstunde zum Essensplan
- **GIVEN** ein Nutzer ist in Gruppenstunde
- **WHEN** er den App-Switcher öffnet und „Essensplan“ wählt
- **THEN** öffnet sich die Startseite von `essensplan.app` im selben Tab

#### Scenario: Mobile Ansicht
- **WHEN** ein Nutzer bei 320 px Breite den App-Switcher öffnet
- **THEN** sind alle vier Apps ohne horizontales Scrollen sichtbar und antippbar

### Requirement: Einheitliches Benutzermenü
Jede App SHALL dasselbe Benutzermenü anzeigen, mit Name und Bild, „Konto verwalten“ (Link in die Konto-App) und „Abmelden“. Anonyme Besucher SHALL stattdessen „Anmelden“ sehen.

#### Scenario: Konto verwalten
- **WHEN** ein angemeldeter Nutzer im Essensplan „Konto verwalten“ wählt
- **THEN** öffnet sich `konto.gruppenstunde.de` mit Rücksprung zum Essensplan
- **AND** er ist dort angemeldet, ohne einen Anbieter auszuwählen

#### Scenario: Anonymer Besucher
- **WHEN** ein nicht angemeldeter Besucher eine Produkt-App öffnet
- **THEN** zeigt das Benutzermenü „Anmelden“

### Requirement: Deep-Links zwischen verknüpften Objekten
Verweist ein Objekt auf ein Objekt eines anderen Produkts, SHALL die App einen Link auf die Detailseite in der zuständigen App anzeigen. Die App MUST die fremde Seite nicht einbetten und MAY nur Titel und Kurzinfo des verknüpften Objekts anzeigen.

#### Scenario: Aktion mit verknüpftem Essensplan
- **GIVEN** eine Aktion ist mit einem Essensplan verknüpft
- **WHEN** ein Organisator das Aktions-Dashboard in der Anmelde-App öffnet
- **THEN** sieht er Titel und Zeitraum des Essensplans und „Im Essensplan öffnen“
- **AND** der Link führt auf `essensplan.app/meal-plans/<id>`

#### Scenario: Essensplan mit verknüpfter Aktion
- **WHEN** ein Nutzer diesen Essensplan im Essensplan öffnet
- **THEN** sieht er „Zur Aktion“ mit Link auf die Aktion in der Anmelde-App

#### Scenario: Verknüpftes Objekt ohne Leserecht
- **GIVEN** ein Nutzer darf die Aktion sehen, aber nicht den verknüpften Essensplan
- **WHEN** er das Aktions-Dashboard öffnet
- **THEN** wird kein Titel des Essensplans angezeigt, sondern nur „Ein Essensplan ist verknüpft“

### Requirement: App-Links vom Backend
Das Backend SHALL die Basis-URLs der Apps bereitstellen (`GET /api/platform/apps/` → `[{ id, name, description, url }]`), damit Deep-Links in allen Umgebungen auf die richtige Domain zeigen. Der Endpunkt SHALL ohne Anmeldung erreichbar sein.

#### Scenario: Apps abrufen (anonym)
- **WHEN** ein nicht angemeldeter Client `GET /api/platform/apps/` aufruft
- **THEN** antwortet das System mit HTTP 200 und den vier Apps `konto`, `gruppenstunde`, `anmeldung`, `essensplan` mit ihren Basis-URLs für die aktuelle Umgebung
