## 1. Backend: Model und Migration

- [x] 1.1 `backend/supply/choices.py`: `IngredientStatusChoices` auf `DRAFT`, `VERIFIED` reduzieren
- [x] 1.2 `backend/supply/models/ingredient.py`: Visibility-Choice `public` ergänzen; CheckConstraints `ingredient_status_valid` und `ingredient_public_requires_verified`
- [x] 1.3 Migration: `AlterField` → `RunPython` (jeder Status ≠ `verified` → `draft`; Reverse setzt `public` → `private`) → `AddConstraint` ×2
- [x] 1.4 Migrationstests: `approved`/`user_content` werden `draft`, nichts wird gelöscht; ungültiger Status und `public`+`draft` werfen `IntegrityError`

## 2. Backend: Schemas (Pydantic)

- [x] 2.1 `backend/supply/schemas/ingredients.py`: `status` als `Literal["draft", "verified"]` in allen Ingredient-Aus- und -Eingaben; Ausgabe-`visibility` auf `Literal["private", "shared", "public"]`; Eingabe-`visibility` bleibt `private`/`shared`
- [x] 2.2 `can_verify: bool` in Detail- und Listenausgabe
- [x] 2.3 Tests: `status: "approved"` → 422; `visibility: "public"` im PATCH → 422

## 3. Backend: Sichtbarkeit und Rechte

- [x] 3.1 `backend/content/services/food_access.py`: `_ingredient_public_q()` und `_ingredient_is_public()`; `visible_ingredient_queryset`, `public_ingredient_queryset` und `can_read` (Zutaten-Zweig) darauf umstellen; alle Zutaten-Bezüge auf `approved` entfernen
- [x] 3.2 `matchable_ingredient_queryset(user)` in `food_access` (sichtbar ∪ System-Entwürfe)
- [x] 3.3 `backend/supply/api/ingredients.py`: `_can_edit_ingredient`/`_can_edit_portions` durch `food_access.can_edit` ersetzen (Portion, Package, Alias)
- [x] 3.4 `backend/supply/services/ingredient_status.py`: `set_ingredient_status()` (Staff-Prüfung, Visibility-Folge, `save(update_fields)`); `PATCH /api/ingredients/{slug}/` nutzt ihn, Nicht-Staff mit Status → 403
- [x] 3.5 Tote Helfer entfernen (`supply/api/ingredients.py:201–280`, `recipe/api/recipes.py:128–217`) und Debug-Endpunkt (`supply/api/breakfast_catalog.py:21`)
- [x] 3.6 Matrix-Test: `can_read` == Queryset für anonym, Creator, Owner, Fremder, Gruppenmitglied, Staff × draft/verified × private/shared/public
- [x] 3.7 Tests: anonym liest verified (200) und System-Entwurf (404); Creator findet eigenen Entwurf in der Suche; Owner kann verifizierte Zutat nicht bearbeiten (403, auch Portion/Package/Alias); Staff verifiziert Nutzer-Zutat → `public`; Zurücksetzen → `private`; Debug-Pfad 404

## 4. Backend: Erzeugungspfade und Matcher

- [x] 4.1 `created_by` und `IngredientStatusChoices.DRAFT` setzen in `recipe/api/recipes.py:775`, `recipe/api/items.py:726`, `recipe/services/ai_ingredients_service.py:302`, `recipe/services/url_import_service.py:377, 1183`, `recipe/services/recipe_ai_suggest_service.py:437`, `supply/services/ingredient_ai_suggest_service.py:349`, `recipe/management/commands/import_cooklang.py:540` (Nutzer ggf. als Parameter durchreichen)
- [x] 4.2 `recipe/services/ingredient_matcher.py`: `user`-Parameter; alle Kandidaten-Abfragen (Zeilen 259, 266, 397, 486, 585) über `matchable_ingredient_queryset`; Aufrufer (Review-Preview, URL-Import, Cooklang) anpassen
- [x] 4.3 `content/admin_api.py`: Nutzer-Inhalte über Owner/Creator statt Status — geprüft: `admin_user_detail` filtert bereits über `created_by=user`, keine Änderung nötig
- [x] 4.4 Tests: Rezept-Import setzt `created_by`; Matcher schlägt keine private fremde Zutat vor; Matcher schlägt System-Entwurf vor; Cooklang legt `draft` an; MealItem mit fremder privater Zutat → 404, mit System-Entwurf → OK

