## 1. Backend: Datenmodell & Migrationen

- [ ] 1.1 `RecipeItemExchangeGroup`-Modell in `backend/recipe/models/items.py` anlegen (id, recipe FK, name CharField optional)
- [ ] 1.2 `RecipeItem` um `is_optional`, `exchange_group` (FK → RecipeItemExchangeGroup, nullable, PROTECT), `exchange_position` (IntegerField, nullable) erweitern
- [ ] 1.3 CHECK CONSTRAINT hinzufügen: `is_optional` und `exchange_group` schließen sich aus
- [ ] 1.4 `MealItemSplit`-Modell in `backend/planner/models/meal_plan.py` anlegen (meal_item FK CASCADE, recipe_item FK PROTECT, share FloatField, created_at/updated_at)
- [ ] 1.5 Migrationen generieren und anwenden: `uv run python manage.py makemigrations recipe` und `makemigrations planner`
- [ ] 1.6 Migration testen: `uv run python manage.py migrate` — keine Fehler, bestehende Daten unverändert

## 2. Backend: Pydantic-Schemas

- [ ] 2.1 `RecipeItemExchangeGroupSchema` in `backend/recipe/schemas/` anlegen (id, recipe_id, name, members)
- [ ] 2.2 `RecipeItemSchema` in `backend/recipe/schemas/` um `is_optional`, `exchange_group_id`, `exchange_position` erweitern
- [ ] 2.3 `MealItemSplitSchema` (In/Out) in `backend/planner/schemas/` anlegen (meal_item_id, recipe_item_id, share)
- [ ] 2.4 `MealItemSplitBulkSetSchema` anlegen: Liste von Splits + Constraint-Validierung (Σ share = 1.0 pro Gruppe)

## 3. Backend: API-Endpunkte — Exchange-Gruppen

- [ ] 3.1 `POST /api/recipes/{recipe_id}/exchanges/` — Exchange-Gruppe anlegen (nur Rezept-Autor)
- [ ] 3.2 `GET /api/recipes/{recipe_id}/exchanges/` — Alle Exchange-Gruppen eines Rezepts
- [ ] 3.3 `DELETE /api/recipes/{recipe_id}/exchanges/{group_id}/` — Gruppe löschen; PROTECT-Fehler als HTTP 409 mit deutscher Fehlermeldung
- [ ] 3.4 `PATCH /api/recipe-items/{item_id}/` — `is_optional`, `exchange_group`, `exchange_position` setzen; Validierung: nicht beides gleichzeitig
- [ ] 3.5 Exchange-Gruppen in bestehendem Rezept-Detail-Endpunkt mitliefern (Seiteneffekt: keine neue Route nötig)

## 4. Backend: API-Endpunkte — Splits

- [ ] 4.1 `GET /api/meal-items/{meal_item_id}/splits/` — Alle Splits eines MealItems
- [ ] 4.2 `PUT /api/meal-items/{meal_item_id}/splits/` — Splits atomar setzen (ersetzt alle); Constraint-Prüfung, HTTP 400 bei Fehler; nur Schreibberechtigte
- [ ] 4.3 `DELETE /api/meal-items/{meal_item_id}/splits/` — Alle Splits löschen; HTTP 403 wenn nicht berechtigt

## 5. Backend: Berechnungslogik

- [ ] 5.1 Hilfsfunktion `largest_remainder_round(shares: dict, total: int) -> dict` in `backend/planner/services/` implementieren
- [ ] 5.2 Einkaufslisten-Berechnung in `backend/planner/` anpassen: Split-aware Mengenberechnung pro Zutat (siehe design.md Pipeline)
- [ ] 5.3 Nährwert-Berechnung für MealItem mit Splits: gewichteter Durchschnitt live berechnen (kein Cache); bestehenden `cached_energy_kcal`-Pfad als Fallback wenn keine Splits
- [ ] 5.4 Fork-Logik erweitern: beim Forken alle Exchange-Gruppen und `RecipeItem`-Flags als neue Objekte kopieren

## 6. Backend: Tests

