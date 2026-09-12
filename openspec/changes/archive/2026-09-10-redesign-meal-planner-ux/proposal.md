## Why

Die aktuelle Menüplanung in Inspi verfügt über mächtige Fachfunktionen, wirkt jedoch durch sieben nebeneinanderstehende Tabs, technische Abstraktionen (z. B. Skalierungsfaktoren wie `× 0,35`, globale Referenzmahlzeiten-Konflikte) und fragmentierte Dialoge überkomplex und fehleranfällig. Gruppenleiter und Lagerküchen-Teams benötigen einen intuitiven, workflow-orientierten Ablauf, der sich auf die drei realen Phasen konzentriert: Planen (Was essen wir wann?), Einkaufen (Was müssen wir besorgen & was kostet es?) und Kochen (Wie setzen wir das vor Ort zu welchen Zeiten um?).

## What Changes

- **Reduktion auf 3 Haupt-Tabs (Planen, Einkaufen, Kochen):** Die bisher 7 separaten Tabs (`plan`, `table`, `cooking-schedule`, `costs`, `shopping`, `suggestions`, `ingredient-scan`) werden auf drei fokussierte Phasen konsolidiert. Innerhalb von „Planen“ wechselt ein Header-Switch nahtlos zwischen Tagesplan (Karten) und kompakter Tabelle.
- **Kompakte Mahlzeitenkarten mit Inline-Akkordeon:** Karten im Tagesplan zeigen fokussiert Name, Zeit, Personenanzahl, Kosten und 3–4 Hauptzutaten-Tags. Detaillierte Nährwerte, Portionen und Zutaten öffnen sich per Inline-Akkordeon.
- **Klartext-Mengeneingabe („Portionen für X Personen“):** Verwirrende Dezimal-Faktoren (`factor: 0.35`) werden in der UI vollständig durch verständliche Personenanzahlen („Portionen für [ 25 ] Personen“) ersetzt; die Skalierungsfaktoren werden im Hintergrund berechnet.
- **Lokaler Wirkungsbereich als Standard:** Jede Bearbeitung einer Mahlzeit wirkt standardmäßig ausschließlich lokal auf diesen konkreten Slot. Vorlagen-/Referenz-Aktualisierungen für alle Tage müssen explizit per Aktion ausgelöst werden.
- **1-Screen-Frühstücksbaukasten:** Der 6-stufige Assistent mit Kcal-Dichte-Slidern wird durch einen aufgeräumten 1-Screen-Baukasten (Brot, Belag, Obst, Warmes/Getränke) mit automatischen Standardmengen ersetzt.
- **Einheitliches Omnibar-Hinzufügen:** Das bisherige Suchen nach Rezepten und Zutaten wird in einer dialogweiten Omnibar-Suche (Cmd+K Style) mit Filter-Pills (`Alle`, `Rezepte`, `Zutaten`, `Bundles/Sets`) vereint.
- **Verschieben & Wiederholen:** Mahlzeiten können per Drag & Drop zwischen Tagen verschoben werden, flankiert durch ein zuverlässiges Dreipunkt-Menü (`Verschieben nach...`, `Kopieren auf...`).
- **Sofortiges Löschen mit Toast-Undo:** Einzelne Zutaten und Gerichte werden ohne blockierenden Dialog sofort entfernt und erhalten einen 6-Sekunden-Toast mit `[ Rückgängig ]`. Ganze Tage oder Mahlzeiten behalten eine kurze Bestätigung.
- **Schlanker Schnelleinstieg:** Neuer Planerstellungs-Dialog als kompaktes Modal mit nur 3 Pflichtfeldern (Name, Zeitraum, Personenzahl), der direkt mit leeren Standard-Slots startet.
- **Actionable Alerts via Header-Check:** Ein zentraler `[ Plan-Check (X) ]`-Button im Header bündelt Lücken (leere Mahlzeiten, Budgetgrenzen, Allergene) und bietet direkte Ein-Klick-Lösungsaktionen (z. B. `[ 🪄 Gericht vorschlagen ]`).

## Capabilities

### New Capabilities
- `meal-planner-workflow-navigation`: 3 Hauptbereiche (Planen, Einkaufen, Kochen), Header-Switch (Tagesplan ⇄ Tabelle), Einkaufen-Subtabs (Liste ⇄ Budget) und Kochen-Split (Zeitplan + Küchenhelfer).
- `meal-card-compact-accordion`: Kompakte Mahlzeitenkarten mit Status-Pills, Hauptzutaten-Tags und Inline-Akkordeon für Nährwerte und Zutaten.
- `meal-planner-omnibar-search`: Zentrale Omnibar-Suche für Rezepte, Einzelzutaten und Sets mit Live-Filterung und direkter Portionsvorschau.
- `breakfast-single-screen-builder`: 1-Screen-Baukasten für Frühstücksbuffets mit vorberechneten Standardmengen und optionalem Profi-Modus.
- `meal-planner-actionable-alerts`: Header-basierter Plan-Check mit Zähler-Badge und Ein-Klick-Aktionsvorschlägen.
- `meal-planner-optimistic-undo`: Optimistisches Entfernen von Zutaten und Items mit Rollback-fähigem Toast-Undo ohne Bestätigungsdialoge.

### Modified Capabilities
- `meal-plan`: Anpassung des Datenflusses für Portionsanzeige in Personenanzahl, Entkopplung von Referenzmahlzeiten-Zwangs-Sync bei lokalen Edits und Bereitstellung von leeren Standard-Slots bei Schnellerstellung.
- `breakfast-wizard`: Ablösung der 6-Schritt-Navigation durch den 1-Screen-Baukasten bei Beibehaltung der Nährwert- und Mengengrundlagen.
- `meal-plan-table-view`: Integration als Sub-View unter „Planen“ mit synchroner Klartext-Portionierung und Undo-Toasts.

## Impact

- **Frontend (`frontend-food`):**
  - Umbau von `MealEventDetailPage.tsx`: Reduktion der Tabs von 7 auf 3 (`plan`, `shopping`, `cooking`), Einbettung von Sub-Views.
  - Überarbeitung von `DayPlanView.tsx` und `MealSlot.tsx`: Kompakte Karten mit Tags, Inline-Akkordeon, Drag & Drop (`@hello-pangea/dnd` oder native HTML5 / dnd-kit falls etabliert).
  - Neuer `MealOmnibarDialog.tsx` als Ersatz für den zweigeteilten `RecipeSearchDialog.tsx`.
  - Neuer `BreakfastQuickBuilder.tsx` als bevorzugte Ansicht im Frühstücks-Flow.
  - Neuer `PlanCheckFlyout.tsx` für actionable alerts.
  - Anpassung der Schnellerstellung in `CreateMealPlanDialog.tsx`.
- **Backend (`planner`, `recipe`, `supply`):**
  - Zusätzliche API-Unterstützung für Portionsangaben (`servings` statt reinem `factor`), bzw. bequeme Konvertierungs-Helper im Pydantic-Schema.
  - Endpunkte für Slot-Verschiebung / Tausch (`POST /api/meal-plans/{id}/meals/reorder/` oder `swap`).
  - Robuste Validierung gegen unbeabsichtigtes Überschreiben globaler Referenzmahlzeiten.
- **Schemas & Migrationen:**
  - Pydantic- und Zod-Schemas für Mahlzeitenkarten-Aktionen, Plan-Check-Hinweise und Portions-Updates synchronisieren.
  - Keine zerstörerischen DB-Migrationen erforderlich (bestehende `factor`- und `MealItem`-Strukturen bleiben kompatibel).