## 5. Backend: Tests auf das neue Modell umstellen

- [x] 5.1 30 Zutaten-Anlagen mit `approved`/`user_content` in 16 Dateien auf `verified` bzw. `draft` umstellen (Liste im Proposal-Impact)
- [x] 5.2 `supply/tests/test_api.py:363–430` und ähnliche Tests, die Nicht-Staff-Änderungen an approved-Zutaten erwarten: auf Owner-Entwurf umstellen oder 403 erwarten
- [x] 5.3 `supply/tests/test_breakfast_wizard_visibility.py`: Tests der entfernten Helfer löschen, Katalog-Tests behalten
- [x] 5.4 grep über `backend/` (inkl. `backend/data/`, Seeds) nach `"user_content"` und Zutaten-`"approved"`: 0 Treffer

## 6. Backend: Verifizierungs-Befehl

- [x] 6.1 `supply/management/commands/verify_ingredients_in_approved_recipes.py`: Trockenlauf (Anzahl, Lückenliste kcal/Preis/Abteilung), `--apply`, `--csv`; Nutzer-Zutaten nur berichten; nutzt `set_ingredient_status`
- [x] 6.2 Tests: Trockenlauf ohne Änderung; `--apply` verifiziert mit Audit-Eintrag je Zutat; zweiter Lauf 0; Nutzer-Zutat bleibt Entwurf

## 7. Frontend (frontend-food)

- [x] 7.1 `src/schemas/supply.ts`: `IngredientStatusSchema = z.enum(['draft', 'verified'])`, Visibility-Enum `['private', 'shared', 'public']`, `can_verify: z.boolean()`
- [x] 7.2 `src/lib/ingredientStatus.ts`: `INGREDIENT_STATUS_OPTIONS` (Entwurf, Verifiziert)
- [x] 7.3 `CreateIngredientPage.tsx`: Statusauswahl entfernen (Backend legt immer Entwürfe an)
- [x] 7.4 `IngredientEditPage.tsx`, `IngredientDetailPage.tsx`: gemeinsame Optionen; Status-Auswahl und „Verifizieren“ nur bei `can_verify` statt `user.is_staff`
- [x] 7.5 `components/recipe/RecipeSearchCard.tsx`: Badge-Mapping nur `verified`/`draft`
- [x] 7.6 Vitest: UI blendet Verifizieren bei `can_verify: false` aus; Schema lehnt `approved` ab; bestehende Tests `IngredientEditPage.test.tsx` anpassen

## 8. Prüfung und Daten

- [x] 8.1 `uv run pytest` (gesamt: ~2600 Tests grün), in `frontend-food`: `npm run test` (481 grün), `npx tsc -b --noEmit` (sauber), `npm run lint` (sauber)
- [x] 8.2 Lokal `uv run python manage.py migrate`; Befehl im Trockenlauf (469 betroffen, 35 ohne kcal, 7 ohne Preis, 0 ohne Abteilung) — Lückenliste siehe unten
- [x] 8.3 Lokal `--apply` ausgeführt (469 verifiziert, danach 0 verbleibend); Browser-Stichprobe bestätigt: anonym „Kidneybohnen aus der Dose“ → 200/`verified`, Frühstückskatalog zeigt alle 8 Margarinen für Nicht-Staff
- [ ] 8.4 **Prod nur mit deiner Freigabe**: Deploy (Migration), Trockenlauf zeigen, `--apply` erst nach OK — noch offen, siehe Hinweis unten