- [ ] 6.1 Test: Exchange-Gruppe anlegen, Glied hinzufügen, Glied löschen (PROTECT)
- [ ] 6.2 Test: `is_optional` + `exchange_group` gleichzeitig → HTTP 400
- [ ] 6.3 Test: Split Σ ≠ 1.0 → HTTP 400; Σ = 1.0 → HTTP 200
- [ ] 6.4 Test: Einkaufslisten-Menge bei Exchange-Split (8/10 Parmesan + 2/10 Hefeflocken)
- [ ] 6.5 Test: Largest-Remainder-Rundung bei krummen Portionen (20% von 11)
- [ ] 6.6 Test: Nährwert gewichteter Durchschnitt bei Split
- [ ] 6.7 Test: Fork kopiert Exchange-Gruppen vollständig als neue Objekte

## 7. Frontend: Zod-Schemas (1:1 zu Pydantic)

- [ ] 7.1 `RecipeItemExchangeGroupSchema` in `frontend-food/src/schemas/` anlegen
- [ ] 7.2 `RecipeItemSchema` um `isOptional`, `exchangeGroupId`, `exchangePosition` erweitern
- [ ] 7.3 `MealItemSplitSchema` und `MealItemSplitBulkSetSchema` in `frontend-food/src/schemas/` anlegen

## 8. Frontend: TanStack Query Hooks

- [ ] 8.1 `useRecipeExchangeGroups(recipeId)` — GET Exchange-Gruppen
- [ ] 8.2 `useCreateExchangeGroup(recipeId)` — POST Exchange-Gruppe anlegen
- [ ] 8.3 `useDeleteExchangeGroup(recipeId)` — DELETE mit PROTECT-Fehlerbehandlung (Toast auf Deutsch)
- [ ] 8.4 `usePatchRecipeItem(itemId)` — PATCH `is_optional`, `exchange_group`, `exchange_position`
- [ ] 8.5 `useMealItemSplits(mealItemId)` — GET Splits
- [ ] 8.6 `useSetMealItemSplits(mealItemId)` — PUT Splits (mit Constraint-Validierung im Frontend vor dem Request)
- [ ] 8.7 `useDeleteMealItemSplits(mealItemId)` — DELETE alle Splits

## 9. Frontend: Rezept-Editor

- [ ] 9.1 "Alternative hinzufügen"-Button an jeder Zutat im RecipeItem-Editor implementieren
- [ ] 9.2 Exchange-Kette unter der Ursprungszutat expandierbar darstellen (Zutat → Eingerückte Alternativen)
- [ ] 9.3 "Optional"-Toggle an jeder Zutat implementieren; deaktiviert wenn Zutat in Exchange-Gruppe
- [ ] 9.4 Fehlermeldung beim PROTECT-Fehler (Löschen blockiert): Toast "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden."

## 10. Frontend: Rezeptansicht

- [ ] 10.1 Zutatenliste in der Rezeptdetailseite: Exchange-Alternativen in Klammern rendern `Parmesan (oder: Hefeflocken / Cashew-Creme)`
- [ ] 10.2 Optionale Zutaten mit `(optional)` kennzeichnen

## 11. Frontend: Einplanen-Dialog (Split-Konfiguration)

- [ ] 11.1 Beim Hinzufügen eines Rezepts zum Meal prüfen: Hat das Rezept Exchanges oder Optionals?
- [ ] 11.2 Split-Konfigurations-Dialog implementieren: zeigt alle Exchange-Gruppen und optionalen Zutaten mit vorausgefüllten Defaults
- [ ] 11.3 Pro Exchange-Gruppe: Portionen-Eingabe pro Glied; Live-Validierung: Summe muss = effective_portions
- [ ] 11.4 Pro optionaler Zutat: Portionen-Eingabe "mit/ohne"; Live-Validierung: Summe muss = effective_portions
- [ ] 11.5 Anzeige in ganzen Portionen (gerundete Darstellung aus float-Anteilen via Largest-Remainder)
- [ ] 11.6 "Speichern"-Button löst `useSetMealItemSplits` aus; Dialog schließt sich bei Erfolg
- [ ] 11.7 Kein Dialog wenn keine Exchanges/Optionals vorhanden → direktes Hinzufügen wie bisher

## 12. Abschluss & Qualitätssicherung

- [ ] 12.1 Pydantic- und Zod-Schemas gegenseitig abgleichen (alle Felder 1:1)
- [ ] 12.2 Mobile-Ansicht des Split-Dialogs testen (320px Minimum)
- [ ] 12.3 Einkaufslisten-Ausgabe mit Split manuell prüfen: Mengen stimmen, keine Zutaten doppelt
- [ ] 12.4 Bestehende Rezepte und Essenspläne ohne Exchanges/Optionals: Verhalten unverändert verifizieren
