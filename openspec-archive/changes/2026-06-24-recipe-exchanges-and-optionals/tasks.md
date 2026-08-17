## 1. Backend: Datenmodell & Migrationen

- [x] 1.1 `RecipeItemExchangeGroup`-Modell in `backend/recipe/models/items.py` anlegen (id, recipe FK, name CharField optional)
- [x] 1.2 `RecipeItem` um `is_optional`, `exchange_group` (FK → RecipeItemExchangeGroup, nullable, PROTECT), `exchange_position` (IntegerField, nullable) erweitern
- [x] 1.3 CHECK CONSTRAINT hinzufügen: `is_optional` und `exchange_group` schließen sich aus
- [x] 1.4 `MealItemSplit`-Modell in `backend/planner/models/meal_plan.py` anlegen (meal_item FK CASCADE, recipe_item FK PROTECT, share FloatField, created_at/updated_at)
- [x] 1.5 Migrationen generieren und anwenden: `uv run python manage.py makemigrations recipe` und `makemigrations planner`
- [x] 1.6 Migration testen: `uv run python manage.py migrate` — keine Fehler, bestehende Daten unverändert

## 2. Backend: Pydantic-Schemas

- [x] 2.1 `RecipeItemExchangeGroupSchema` in `backend/recipe/schemas/` anlegen (id, recipe_id, name, members)
- [x] 2.2 `RecipeItemSchema` in `backend/recipe/schemas/` um `is_optional`, `exchange_group_id`, `exchange_position` erweitern
- [x] 2.3 `MealItemSplitSchema` (In/Out) in `backend/planner/schemas/` anlegen (meal_item_id, recipe_item_id, share)
- [x] 2.4 `MealItemSplitBulkSetSchema` anlegen: Liste von Splits + Constraint-Validierung (Σ share = 1.0 pro Gruppe)

## 3. Backend: API-Endpunkte — Exchange-Gruppen

- [x] 3.1 `POST /{recipe_id}/exchanges/` (recipe-Router, in `recipe/api/items.py`) — Exchange-Gruppe anlegen (nur Rezept-Autor)
- [x] 3.2 `GET /{recipe_id}/exchanges/` — Alle Exchange-Gruppen eines Rezepts
- [x] 3.3 `DELETE /{recipe_id}/exchanges/{group_id}/` — Gruppe löschen; PROTECT-Fehler als HTTP 409 mit deutscher Fehlermeldung
- [x] 3.4 Bestehendes `update_recipe_item` (`PATCH /{recipe_id}/recipe-items/{item_id}/`) + `RecipeItemUpdateIn` um `is_optional`, `exchange_group_id`, `exchange_position` erweitern; Validierung: nicht optional UND exchange gleichzeitig (HTTP 400); Änderungsschutz bei aktiven Splits auf Split-relevanten Feldern (HTTP 409)
- [x] 3.5 Bestehendes `delete_recipe_item` (`DELETE /{recipe_id}/recipe-items/{item_id}/`) um Split-Löschschutz erweitern (HTTP 409 bei aktiven Splits)
- [x] 3.6 `delete_exchange_group`-Logik: PROTECT-Prüfung (HTTP 409), sonst Nicht-Default-Glieder löschen + Original auf exchange_group=NULL
- [x] 3.7 Exchange-Gruppen + neue RecipeItem-Felder in `RecipeItemOut`/Rezept-Detail-Schema mitliefern

## 4. Backend: API-Endpunkte — Splits

- [x] 4.1 `GET /{meal_plan_id}/meal-items/{item_id}/splits/` (planner-Router, Muster wie `set_meal_item_overrides`) — Alle Splits eines MealItems
- [x] 4.2 `PUT /{meal_plan_id}/meal-items/{item_id}/splits/` — Splits atomar setzen (ersetzt alle); Constraint-Prüfung, HTTP 400 bei Fehler; nur Schreibberechtigte
- [x] 4.3 `DELETE /{meal_plan_id}/meal-items/{item_id}/splits/` — Alle Splits löschen; HTTP 403 wenn nicht berechtigt
- [x] 4.4 Bestehendes `set_meal_item_overrides` erweitern: Override auf `is_optional`- oder `exchange_group`-RecipeItems ablehnen (HTTP 400)

