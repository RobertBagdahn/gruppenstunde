## 1. Backend

- [x] 1.1 Bestätigen, dass keine Backend-, Pydantic- oder Migrationsänderung nötig ist: Die Detailantwort liefert `name`, `is_checked`, Menge, `package_options`, Abteilung, `is_material` und `claimed_by_display_name`. Zod `ShoppingListItemSchema` bleibt unverändert.

## 2. Gemeinsame Hilfsfunktionen (Frontend)

- [x] 2.1 `groupBySection`, `OTHER_SECTION` und `MATERIAL_SECTION` aus `ShoppingListDetailPage.tsx` nach `src/lib/shoppingListSections.ts` verschieben, Importe und `groupBySection.test.ts` anpassen
- [x] 2.2 `formatItemQuantityLabel(item)` in `src/lib/shoppingItemDisplay.ts` anlegen (Menge plus Packungsbedarf) und in `ShoppingListItemRow.tsx` verwenden, ohne die Bildschirmanzeige zu ändern
- [x] 2.3 `src/lib/shoppingListExport.ts` mit `buildShoppingListExport(list, items, now)` und `formatShoppingListText(exportData)` anlegen
- [x] 2.4 Unit-Tests `shoppingListExport.test.ts`: nur offene Einträge, Zähler im Kopf, Abteilungsreihenfolge inkl. „Sonstiges“ und „Verbrauchsmaterial“, leere Abteilungen entfallen, Zuständigkeit in Klammern, Eintrag ohne Menge, exakter Textaufbau

## 3. Druckansicht (Frontend)

- [x] 3.1 `src/components/shopping/ShoppingListPrintView.tsx`: Kopf, Abteilungen mit Kästchen, Name und Menge, `print:columns-2`, `break-inside-avoid`, Abschnitt „Zusätzlich“ mit fünf Leerzeilen; auf dem Bildschirm `hidden print:block`
- [x] 3.2 Auf der Detailseite den restlichen Inhalt mit `print:hidden` versehen und die Druckansicht einbinden
- [x] 3.3 Druckvorschau in Chromium geprüft (A4-Layout per Screenshot: zweispaltig, Kästchen, Abschnitt „Zusätzlich“, keine Bedienelemente)
- [ ] 3.4 Offen: Druck auf iOS-Safari und Android-Chrome auf echtem Gerät prüfen (hier nicht ausführbar)

## 4. Export-Menü (Frontend)

- [x] 4.1 `src/components/shopping/ShoppingListExportMenu.tsx` mit `DropdownMenu` anlegen: „Drucken oder als PDF speichern“ (`window.print()`), „Als Text teilen“ (nur bei `navigator.share`, `AbortError` still), „Text kopieren“ (`navigator.clipboard.writeText`), Meldungen über `notify`
- [x] 4.2 Button „Liste exportieren“ im Kopfband für alle Betrachter einbauen (nicht im Einkaufsmodus); bei keinen offenen Einträgen deaktiviert mit „Alles abgehakt – nichts zu exportieren“
- [x] 4.3 Neues Icon `FileDown` gemäß Icon-Regeln einbinden (ggf. in `ICONS` ergänzen); Mobile-Prüfung bei 320 px (Kopfband-Buttons umbrechen nicht)

## 5. Tests

- [x] 5.1 Komponententest `ShoppingListExportMenu.test.tsx`: Aktionen mit und ohne `navigator.share`, Teilen-Abbruch ohne Meldung, Kopieren Erfolg und Fehler
- [x] 5.2 `ShoppingListDetailPage.test.tsx`: Button für Besitzer, Viewer und Gast sichtbar; im Einkaufsmodus ausgeblendet; deaktiviert bei allem abgehakt; keine API-Anfrage beim Export
- [x] 5.3 E2E in `frontend-food/e2e/`: Liste öffnen, Text kopieren, Inhalt der Zwischenablage prüfen; Druckansicht per `page.emulateMedia({ media: 'print' })` auf Abteilungen, Kästchen und fehlende abgehakte Einträge prüfen
- [x] 5.4 `npm run lint`, `npm run build` (inkl. `tsc -b`) und die betroffenen Vitest-Suites in `frontend-food/` ausführen

## Abweichungen vom Design (bei der Umsetzung entschieden)

- Die Druckansicht ist nur während des Druckens im DOM (`ShoppingListDetailPage` mountet sie mit `flushSync` kurz vor `window.print()`). So steht der Text nicht doppelt auf dem Bildschirm, und die Tests sehen nur eine Fassung.
- Die Kopfzeile der Druckansicht ist ein `div`, kein `header`: die globale Druck-CSS blendet jedes `header`-Element aus.
- `index.css`: Im Druck wird `.bg-background` weiß, damit der Seitenhintergrund der App nicht auf das Papier fällt.
- Die Mengenangabe im Export ist die Zeilenbeschriftung inklusive Packungsbedarf (`formatItemQuantityLabel`); eine separate Packungszeile gibt es nicht.

## 6. Spec-Abgleich

- [x] 6.1 Szenario-Fehler korrigiert („Drucken“ fehlt nicht bei fehlender Teilen-Funktion)
- [x] 6.2 Textformat als Szenario mit vollständigem Beispiel, Teilen-Fehler, Stand-Zeile, Packungsbedarf ergänzt
- [x] 6.3 Druckblatt nur beim Drucken und Papier ohne Hintergrund als Szenarien in `shopping-list-views` ergänzt
