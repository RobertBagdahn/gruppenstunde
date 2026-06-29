## 1. Pre-Migration: Datenqualität prüfen

- [ ] 1.1 Django-Management-Script schreiben das case-insensitive Duplikate in `Portion.name` pro Ingredient findet und ausgibt
- [ ] 1.2 Query ausführen: Zutaten mit mehreren `is_default=True`-Portionen identifizieren
- [ ] 1.3 Duplikate manuell oder per Script bereinigen (soft-delete Duplikat, RecipeItems auf verbleibende Portion umhängen)

## 2. Backend: Datenbank-Migration

- [ ] 2.1 Django-Datenmigration schreiben: `is_default=True`-Portion bekommt `rank=1`; alle anderen Portionen einer Zutat werden nach `(priority desc, rank asc)` neu als `rank=2,3,...` nummeriert; `g`-Portion erhält `rank=9999`
- [ ] 2.2 Django-Schema-Migration: `priority`-Feld von `Portion` entfernen
- [ ] 2.3 Django-Schema-Migration: `is_default`-Feld von `Portion` entfernen
- [ ] 2.4 Django-Schema-Migration: `UniqueConstraint(Lower("name"), "ingredient_id", condition=Q(deleted_at__isnull=True), name="unique_portion_name_per_ingredient")` zu `Portion.Meta` hinzufügen
- [ ] 2.5 Migrationen ausführen (`uv run python manage.py migrate`) und validieren

## 3. Backend: Portions-Modell und Signal

- [ ] 3.1 `Portion`-Modell in `supply/models/ingredient.py` bereinigen: `priority`, `is_default` entfernen; Default-Ordering auf `["rank"]` ändern
- [ ] 3.2 `system_portion_names()` bleibt (`{"g", "Packung", "Stück"}`); `_create_system_portions()` in `supply/signals.py` anpassen: `g` erhält `rank=9999`, `Stück` erhält `rank=2`, `Packung` erhält `rank=3`; Normalportion wird nicht als System-Portion angelegt (kommt von KI)
- [ ] 3.3 `Portion.compute_weight_g()` prüfen — keine Änderungen nötig wenn korrekt

## 4. Backend: API-Endpoints

- [ ] 4.1 In `supply/api/ingredients.py`: POST/PATCH-Portions-Endpoint mit Unique-Name-Validierung erweitern (case-insensitive Check, 422 bei Duplikat)
- [ ] 4.2 Neuen Endpoint `POST /api/ingredients/{slug}/portions/reorder/` implementieren: Body `{orders: [{id, rank}]}`, atomisches Update aller ranks
- [ ] 4.3 `move`-Endpoint (`POST /{slug}/portions/{id}/move/`) entfernen oder als deprecated markieren
- [ ] 4.4 Portions-Endpoints: `priority` und `is_default` aus Pydantic-Schemas (`PortionIn`, `PortionOut`, `PortionUpdateIn`) in `supply/schemas/ingredients.py` entfernen

## 5. Backend: KI-Services anpassen

- [ ] 5.1 `ingredient_ai_suggest_service.py` — Pydantic-Response-Schema für `suggest_all_fields()` erweitern: `stueck_weight_g: float | None`, `packung_weight_g: float | None`; erste Portion in `portions`-Array ist immer die Normalportion (rank=1, typische Menge pro Person)
- [ ] 5.2 Gemini-Prompt in `suggest_all_fields()` aktualisieren: priority-Felder durch rank ersetzen; Normalportion als erste Pflichtportion; `stueck_weight_g`/`packung_weight_g` als Pflichtfelder im JSON-Output (null wenn nicht sinnvoll)
- [ ] 5.3 `ai_create_ingredient()` anpassen: nach KI-Response `weight_g` für Stück- und Packung-System-Portionen aus `stueck_weight_g`/`packung_weight_g` setzen; erste KI-Portion als rank=1-Normalportion anlegen
- [ ] 5.4 `IngredientSuggestAllSchema` (Pydantic + Zod) um `stueck_weight_g` und `packung_weight_g` erweitern
- [ ] 5.5 `PortionSuggestionSchema` (Pydantic + Zod): `priority`-Feld entfernen, `rank`-Feld hinzufügen

## 6. Backend: Einkaufslisten-Logik

- [ ] 6.1 `supply/utils.py` — `build_package_display()` umschreiben: statt `name="Packung"` wird die Portion mit kleinstem `weight_g > 0` gewählt, die nicht g-Basiseinheit ist
- [ ] 6.2 Hilfsfunktion `get_shopping_portion(ingredient) -> Portion | None` in `supply/utils.py` extrahieren (kleinste nicht-g Portion mit weight_g > 0)
- [ ] 6.3 Alle Aufrufer von `build_package_display()` auf neue Logik prüfen und ggf. anpassen

