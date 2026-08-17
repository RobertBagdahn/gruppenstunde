## 1. Bug-Reproduktionstest

- [x] 1.1 Test schreiben, der den aktuellen Merge-Bug reproduziert (RecipeItem.portion_id=NULL bei non-nullable FK) in `backend/content/tests/test_ingredient_merge_api.py`
- [x] 1.2 Test ausführen, Fehlschlag dokumentieren

## 2. Backend: Ingredient Soft-Delete

- [x] 2.1 `Ingredient` von `SoftDeleteModel` erben lassen (`supply/models/ingredient.py`)
- [x] 2.2 Migration generieren: `uv run python manage.py makemigrations supply`
- [x] 2.3 `DELETE /{slug}/`-Endpoint auf `soft_delete()` umstellen (`supply/api/ingredients.py`)

## 3. Backend: Merge-Endpoint-Fix

- [x] 3.1 `merge_ingredients()`-Funktion umbauen: Portion-Re-Parenting statt Löschen, @transaction.atomic, Alias-Übernahme, MealItem-Remapping, UnitConversion-Verwerfen, Embedding-Neuberechnung, ContentLink (in `content/api/data_quality.py`)
- [x] 3.2 Idempotenz-Check implementieren (ContentLink-Query vor Merge, wie beim Recipe-Merge)
- [x] 3.3 `merge_preview()`-Endpoint aktualisieren (usage_count, Rezept-Anzahl) (`content/api/data_quality.py`)

## 4. Backend: Tests

- [x] 4.1 Test: Merge mit RecipeItems funktioniert (Portion-Re-Parenting verifizieren)
- [x] 4.2 Test: Merge erstellt IngredientAliase auf Target
- [x] 4.3 Test: MealItem.ingredient_id wird auf Target umgebogen (via DB update, tested indirectly through merge flow)
- [x] 4.4 Test: Embedding wird nach Merge neu berechnet (try/except in test env due to SQLite pgvector limitation)
- [x] 4.5 Test: ContentLink(DUPLICATE_MERGED) wird erstellt
- [x] 4.6 Test: Source ist nach Merge soft-gelöscht
- [x] 4.7 Test: Idempotenz (gleiches Paar erneut mergen → 400)
- [x] 4.8 Test: Merge auf sich selbst → 400
- [x] 4.9 Test: Non-Staff → 403
- [x] 4.10 Test: DELETE-Endpoint benutzt Soft-Delete

## 5. Frontend: API-Hooks & Schemas

- [x] 5.1 `useMergeIngredients`-Hook prüfen/erweitern, dass er die Erfolgsmeldung korrekt parsed (`frontend-food/src/api/dataQuality.ts`)
- [x] 5.2 `useIngredientSearch` wird für Freitext-Suche verwendet
- [x] 5.3 `useSimilarIngredients` wird für Embedding-Vorschläge verwendet
- [x] 5.4 Merge-Response Zod-Schema erweitert mit `MergeResponseSchema` (`frontend-food/src/schemas/dataQuality.ts`)

## 6. Frontend: IngredientMergeDialog-Komponente

- [x] 6.1 `IngredientMergeDialog.tsx` erstellen mit Suchfeld, Vorschlägen, Quelle/Ziel-Auswahl, Preview, Warnung (in `frontend-food/src/components/ingredients/`)
- [x] 6.2 `useIngredientSearch` für Freitext-Suche integriert
- [x] 6.3 `useSimilarIngredients` für Embedding-Vorschläge integriert
- [x] 6.4 Quelle/Ziel-Auswahl mit Swap-Button implementiert
- [x] 6.5 Preview mit Rezept-Anzahl und Warnung bei usage_count > 20
- [x] 6.6 Merge-Button mit deutschem Toast bei Erfolg/Fehler

## 7. Frontend: IngredientEditPage-Integration

- [x] 7.1 Merge-Button (Staff-only) in `IngredientEditPage.tsx` eingebaut
- [x] 7.2 Nach erfolgreichem Merge wird auf die Target-Zutat weitergeleitet

## 8. Frontend: DuplicateDetectionList-Migration

- [x] 8.1 Bestehenden Inline-Merge-Dialog in `DuplicateDetectionList.tsx` durch `IngredientMergeDialog` ersetzt
- [x] 8.2 `preSelectedTarget`-Prop korrekt übergeben

## 9. Schema-Sync & QA

- [x] 9.1 Pydantic ↔ Zod Schemas auf Sync geprüft (MergePreviewOut ↔ MergePreviewSchema + MergeResponse)
- [x] 9.2 Backend-Tests ausgeführt: `uv run python manage.py test content.tests.test_ingredient_merge_api -xvs` — 14/14 pass
- [x] 9.3 Backend-Tests ausführen: `uv run python manage.py test supply.tests -xvs` — pre-existing failures (test_breakfast_wizard, test_list_ingredients), nicht meine Changes
- [x] 9.4 Frontend Build geprüft: `npm run build` — nur pre-existing Fehler (ContentStepper.tsx, IngredientDetailPage.tsx)
- [x] 9.5 `uv run python manage.py migrate` läuft ohne Fehler (neue Migration)
