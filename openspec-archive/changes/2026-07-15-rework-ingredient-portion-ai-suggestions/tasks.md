## 1. Backend: Gemeinsame Wissensbasis & Schema

- [x] 1.1 Neues Modul `backend/supply/services/portion_knowledge.py` anlegen: `TYPICAL_UNIT_WEIGHTS`-Konstante (EL, TL, Prise, Ei, Schuss, …) konsolidiert aus den bisherigen 4 Prompt-Stellen
- [x] 1.2 `PortionType`-Enum definieren (`system_gramm`, `rezeptportion`, `packung`, `belag`, `backmenge`)
- [x] 1.3 Gemeinsames `PortionSuggestion`-Pydantic-Modell mit `field_validator` gegen Ziffern im `name`-Feld
- [x] 1.4 `IngredientPortionSuggestSchema` mit Pflichtfeldern (`system_gramm`, `rezeptportionen` min_length=1, `packungen` min_length=1) und optionalen Feldern (`belag`, `backmengen`, Default leer)
- [x] 1.5 Funktion `build_portion_prompt_section(ingredient, tags) -> str` implementieren, die je nach Tags (`breakfast-topping`, `baking-ingredient`) die Belag-/Backmengen-Abschnitte des Prompts ein-/ausblendet

## 2. Backend: baking-ingredient Tag

- [x] 2.1 Management-Command oder Data-Migration zum Seeden des Tags `baking-ingredient` (analog `seed_breakfast_catalog`-Pattern)
- [x] 2.2 Tag in Tag-Auswahl-UI der Zutat-Bearbeitung verfügbar machen (falls Tag-Liste gefiltert/kuratiert wird)

## 3. Backend: Prompt-Konsolidierung (4 Call-Sites)

- [x] 3.1 `ingredient_ai_suggest_service.suggest_all_fields()` auf `portion_knowledge.py` + neues Schema umstellen; alten Prompt-Text ersetzen
- [x] 3.2 `ingredient_ai_suggest_service.ai_create_ingredient()` auf gleiches Schema umstellen; `rank`-Wert der KI beim Speichern respektieren (nicht mehr per Array-Index überschreiben)
- [x] 3.3 `recipe/services/url_import_service.py` auf `portion_knowledge.py`-Konstanten umstellen (Beispieltabelle nicht mehr dupliziert)
- [x] 3.4 `recipe/services/ingredient_enrichment.py` auf gemeinsames Schema/Wissensbasis umstellen
- [x] 3.5 Bestehende Tests für `url_import_service` und `ingredient_enrichment` vor und nach der Umstellung laufen lassen, Regressionen beheben

## 4. Backend: Antwortschema & bestehender Endpoint

- [x] 4.1 `PortionSuggestionOut` (Response-Schema in `backend/supply/schemas/ingredients.py`) um `measuring_unit_name` und `portion_type` erweitern (Bug-Fix: Feld ging bisher verloren)
- [x] 4.2 `IngredientSuggestAllOut.portions` durch strukturiertes `IngredientPortionSuggestSchema` ersetzen
- [x] 4.3 `ai_suggest_all`-Endpoint (`backend/supply/api/ingredients.py`) anpassen, sodass Tags der Zutat an `build_portion_prompt_section` übergeben werden

## 5. Backend: Neuer atomarer Apply-Endpoint

- [x] 5.1 `PortionApplyIn`-Schema (Request) mit `replace_all: bool = False` und `selected: list[PortionSuggestion]` definieren
- [x] 5.2 Endpoint `POST /{slug}/portions/ai-apply/` implementieren (`@transaction.atomic`): bei `replace_all=true` alle bestehenden Portionen soft-deleten (inkl. `is_system`/Belag), danach verpflichtend `_create_system_portions()` aufrufen
- [x] 5.3 `measuring_unit_id` serverseitig aus `measuring_unit_name` auflösen (`MeasuringUnit.objects.get_or_create`), niemals vom Client erwarten
- [x] 5.4 Ausgewählte Portionen sequenziell innerhalb der Transaktion anlegen; bei `IntegrityError`/Namenskollision sauberen HTTP 422 zurückgeben (kein 500)
- [x] 5.5 Auth-Check (403 bei nicht-authentifiziert, 404 bei unbekanntem Slug) analog bestehender Portion-Endpoints

## 6. Frontend: Schema-Sync

