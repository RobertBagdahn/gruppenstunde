# Spec Delta

## Purpose

Wiederverwendbare Läden (z. B. Metro, Metzger Müller, DM), aus denen beim Planen eines Einkaufs gewählt wird. Ein Laden ist nur ein Name, ohne Sortiment.

## ADDED Requirements

### Requirement: Laden anlegen
Angemeldete Nutzer SHALL Läden mit einem Namen (1–80 Zeichen, getrimmt, nicht nur Leerraum) anlegen können (`POST /api/shopping-stores/`). Ein Laden gehört der anlegenden Person. Existiert für diese Person bereits ein Laden mit demselben Namen (ohne Rücksicht auf Groß- und Kleinschreibung), MUST die API diesen Laden zurückgeben, statt einen zweiten anzulegen.

#### Scenario: Neuer Laden
- **WHEN** ein angemeldeter Nutzer „Metro“ anlegt
- **THEN** antwortet die API mit 201 und liefert `id` und `name`

#### Scenario: Doppelter Name
- **GIVEN** der Nutzer hat bereits „Metro“
- **WHEN** er „metro “ anlegt
- **THEN** liefert die API den bestehenden Laden „Metro“

#### Scenario: Leerer Name
- **WHEN** der Name nur aus Leerzeichen besteht
- **THEN** antwortet die API mit 422 „Bitte gib einen Namen für den Laden ein.“

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Client einen Laden anlegt
- **THEN** antwortet die API mit 401

### Requirement: Läden zur Auswahl
`GET /api/shopping-stores/` SHALL paginiert (`page`, `page_size`, Standard 20) und per `search` filterbar die eigenen Läden liefern. Mit `event_slug` MUST die Antwort zusätzlich die Läden enthalten, die in Einkäufen dieses Events verwendet werden, sofern der Nutzer Zugriff auf das Event hat. Die Auswahl im Formular SHALL das Anlegen eines neuen Ladens direkt aus der Eingabe erlauben („„Metzger Müller“ anlegen“).

#### Scenario: Laden des Teams
- **GIVEN** Anna hat für das Event einen Einkauf bei „Metzger Müller“ geplant
- **WHEN** Ben, ebenfalls im Event-Team, für dieses Event einen Laden sucht
- **THEN** erscheint „Metzger Müller“ in der Auswahl

#### Scenario: Neuer Laden aus der Eingabe
- **WHEN** der Nutzer „DM“ eintippt und es keinen passenden Laden gibt
- **THEN** bietet die Auswahl „„DM“ anlegen“ an und verwendet nach dem Anlegen den neuen Laden

### Requirement: Laden umbenennen und löschen
Die besitzende Person SHALL einen Laden umbenennen können. Das Löschen MUST verweigert werden (409 „Dieser Laden wird noch in Einkäufen verwendet“), solange Einkäufe ihn verwenden. Fremde Läden MUST für Änderungen 404 liefern.

#### Scenario: Laden in Verwendung
- **WHEN** der Nutzer einen Laden löscht, der in einem Einkauf steht
- **THEN** antwortet die API mit 409

#### Scenario: Fremder Laden
- **WHEN** ein Nutzer den Laden einer anderen Person umbenennt
- **THEN** antwortet die API mit 404
