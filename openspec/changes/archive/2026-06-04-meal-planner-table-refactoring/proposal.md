## Why

Das aktuelle tabellarische Layout im Essensplaner ("Tabelle"-Tab) wurde von einem echten Tabellen-Layout (`<table>`) auf eine kartenbasierte Grid-Struktur (`CardTable` und `DataCardRow`) umgestellt. Dadurch ging die strukturierte Ausrichtung verloren (Mahlzeit-Spalten verspringen und richten sich nicht mehr gleichmäßig über verschiedene Tage hinweg aus). Zudem ist das Layout durch direkt sichtbare Schaltflächen ("+ Rezept", "+ Zutat", "Hinzufügen", etc.) optisch überladen und unübersichtlich.

Diese Änderung bringt das klassische, strukturierte Tabellen-Layout zurück, entfernt den "Dessert"-Mahlzeitentyp für ein kompakteres Design und lagert alle Aktionen in ein einheitliches, aufgeräumtes Burger-/Dropdown-Menü aus.

## What Changes

- **Rückkehr zum echten Tabellen-Layout (`<table>`)**: Die Tabellenansicht wird wieder mit Tagen als Spalten und den Mahlzeitentypen als Zeilen dargestellt. Auf Mobilgeräten wird die Tabelle horizontal scrollbar dargestellt, um die Struktur beizubehalten.
- **Entfernung von "Dessert"**: Der Mahlzeitentyp "Dessert" (Nachtisch) wird aus der standardmäßigen Tabellen-Reihenfolge (`MEAL_TYPE_ORDER`) entfernt, um Platz zu sparen und die Ansicht kompakter zu machen.
- **Auslagerung von Buttons in Burger-Menüs**: Alle sichtbaren Schaltflächen für Aktionen in den Slots (wie "+ Rezept", "+ Zutat", "+ Notiz", "Hinzufügen", etc.) werden entfernt und in ein zentrales Burger-/Dropdown-Menü (Dreipunkt-Menü `[⋮]`) pro Slot verlagert:
  - **Leerer Slot**: Zeigt nur das `[⋮]`-Menü mit den Optionen: "Rezept hinzufügen...", "Zutat hinzufügen..." und "Notiz hinzufügen...".
  - **Bestehender Slot**: Integriert die Such- und Hinzufüge-Optionen direkt in das bestehende `MealActionsMenu` (`[⋮]`), sodass alle Aktionen an einem einzigen Ort gebündelt sind.
- **Erhalt aller neuen Funktionen**: Neue Features wie das Skalieren auf Soll-Portionen, Verknüpfen/Entkoppeln von RefMeals, Handhabung externer Mahlzeiten, Budget-Ampel und Notiz-Bearbeitung werden vollständig in das überarbeitete Layout und das Burger-Menü integriert.

## Capabilities

### New Capabilities

*(Keine neuen Capabilities nötig)*

### Modified Capabilities

- `meal-plan-table-view`: Aktualisierung der Anforderungen für die Tabellen-Struktur, Entfernung des Dessert-Typs aus der Tabellenansicht und Verlagerung aller Quick Actions in das Dropdown-Menü der Slots.

## Impact

- **Frontend-Food**:
  - `/src/pages/planning/TableView.tsx`: Umstrukturierung von Grid/Cards zurück zu einer echten HTML-Tabelle (`<table>`), Anpassung von `MEAL_TYPE_ORDER` (Entfernung von `dessert`), Entfernung aller sichtbaren Add-Buttons und Verwendung des Dropdown-Menüs für Aktionen.
  - `/src/components/planning/MealActionsMenu.tsx`: Integration der Hinzufüge-Optionen (Rezept und Zutat suchen/hinzufügen, Notiz hinzufügen) direkt in das bestehende Dropdown-Menü.
