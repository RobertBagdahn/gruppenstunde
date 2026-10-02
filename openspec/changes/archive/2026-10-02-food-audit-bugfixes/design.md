## Context

Das Audit vom 30.09.2026 hat die Fehler im Browser gegen den lokalen Prod-Export nachgestellt. Die Motivation steht in `proposal.md`, die Anforderungen in den Delta-Specs. Dieses Dokument legt die technischen Entscheidungen für die **Priorität 1** fest. Priorität 2 und 3 sind lokale Korrekturen ohne Architekturfragen und stehen nur in `tasks.md`.

Randbedingungen: keine Rückwärtskompatibilität nötig, bestehende Migrationen nicht ändern, Pydantic und Zod synchron halten, UI-Texte auf Deutsch.

## Goals / Non-Goals

**Goals**
- Keine stille Mengenverfälschung mehr: Rezept-Editor, Import-Umrechnung, Essensplan-Einzelzutat, Einkaufsliste.
- Jede Liste liefert beim Blättern jeden Eintrag genau einmal.
- Die Zutatenprüfung ist immer abschließbar (entfernen, fehlende Menge erkennbar und erfassbar).
- Die Wochenplan-Suche öffnet genau einen Dialog für eine klar benannte Mahlzeit.

**Non-Goals**
- Datenbereinigung: Abteilungen, Dubletten, Tags, Nährwerte, Portionsnamen, drei Tassen-Definitionen.
- Backfill bestehender `MealItem`-Einträge auf Portionen.
- Neugestaltung der Sets und Bundles in der Wochenplan-Suche (sie werden nur entfernt).

## Decisions

### D1 Rezept-Editor: Dialog-Mengen sind Kontextmengen
`frontend-food/src/components/recipe/InlineIngredientEditor.tsx`:
- In `handleAddFromDialog` (~Z. 1044) wird die eingegebene Menge nicht mehr mit `scaleQuantity(…, scale)` multipliziert.
- Die Vorbelegung „1 Portion pro Person“ in der Schnellsuche (~Z. 920) und beim Anlegen einer Alternative (`handleSelectAlternative`, ~Z. 1268) bleibt skaliert. Beide sind keine Nutzereingabe, die Alternative öffnet keinen Mengen-Dialog.

*Alternative:* Den Dialog im Pro-Person-Modus rechnen lassen. Verworfen, denn der Editor zeigt ausdrücklich „Gesamtmengen für N Personen“ (Spec `recipe-serving-input-context`).

### D2 Gramm ist eine echte Portion
`IngredientQuantityDialog.tsx`:
- `onSelectGrams` wählt wie `handleSelectStandardMeasure` die Gramm-Portion (`findGramPortion`).
- Gibt es keine, blendet der Dialog „Gramm“ und die Standardmaße aus (`showGramsSection=false`). Ohne jede Portion ist „Hinzufügen“ deaktiviert.
- Der Dialog ruft `onConfirm` nie mit `portionId=null` auf.

`InlineIngredientEditor.handleAddFromDialog`: Ist `portionId` gesetzt, aber nicht in der Portionsliste, erscheint ein Fehler-Toast statt eines Fallbacks auf Rang 1.

`RecipeIngredientReviewStep.handleQuantityConfirm` bekommt dadurch immer eine Portion. Die Zeile ist anschließend bestätigbar.

*Alternative:* Beim Speichern eine Gramm-Portion erzeugen. Verworfen, weil fast jede Zutat bereits eine „g“-Portion (Rang 9999) hat.

### D3 Dichte nur für Volumen
`backend/recipe/services/unit_gram_conversion.py`:
- `METRIC_GRAMS_PER_UNIT` wird aufgeteilt in `MASS_GRAMS_PER_UNIT` (g, kg) ohne Dichte und `VOLUME_ML_PER_UNIT` (ml, l, liter) mit `_density`.
- Standardmaße (EL, TL, Tasse) bleiben volumenbasiert mit Dichte.

