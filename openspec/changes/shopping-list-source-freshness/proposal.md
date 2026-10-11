# Aktualität und Duplikatschutz für planbasierte Einkaufslisten

## Why

Eine aus einem Essensplan erzeugte Einkaufsliste kann nach Änderungen an Personenzahl oder Mahlzeiten fachlich veraltet sein. Gleichzeitig bleibt die Erstellaktion verfügbar und erlaubt wiederholte Listen mit identischem Namen und Inhalt. Es fehlt eine klare, sichtbare Regel, ob eine erzeugte Liste ein unabhängiger Snapshot oder eine aktuelle Projektion des Plans ist.

## What Changes

- Die fachliche Aktualitätsregel für planbasierte Listen wird festgelegt: Snapshot mit sichtbarem Änderungsstatus oder Aktualisierung aus dem Quellplan.
- Die UI zeigt, ob sich der Quellplan seit der Erstellung geändert hat, und bietet entsprechend der gewählten Regel eine sichere Aktion zum Aktualisieren oder Neuerstellen.
- Wiederholte Erstellaufrufe erzeugen nicht unbemerkt identische Listen; die API behandelt Wiederholungen idempotent oder verlangt eine bewusste Bestätigung.
- Änderungen und Aktualisierungen bewahren abgehakte Einträge, manuelle Ergänzungen sowie die Quellenzuordnung nachvollziehbar.

## Capabilities

### Modified Capabilities
- `shopping-list`
- `shopping-list-item-sources`

### New Capabilities
- `shopping-list-source-lifecycle`

## Impact

- Backend: Erstell-/Aktualisierungsendpunkt und Metadaten zur Quellplan-Version beziehungsweise zum Erstellzeitpunkt.
- Food-Frontend: `ShoppingView`, Erstellaktion und Anzeige veralteter Listen.
- API- und Frontend-Schemas sowie Tests für Wiederholungsaufrufe, Planänderungen und manuelle Listeneinträge.

Vor der Implementierung ist die Snapshot- oder Synchronisierungsregel als Produktentscheidung zu bestätigen.
