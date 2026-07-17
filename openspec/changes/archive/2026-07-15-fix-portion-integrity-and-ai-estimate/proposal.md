## Why

Eine Live-Untersuchung des Rezepts "Linsensuppe" (id=59) hat gezeigt, dass die AI-Mengenschätzung beim Übernehmen ("Übernehmen"-Button) reproduzierbar falsche Gramm-Mengen speichert — bei 3 von 10 Zutaten des Testrezepts um Faktor 10 bis 333 (z.B. Jodsalz: 3g beabsichtigt, 1000g gespeichert). Ursache ist ein struktureller Bug: `RecipeQuantityEstimationService._build_response()` berechnet die Menge immer relativ zur `rank=1`-Portion einer Zutat, gibt aber keine `portion_id` zurück; das Frontend übernimmt beim Klick auf "Übernehmen" nur `quantity`, nicht `portion_id` — die Zeile bleibt auf ihrer alten (ggf. anderen oder sogar soft-gelöschten) Portion. Eine DB-Analyse zeigt, dass **70,5 % aller RecipeItems** nicht auf die rank=1-Portion ihrer Zutat zeigen und **125 Zutaten** gleichzeitig zwei rank=1-Portionen besitzen (Altlast aus `enrich_seeds`-Läufen, die neue Portionen anlegen, ohne referenzierende RecipeItems umzuhängen). Zusätzlich existieren RecipeItems, die auf bereits soft-gelöschte Portionen zeigen (Portion wird beim Löschen nie umgehängt). Diese Kombination führt außerdem zu sichtbar unplausiblen Rezeptmengen (z.B. "Käsespätzle" mit 150 kg pro Portion) und zu verwirrenden Anzeigen im Editier-Modus und in der AI-Mengenschätzungs-Vorschau ("0.01 Gramm (1g)").

Der Fix muss jetzt erfolgen, weil der Bug aktiv Rezeptdaten korrumpiert, sobald Nutzer die AI-Mengenschätzung verwenden, und weil `enrich_seeds`-artige Wartungsprozesse den Schaden bei jedem Lauf vergrößern können.

## What Changes

- Portion-Model bekommt Integritäts-Guards: `weight_g` einer bereits von RecipeItems referenzierten Portion darf nicht mehr verändert werden (Update-API erzeugt stattdessen eine neue Portion); `RecipeItem.portion_id` darf nur durch explizite User-Aktion im Editor geändert werden, niemals durch Hintergrundprozesse.
- Ein Partial-Unique-Index verhindert künftig, dass eine Zutat gleichzeitig mehr als eine aktive `rank=1`-Portion besitzt.
- Löschen (Soft-Delete) einer Portion, die noch von RecipeItems referenziert wird, hängt diese automatisch auf die aktuell gültige `rank=1`-Portion um (Gramm-Menge bleibt erhalten) statt die Referenz verwaist zu lassen — **BREAKING** gegenüber der bisherigen `portion-soft-delete`-Spec, die Löschen unabhängig von Referenzen erlaubte.
- `POST /api/recipes/{id}/estimate-quantities/` liefert künftig `portion_id` (immer die aktuelle rank=1-Portion) in jedem Response-Item; das Backend validiert beim Speichern zusätzlich, dass die resultierende Gramm-Menge der AI-Absicht entspricht — **BREAKING** Response-Schema-Erweiterung.
- `InlineIngredientEditor.handleApplyEstimate` übernimmt `portion_id` und `quantity` gemeinsam statt nur `quantity`.
- `InlineIngredientEditor.normalizeItems()` berechnet den editierbaren Mengenwert künftig robust über das backend-autoritative `weight_g`/`quantity`-Verhältnis (nicht über eine fragile Client-seitige Portion-Lookup, die bei soft-gelöschten/fehlenden Portionen auf `weight_g=1` zurückfällt) und zeigt Mengen konsistent in Gramm, gebunden an die rank=1-Portion.
- Ein neuer Management-Command-Workflow bereinigt Bestandsdaten einmalig und wiederholbar:
  1. Dedupe der 125 Zutaten mit doppeltem `rank=1` (bereits referenzierte Portion gewinnt).
  2. Rebind aller RecipeItems, die auf soft-gelöschte Portionen zeigen, auf die jeweils gültige `rank=1`-Portion (Gramm-Menge erhalten).
  3. AI-Plausibilitätsprüfung über alle Rezepte (führt automatisch realistische Mengenkorrekturen durch, keine manuelle Freigabe).
  4. Vollständiger `recalculate_recipe_cache()`-Lauf für alle veränderten Rezepte.

## Capabilities

### New Capabilities
- `portion-integrity-guardrails`: Model-/API-seitige Regeln, die verhindern, dass `Portion.weight_g` oder `RecipeItem.portion_id` nach Referenzierung unkontrolliert verändert werden, plus Unique-Constraint gegen doppelte `rank=1`-Portionen und Auto-Rebind-Verhalten beim Löschen.
- `recipe-quantity-repair`: Management-Command-Familie zur einmaligen (und wiederholbaren) Bereinigung bestehender Portion-/Mengen-Inkonsistenzen inkl. AI-gestützter Plausibilitätsprüfung und Cache-Neuberechnung.

### Modified Capabilities
- `recipe-ai-quantity-estimate`: Response muss `portion_id` (aktuelle rank=1-Portion) enthalten; Apply-Flow übernimmt Portion und Menge atomar; Backend validiert die gespeicherte Gramm-Menge gegen die AI-Absicht.
- `portion-soft-delete`: Löschen einer referenzierten Portion löst Auto-Rebind aus, statt die RecipeItem-Referenz unverändert zu lassen.
- `recipe-inline-edit`: Editierbare Mengen werden immer in Gramm angezeigt und robust aus dem backend-autoritativen Gewicht berechnet, nicht aus einer fragilen Portion-Namens-Lookup.

## Impact

- **Backend**: `supply/models/ingredient.py` (Portion.save/compute_weight_g Guards), `supply/api/ingredients.py` (update/delete Portion Endpoints), `recipe/services/ai_ingredients_service.py` (`_build_response`, Prompt), `recipe/schemas/items.py` (`EstimateQuantityItemOut` + neues `portion_id`-Feld), `recipe/api/items.py` (Save-Validierung), neue Migration für Partial-Unique-Index, neuer Management-Command in `core/management/commands/` oder `recipe/management/commands/`.
- **Frontend**: `frontend-food/src/schemas/recipe.ts` (`EstimateQuantityItemSchema` + `portion_id`), `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` (`handleApplyEstimate`, `normalizeItems`, `getItemWeightG`).
- **Daten-Migration**: Einmaliger Lauf gegen die Produktions-/Dev-Datenbank zur Bereinigung der 125 Duplikat-rank=1-Fälle und aller RecipeItems mit toten Portion-Referenzen, gefolgt von vollständiger Cache-Neuberechnung betroffener Rezepte.
- **Tests**: Neue Backend-Unit-Tests für Guard-Rails und Rebind-Logik, Regressionstest exakt für das Rezept-59-Szenario (Portion mit `rank≠1` + soft-gelöschte Portion), Frontend-Tests für `handleApplyEstimate`/`normalizeItems`.