### D4 `MealItem.portion`
- **Model:** neues Feld `portion = ForeignKey("supply.Portion", null=True, blank=True, on_delete=SET_NULL, related_name="meal_items")` in `backend/planner/models/meal_plan.py`. Die Migration fügt nur das Feld hinzu.
- **Semantik:** `portion` gesetzt heißt `quantity` = Anzahl Portionen pro Person, das Gewicht ist `quantity × resolve_trusted_weight(portion)`. Ohne `portion` bleibt alles wie bisher (Einheit Gramm oder ml = direkte Menge, sonst Einheiten-Portion).
- **Helper:** `planner/services/meal_item_helpers._resolve_ingredient_weight_g` prüft `item.portion` zuerst.
- **Schema:** `MealItemOut.resolve_quantity_g` (`planner/schemas/meal_plan.py` ~Z. 168) nutzt denselben Helper statt der eigenen Logik mit `("g",)`. Neue Ausgabefelder sind `portion_id` und `portion_name` (Klartextname der Portion).
- **API:** `POST /api/meal-plans/{id}/meals/{meal_id}/items/` akzeptiert `portion_id: int | None`, ebenso `PATCH …/items/{item_id}/`. Die Portion MUSS zur `ingredient_id` gehören und aktiv sein, sonst HTTP 422 „Die Portion gehört nicht zu dieser Zutat“ (wie die übrigen Validierungsfehler der Item-API). Ist `portion_id` gesetzt, wird `measuring_unit` aus der Portion übernommen.
- **Frontend:** `MealEventDetailPage.handleAddIngredient` sendet `portion_id`. `formatItemPortion` zeigt „1 Scheibe / P. (30 g)“.

*Alternative:* `measuring_unit` durch die Portion ersetzen und migrieren. Verworfen, weil Buffet- und Frühstückspfade bewusst Gramm pro Person speichern und ein Backfill mehrdeutig wäre (5.668 Zutaten mit mehreren Portionen je Einheit).

### D5 Einkaufslisten-Anzeigemenge
`shopping/schemas.py._display_quantity` (beide Klassen):
- Bei vorhandener Zutat wird immer `shopping_quantity(quantity_g, ingredient)` genutzt, unabhängig vom gespeicherten `unit`.
- Nur Freitext-Einträge ohne Zutat zeigen `quantity_g` mit `unit` roh.
- `create_from_meal_plan` speichert künftig `unit="g"`, weil `quantity_g` immer Gramm ist.

### D6 Stabile Listen
- **Rezepte** (`recipe/api/recipes.py`): Jede Sortierung endet mit `-id`. `random` nutzt `seed: int | None`; die Sortierung ist `MD5(Concat(Cast("id", CharField()), Value(str(seed))))`, dann `id`. Ohne Seed erzeugt das Backend einen und gibt ihn in der Antwort zurück. Das Frontend speichert `seed` im URL-State (`RecipeListStateSchema`).
- **Einkaufslisten** (`shopping/api.py` `list_shopping_lists`):
  - `sort: Literal["newest","oldest","name_asc"] = "newest"` sortiert nach `-updated_at, -id`, `updated_at, id` bzw. `Lower("name"), id`.
  - `mine: bool = False` filtert auf `owner=request.user`.
  - Das Frontend sendet beide Parameter; das clientseitige Sortieren und Filtern in `ShoppingListPage.tsx` entfällt.
  - Die Antwortform bleibt `{ items, total, page, page_size, total_pages }`.
- **Essenspläne und Zutaten** bekommen denselben Tie-Breaker `id` (Zutaten-Sortierung selbst ist P2).

*Alternative für Zufall:* Zufällig nur clientseitig pro Seite mischen. Verworfen, weil es über Seiten hinweg ebenfalls keine vollständige Liste ergibt.

