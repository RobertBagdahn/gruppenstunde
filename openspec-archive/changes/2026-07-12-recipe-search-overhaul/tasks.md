# Tasks: Recipe Search Overhaul

## 1. Backend: Pydantic-Schema-Änderungen

- [x] 1.1 `RecipeFilterIn` in `backend/recipe/schemas/recipes.py` erweitern: `sort` default von `"newest"` auf `"use_count"`, `origin` von `str | None` auf `list[str] | None`, `difficulty`/`execution_time`/`recipe_type`/`preparation_method` auf `list[str] | None`
- [x] 1.2 Neue Schemas in `backend/recipe/schemas/recipes.py`: `VerifyRequestIn` (`confirm: bool`), `VerifyStatusOut` (`can_verify: bool`, `rules_passed: int`, `rules_total: int`, `warnings: list[dict]`, `missing_fields: list[str]`)
- [x] 1.3 `RECIPE_SORT_OPTIONS` in `frontend-food/src/schemas/recipe.ts` synchronisieren: `use_count` als ersten Eintrag mit Label "Beliebteste", `newest` → "Neueste"
- [x] 1.4 `RECIPE_ORIGIN_OPTIONS` in `frontend-food/src/schemas/recipe.ts` anpassen: "Alle" entfernen, stattdessen drei Checkbox-Werte ohne Radio-Semantik
- [x] 1.5 `RecipeFilterSchema` in `frontend-food/src/schemas/recipe.ts`: `origin` auf `z.array(z.string())`, `difficulty`/`recipe_type`/`execution_time` auf `z.array(z.string())`, neue Felder `preparation_method: z.array(z.string())`, `cost_ranges: z.array(z.string())`
- [x] 1.6 Neue Zod-Schemas in `frontend-food/src/schemas/recipe.ts`: `VerifyRequestSchema`, `VerifyStatusSchema`

## 2. Backend: list_recipes API-Anpassungen

- [x] 2.1 `list_recipes` in `backend/recipe/api/recipes.py`: default `origin` auf `["verified"]` wenn kein Parameter gesendet
- [x] 2.2 `list_recipes`: multi-value `origin`-Filter (OR-Verknüpfung via `Q`-Objekte — verified+community+personal kombiniert)
- [x] 2.3 `list_recipes`: `difficulty`, `execution_time`, `recipe_type`, `preparation_method` auf `list`-Parameter mit `__in`-Lookup umstellen
- [x] 2.4 `list_recipes`: `use_count`-Sortierung implementieren: `order_by("-usage_count", "-created_at")` für `use_count`, 0er-Werte fallen automatisch ans Ende
- [x] 2.5 `list_recipes`: Sort-Map um `"use_count"` erweitern

## 3. Backend: Verification-Endpoints

- [x] 3.1 `recipe/services/verification_service.py` erstellen: `check_verification_readiness(recipe) -> VerificationResult` mit Pflichtfeld-Check (image, description, recipe_items, steps) + Rule-Evaluation aller aktiven Rules
- [x] 3.2 `POST /api/recipes/{id}/verify/` in `backend/recipe/api/recipes.py`: Staff-only, prüft `confirm`-Flag, führt Verification-Check durch, setzt `status="approved"`, erstellt `ApprovalLog`
- [x] 3.3 `GET /api/recipes/{id}/verification-status/` in `backend/recipe/api/recipes.py`: gibt `VerificationResult` zurück (kein Auth-Required für lesenden Zugriff, aber Anzeige im Frontend nur für Owner/Staff)

## 4. Backend: Tests

- [x] 4.1 Tests für `list_recipes` mit default origin=verified, multi-value origin, multi-value difficulty/recipe_type/execution_time/preparation_method
- [x] 4.2 Tests für `use_count`-Sortierung (Rezepte mit unterschiedlichen usage_count-Werten)
- [x] 4.3 Tests für `POST /api/recipes/{id}/verify/` (happy path, mit/ohne Warnings, 403 für non-staff, 404)
- [x] 4.4 Tests für `GET /api/recipes/{id}/verification-status/` (vollständig, mit fehlenden Feldern, mit Rule-Verstößen)
- [x] 4.5 Tests für `verification_service.check_verification_readiness` (alle Pflichtfelder, Rule-Evaluation)

## 5. Frontend: RecipeFilterSidebar neugestalten

