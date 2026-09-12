## Context

Die Essensplanung in Inspi (`frontend-food` und Backend-App `planner` / `food`) unterstützt komplexe Gruppenverpflegung (Normportionen, DGE-Nährwertaggregation, Rezeptvarianten, Einkaufslisten, KI-Vorschläge). Aktuell leidet die Benutzerführung jedoch unter hoher kognitiver Last: 7 parallele Tabs überfordern den Nutzer, Mengenskalierungen erfolgen über unanschauliche Dezimalfaktoren (`factor: 0.35`), Bearbeitungen an Referenzmahlzeiten können unbeabsichtigt andere Tage überschreiben, und Suchfunktionen für Rezepte und Zutaten sind getrennt und fragmentiert.

Diese Design-Spezifikation übersetzt die Erkenntnisse der UX-Exploration in eine klare technische Architektur.

## Goals / Non-Goals

**Goals:**
- Reduktion der primären Navigation auf 3 intuitive Hauptphasen: **Planen**, **Einkaufen** und **Kochen**.
- Nahtloser Wechsel zwischen visueller Kartenansicht (Tagesplan) und kompakter Tabelle über einen Header-Switch im Bereich „Planen“.
- Einführung von kompakten Mahlzeitenkarten mit Inline-Akkordeon und 3–4 Hauptzutaten-Tags zur schnellen Orientierung.
- Vollständiger Ersatz von Dezimal-Faktoren durch verständliche Personenanzahlen („Portionen für [ X ] Personen“) im Frontend.
- Absicherung gegen Datenverlust durch strikt lokalen Wirkungsbereich von Mahlzeiten-Edits als Standard.
- Schlanker 1-Screen-Frühstücksbaukasten statt des überladenen 6-Stufen-Wizards.
- Zentrales Omnibar-Hinzufügen-Modal (Cmd+K Style) mit Filter-Pills für Rezepte, Zutaten und Vorlagen-Bundles.
- Reibungsarmes Verschieben von Mahlzeiten via Drag & Drop (mit barrierefreiem Menü-Fallback).
- Unterbrechungsfreies Löschen von Items mit optimistischem UI-Update und 6-Sekunden-Toast-Undo.
- Zentraler Header-Button `[ Plan-Check (X) ]` mit actionable Quick-Fix-Aktionen.

**Non-Goals:**
- Keine Neuentwicklung der zugrundeliegenden Berechnungs-Engines (DGE-Formeln, Kcal-Dichte-Algorithmus bleiben im Backend unverändert).
- Kein Ersatz des bestehenden Rechtesystems (Permissions basieren weiterhin auf `can_edit`/`can_delete`).
- Keine Änderung des Exportformats für REWE oder Standard-PDFs über die korrekte Datenanreicherung hinaus.

## Decisions

### Decision 1: Konsolidierung der 7 Tabs auf 3 Haupt-Tabs mit Sub-Navigation
- **Wahl:**
  - Hauptreiter: `Planen` (`/plan`), `Einkaufen` (`/shopping`), `Kochen` (`/cooking`).
  - `Planen`: Beinhaltet Header-Switch `[ Tagesplan | Tabelle ]`.
  - `Einkaufen`: Beinhaltet Sub-Tabs `[ Einkaufsliste | Kosten & Budget ]`.
  - `Kochen`: Beinhaltet Sub-Tabs `[ Zubereitungs-Zeitplan | Küchenhelfer & Allergene ]`.
- **Begründung:** Bildet die reale Chronologie und Rollenteilung eines Lagers (Planer vor dem Lager, Einkäufer im Supermarkt, Küchenteam vor Ort) perfekt ab.
- **Verworfene Alternativen:** Bottom-Navigation (auf Desktop unnatürlich) oder Beibehaltung von 7 Tabs mit Dropdown (löst das Orientierungsproblem nicht).

### Decision 2: Mahlzeiten-Karten mit Hauptzutaten-Tags und Inline-Akkordeon
- **Wahl:** Die Karte zeigt im Ruhezustand Titel, Uhrzeit, Personenanzahl, Portionspreis/Gesamtkosten und bis zu 4 farbige Zutatentags. Per Klick expandiert sie inline als Akkordeon und offenbart Portionseingabe, Zutatenmengen, Nährwertbalken und Aktionen.
- **Begründung:** Bietet sofortigen visuellen Überblick über den Speiseplan ohne Klick-Orgien, hält aber alle Details ohne Seiten- oder Kontextwechsel erreichbar.

### Decision 3: Klartext-Portionen statt mathematischer Faktoren
- **Wahl:** Frontend zeigt immer „Portionen für [ X ] Personen“. Die Berechnung des internen `factor = portions / recipe.servings` erfolgt transparent beim Abschicken der Mutation.
- **Begründung:** Nutzer denken in Gruppenstärken („Heute Mittag essen 22 Pfadis mit“), nicht in Dezimalbrüchen („Rezept für 4 Personen mal 5,5“).

