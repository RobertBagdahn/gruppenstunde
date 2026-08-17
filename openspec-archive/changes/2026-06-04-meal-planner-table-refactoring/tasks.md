## 1. Vorbereitungen

- [x] 1.1 Mahlzeitentyp `dessert` aus der `MEAL_TYPE_ORDER` in `/src/pages/planning/TableView.tsx` entfernen.

## 2. Umbau auf HTML-Tabelle

- [x] 2.1 Den Container-Aufbau in `TableView.tsx` von `CardTable` / `DataCardRow` auf ein echtes HTML-Tabellen-Layout (`<table>` Element) umstrukturieren.
- [x] 2.2 Die Tabelle in ein Div mit `overflow-x-auto` verpacken und die erste Spalte ("Mahlzeit") mit Tailwind-Klassen `sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)]` fixieren.
- [x] 2.3 Spaltenköpfe für jedes geplante Datum (`dates`) mit Wochentag und formatiertem Datum rendern (`min-w-[220px]`).
- [x] 2.4 Tabellenfuß (`<tfoot>`) zur Darstellung der täglichen Summen (Kalorien und farbcodierte Budget-Ampel) pro Tag-Spalte einbauen, basierend auf dem bestehenden Berechnungs- und Darstellungs-Code.

## 3. Konsolidierung der Schaltflächen & Aktions-Dropdowns

- [x] 3.1 In leeren Slots (Zellen ohne vorhandene Mahlzeit) alle direkt sichtbaren Buttons entfernen und durch ein einzelnes, unauffälliges Dreipunkt-Menü `[⋮]` (mittels shadcn `DropdownMenu`) ersetzen.
- [x] 3.2 Optionen im Dropdown-Menü für leere Slots implementieren: "Rezept hinzufügen...", "Zutat hinzufügen..." und "Notiz hinzufügen...". Jede Option muss zuerst asynchron `onAddMealType(date, mealType)` aufrufen und danach das entsprechende Dialogfenster öffnen.
- [x] 3.3 Die Komponente `/src/components/planning/MealActionsMenu.tsx` erweitern, sodass sie die Aktionen "Rezept hinzufügen..." (sucht Rezepte) und "Zutat hinzufügen..." (sucht Zutaten) als Menüeinträge anbietet.
- [x] 3.4 In befüllten Slots den direkt sichtbaren Button "Hinzufügen" aus dem Slot-Footer entfernen und alle Aktionen im erweiterten `MealActionsMenu` bündeln.

## 4. Qualitätssicherung & Verifizierung

- [x] 4.1 Die Tabellenansicht lokal aufrufen und prüfen, ob alle Spalten (Tage) und Zeilen (Mahlzeiten) sauber fluchten.
- [x] 4.2 Die korrekte Funktionalität beim Hinzufügen von Rezepten/Zutaten über das Dropdown-Menü eines leeren Slots testen.
- [x] 4.3 Die korrekte Funktionalität beim Hinzufügen über das `MealActionsMenu` eines befüllten Slots testen.
- [x] 4.4 Responsivität und horizontales Scrollen auf schmalen Viewports überprüfen.
