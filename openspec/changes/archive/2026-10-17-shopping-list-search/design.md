## Context

Die Detailseite `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx` lädt über `useShoppingList(listId)` die komplette Liste mit allen Einträgen (`GET /api/shopping-lists/{id}/`). `groupBySection` gruppiert die Einträge nach Abteilung, und `useShoppingListSync` hält sie per Pulse-Abgleich aktuell. Eine Suche gibt es nicht. Beim Feldtest am 16.10.2026 mit fünf Personen im Supermarkt war das Neuladen der ganzen Liste der Lasttreiber: 2 Backend-Slots und rund 7,5 s pro Detailabruf führten zu 429-Fehlern. Eine Suche darf diese Last deshalb nicht erhöhen.

## Goals / Non-Goals

**Goals:**
- Im Laden schnell sehen, ob und wo ein Artikel auf der Liste steht und ob er schon abgehakt ist.
- Fehlende Artikel aus der Suche heraus ergänzen, ohne doppelte Einträge zu erzeugen.
- Suchbegriff im URL-State, damit er nach Neuladen oder App-Wechsel erhalten bleibt.

**Non-Goals:**
- Serverseitige Suche, Volltextindex oder Suche über mehrere Listen.
- Unscharfe Suche oder Synonyme, z. B. „Spaghetti“ findet „Nudeln“. Das gehört zur geplanten Anforderung „Zutaten zusammenführen“.
- Suche in Rezept- oder Mahlzeitnamen der Quellen. Das gehört zur geplanten Ansicht pro Mahlzeit.

## Decisions

### Filterung im Browser statt neuer API
Die Detailantwort enthält bereits alle Einträge. Eine Filterung im Browser ist sofort, funktioniert auch bei langsamer Verbindung und erzeugt keine Anfragen.
- **Verworfene Alternative:** `GET /api/shopping-lists/{id}/?q=` als serverseitiger Filter. Das würde jede Eingabe zu einem teuren Detailabruf machen.
- **Folge:** keine Endpunkt-, Pydantic- oder Zod-Änderung, keine Migration.

### Reine Hilfsfunktion `frontend-food/src/lib/shoppingListSearch.ts`
- `normalizeSearchText(text: string): string`: trimmt, setzt `toLocaleLowerCase('de-DE')`, ersetzt „ß“ durch „ss“ und entfernt Akzente per `normalize('NFD')`, indem Combining Marks (`\p{M}`) gestrichen werden.
- `filterShoppingItems(items: ShoppingListItem[], query: string): ShoppingListItem[]` nutzt einen Teilstring-Vergleich auf `item.name`.

Die Seite ruft `groupBySection(filterShoppingItems(items, query))` auf. Reihenfolge und Abteilungslogik bleiben so unverändert, und leere Abteilungen entstehen gar nicht erst. Die Hilfsfunktion ist ohne React testbar.
- **Verworfene Alternative:** Filter in `groupBySection`. Das würde zwei Verantwortungen vermischen.

### URL-State über `useSearchParams`
- `q` wird mit `setSearchParams(next, { replace: true })` geschrieben. So entsteht pro Tastendruck kein Verlaufseintrag, und „Zurück“ verlässt die Seite.
- Der Eingabewert ist direkt an `q` gebunden. Ein Debounce ist bei rein lokaler Filterung unnötig.
- Beim Leeren wird der Parameter gelöscht. Andere Parameter bleiben erhalten.

### Platzierung und Einkaufsmodus
- Das Suchfeld steht zwischen Fortschrittsbalken und Abteilungen, in normalem und Einkaufsmodus.
- Es wird nicht klebend (`sticky`) gesetzt. Das HeroBand ist bereits hoch, und auf 320 px würde ein klebendes Feld zu viel Fläche nehmen. Nach einem Feldtest kann man das neu bewerten.
- Im Einkaufsmodus bekommt das Feld eine Höhe von `h-12` (48 px) und `text-emphasis`, passend zu den großen Bedienflächen.
- Das Feld nutzt die vorhandene `Input`-Komponente aus `components/ui` mit Lucide-Icon `Search` (16 px) und einer Schaltfläche „Suche leeren“ (`X`, `aria-label`).
- `type="search"` und `enterKeyHint="search"` sorgen für eine passende mobile Tastatur.

### Hinzufügen bei keinem Treffer
Das Hinzufügen nutzt den vorhandenen `useAddShoppingListItem(listId)`, inklusive Gast-Header. Das Formular „Eintrag hinzufügen“ bleibt unverändert. Der Suchbegriff bleibt nach dem Anlegen stehen. Da die Mutation die Liste invalidiert, erscheint der neue Eintrag als Treffer und bestätigt so das Anlegen; ein zusätzlicher Toast ist überflüssig (Mikro-Aktion).

### Betroffene Dateien
- `frontend-food/src/lib/shoppingListSearch.ts` (neu) und `frontend-food/src/lib/shoppingListSearch.test.ts` (neu)
- `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx`
- `frontend-food/src/pages/shopping/ShoppingListDetailPage.test.tsx`
- `frontend-food/e2e/` (Szenario Suche)
- Backend: keine Dateien, keine Endpunkte. API-Änderungen: keine. Migrationen: keine.

## Risks / Trade-offs

- **[Risiko]** Nutzer suchen „Spaghetti“, auf der Liste steht „Nudeln“, und sie tragen „Spaghetti“ doppelt ein. → Das ist bewusst außerhalb des Scopes. Die geplante Anforderung „Zutaten zusammenführen mit Rückfrage“ deckt das ab.
- **[Risiko]** Ein Filter ist aktiv, ohne dass es auffällt, und Einträge scheinen zu fehlen. → Die Trefferzahl steht sichtbar über der Liste, „Suche leeren“ ist immer erreichbar, und der Fortschrittsbalken zählt die ganze Liste.
- **[Trade-off]** Ein Teilstring-Vergleich findet „Ei“ auch in „Eisbergsalat“. → Für eine Einkaufsliste mit 20–80 Einträgen ist das akzeptabel und vorhersehbarer als eine unscharfe Suche.

## Migration Plan

Reine Frontend-Änderung. Ausrollen mit dem normalen Food-Frontend-Deploy, Rollback über die vorherige Revision. Nicht während eines laufenden Einkaufs-Einsatzes deployen.

## Open Questions

- **Rückfrage 7 an Peter:** Soll man bei „nicht gefunden“ direkt hinzufügen können? Bei „Nein“ entfällt die Anforderung „Kein Treffer und Hinzufügen“ bis auf den Hinweistext.