### Decision 4: Strikt lokaler Wirkungsbereich bei Mahlzeiten-Änderungen
- **Wahl:** Änderungen an einer Mahlzeit (Zutaten, Notiz, Portionen) modifizieren immer nur diesen konkreten `Meal`-Datensatz. Möchte der Nutzer eine Vorlage aktualisieren, wählt er im Dreipunkt-Menü explizit `„Als Vorlage für alle Frühstücke/Tage übernehmen“`.
- **Begründung:** Verhindert versehentliche Massenänderungen und eliminiert die bisherige Verwirrung zwischen `ref_meal` und `direct_meal`.

### Decision 5: Omnibar-Hinzufügen-Modal
- **Wahl:** Ein zentraler Dialog mit fokussiertem Suchfeld, Tastatur-Navigation (Pfeiltasten, Enter) und Filter-Pills `[ Alle ] [ Rezepte ] [ Zutaten ] [ Bundles ]`.
- **Begründung:** Schnelligkeit und Konsistenz. Kein separater Workflow mehr nötig für Zutatensuche vs. Rezeptsuche.

### Decision 6: 1-Screen-Frühstücksbaukasten
- **Wahl:** Eine fokussierte Modal-Oberfläche mit 4 Sektionen (Brot & Basis, Aufstriche & Belag, Frisches & Extras, Getränke). Standardportionen werden automatisch anhand der Gruppenstärke berechnet. Ein kleiner Link schaltet bei Bedarf den Nährwert-Expertenmodus frei.
- **Begründung:** 90 % aller Frühstücksplanungen sind einfache Buffets. Der 6-stufige Assistent war der größte Reibungspunkt in Usertests.

### Decision 7: Optimistisches Löschen mit Toast-Undo
- **Wahl:** `useRemoveMealItem` entfernt das Item sofort aus dem React-Query-Cache und triggert einen Toast `„Item entfernt [ Rückgängig ]“`. Klickt der Nutzer innerhalb von 6 Sekunden auf Rückgängig, wird das Item wiederhergestellt. Erst nach Ablauf wird der Server-Call final bestätigt. Ganze Mahlzeiten und Tage behalten einen modalen `ConfirmDialog`.
- **Begründung:** Beschleunigt das Editieren enorm und schützt vor Fehlern, ohne den Workflow durch Popups auszubremsen.

### Decision 8: Header-Check für Actionable Alerts
- **Wahl:** Im Header signalisiert ein Button `[ 🔔 Plan-Check (X) ]` Unregelmäßigkeiten. Klick öffnet ein Flyout mit strukturierten Quick-Fixes:
  - Lücken: `Samstagmittag ist noch leer` → Button `[ 🪄 Gericht vorschlagen ]`
  - Budget: `Mittwoch überschreitet Budget um 1,10 €/P.` → Button `[ 🪄 Günstigere Alternative ]`
- **Begründung:** Nutzer müssen Warnungen nicht mehr auf 7 verschiedenen Tabs zusammensuchen.

## Risks / Trade-offs

- **[Drag & Drop auf Touch-Geräten]** → Mobile Browser haben teils Konflikte zwischen Scrollen und Draggen.
  *Mitigation:* Jede Karte behält im Dreipunkt-Menü die Standard-Befehle `Verschieben nach Tag X` und `Kopieren auf Tag X`.
- **[TanStack Cache-Inkonsistenz bei schnellem Undo]** → Wenn ein Rollback fehlschlägt, könnte der UI-Zustand vom Server abweichen.
  *Mitigation:* Robuste Snapshot-Verwaltung in `onMutate` mit `queryClient.setQueryData` und `onError`-Rollback.
- **[Rundungsfehler bei Portionen ↔ Faktor]** → Konvertierung von `portions` nach `factor` und zurück könnte Nachkommastellen erzeugen.
  *Mitigation:* Im Backend und Frontend Rundung auf 2 Dezimalstellen standardisieren (`round(portions / recipe_servings, 2)`).

## Affected Files & APIs

### Frontend (`frontend-food/`)
- `src/pages/planning/MealEventDetailPage.tsx`: Umbau auf 3 Haupt-Tabs & Header-Check.
- `src/pages/planning/DayPlanView.tsx`: Integration der kompakten Mahlzeitenkarten mit Inline-Akkordeon und DnD.
- `src/pages/planning/MealSlot.tsx` & `MealPlanCompactCard.tsx`: Anzeige von Hauptzutaten-Tags, Personenportionen und Dreipunkt-Menü.
- `src/pages/planning/RecipeSearchDialog.tsx`: Umbau zu Omnibar-Dialog mit Pill-Filtern für Rezepte, Zutaten und Bundles.
- `src/pages/planning/breakfast/BreakfastWizardPage.tsx`: Refactoring zu 1-Screen-Baukasten `BreakfastQuickBuilder.tsx`.
- `src/components/planning/PlanCheckFlyout.tsx`: Neu – Flyout für Alerts und Handlungsvorschläge.
- `src/api/mealPlans.ts` & `src/schemas/mealPlan.ts`: Aktualisierung der API-Hooks und Zod-Schemas.

### Backend (`backend/`)
- `planner/api/meal_plans.py`: Endpunkte für Reorder/Swap von Mahlzeiten, Bereitstellung von Quick-Check-Validierungen.
- `planner/schemas/meal_plans.py`: Erweiterung um optionale `servings_target`-Felder und Alert-Strukturen.
