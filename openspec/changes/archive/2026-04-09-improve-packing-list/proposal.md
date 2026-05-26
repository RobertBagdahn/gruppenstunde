## Why

Die Packliste ist aktuell eine flache Liste ohne Detailansicht für einzelne Items und ohne "Nicht mitbringen"-Funktion. Items können nur inline bearbeitet werden, es fehlt eine Möglichkeit, mehr Informationen pro Item anzuzeigen. Außerdem fehlt eine Freigabe-/Sichtbarkeitssteuerung — derzeit kann jeder, der die URL kennt, jede Liste sehen. Es gibt keine Möglichkeit, Listen privat zu halten oder gezielt per Share-Link zu teilen, bei dem Besucher Items für sich abhaken können. Zusätzlich sind die Testdaten im Seed-Command lückenhaft und decken keine "Nicht mitbringen"-Einträge ab.

## What Changes

- **"Nicht mitbringen"-Kategorie**: Neues Feld `is_do_not_bring` am `PackingItem` Model. Items mit diesem Flag werden visuell anders dargestellt (durchgestrichen, Warnsymbol) und sind nicht abhakbar. Beispiele: "Handy, außer ausgeschaltet im Rucksack", "Geld", "eigene Süßigkeiten".
- **Klickbare Items mit Detailansicht**: Jedes Item wird klickbar. Klick öffnet eine Detail-Seite oder ein Modal mit erweiterten Informationen (Beschreibung, Menge, optional verknüpftes Supply, Hinweise).
- **Sichtbarkeitssteuerung**: Neues Feld `visibility` am `PackingList` Model (`private` = nur Owner, `link_only` = per Share-Link zugänglich). **BREAKING**: Ersetzt das bisherige Verhalten, dass alle Listen öffentlich lesbar sind.
- **Share-Link mit eigenem Check-State**: Neues Model `PackingListShare` mit UUID-Token. Besucher eines Share-Links können Items für sich abhaken, ohne den Original-Zustand zu verändern. Jeder Share-Link hat seinen eigenen Check-State (`PackingListShareCheck`).
- **Erweiterte Testdaten**: Seed-Command um "Nicht mitbringen"-Items und mehr Kategorien/Items ergänzen.

## Capabilities

### New Capabilities
- `packing-list-do-not-bring`: "Nicht mitbringen"-Items, die visuell als Verbot markiert und nicht abhakbar sind
- `packing-list-item-detail`: Klickbare Items mit Detailansicht (erweitertes Modal/Seite mit Beschreibung, Menge, Supply-Link, Hinweisen)
- `packing-list-sharing`: Sichtbarkeitssteuerung (privat/link-only) und Share-Links mit eigenem Check-State pro Besucher
- `packing-list-seed-data`: Erweiterte Testdaten für Seed-Command inkl. "Nicht mitbringen"-Einträge

### Modified Capabilities
- `packing-list`: Basis-Model wird um `visibility` und `is_do_not_bring` erweitert, API-Endpunkte für Sichtbarkeit und Shares hinzugefügt

## Impact

- **Backend**: `packinglist` App — Models (`PackingList`, `PackingItem` modifiziert, `PackingListShare` + `PackingListShareCheck` neu), Schemas, API-Endpunkte, Migrations, Seed-Command
- **Frontend**: `PackingListDetailPage` (Item-Klick, Detail-Modal), `PackingListsPage` (Sichtbarkeits-Toggle), neue Share-Seite, Zod-Schemas erweitern
- **Pydantic-Schemas**: `PackingItemOut`, `PackingListOut`, `PackingListCreateIn`, `PackingListUpdateIn` anpassen; neue Schemas für Share-Endpunkte
- **Zod-Schemas**: `PackingItemSchema`, `PackingListSchema`, `PackingListSummarySchema` anpassen; neue Share-Schemas
- **Migrations**: 1 neue Migration für Model-Änderungen
- **API-Endpunkte**: Neue Endpunkte für Share-Links (erstellen, abrufen, abhaken) und Share-View (Liste per Token laden)
