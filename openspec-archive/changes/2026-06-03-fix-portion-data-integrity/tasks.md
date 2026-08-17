## 1. Zentrale Portion-Logik (Backend)

- [x] 1.1 `Portion.compute_weight_g(explicit: float | None = None)` in `backend/supply/models/ingredient.py` implementieren (`> 0`-Logik, explizit hat Vorrang)
- [x] 1.2 `Portion.save()` so anpassen, dass `weight_g` über `compute_weight_g()` gesetzt wird, wenn nicht explizit übergeben
- [x] 1.3 `Portion.name`: `blank=True` und `default="g"` entfernen (`max_length=255`, Pflicht)
- [x] 1.4 `resolve_canonical_unit(name)` Helper in `backend/supply/services/` mit Synonym-Map (g→Gramm, ml→Milliliter, EL→Esslöffel, TL→Teelöffel, etc.) implementieren

## 2. API-Anpassung (Backend)

- [x] 2.1 `create_portion` in `backend/supply/api/ingredients.py`: duplizierte `weight_g`-Berechnung durch `compute_weight_g()` ersetzen, fehlerhaften `> 1`-Check entfernen
- [x] 2.2 `update_portion`: gleiche Umstellung auf zentrale Berechnung
- [x] 2.3 `create_portion`: leeren `name` ablehnen → `HttpError(422, ...)`
- [x] 2.4 Pydantic-Schemas in `backend/supply/schemas/ingredients.py`: `PortionCreateIn.name` required, `PortionUpdateIn.name` optional, `PortionOut` unverändert prüfen

## 3. URL-Import (Backend)

- [x] 3.1 `url_import_service.py:604` — `MeasuringUnit.objects.get_or_create(name=...)` durch `resolve_canonical_unit()` ersetzen
- [x] 3.2 `_create_new_ingredients` (`:607`): Portion via `get_or_create` auf `(ingredient, name, measuring_unit, quantity)` statt `create`
- [x] 3.3 `_resolve_portion` (`:759`): neue Portion über zentrale `weight_g`-Berechnung absichern, wenn Gemini-Wert ungültig (`<= 0`)
- [x] 3.4 Sicherstellen, dass kein Pfad mehr leere Portionsnamen erzeugt (Ableitung aus Einheit)

## 4. Legacy-Import (Backend)

- [x] 4.1 `import_legacy_food.py:513,595` — fehlende `weight_g` vor `bulk_create` über `compute_weight_g()` ableiten
- [x] 4.2 Portion-Dedup pro Zutat über `(name, measuring_unit, quantity)` (In-Memory + Abgleich gegen bestehende)
- [x] 4.3 Leere/Default-Namen aus `measuring_unit` ableiten

## 5. Migrationen (Backend)

- [x] 5.1 Daten-Migration: Dubletten-Einheiten (id 87–99) auf kanonische (61–75) umhängen, `RecipeItem` mit umziehen, leere Dubletten löschen
- [x] 5.2 Daten-Migration: Portionen pro Zutat dedupen, `RecipeItem.portion` umhängen, Duplikate soft-deleten
- [x] 5.3 Daten-Migration: leere/`"g"`-Namen aus Einheit ableiten
- [x] 5.4 Daten-Migration: `weight_g = NULL` über `quantity × measuring_unit.quantity` nachberechnen
- [x] 5.5 Schema-Migration: `Portion.name` non-blank, kein Default (NACH Daten-Migration)
- [x] 5.6 Betroffene Rezepte nach Dedup über `recalculate_recipe_cache` neu berechnen
- [x] 5.7 `uv run python manage.py makemigrations supply` ausführen und Reihenfolge der Migrationen verifizieren

## 6. Frontend (frontend-food)

- [x] 6.1 Zod-Schema `name` als required (`z.string().min(1)`) in `frontend-food/src/schemas/supply.ts` (und ggf. `recipe.ts`) synchronisieren
- [x] 6.2 `IngredientDetailPage.tsx`: `PortionCard` markiert unvollständige Portionen (fehlendes `weight_g`/leerer Name) sichtbar statt leerer Zeile
- [x] 6.3 `handleAddPortion` / Edit-Form: leeren Namen client-seitig validieren

## 7. Tests

- [x] 7.1 Unit-Test `Portion.compute_weight_g()` (explizit, calc=1.0 → 1.0, calc≤0 → None)
- [x] 7.2 API-Test `create_portion`: Happy-Path, leerer Name → 422, nicht-authentifiziert → 403
- [x] 7.3 Test `resolve_canonical_unit()` (g→Gramm, unbekannt → Fallback)
- [x] 7.4 Test URL-Import: keine Dubletten-Einheit, keine Duplikat-Portion, `weight_g` gesetzt
- [x] 7.5 Test Legacy-Import: Mehrfachlauf vervielfacht Portionen NICHT, `weight_g` berechnet
- [x] 7.6 Migrations-Test: kaputte Fixtures (NULL weight_g, leere Namen, Duplikate) werden korrekt repariert, RecipeItem-FKs bleiben gültig

## 8. Verifikation Prod

- [ ] 8.1 Cloud-SQL-Snapshot vor Migration erstellen
- [ ] 8.2 Migration über cloud-sql-proxy gegen Prod ausführen
- [ ] 8.3 Read-Only-Verifikation: `weight_g IS NULL`-Count ~0, keine leeren Namen, Portion-Counts pro Zutat plausibel