## 5. Backend: Berechnungslogik

- [x] 5.1 Hilfsfunktion `largest_remainder_round(shares: dict, total: int) -> dict` in `backend/planner/services/` implementieren (arbeitet auf effective_portions OHNE reserve_factor)
- [x] 5.2 Einkaufsliste split-aware machen: `backend/supply/services/shopping_service.py` → `generate_shopping_list` um `included_fraction` pro RecipeItem erweitern (Default-Glied 1.0, Nicht-Default ohne Split 0.0, Split → gerundete_portionen/effective_portions); `reserve_factor` NICHT doppelt anwenden
- [x] 5.3 Nährwert/Kosten pro MealItem split-aware: `backend/planner/schemas/meal_plan.py` → `MealItemOut.resolve_energy_kcal/resolve_cost_eur` um Delta-Ansatz erweitern (Cache-Basiswert + Differenz pro getauschtem Glied); ohne Splits bestehender Cache-Pfad unverändert
- [x] 5.4 Plan-/Tag-Aggregation split-aware: `backend/planner/api/meal_plan.py` (~Zeile 811+) Schleife über RecipeItems um `included_fraction` ergänzen
- [x] 5.5 Fork-Logik in `backend/recipe/api/recipes.py` → `fork_recipe` erweitern: `is_optional` mitkopieren; pro `RecipeItemExchangeGroup` neue Gruppe anlegen und kopierte RecipeItems via exchange_group/exchange_position neu verknüpfen
- [x] 5.6 Rezept-Löschschutz: vor dem Löschen eines Rezepts (oder RecipeItems) prüfen ob aktive `MealItemSplit` existieren → HTTP 409 mit deutscher Fehlermeldung

## 6. Backend: Tests

- [x] 6.1 Test: Exchange-Gruppe anlegen, Glied hinzufügen, Glied löschen (PROTECT)
- [x] 6.2 Test: `is_optional` + `exchange_group` gleichzeitig → HTTP 400
- [x] 6.3 Test: Split Σ ≠ 1.0 → HTTP 400; Σ = 1.0 → HTTP 200
- [x] 6.4 Test: Einkaufslisten-Menge bei Exchange-Split (8/10 Parmesan + 2/10 Hefeflocken)
- [x] 6.5 Test: Largest-Remainder-Rundung bei krummen Portionen (20% von 11)
- [x] 6.6 Test: Nährwert Delta-Ansatz bei Split (Parmesan vs. Hefeflocken ergibt abweichende kcal)
- [x] 6.7 Test: Fork kopiert Exchange-Gruppen vollständig als neue Objekte (unabhängig vom Original)
- [x] 6.8 Test: Rezept-Löschung mit aktiven Splits → HTTP 409
- [x] 6.9 Test: reserve_factor wird nicht doppelt auf Splits angewendet (Einkaufsmenge bleibt korrekt)
- [x] 6.10 Test: PDF-Export rendert getrennte Blöcke pro Exchange-Split
- [x] 6.11 Test: Override auf Split-/Optional-Zutat → HTTP 400; Override auf normaler Zutat → erlaubt
- [x] 6.12 Test: is_optional/exchange_group ändern bei aktiven Splits → HTTP 409
- [x] 6.13 Test: Exchange-Gruppe löschen entfernt Nicht-Default-Glieder, Original bleibt

## 7. Frontend: Zod-Schemas (1:1 zu Pydantic)

- [x] 7.1 `RecipeItemExchangeGroupSchema` in `frontend-food/src/schemas/` anlegen
- [x] 7.2 `RecipeItemSchema` um `isOptional`, `exchangeGroupId`, `exchangePosition` erweitern
- [x] 7.3 `MealItemSplitSchema` und `MealItemSplitBulkSetSchema` in `frontend-food/src/schemas/` anlegen

## 8. Frontend: TanStack Query Hooks

