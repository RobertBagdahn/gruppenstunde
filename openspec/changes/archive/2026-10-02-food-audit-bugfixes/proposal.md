## Why

Das Browser-Audit des Food-Frontends vom 30.09.2026 (zwei Runden, ausgelöst durch Peters Rückmeldungen zu Wochenplan-Suche und Zutatenprüfung) hat rund 60 Fehler gefunden. Die kritischsten verfälschen Mengen still oder lassen Daten aus Listen verschwinden:

- Eine Zutat aus der Detailsuche wird mit der Personenzahl multipliziert (2 × 100 g → 800 g bei 4 Personen).
- „Gramm“ im Mengen-Dialog wird zur Normalportion: 250 g Mehl → 1000 × „Tasse Mehl“ = 100 kg.
- Gramm- und kg-Angaben beim Import werden mit der Dichte multipliziert (250 g Mehl → 150 g).
- Einzelzutaten im Essensplan speichern nur die Einheit statt der gewählten Portion. Toastbrot „1 Scheibe“ wird so in Tagesplan, Tabelle und Einkaufsliste unterschiedlich gerechnet (30 g, 1 g, 13 g für 12 Personen).
- Die erzeugte Einkaufsliste zeigt Flüssigkeiten in Gramm als „ml“ (Honig 273 ml statt 195 ml).
- Einkaufs- und Rezeptlisten verlieren beim Blättern Einträge (13 von 76 Listen und bis zu 91 von 267 Rezepten nie sichtbar), weil nicht stabil sortiert wird.
- Cmd+K öffnet im Wochenplan einen Such-Dialog pro Mahlzeit. Das ergibt 7 gestapelte Dialoge, die Auswahl landet in der falschen Mahlzeit, und es wirkt, „als passiere nichts“.
- In der Zutatenprüfung können KI-Zeilen nicht entfernt werden und blockieren das Speichern. Fehlende Mengen sind ohne Hinweis. Gleichnamige Zeilen einer Quelle werden verschmolzen.

## What Changes

**Priorität 1 – kritisch (diese Change-Runde)**
- Rezept-Editor: Mengen aus Detailsuche und Alternativ-Dialog gelten als Gesamtmenge im Personen-Kontext und werden nicht erneut multipliziert.
- Mengen-Dialog: „Gramm“ und Standardmaße wählen die Gramm-Portion der Zutat. Ohne Gramm-Portion ist die Option nicht wählbar. Der Editor fällt nie still auf die Normalportion zurück.
- Import-Umrechnung: Dichte nur für Volumen (ml, l), nie für g und kg.
- `MealItem.portion` (neu, optional): Die Wochenplan-Suche speichert die gewählte Portion. Gramm- und Portionsberechnung laufen einheitlich über den kanonischen Helper, auch in `MealItemOut.resolve_quantity_g`.
- Einkaufsliste: Die Anzeigemenge wird immer aus `quantity_g` über die Dichte abgeleitet. Gespeicherte Einträge und Plan-Tab zeigen dieselbe Menge.
- Listen-API: Einkaufslisten mit serverseitiger Sortierung (`sort`) und Eigentümerfilter (`mine`). Rezeptlisten mit eindeutigem Tie-Breaker und reproduzierbarem Zufall (`seed`).
- Wochenplan-Suche: Cmd+K öffnet höchstens einen Dialog, und zwar für die zuletzt aktive Mahlzeit.
- Zutatenprüfung:
  - Zeilen lassen sich entfernen.
  - Zeilen ohne Menge sind „Offen“ mit dem Hinweis „Menge fehlt“; „Vorschlag bestätigen“ öffnet dort den Mengen-Dialog.
  - Gleichnamige Zeilen derselben Quelle bleiben getrennt.

**Priorität 2 – falsche Anzeigen und tote Bedienelemente**
- Zutatenprüfung:
  - „Zutat ändern“ und „Zutat hinzufügen“ bekommen eine Funktion.
  - „Abbrechen“ im Mengen-Dialog behält die bisherige Portion.
  - Tippen ohne Auswahl entkoppelt die Zutaten-ID.
  - Der Mengen-Dialog startet mit den aktuellen Werten.
- Klartext-Portionsnamen statt `str(portion)` in Review, Rezept-Items, Nährwerten und KI-Vorschlägen.
- Zutatenliste: Sortierung (`sort`) und „Meine Zutaten“ (`origin`) im Backend unterstützen.
- Rezeptliste:
  - Den Kostenfilter atomar setzen, `patch()` auf Funktionsupdate umstellen.
  - Filterbasis ist der Portionspreis.
