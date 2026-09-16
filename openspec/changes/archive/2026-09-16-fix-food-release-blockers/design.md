## Context

Die betroffenen Flows sind bereits teilweise implementiert, aber über mehrere Services und API-Verträge verteilt:

- `backend/recipe/api/items.py` filtert nach dem Matchergebnis erneut nach vorhandenen Zutaten und entfernt dadurch gültige Replacement-Kandidaten.
- `backend/content/api/data_quality.py` besitzt neben dem neuen `IngredientPriceProposal`-Workflow weiterhin `price-analysis/evaluate` und `price-analysis/apply`, wobei `apply` den globalen Zutatenpreis direkt schreibt.
- `backend/planner/api/meal_plan.py` berechnet Preisabdeckung, serialisiert aber nur die Anzahl bepreister Zutaten und nicht die fehlenden Zutaten oder den Coverage-Anteil.
- Food-Zod-Schemas und UI-Komponenten spiegeln diese uneinheitlichen Verträge.

Die Lösung muss ohne parallele Preislogik auskommen, die bestehende RecipeItem-Idempotenz erhalten und die aktiven Varianten bei Kostenberechnungen unverändert berücksichtigen.

## Goals / Non-Goals

**Goals:**

- Replacement-Kandidaten werden in der Suggestion-Response behalten, wenn sie eine bestehende RecipeItem-Zeile ersetzen sollen.
- Der Data-Quality-Batch-Workflow erzeugt nachvollziehbare `IngredientPriceProposal`-Datensätze und nutzt keine direkte KI-Preis-Mutation mehr.
- Annahme, Ablehnung, positive-Preis-Konflikte und konkurrierende Approval-Anfragen bleiben serverseitig geschützt.
- Rezept- und Meal-Plan-Kosten liefern dieselbe vollständige Preisabdeckung mit `total`, `priced`, `missing` und `coverage`.
- Backend-Pydantic- und Food-Zod-Verträge bleiben synchron.
- Tests beweisen den vollständigen Request-to-DB-to-Response-Fluss und verhindern Regressionen durch den alten Batch-Pfad.

**Non-Goals:**

- Keine Implementierung der noch offenen Piece-Portion-Änderung.
- Keine automatische Annahme von KI-Preisvorschlägen.
- Keine Änderung der bestehenden RecipeItem-Replacement- oder Variantengruppen-Semantik.
- Keine zusätzliche Migration, sofern die bestehenden Proposal-, Cache- und Idempotenzfelder ausreichen.

## Decisions

### Replacement-Kandidaten vor Duplikatfilter schützen

Der Filter in `recipe/api/items.py` behandelt `replacement_for_item_id != None` als explizite Ausnahme. Normale Kandidaten werden weiterhin anhand von Ingredient-ID und normalisiertem Namen dedupliziert. Die Response bleibt das bestehende Wrapper-Schema `AiIngredientSuggestionsOut`; der Frontend-Client sendet Replacement-Kandidaten ausschließlich an `POST /api/recipes/{recipe_id}/items/{item_id}/replace/`.

Alternative: Den Filter vollständig entfernen. Das würde echte Duplikate wieder zulassen und wird deshalb verworfen.

### Einen Preis-Approval-Pfad als Single Source of Truth verwenden

`POST /api/admin/data-quality/ingredients/price-analysis/evaluate/` darf weiterhin Vorschläge für die Data-Quality-Tabelle liefern, muss diese aber als `IngredientPriceProposal` mit Status `pending` persistieren oder vorhandene pending Proposals wiederverwenden. `PATCH /api/admin/data-quality/ingredients/price-analysis/apply/` wird nicht mehr direkt `Ingredient.price_per_kg` schreiben. Entweder wird der Endpoint entfernt, falls aktive Entwicklung das erlaubt, oder er wird zu einem expliziten Proposal-Akzeptierungs-Batch mit Konflikt- und Reviewer-Prüfung umgebaut.

Bevorzugt wird die zweite Variante, damit der bestehende Food-Client keinen unklaren 404-Pfad erhält: Die Response meldet pro Eintrag `created`, `accepted`, `rejected` oder `conflict`; positive Preise werden nur mit einem expliziten `replace`-Flag überschrieben. Die UI verlinkt aus der Preisanalyse zur Ingredient-Detail-Approval-Ansicht oder zeigt den Proposal-Status direkt.

### Gemeinsames Preisabdeckungsobjekt

`PriceCoverageOut` wird auch in `MealPlanCostSummaryOut` verwendet. Die Kostenberechnung zählt nur aktive RecipeItems und aktive Direktzutaten; pending Proposals zählen als fehlend. Die bestehende Teilkostensumme bleibt erhalten, wird aber bei `missing > 0` im Frontend sichtbar als unvollständig markiert.

