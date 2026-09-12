## Context

Die Essensplanung für Freizeiten und Lager nutzt im Food-Frontend zwei Hauptansichten: den Tagesplan (`DayPlanView`) und die tabellarische Übersicht (`TableView`). Auf Freizeiten mit 10–50 Teilnehmern ist die Tabelle unverzichtbar, um die gesamte Woche zu überblicken.

Aktuell leidet die Tabelle unter gravierenden Darstellungsproblemen:
1. **Flexbox-Kollision & Text-Überlappung**: Das Mengen-Badge für Zutaten (`portion_display`) besitzt `shrink-0` und verdrängt die linke Inhaltsspalte bei einer Spaltenbreite von 240px. Nährwerte und Preise überlappen buchstäblich das Mengenbadge, Titel werden zu 1–3 Buchstaben trunkiert („B...“, „Bau...“).
2. **Text-Doppelung**: Der Zutatennamen-Titel wird gerendert, obwohl `portion_display` („16,7 Gramm Emmentaler Hartkäse (17g)“) den Namen nochmals enthält.
3. **Mahlzeiten-Explosion durch Frühstückszutaten**: 8–12 Einzelzutaten erzeugen 8–12 große Karten in einer Mahlzelle (~500px Zeilenhöhe), wodurch alle anderen Mahlzeiten aus dem sichtbaren Bereich gedrückt werden.
4. **Fehlende Budget-Transparenz**: Das Budget wird nur im `tfoot` der Tabelle oder im separaten Tab „Kosten“ angezeigt. Planende sehen beim Hinzufügen von Speisen nicht live, ob sie im Budget liegen.
5. **Schlechte Interaktion**: Keine Direktauswahl (+ Rezept, + Zutat) in leeren oder bestehenden Slots, Löschen nur bei Hover (auf Touch unbrauchbar), keine Mengenänderung für portionierte Zutaten in der Tabelle.

## Goals / Non-Goals

**Goals:**
- **Kollisionsfreie Item-Karten**: Robustes 2-Zeilen-Layout für Rezepte und Zutaten in allen Tabellenzellen ohne Textüberlappung oder Abschneiden.
- **Bereinigte Mengen- und Namensdarstellung**: Saubere Trennung von Name, Menge/Einheit und Nährwerten.
- **Kompaktes Frühstücksbuffet**: Optionale oder automatische Bündelung von Frühstückszutaten in eine übersichtliche Buffet-Kachel mit Kcal- und Preis-Summen, die bei Bedarf aufgeklappt werden kann.
- **Sticky Budget-Cockpit**: Eine schmale, elegante Leiste im Header/über der Arbeitsfläche mit Soll/Ist-Budget, Restbudget, Kalorienabdeckung und Ampelstatus (grün/gelb/rot).
- **Schnelle Interaktionen**: Direkt sichtbare `+ Rezept`- und `+ Zutat`-Buttons in Slots, touch-fähiges Löschen mit Undo-Toast und Inline-Mengenanpassung für Zutaten.
- **Responsive Stabilität**: Sauberes Scrolling und Mindestbreiten (min-w-[260px]) ohne abgeschnittene Tage am Rand.

**Non-Goals:**
- Keine Änderungen an der Django-Datenbankstruktur oder bestehenden API-Endpunkten (alle Daten werden bereits über die `MealPlan`-API geliefert).
- Kein Umbau des separaten „Kosten“-Tabs (`CostDashboard.tsx`) abgesehen von geteilter Logik / Status-Farben.
- Kein vollständiger Rewrite des Breakfast-Wizards.

## Decisions

### 1. Robustes 2-Zeilen Item-Karten-Layout
*Entscheidung:* Item-Karten werden in ein definiertes 2-Zeilen-Grid strukturiert:
- **Obere Zeile:** Name (links, truncated mit Title-Tooltip) und Portions-/Mengenangabe (rechts, z. B. `17 g / P.` oder `1 Port.`).
- **Untere Zeile:** Kalorien & Preis (links, `63 kcal · 0,20 €`) und Stepper/FactorInput + Entfern-Icon (rechts).
*Begründung:* Ein 1-Zeilen-Flexbox-Layout mit `justify-between` und `shrink-0` bricht zwangsläufig zusammen, wenn Namen oder Einheiten länger als 15 Zeichen sind. Ein 2-Zeilen-Aufbau garantiert konsistente Höhen und schließt Überlappungen mathematisch aus.

