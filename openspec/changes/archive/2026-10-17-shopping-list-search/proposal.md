## Why

Beim gemeinsamen Einkauf am 16.10.2026 mussten fünf Personen auf dem Handy lange Listen durchscrollen, um zu sehen, ob etwas schon auf der Liste steht oder bereits abgehakt ist. Das Team wünscht sich deshalb ausdrücklich eine „Suchfunktion: was ist auf der Liste“. Eine Suche spart im Laden Zeit und verhindert außerdem, dass Einträge doppelt von Hand ergänzt werden.

## What Changes

- Neues Suchfeld auf der Einkaufslisten-Detailseite (`/shopping-lists/:id`) im Food-Frontend, auch im Einkaufsmodus.
- Die Suche filtert die bereits geladenen Einträge im Browser. Sie unterscheidet nicht zwischen Groß- und Kleinschreibung und ignoriert Umlaute bzw. Akzente. Abgehakte Einträge werden mitgefunden.
- Die Gruppierung nach Abteilungen bleibt erhalten; leere Abteilungen werden ausgeblendet; die Trefferzahl wird angezeigt.
- Der Suchbegriff steht in der URL (`?q=`). Neuladen, Teilen der URL und Zurück-Navigation behalten ihn.
- Ohne Treffer bietet die Seite Nutzern mit Bearbeitungsrecht „„<Suchbegriff>“ hinzufügen“ an. Das ist vorbehaltlich Peters Antwort auf Rückfrage 7 und als eigene Anforderung spezifiziert, damit sie bei Bedarf einzeln entfallen kann.
- Keine Backend-Änderung, keine neuen Endpunkte.

## Capabilities

### New Capabilities
- `shopping-list-search`: Suche und Filter der Einträge auf der Einkaufslisten-Detailseite, URL-State, Verhalten im Einkaufsmodus, Hinzufügen bei fehlendem Treffer.

### Modified Capabilities
<!-- Keine: der Einkaufsmodus (shopping-list-sharing) zählt nur ausgeblendete Bereiche auf; ein zusätzliches sichtbares Suchfeld widerspricht dem nicht. -->

## Impact

- **Frontend (nur `frontend-food/`):**
  - `src/pages/shopping/ShoppingListDetailPage.tsx`: Suchfeld, Filterung, Leerzustand mit Hinzufügen.
  - Neue reine Hilfsfunktion `src/lib/shoppingListSearch.ts` mit Unit-Tests.
  - Seitentests und ein E2E-Szenario.
- **Backend:** keine Änderung, keine betroffene Django-App.
- **Schemas:** keine Pydantic- oder Zod-Änderung, da die Detailantwort bereits alle Einträge enthält.
- **Migrationen:** keine.
- **Last:** keine zusätzlichen API-Anfragen. Das ist relevant, weil die Last-Spitze beim Ausfall vom 16.10.2026 vom Neuladen der Liste kam.
