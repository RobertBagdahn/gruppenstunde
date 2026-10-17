## 1. Backend

- [x] 1.1 Bestätigen, dass keine Backend-, Pydantic- oder Migrationsänderung nötig ist: Die Detailantwort `GET /api/shopping-lists/{id}/` liefert alle Einträge mit `name`, `is_checked` und Abteilung. Zod `ShoppingListItemSchema` bleibt unverändert.

## 2. Suchlogik (Frontend)

- [x] 2.1 `frontend-food/src/lib/shoppingListSearch.ts` anlegen mit `normalizeSearchText` (Trim, Kleinschreibung `de-DE`, ß→ss, Akzente entfernen) und `filterShoppingItems(items, query)` (Teilstring auf `name`, leere Suche gibt alle Einträge zurück)
- [x] 2.2 Unit-Tests `shoppingListSearch.test.ts`: Groß-/Kleinschreibung, Umlaute („mohr“ findet „Möhren“), ß/ss, Leerzeichen am Rand, abgehakte Einträge, leere Suche

## 3. Detailseite (Frontend)

- [x] 3.1 `q` über `useSearchParams` lesen und schreiben (`replace: true`, Parameter beim Leeren entfernen, andere Parameter erhalten)
- [x] 3.2 Suchfeld zwischen Fortschrittsbalken und Abteilungen einbauen (`Input`, Icon `Search`, „Suche leeren“, Escape leert), nur bei mindestens einem Eintrag; im Einkaufsmodus `h-12` und `text-emphasis`
- [x] 3.3 `groupBySection(filterShoppingItems(items, q))` verwenden; Trefferzahl („1 Treffer“/„n Treffer“) bei aktiver Suche anzeigen; Fortschritt weiter aus allen Einträgen berechnen
- [x] 3.4 Leerzustand „Nichts gefunden für „<q>““; bei `can_edit` Schaltfläche „„<q>“ hinzufügen“ über `useAddShoppingListItem`, Suchbegriff bleibt erhalten, Fehler über `notify.error('Eintrag konnte nicht hinzugefügt werden', …)`
- [x] 3.5 Mobile-Prüfung bei 320 px im normalen und im Einkaufsmodus (kein horizontales Scrollen, Bedienflächen groß genug)

## 4. Tests

- [x] 4.1 `ShoppingListDetailPage.test.tsx`: Filterung mit Abteilungen, Trefferzahl, `?q=` beim Laden vorbelegt, Suche leeren entfernt `q`, Suchfeld im Einkaufsmodus sichtbar
- [x] 4.2 Seitentest: keine zusätzliche Anfrage beim Tippen (Fetch-Mock zählt Aufrufe)
- [x] 4.3 Seitentest: kein Treffer zeigt für Bearbeiter und Gast die Hinzufügen-Schaltfläche, für Viewer nur den Hinweis; Fehlerfall behält den Suchbegriff
- [x] 4.4 E2E in `frontend-food/e2e/`: Liste öffnen, suchen, Treffer abhaken, neu laden (Suche bleibt), fehlenden Eintrag aus der Suche hinzufügen
- [x] 4.5 `npm run lint`, `npm run build` (inkl. `tsc -b`) und die betroffenen Vitest-Suites in `frontend-food/` ausführen

## 5. Nachbesserungen aus dem Test

- [x] 5.1 Schriftgröße des Suchfelds auf 16 px in beiden Modi (iOS zoomt Felder mit weniger als 16 px heran); E2E prüft `font-size`
- [x] 5.2 `cn()` in `src/lib/utils.ts` kennt die Projekt-Schriftgrößen (`text-body`, `text-emphasis`, …). Vorher verwarf `twMerge` `text-emphasis` neben `text-foreground`; Unit-Tests in `utils.test.ts`
- [x] 5.3 Fehlerfall „Hinzufügen schlägt fehl“: Suchbegriff bleibt, Meldung erscheint (Unit- und E2E-Test)
- [x] 5.4 Browser-Verlauf: Tippen erzeugt keine zusätzlichen Einträge (`history.length` unverändert)
- [x] 5.5 Fortschrittsbalken zählt während der Suche die ganze Liste (Unit-Test)

## 6. Nachbesserungen Runde 2

- [x] 6.1 Sitzungsprüfung bei Überlastung (429/5xx/Netz) wird wiederholt; umgesetzt und spezifiziert im Change `food-overload-and-typography`
- [x] 6.2 Detailseite zeigt bei nicht prüfbarer Anmeldung einen Fehler mit „Erneut versuchen“ statt der Anmeldeseite; Gäste bleiben auf der Liste (Spec: `food-overload-and-typography`)
- [x] 6.3 Titel im Kopfband bricht nicht mehr mitten im Wort (Buttons rutschen bei wenig Platz darunter); 320-px-Screenshot geprüft
- [x] 6.4 Test-Fixtures in `food-integrity.spec.ts` an das aktuelle Schema angepasst (Session-Format, Materialien, KI-Quota, deutsches Zahlenformat)
- [x] 6.5 Spec-Abgleich: Szenarien für 16-px-Schrift, 320-px-Layout, Verlauf und Fortschritt ergänzt (`specs/shopping-list-search/spec.md`)
