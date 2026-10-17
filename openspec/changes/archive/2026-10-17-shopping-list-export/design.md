## Context

`ShoppingListDetailPage.tsx` lädt die komplette Liste und gruppiert sie mit `groupBySection`. Die Mengenbeschriftung der Zeile entsteht in `ShoppingListItemRow.tsx` aus `formatShoppingQuantity(...)` und `formatPackageNeed(...)` aus `src/lib/shoppingItemDisplay.ts`. In `src/index.css` gibt es globale `@media print`-Regeln: Navigation und Buttons werden ausgeblendet, Hintergründe zurückgesetzt, `@page { margin: 2cm }`. Die Materialliste nutzt bereits `window.print()`. Für Einkaufslisten fehlt ein Einstieg.

Das Backend lief beim Feldtest am 16.10.2026 mit 2 Instanzen à 1 gleichzeitiger Anfrage und war der Engpass. PDF-Renderings sind laut Terraform-Konfiguration speicherintensiv. Ein Export darf deshalb keine Serverlast erzeugen.

## Goals / Non-Goals

**Goals:**
- Rückfalllösung für den Laden: Papierliste oder Text in einer anderen App.
- Gleiche Inhalte und Reihenfolge wie auf dem Bildschirm, nach Abteilungen gruppiert.
- Für alle Betrachter einschließlich Gästen, ohne Backend-Last.

**Non-Goals:**
- Serverseitige PDF-Erzeugung oder Dateidownload (`.pdf`, `.csv`).
- Rückimport von Häkchen aus der exportierten Liste.
- Export pro Mahlzeit oder Einkaufstermin. Das kommt mit den Changes für die Ansicht pro Mahlzeit und für Einkaufstermine.
- Offline-Modus. Er ist zurückgestellt, bis die Ausfall-Analyse fertig ist.

## Decisions

### Browser-Druck statt Server-PDF
`window.print()` mit einer eigenen Druckkomponente. Jeder mobile Browser bietet im Druckdialog „Als PDF speichern“, sodass „PDF“ ohne Bibliothek und ohne Backend abgedeckt ist.
- **Verworfen:** ein neuer Endpunkt nach dem Muster des Essensplan-PDF-Exports. Das wäre zusätzliche Last auf dem knappen Backend und funktioniert gerade dann nicht, wenn der Server überlastet ist.
- **Verworfen:** clientseitige PDF-Bibliothek. Sie bringt Bundle-Größe ohne Mehrwert gegenüber dem Druckdialog.

### Eigene Druckkomponente `ShoppingListPrintView`
- `src/components/shopping/ShoppingListPrintView.tsx` wird mit `hidden print:block` gerendert, aber nur während des Druckens: die Seite mountet sie mit `flushSync` kurz vor `window.print()` und entfernt sie danach. Der übrige Seiteninhalt bekommt `print:hidden`.
- So bleibt die Bildschirmansicht unberührt. Das Drucklayout mit zweispaltigem `print:columns-2`, `break-inside-avoid` je Abteilung, Kästchen als `border`-Quadrat und Freizeilen „Zusätzlich“ ist unabhängig vom interaktiven Layout.
- **Verworfen:** die interaktive Liste per Print-CSS umgestalten. Sie enthält Bedienelemente, Quellen und Zuständigkeits-Buttons und wäre im Druck schwer kontrollierbar.

### Gemeinsame Daten für Druck und Text
`src/lib/shoppingListExport.ts` enthält reine Funktionen:
- `buildShoppingListExport(list, items, now): ShoppingListExport` liefert ein strukturiertes Ergebnis: Kopf, Zähler und Abteilungen mit Zeilen `{ name, quantity, claimedBy }`. Es nutzt `groupBySection` und filtert `!is_checked`.
- `formatShoppingListText(exportData): string` erzeugt den WhatsApp-tauglichen Text.