### 2. Formatierung von Zutatenportionen (`cleanPortionDisplay`)
*Entscheidung:* Im Frontend wird eine Hilfsfunktion `formatItemPortion(item)` etabliert: Wenn `item.ingredient_id` vorhanden ist, wird die Portionsgröße als reine Menge + Einheit formatiert (z. B. `16,7 g / P.` oder `1 Scheibe / P.`), statt den kompletten Rohstring `"16,7 Gramm Emmentaler Hartkäse (17g)"` zu wiederholen.
*Begründung:* Verhindert redundante Namensanzeige und spart ~60% der Badge-Breite ein.

### 3. Kompakte Frühstücksbündelung („Buffet-Ansicht“) in der Tabelle
*Entscheidung:* Mahlzeiten vom Typ `breakfast` (oder Mahlzeiten mit > 4 reinen Zutatenitems) erhalten in `TableView` standardmäßig eine aggregierte Buffet-Karte:
- Zeigt Gesamtkalorien, Portionspreis und eine Vorschau der Zutaten (z. B. „Brot, Käse, Haferdrink + 5 weitere“).
- Ein Pfeil-Button `[▾]` erlaubt das Aufklappen der Einzelzutaten direkt in der Zelle.
*Begründung:* Hält die Zeilenhöhe der Tabelle unter 160px und ermöglicht die gleichzeitige Betrachtung von Frühstück, Mittagessen und Abendessen über alle Tage.

### 4. Komponenten-Extraktion: `MealPlanBudgetCockpit`
*Entscheidung:* Ein neues UI-Element `MealPlanBudgetCockpit.tsx` wird in `MealEventDetailPage.tsx` direkt oberhalb der Tab-Navigation platziert:
- Zeigt bei vorhandenem `budget_per_person_per_day`: Soll-Budget vs. Ist-Kosten, Differenz (+/- €) und farbigen Progress-Balken.
- Zeigt Soll/Ist-Kalorien (`2.000 kcal / Tag`).
- Klick auf das Cockpit navigiert direkt in den Kosten- oder Nährwerte-Tab.
*Begründung:* Das Budget ist der wichtigste operative Leitwert bei der Lagerplanung und muss ohne Scrollen permanent im Blick bleiben.

### 5. Direkte Quick-Actions und Undo-Toast
*Entscheidung:*
- Leere Slots zeigen neben dem Dropdown-Menü prominente, kompakte Schnellbuttons `[+ Rezept]` und `[+ Zutat]`.
- Gefüllte Slots haben am Fuß einen dezenten `+`-Button.
- Beim Löschen eines Items wird `onDeleteItem` aufgerufen und sofort ein Sonner-Toast mit `{ action: { label: 'Rückgängig', onClick: ... } }` angezeigt, indem das gelöschte Item bei Undo über `onAddRecipe` bzw. `onAddIngredient` wiederhergestellt wird.
*Begründung:* Drastische Reduktion von Klickpfaden und Beseitigung nerviger Bestätigungsdialoge bei Routinearbeiten.

## Risks / Trade-offs

- **[Undo bei Item-Löschung]** → Wenn ein Item gelöscht wird, hat es serverseitig eine ID verloren; beim Wiederherstellen wird ein neues Item mit neuer ID angelegt. *Mitigation:* `onAddRecipe` bzw. `onAddIngredient` reicht völlig aus, da Mahlzeit-Items austauschbar sind.
- **[Kompakte Frühstücksansicht verbirgt Details]** → Nutzer könnten übersehen, dass Zutaten vorhanden sind. *Mitigation:* Die Kachel zeigt stets die Zutatennamen als kommagetrennte Vorschau und die Gesamtzahl der Komponenten.
- **[Spaltenbreiten auf kleinen Bildschirmen]** → Zu breite Spalten führen zu starkem Scrollen. *Mitigation:* `min-w-[260px]` kombiniert mit sauberem `overflow-x-auto` und dezenten Scroll-Schatten.

## Affected Files

- `frontend-food/src/components/planning/MealPlanBudgetCockpit.tsx` *(neu)*
- `frontend-food/src/pages/planning/TableView.tsx` *(Überarbeitung Item-Cards, Quick-Actions, Buffet-Kompaktansicht)*
- `frontend-food/src/pages/planning/MealSlot.tsx` *(Angleichung Item-Card & Quick-Actions)*
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` *(Integration BudgetCockpit)*
- `frontend-food/src/utils/formatItemDisplay.ts` *(neu: saubere Portions- und Namensformatierung)*