- [x] 5.1 `RecipeFilterSidebar.tsx` komplett umbauen: alle Filtergruppen als Checkbox-Gruppen (keine Radio-Buttons mehr)
- [x] 5.2 Neue Filtergruppe "Anzeigen" mit drei Checkboxen: Inspi-verifiziert (default checked), Community-Rezepte, Meine Rezepte
- [x] 5.3 Neue Filtergruppe "Zubereitungsart" mit Checkboxen: Kochen, Backen, Braten, Grillen, Roh
- [x] 5.4 Kosten-Filter von Min/Max-Input auf vordefinierte Preisstufen umbauen: `< 2€`, `2-5€`, `5-10€`, `> 10€`
- [x] 5.5 Filter-Gruppen-Titel anpassen: Typ, Anzeigen, Stufe, Schwierigkeit, Dauer, Zubereitungsart, Kosten
- [x] 5.6 "Zurücksetzen"-Button prominent und immer sichtbar oben in der Sidebar platzieren
- [x] 5.7 Aktive-Filter-Chips überarbeiten für Multi-Select (nicht nur einzelne Werte wie vorher)
- [x] 5.8 Sidebar sticky machen (`position: sticky; top: <header-height>`, `max-height: calc(100vh - <header-height>)`, `overflow-y: auto`)

## 6. Frontend: RecipeListPage überarbeiten

- [x] 6.1 Default-Filter auf `origin: ["verified"]`, `sort: "use_count"` in `DEFAULT_FILTERS` ändern
- [x] 6.2 URL-Parameter-Serialisierung für Array-Filter anpassen (z.B. `origin=verified&origin=community`)
- [x] 6.3 View-Toggle-Button (Kacheln/Tabelle) in die Ergebnis-Kopfzeile einbauen mit localStorage-Persistenz
- [x] 6.4 `RecipeTable`-Komponente erstellen mit Spalten: Bild (48px), Titel, Dauer, Schwierigkeit, Likes, Kosten
- [x] 6.5 Tabellen-Zeilen-Komponente `RecipeTableRow` erstellen mit Klick-Navigation, Draft-Badge, Action-Buttons
- [x] 6.6 Dynamischen Seitentitel implementieren: "Verifizierte Rezepte – Inspi" (default), "Frühstück – Rezepte – Inspi" (mit Filter)
- [x] 6.7 `SearchHighlight`-Komponente erstellen die Suchtext in Titel/Summary hervorhebt
- [ ] 6.8 `FilterBottomSheet`-Komponente für Mobile erstellen (shadcn/ui Sheet, side="bottom")
- [x] 6.9 Skeleton-Loading für beide View-Typen: `RecipeCardSkeleton` (Grid) und `RecipeTableSkeleton` (Table)
- [x] 6.10 Intelligenten Empty-State implementieren mit "Weniger Filter anwenden" CTA und Fallback-Vorschlägen

## 7. Frontend: RecipeCard überarbeiten

- [x] 7.1 Suchtext-Highlighting in RecipeCard integrieren (via `SearchHighlight`-Komponente)
- [x] 7.2 Draft-Erkennung in RecipeCard: wenn `status === "draft"`, "Entwurf"-Badge anzeigen
- [x] 7.3 `RecipeBadge`-Komponente um "Entwurf"-Style erweitern (z.B. grau mit "Entwurf"-Label)
- [x] 7.4 Tabellenansicht im RecipeCard-Skeleton-Styling berücksichtigen (gleiche Dimensionen)

## 8. Frontend: Verification-UI

- [x] 8.1 `VerifyDialog`-Komponente erstellen: zeigt Preview-Ergebnis, Warning-Liste, "Abbrechen"/"Trotzdem verifizieren"-Buttons
- [x] 8.2 `VerificationScore`-Komponente erstellen: Fortschrittsbalken "X/Y Regeln erfüllt", nur sichtbar für Owner und Staff bei nicht-approved Rezepten
- [ ] 8.3 Verify-Button auf Rezept-Detailseite für Staff-User einbauen (nur wenn Status nicht `approved`)
- [x] 8.4 VerificationStatus-Hook `useVerificationStatus(id)` und Verify-Mutation `useVerifyRecipe(id)` in `api/recipes.ts` hinzufügen

## 9. Frontend: API & Query-Hooks

- [x] 9.1 `buildFilterParams` in `api/recipes.ts` für Array-Parameter anpassen (mehrere `append`-Aufrufe)
- [x] 9.2 `useRecipes`-Hook: Default-Parameter auf `{ origin: ["verified"], sort: "use_count" }` setzen
- [x] 9.3 `useVerificationStatus(recipeId)`-Hook: `GET /api/recipes/{id}/verification-status/`
- [x] 9.4 `useVerifyRecipe(recipeId)`-Mutation: `POST /api/recipes/{id}/verify/`, invalidates recipe queries

## 10. Finalisierung

- [ ] 10.1 ESLint/TypeScript-Check im Frontend: `cd frontend-food && npm run lint`
- [ ] 10.2 Backend-Tests ausführen: `cd backend && uv run python manage.py test recipe.tests`
- [ ] 10.3 Manueller Test: Rezeptsuche mit default verified, mit community, mit mine+Drafts, Tabellenansicht, Bottom-Sheet auf Mobile
- [ ] 10.4 Verification-Workflow manuell testen: Staff verifiziert Rezept mit/ohne Warnings
- [ ] 10.5 Skeleton-Loading und View-Toggle-Wechsel testen (Grid → Table während Laden)
