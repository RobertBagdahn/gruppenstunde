## Context

Die Tabellenansicht im Essensplaner (`TableView.tsx`) wurde kürzlich von einer echten HTML-Tabelle auf eine kartenbasierte Liste umgestellt (`CardTable`/`DataCardRow`). Diese kartenbasierte Flex-/Grid-Struktur führt dazu, dass die Spalten der Mahlzeiten (Frühstück, Mittagessen etc.) über verschiedene Tage hinweg nicht mehr vertikal miteinander fluchten. Dadurch leidet die Übersichtlichkeit beim Vergleichen von Tagen und der optische Eindruck ist durch viele direkt sichtbare Aktionsschaltflächen überladen.

Dieses Design beschreibt die technische Umsetzung der Rückkehr zu einem tabellarischen Layout und der Konsolidierung aller Aktions-Buttons in übersichtliche Dropdown-Menüs.

## Goals / Non-Goals

**Goals:**
- Wiederherstellung einer echten HTML-Tabellenstruktur (`<table>`) im "Tabelle"-Tab der Essensplan-Detailseite, bei der die Tage als Spalten und die Mahlzeitentypen als Zeilen angeordnet sind (wie im Commit `8b823a4`).
- Entfernung des Mahlzeitentyps "Dessert" aus der Tabelle (`MEAL_TYPE_ORDER`), um Platz zu sparen.
- Vollständige Eliminierung aller direkt sichtbaren Buttons (`+ Rezept`, `+ Zutat`, `Notiz hinzufügen`, `Hinzufügen` etc.) aus den Zellen.
- Auslagerung aller Aktionen in ein einziges, aufgeräumtes Dreipunkt-Aktionsmenü (`[⋮]`) pro Zelle/Slot (sowohl für leere als auch für befüllte Slots).
- Beibehaltung aller neuen Funktionalitäten (Scaling, Verknüpfen/Entkoppeln, externe Mahlzeiten, Budget-Ampel, etc.).

**Non-Goals:**
- Keine Änderungen an den Backend-Modellen, Ninja-APIs oder Schemas (die bestehende API reicht vollkommen aus).
- Keine Änderungen an der "Tagesplan"-Ansicht (`DayPlanView.tsx`), diese bleibt unberührt.

## Decisions

### 1. Verwendung einer echten HTML-Tabelle (`<table>`) mit responsivem horizontalem Scrollen
Wir kehren zur semantisch korrekten und bewährten Struktur einer echten HTML-Tabelle zurück:
- **Spalten (`<th>` / `<td>`)**: Datum/Tage. Die erste Spalte ("Mahlzeit") bleibt links fixiert (`sticky left-0`).
- **Zeilen (`<tr>`)**: Die Mahlzeitentypen:
  - Frühstück (`breakfast`)
  - Mittagessen (`lunch`)
  - Abendessen (`dinner`)
  - Snack (`snack`)
  - Getränke (`drinks`)
- **Wrapper**: Ein Container mit `overflow-x-auto` sorgt dafür, dass die Tabelle auf kleineren Bildschirmen flüssig horizontal scrollt und das Layout der Zeilen und Spalten unberührt lässt.

### 2. Integration aller Hinzufüge- und Modifikationsoptionen in ein einziges Dropdown-Menü
Um die Zellen maximal clean zu halten, lagern wir alle Aktionen in Dropdown-Menüs aus:

#### A. Leere Slots (Kein Meal-Objekt vorhanden)
Anstatt des bisherigen Buttons-Blocks rendern wir in der Tabellenzelle ein einzelnes, dezentes Aktionsmenü (z.B. mittels `@/components/ui/dropdown-menu`).
- **Trigger**: Ein dezentes `[⋮]`-Symbol (Lucide `MoreVertical`) oben rechts in der Zelle (oder zentriert, wenn die Zelle leer ist).
- **Aktionen**:
  - `Rezept hinzufügen...` (Triggert `onAddMealType` und öffnet das Rezeptsuch-Such-Dialogfenster)
  - `Zutat hinzufügen...` (Triggert `onAddMealType` und öffnet das Zutaten-Detail-Dialogfenster)
  - `Notiz hinzufügen...` (Triggert `onAddMealType` und aktiviert den Inline-Notiz-Editor)

#### B. Bestehende Slots (Meal-Objekt vorhanden)
Wir erweitern die bestehende Komponente `MealActionsMenu` (in `/src/components/planning/MealActionsMenu.tsx`) so, dass sie auch die Add-Aktionen beherbergt:
- Neue Dropdown-Einträge:
  - `Rezept hinzufügen...` (öffnet das Suchfenster für Rezepte)
  - `Zutat hinzufügen...` (öffnet das Suchfenster für Zutaten)
  - `Notiz hinzufügen...` / `Notiz bearbeiten...` (aktiviert den Inline-Editor für Notizen)
- Der bisher direkt sichtbare "+ Hinzufügen" Button im Slot-Footer wird komplett entfernt.

## Risks / Trade-offs

- **[Risk]** Die Tabelle wird auf Smartphones zu breit.
  - **Mitigation**: Durch das Verpacken der gesamten Tabelle in ein `overflow-x-auto` Div und das Festlegen einer Mindestbreite pro Tag-Spalte (z.B. `min-w-[220px]`) scrollt die Tabelle komfortabel seitwärts. Die erste Spalte ("Mahlzeit") ist über `sticky left-0 z-10 bg-background` fixiert, sodass der Nutzer beim horizontalen Scrollen stets weiß, in welcher Zeile er sich befindet.

- **[Risk]** Verwirrung beim Suchen/Hinzufügen in einem leeren Slot, da das Meal-Objekt erst erstellt werden muss.
  - **Mitigation**: Genauso wie im bisherigen Code erstellen wir das `Meal`-Objekt asynchron über den Callback `onAddMealType(date, mealType)` im Moment, in dem die Dropdown-Option geklickt wird. Sobald das Objekt zurückgegeben wird, öffnen wir das Rezept- oder Zutaten-Suchfenster bzw. den Notiz-Editor für die neu angelegte Mahlzeit.