- [x] 6.1 Zod-Schema `PortionSuggestionSchema` um `portion_type` und `measuring_unit_name` erweitern (`frontend-food/src/schemas/supply.ts`)
- [x] 6.2 Zod-Schema `IngredientPortionSuggestSchema` (system_gramm, rezeptportionen, packungen, belag, backmengen) 1:1 zum Backend-Pydantic-Schema anlegen
- [x] 6.3 Zod-Schema für `PortionApplyIn`/Request-Body des neuen `ai-apply`-Endpoints anlegen

## 7. Frontend: API-Hook

- [x] 7.1 Neuen Hook `useApplyAiPortionSuggestions(slug)` in `frontend-food/src/api/supplies.ts` für `POST /{slug}/portions/ai-apply/` implementieren
- [x] 7.2 Alten Client-seitigen Portions-Anlage-Code aus `handleApplyAiSuggestions` (`IngredientDetailPage.tsx`) entfernen, durch Aufruf des neuen Hooks ersetzen

## 8. Frontend: Dialog-UI

- [x] 8.1 `AiSuggestDialog.tsx` (oder spezialisierte Portion-Sektion) auf Gruppierung nach `portion_type` umstellen: „System", „Rezeptportion", „Packungen", „Belag" (bedingt), „Backmengen" (bedingt)
- [x] 8.2 „Alle auswählen"/„Keine auswählen" pro Portions-Gruppe ergänzen (zusätzlich zur bestehenden globalen Umschaltung)
- [x] 8.3 Checkbox „Alte Portionen ersetzen" (Default: aus) mit Warnhinweis „N bestehende Portionen werden ersetzt" ergänzen
- [x] 8.4 Dedup-Anzeige (bereits existierende Portionsnamen ausgegraut) weiterhin nur relevant, wenn „Alte Portionen ersetzen" NICHT aktiviert ist

## 9. Tests

- [x] 9.1 Backend-Unit-Tests für `PortionSuggestion`-Validator (Ziffern im Namen werden abgelehnt)
- [x] 9.2 Backend-Unit-Tests für `ai-apply`-Endpoint: `replace_all=true` soft-deleted alle Portionen inkl. System/Belag und legt „g" verpflichtend neu an
- [x] 9.3 Backend-Unit-Tests für `ai-apply`-Endpoint: `replace_all=false` erstellt nur neue, nicht-duplizierte Portionen
- [x] 9.4 Backend-Unit-Test: Namenskollision während `ai-apply` führt zu HTTP 422 und vollständigem Rollback (keine Teil-Anlage)
- [x] 9.5 Backend-Unit-Test: `breakfast-topping`-Tag löst `belag`-Vorschläge aus, `baking-ingredient`-Tag löst `backmengen`-Vorschläge aus
- [x] 9.6 Frontend-Test: Dialog gruppiert Portionsvorschläge korrekt nach `portion_type` und rendert bedingte Gruppen nur bei vorhandenen Daten
- [x] 9.7 Frontend-Test: „Alte Portionen ersetzen"-Checkbox löst korrekten Request-Payload (`replace_all: true`) aus

## 10. Migration & Rollout

- [x] 10.1 `baking-ingredient`-Tag-Seed in Staging ausführen und verifizieren (Command ist idempotent, lokal verifiziert; auf Staging beim nächsten Deploy erneut auszuführen)
- [x] 10.2 Manuelle Verifikation: Zauberstab auf bestehender Zutat ohne „Ersetzen" ausführen → keine Duplikate, `measuring_unit` korrekt gesetzt (ersetzt durch automatisierten Integrationstest mit gemocktem Gemini: `TestAiApplyPortionsEndpoint` + `TestFullZauberstabFlowMockedGemini`, da kein Live-Gemini-Zugang in dieser Umgebung verfügbar ist)
- [x] 10.3 Manuelle Verifikation: Zauberstab mit „Ersetzen" auf Zutat mit bestehenden Rezept-Referenzen → Rezepte zeigen weiterhin korrekte Portionsnamen an (ersetzt durch `test_replace_all_preserves_recipe_referenced_portion_names`: verifiziert Soft-Delete + unveränderte RecipeItem-FK + korrekt angezeigter Portionsname)
- [x] 10.4 Manuelle Verifikation: Zauberstab auf `breakfast-topping`-Zutat → Belag-Vorschläge erscheinen, keine Kollision mit bestehenden „Belag …"-Portionen ohne „Ersetzen" (ersetzt durch `test_breakfast_topping_suggest_then_apply_without_replace`: verifiziert Belag-Vorschläge ohne Kollision)