- NaN-Histogramme, „Invalid Date“ im Kopieren-Dialog, Kochplan-Zeitspanne in UTC und Reihenfolge nach Uhrzeit.
- Gesamtnährwerte beschriften und werten konsistent.
- Einkaufsliste: Stückzahl und Portionsname als strukturierte Anzeige, Einträge ohne Abteilung unter „Sonstiges“.
- Wochenplan-Suche:
  - Platzhalter-Sets entfernen.
  - Mobil ist der Übernehmen-Knopf erreichbar.
  - Der Filter wird beim Öffnen zurückgesetzt.
- Plan-Assistent: 0 Personen und Ende vor Start blockieren; Schrittzähler korrigieren. Backend: `norm_portions > 0`.
- Plan-Check mit deutschem Datums- und Zahlenformat.

**Priorität 3 – Format, Layout, Barrierefreiheit**
- Deutsche Zahlenformate überall: Protein, Nährwert-Balken, Histogramm-Achsen, PAL, Mengenfelder.
- 320-px-Layout: abgeschnittene Preise, Knöpfe und Badges.
- `aria-label` für Filter-Checkboxen und -Radios und für das ⋮-Menü.
- Tag-Badges in Mahlzeiten mit Namen statt Slug.
- Leere Filterergebnisse zeigen „Keine Treffer“ und „Zurücksetzen“.
- Soll- und Ist-Reihenfolge einheitlich.

Nicht Teil dieser Change: Datenbereinigung (leere Abteilungen, Dubletten, fehlende Tags und Ernährungs-Tags, Nährwerte von Zimt, Portionsnamen). Dafür gibt es einen eigenen Datenbericht.

## Capabilities

### New Capabilities
- `stable-list-ordering`: Deterministische, seitenübergreifend stabile Sortierung aller Food-Listen-Endpunkte (Tie-Breaker, reproduzierbarer Zufall, serverseitiges Sortieren und Filtern).

### Modified Capabilities
- `recipe-ingredient-review`: Zeilen entfernen, Hinweis bei fehlender Menge mit Dialog-Einstieg, kein Verschmelzen gleichnamiger Zeilen einer Quelle, „Zutat ändern“ und „Zutat hinzufügen“ funktionsfähig.
- `ingredient-unit-ai-conversion`: Dichte nur für Volumeneinheiten.
- `recipe-serving-input-context`: Explizites Szenario für Detailsuche, Alternativen und Gramm-Eingabe (keine erneute Multiplikation, kein Portions-Fallback).
- `meal-planner-omnibar-search`: Ein Dialog pro Tastenkürzel. Die gewählte Portion wird gespeichert, Platzhalter-Sets entfallen.
- `shopping-list`: Anzeigemenge aus `quantity_g` über die Dichte. Die Übersicht wird serverseitig sortiert und gefiltert.

## Impact

- **Backend-Apps:**
  - `recipe`: `services/unit_gram_conversion.py`, `services/ingredient_review_service.py`, `api/recipes.py`, `schemas/items.py`
  - `planner`: `models/meal_plan.py`, `schemas/meal_plan.py`, `api/meal_plan.py`, `services/meal_item_helpers.py`, `services/plan_check.py`
  - `shopping`: `api.py`, `schemas.py`
  - `supply`: `api/ingredients.py`
- **Migration:** `planner` – neues Feld `MealItem.portion` (FK auf `supply.Portion`, `null=True`, `on_delete=SET_NULL`). Kein Backfill nötig: Bestehende Einträge ohne Portion behalten die heutige Semantik (Einheit Gramm oder ml = direkte Menge).
- **Pydantic:**
  - `MealItemCreateIn`, `MealItemUpdateIn` und `MealItemOut` (+ `portion_id`, `portion_name`)
  - `ShoppingListItemOut` und `ShoppingListItemSourceOut` (Anzeigemenge)
  - Listen-Parameter: `sort`, `mine`, `seed`
- **Zod:**
  - `frontend-food/src/schemas/mealPlan.ts` (MealItem `portion_id`, `portion_name`)
  - `schemas/shoppingList.ts`
  - `schemas/ingredientReview.ts` (unverändert, aber neue Store-Aktionen)
- **React (`frontend-food/`):**
  - `components/recipe/InlineIngredientEditor.tsx`, `IngredientQuantityDialog.tsx`, `RecipeIngredientReviewStep.tsx`
  - `store/useRecipeIngredientReviewStore.ts`
  - `components/planning/MealOmnibarDialog.tsx`
  - `pages/planning/MealSlot.tsx`, `MealEventDetailPage.tsx`
  - `pages/shopping/ShoppingListPage.tsx`, `api/shoppingLists.ts`
  - `pages/recipes/RecipeListPage.tsx`, `hooks/usePersistedListState.ts`
- **Prod:** Migration einspielen, keine Datenkorrektur. Bestehende Omnibar-Einträge wie „1 Gramm“ Toastbrot bleiben 1 g. Eine Prüfliste im Runbook meldet Einzelzutaten mit `quantity ≤ 5` und Einheit Gramm zur manuellen Kontrolle.