Die Felder lauten:

```text
total_ingredients: int
priced_ingredients: int
missing_ingredients: int
coverage: float | None  # priced / total, null bei total = 0
```

Die vorhandenen per-recipe Zählungen werden aus derselben aktiven Item-Auflösung berechnet, damit Meal-Plan-, Recipe- und Variantendarstellung nicht auseinanderlaufen.

### API- und Schema-Synchronisierung

Backend:

- `backend/recipe/schemas/items.py`: bestehende Replacement-Felder unverändert verwenden.
- `backend/content/schemas/data_quality.py`: Batch-Preis-Response um Proposal-ID/Status erweitern oder einen bestehenden Proposal-Response wiederverwenden.
- `backend/planner/schemas/meal_plan.py`: `MealPlanCostSummaryOut` um `PriceCoverageOut`-kompatible Felder erweitern.

Food-Frontend:

- `frontend-food/src/schemas/dataQuality.ts`: Batch-Approval-Response und Statuswerte synchronisieren.
- `frontend-food/src/schemas/mealPlan.ts`: vollständige Preisabdeckung verpflichtend abbilden.
- `frontend-food/src/api/dataQuality.ts` und `frontend-food/src/api/mealPlans.ts`: Mutationen und Invalidierungen an den Approval-Vertrag anpassen.

### Transaktion, Cache und Idempotenz

Proposal-Erstellung bleibt idempotent pro Ingredient und pending Status. Proposal-Annahme sperrt Proposal und Ingredient in einer Transaktion, schreibt den Reviewer, aktualisiert den globalen Preis und recalculiert abhängige Recipe-Caches. Der Batch-Pfad verarbeitet jedes Ingredient unabhängig, damit ein einzelner Konflikt nicht bestätigte Einträge aus derselben Batch zurückrollt. Die Response muss jeden Eintrag mit seinem Ergebnis ausweisen.

## Risks / Trade-offs

- [Bestehende Data-Quality-UI erwartet direkte Preis-IDs] → Response-Adapter und gezielte Frontend-Tests vor der Entfernung oder Änderung des Apply-Pfads.
- [Batch-Approval erzeugt viele Gemini-Proposals] → Pending-Proposals wiederverwenden, Eingaben auf maximal 50 Zutaten begrenzen und bestehende Gemini-Rate-Limits nutzen.
- [Coverage zählt Varianten doppelt] → Aktive RecipeItems über `calculation_context.active_recipe_items` auflösen und für Rezept-/Direktzutaten separate, getestete Zählpfade verwenden.
- [Konkurrierende Annahme desselben Vorschlags] → `select_for_update`, Statusprüfung und 409 bei bereits bearbeitetem Proposal beibehalten.
- [Teilweise bepreiste Kosten wirken wie exakte Kosten] → Teilbetrag weiter anzeigen, aber deutsches Warn-Badge und vollständige Coverage im Contract erzwingen.
- [Uncommitted Worktree enthält weitere Änderungen] → Vor Implementierung nur die Change-relevanten Dateien anfassen und vor Deployment einen isolierten Diff prüfen.

## Migration Plan

1. Zuerst Contract- und Service-Tests für Replacement-Ausnahme, Batch-Approval und Meal-Plan-Coverage ergänzen.
2. Replacement-Filter und Price-Analysis-Services auf die bestehenden Proposal-/Cache-Services umstellen.
3. Meal-Plan-Pydantic-Schema, API-Aggregation, Zod-Schema und Kostenansichten synchron aktualisieren.
4. Bestehende pending Proposals unverändert weiterverwenden; keine Datenmigration ausführen, sofern `makemigrations --check` keine neue Migration verlangt.
5. Staging mit einem Rezept mit Replacement-Kandidat, einem pending Preis, einem bestätigten Preis, einer Variante und einer Direktzutat prüfen.
6. Rollback: Frontend auf den bisherigen Preisanalyse-Read-only-Status zurücksetzen und Proposal-Erstellung deaktivieren; bereits bestätigte Preise bleiben gültige Daten. Den direkten unbestätigten Apply-Pfad nicht wieder aktivieren.

## Open Questions

- Soll der alte `price-analysis/apply`-Endpoint als batchfähiger Proposal-Accept-Endpoint bestehen bleiben oder nach Frontend-Migration vollständig entfernt werden?
- Soll die Data-Quality-Tabelle Proposal-Annahme inline erlauben oder ausschließlich auf die Ingredient-Detailseite verlinken?