## 7. Backend: Recipe-Services prüfen

- [ ] 7.1 `recipe/services/ai_ingredients_service.py` — `assign_portions()`: statt `is_default=True` → Portion mit `rank=1` verwenden; `priority`-Referenzen entfernen
- [ ] 7.2 `RecipeQuantityEstimationService` auf `rank`-Logik prüfen, `priority`/`is_default` entfernen

## 8. Frontend: Zod-Schemas

- [ ] 8.1 `frontend-food/src/schemas/supply.ts` — `PortionSchema`: `priority` und `is_default` entfernen
- [ ] 8.2 `PortionSuggestionSchema`: `priority` entfernen, `rank` hinzufügen
- [ ] 8.3 `IngredientSuggestAllSchema`: `stueck_weight_g: z.number().nullable()` und `packung_weight_g: z.number().nullable()` hinzufügen
- [ ] 8.4 TypeScript-Fehler nach Schema-Änderungen beheben (`tsc --noEmit`)

## 9. Frontend: Default-Portion-Logik vereinfachen

- [ ] 9.1 `frontend-food/src/lib/portionDefaults.ts` — `selectSmartDefaultPortion()` zu `selectDefaultPortion()` vereinfachen: gibt `portions[0]` zurück; Fallback-Logik für g-Portion (quantity=100) beibehalten
- [ ] 9.2 Alle Aufrufer von `selectSmartDefaultPortion()` auf neuen Funktionsnamen und vereinfachte Logik anpassen
- [ ] 9.3 `portionDisplay.ts` — Sortierlogik prüfen: statt `is_default first → weight_g not null → priority desc` jetzt einfach Array-Reihenfolge (rank asc vom Backend)

## 10. Frontend: Drag & Drop für Portions-Sortierung

- [ ] 10.1 `@dnd-kit/core` und `@dnd-kit/sortable` als Dependencies hinzufügen (falls nicht vorhanden)
- [ ] 10.2 `PortionList`-Komponente in `IngredientDetailPage.tsx` auf Drag & Drop umbauen: `SortableContext`, `DndContext`, `TouchSensor` + `PointerSensor`
- [ ] 10.3 Optimistic Update nach Drag & Drop implementieren: neue Reihenfolge sofort lokal anzeigen, dann `POST /portions/reorder/` aufrufen
- [ ] 10.4 ▲/▼-Buttons aus der Portions-Liste entfernen
- [ ] 10.5 `g`-System-Portion vom Drag & Drop ausschließen (kein `SortableItem` für g, immer am Ende)
- [ ] 10.6 TanStack Query Hook `useReorderPortions(slug)` für neuen reorder-Endpoint anlegen in `frontend-food/src/api/supplies.ts`

## 11. Frontend: Standard-Badge und UI-Markierung

- [ ] 11.1 „Standard"-Badge-Komponente für rank=1-Portion implementieren (shadcn Badge, Farbe: z.B. blau/grün)
- [ ] 11.2 Zeile der rank=1-Portion in der Portions-Liste hervorheben (leichter farbiger Hintergrund via Tailwind)
- [ ] 11.3 Warn-Banner oder Badge „Packungsgewicht fehlt" anzeigen wenn Packung-System-Portion kein `weight_g` hat

## 12. Frontend: KI-Suggestions-Dialog erweitern

- [ ] 12.1 AI-Suggest-Dialog um `stueck_weight_g`- und `packung_weight_g`-Vorschläge erweitern (als eigene Checkbox-Einträge für die jeweiligen System-Portionen)
- [ ] 12.2 „Apply"-Logik: wenn `stueck_weight_g` akzeptiert → PATCH auf Stück-System-Portion; analog für `packung_weight_g`
- [ ] 12.3 Portions-Vorschläge im Dialog: Duplikat-Erkennung (case-insensitive) — bereits vorhandene Portionen als grayed-out anzeigen

## 13. Tests und Verifikation

- [ ] 13.1 Backend: Portions-Unique-Constraint testen (gleicher Name = 422, case-insensitive = 422, soft-deleted = OK)
- [ ] 13.2 Backend: reorder-Endpoint testen (atomisches Update, g bleibt am Ende)
- [ ] 13.3 Backend: KI-Service testen (Normalportion rank=1, stueck/packung weight_g gesetzt)
- [ ] 13.4 Frontend: Drag & Drop auf Touch-Gerät testen
- [ ] 13.5 Frontend: Standard-Badge erscheint bei rank=1, nicht bei anderen
- [ ] 13.6 End-to-End: Zutat anlegen via ai-create → Normalportion rank=1 vorhanden, Stück/Packung mit Gewicht
- [ ] 13.7 End-to-End: Rezept-Zutat hinzufügen → rank=1-Portion vorausgewählt