### D7 Ein Such-Dialog pro Seite
- `MealOmnibarDialog` verliert den globalen `keydown`-Listener.
- Die Slots behalten ihren Dialog für den Klick auf „Gericht hinzufügen“ (höchstens einer ist gleichzeitig offen). Sie melden jede Interaktion über `onActivate(meal.id)` (`onClickCapture`) an `MealEventDetailPage`.
- `MealEventDetailPage` merkt sich `lastActiveMealId` und besitzt den Seiten-Dialog (`omnibarMealId`), der bereits für den Plan-Check existiert.
- Der Hook `useOmnibarShortcut` (`frontend-food/src/hooks/useOmnibarShortcut.ts`) öffnet mit Cmd/Ctrl+K diesen Seiten-Dialog für `lastActiveMealId`; ist schon ein Dialog offen, stapelt er keinen zweiten. Ohne diesen Wert gilt die erste Mahlzeit des ersten Tages, und der Dialogkopf nennt das Ziel („Hinzufügen zu: Abendessen · Fr., 11.12.“).
- Der Filter wird beim Öffnen auf „Alle“ zurückgesetzt.

### D8 Zutatenprüfung
- **Store** (`useRecipeIngredientReviewStore.ts`): neue Aktion `removeRow(key)`. `getFinalizedRows` berücksichtigt nur verbleibende Zeilen. Sind alle entfernt, ist `rows=[]`, der Review-Schritt verschwindet (`reviewRowCount=0`), und das Rezept wird ohne Import-Zutaten angelegt.
- **UI:** Knopf „Entfernen“ (Icon `Trash2`, `aria-label="Zeile entfernen"`) mit Undo-Toast „Zeile entfernt · Rückgängig“.
- **Fehlende Menge:**
  - Das Backend setzt bei `quantity=None` und vorhandener Zutat `status="unresolved"` und den Grund „Menge fehlt – bitte Menge und Portion festlegen.“
  - Das Frontend zeigt „Menge fehlt“ in Warnfarbe. „Vorschlag bestätigen“ heißt bei unvollständiger Zeile „Menge festlegen“ und öffnet den Mengen-Dialog, statt deaktiviert zu sein.
- **Gruppierung** (`ingredient_review_service.py` ~Z. 241): Zusammengeführt werden nur Zeilen aus verschiedenen Quellen, pro Quelle höchstens einmal. Der Schlüssel bleibt `source_text.lower()`, zusätzlich zählt die Quelle.
- **`updateRow`:** Setzt `status` nur auf `changed`, wenn `updates.status` fehlt. Explizite Status aus dem Aufrufer bleiben erhalten.

## Risks / Trade-offs

- [Bestehende Omnibar-Einträge wie „1 Gramm“ Toastbrot bleiben 1 g] → Prüfliste im Runbook (Einzelzutaten mit Einheit Gramm und `quantity ≤ 5`) zur manuellen Kontrolle. Kein automatischer Backfill.
- [Seed-Zufall ändert die Reihenfolge für Nutzer, die „Zufällig“ neu laden] → Gewollt. Ein neuer Seed entsteht nur bei erneuter Auswahl von „Zufällig“.
- [Entfernen von KI-Zeilen kann versehentlich passieren] → Undo-Toast und Bestätigung beim Entfernen der letzten Zeile.
- [`findGramPortion` findet bei manchen Zutaten keine Gramm-Portion] → „Gramm“ ist dann deaktiviert. Die Datenprüfung zählt Zutaten ohne „g“-Portion.
- [Ein Dialog pro Seite ändert die Tests von `MealSlot`] → Die Tests prüfen `onOpenOmnibar` statt des Dialogs.

## Migration Plan

1. Migration `planner.00xx_mealitem_portion` (AddField, nullable). Rückweg: RemoveField ohne Datenverlust für Altbestände.
2. Deploy Backend vor Frontend. Neue optionale Felder und Parameter sind abwärtskompatibel.
3. Prod: Migration dry-run (`sqlmigrate`), dann einspielen. Danach die Runbook-Prüfliste für Einzelzutaten ausführen.

## Open Questions

- Soll „Zufällig“ den Seed pro Sitzung behalten oder bei jedem Neuladen neu erzeugen? Annahme: Er bleibt, solange er in der URL steht.