`ShoppingListPrintView` rendert dieselbe Struktur. Die Mengenbeschriftung wird aus `ShoppingListItemRow` als `formatItemQuantityLabel(item)` nach `src/lib/shoppingItemDisplay.ts` gezogen, damit Zeile, Druck und Text identisch bleiben. `groupBySection` und die Abteilungskonstanten ziehen von der Seite nach `src/lib/shoppingListSections.ts`, damit die Hilfsfunktion nicht aus einer Seite importiert.

### Nur offene Einträge
Vor dem Einkauf ist ohnehin alles offen. Beim Export während des Einkaufs, etwa wenn die App hakt, will man den Rest. Ein Schalter „Abgehakte mitnehmen“ würde das Menü verlängern. Er lässt sich nachrüsten, falls Peters Antwort das verlangt.

### Menü und Teilen
- Das Menü nutzt `DropdownMenu` aus `components/ui` am Icon-Button im Kopfband, Lucide-Icon `FileDown` mit 16 px wie die Nachbar-Buttons.
- Web Share folgt dem Muster aus `ShareLinkManager.tsx`: Erkennung über `typeof navigator.share === 'function'`, ein `AbortError` wird still ignoriert.
- Kopieren geht über `navigator.clipboard.writeText`.
- Meldungen laufen nur über `notify`: „Liste kopiert“, „Liste konnte nicht kopiert werden“, „Liste konnte nicht geteilt werden“. Teilen selbst bekommt keinen Erfolgs-Toast, weil das System-Sheet das Feedback ist.

### Rechte
Export ist lesend und gilt deshalb für alle Betrachter der Detailseite. Gäste sind eingeschlossen, im Gegensatz zum REWE-Export, der einen Token erzeugt. Im Einkaufsmodus ist der Button ausgeblendet, passend zur bestehenden Regel, dort nur Einträge zu zeigen.

### Betroffene Dateien
- `frontend-food/src/lib/shoppingListExport.ts` (neu) mit Test
- `frontend-food/src/lib/shoppingListSections.ts` (neu, aus der Detailseite verschoben)
- `frontend-food/src/lib/shoppingItemDisplay.ts` (`formatItemQuantityLabel`)
- `frontend-food/src/components/shopping/ShoppingListExportMenu.tsx` (neu)
- `frontend-food/src/components/shopping/ShoppingListPrintView.tsx` (neu)
- `frontend-food/src/components/shopping/ShoppingListItemRow.tsx` (nutzt `formatItemQuantityLabel`)
- `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx`
- Backend: keine Dateien, keine Endpunkte, keine Schemas, keine Migrationen.

## Risks / Trade-offs

- **[Risiko]** WhatsApp-Fettschrift `*…*` erscheint in Notizen-Apps als Sternchen. → Für WhatsApp, den Hauptkanal, ist das akzeptabel. Nach Peters Antwort auf Rückfrage 4 kann man die Formatierung anpassen.
- **[Risiko]** Das Zeichen „☐“ wird in Google Keep nicht automatisch zur Checkbox. → In Keep lässt sich jeder Text per „Kästchen anzeigen“ umwandeln. Im Change wird nichts weiter getan.
- **[Risiko]** iOS-Safari druckt Spalten unterschiedlich. → Manuelle Prüfung auf iPhone und Android in den Tasks. Falls nötig, auf einspaltig zurückfallen.
- **[Trade-off]** Der Export ist ein Snapshot. Häkchen auf Papier fließen nicht zurück. Das ist bei einer Rückfalllösung gewollt; der Kopf nennt den Stand.

## Migration Plan

Reine Frontend-Änderung. Ausrollen mit dem normalen Food-Frontend-Deploy, Rollback über die vorherige Revision. Nicht während eines laufenden Einkaufs-Einsatzes deployen.

## Open Questions

- **Rückfrage 4 an Peter:** Papier/PDF, Text oder beides? Der Change setzt beides um. Offen ist noch, ob die Fettschrift für Notizen-Apps stört und ob abgehakte Einträge optional mit exportiert werden sollen.