- [x] 8.1 `useRecipeExchangeGroups(recipeId)` — GET Exchange-Gruppen
- [x] 8.2 `useCreateExchangeGroup(recipeId)` — POST Exchange-Gruppe anlegen
- [x] 8.3 `useDeleteExchangeGroup(recipeId)` — DELETE mit PROTECT-Fehlerbehandlung (Toast auf Deutsch)
- [x] 8.4 `usePatchRecipeItem(itemId)` — PATCH `is_optional`, `exchange_group`, `exchange_position`
- [x] 8.5 `useMealItemSplits(mealItemId)` — GET Splits
- [x] 8.6 `useSetMealItemSplits(mealItemId)` — PUT Splits (mit Constraint-Validierung im Frontend vor dem Request)
- [x] 8.7 `useDeleteMealItemSplits(mealItemId)` — DELETE alle Splits

## 9. Frontend: Rezept-Editor

- [x] 9.1 "Alternative hinzufügen"-Button an jeder Zutat im RecipeItem-Editor implementieren
- [x] 9.2 Exchange-Kette unter der Ursprungszutat expandierbar darstellen (Zutat → Eingerückte Alternativen)
- [x] 9.3 "Optional"-Toggle an jeder Zutat implementieren; deaktiviert wenn Zutat in Exchange-Gruppe
- [x] 9.4 Fehlermeldung beim PROTECT-Fehler (Löschen blockiert): Toast "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden."

## 10. Frontend: Rezeptansicht

- [x] 10.1 Zutatenliste in der Rezeptdetailseite: Exchange-Alternativen in Klammern rendern `Parmesan (oder: Hefeflocken / Cashew-Creme)`
- [x] 10.2 Optionale Zutaten mit `(optional)` kennzeichnen

## 11. Frontend: Einplanen-Dialog (Split-Konfiguration)

- [x] 11.1 Beim Hinzufügen eines Rezepts zum Meal prüfen: Hat das Rezept Exchanges oder Optionals?
- [x] 11.2 Split-Konfigurations-Dialog implementieren: zeigt alle Exchange-Gruppen und optionalen Zutaten mit vorausgefüllten Defaults
- [x] 11.3 Pro Exchange-Gruppe: Portionen-Eingabe pro Glied; Live-Validierung: Summe muss = effective_portions
- [x] 11.4 Pro optionaler Zutat: Portionen-Eingabe "mit/ohne"; Live-Validierung: Summe muss = effective_portions
- [x] 11.5 Anzeige in ganzen Portionen (gerundete Darstellung aus float-Anteilen via Largest-Remainder)
- [x] 11.6 "Speichern"-Button löst `useSetMealItemSplits` aus; Dialog schließt sich bei Erfolg
- [x] 11.7 Kein Dialog wenn keine Exchanges/Optionals vorhanden → direktes Hinzufügen wie bisher

## 12. Backend: Kochplan-Druck (meal-plan-export erweitern)

- [x] 12.1 PDF-Rendering in der bestehenden `GET /api/meal-plans/{id}/export/pdf/`-Logik (WeasyPrint) erweitern: pro MealItem mit Splits getrennte Rezept-Blöcke generieren
- [x] 12.2 Pro Exchange-Variante eine vollständige Zutatenliste rendern, skaliert auf die jeweilige Portionenzahl (z.B. "Variante Parmesan — 8 Portionen")
- [x] 12.3 Optionale Zutaten mit share=0.0 nicht im Block listen
- [x] 12.4 MealItem ohne Splits: einzelner Block wie bisher (kein Variant-Split)

## 13. Abschluss & Qualitätssicherung

- [x] 13.1 Pydantic- und Zod-Schemas gegenseitig abgleichen (alle Felder 1:1)
- [x] 13.2 Mobile-Ansicht des Split-Dialogs testen (320px Minimum)
- [x] 13.3 Einkaufslisten-Ausgabe mit Split manuell prüfen: Mengen stimmen, keine Zutaten doppelt
- [x] 13.4 Bestehende Rezepte und Essenspläne ohne Exchanges/Optionals: Verhalten unverändert verifizieren
- [x] 13.5 `uv run python manage.py makemigrations --check` muss "No changes detected" melden
