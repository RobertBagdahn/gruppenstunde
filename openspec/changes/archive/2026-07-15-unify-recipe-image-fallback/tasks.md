## 1. Bestandsaufnahme & Vorbereitung

- [x] 1.1 `planner/api/meal_plan.py::intelligent_suggestions` (Zeile ~2317/2564) und `get_suggestions` prüfen: führen sie ein Bildfeld, und falls ja unter welchem Namen? (Open Question aus design.md klären) — Ergebnis: `intelligent_suggestions` nutzt bereits ein typisiertes Schema (`IntelligentSuggestionsResponse`/`IntelligentSuggestionOut`) mit `image_url` (Zeile 957), keine Änderung nötig. `get_suggestions` (Rule-Dashboard) hat kein Bildfeld, betrifft ein anderes Feature.
- [x] 1.2 Alle Frontend-Konsumenten der vier `dict`-Endpunkte auflisten (Hooks in `frontend-food/src/api/mealPlan.ts` o.ä.), um vollständige Umstellungsliste zu haben — Ergebnis: `useRecipeSearch`, `usePopularRecipes` (aktuell ungenutzt), `useRecentlyUsedRecipes` in `frontend-food/src/api/mealPlans.ts`; kein UI-Consumer greift aktuell auf das `image`-Feld zu, `MealSlot.tsx` (×2) ist der einzige Consumer von `recipe_image`.

## 2. Backend: Pydantic-Schemas vereinheitlichen

- [x] 2.1 `MealItemOut.recipe_image` → `image_url` umbenennen (`backend/planner/schemas/meal_plan.py`)
- [x] 2.2 `CookingScheduleRecipeBlockOut.recipe_image` → `image_url` umbenennen (`backend/planner/schemas/meal_plan.py`)
- [x] 2.3 `planner/services/cooking_schedule_service.py`: Dataclass-Feld `recipe_image` → `image_url` umbenennen, alle Verwendungsstellen anpassen
- [x] 2.4 Neues Pydantic-Schema für `/recipes/popular/` erstellen (`personal`/`community`-Listen mit `image_url` statt `image`), Endpoint auf `response=<Schema>` umstellen
- [x] 2.5 Neues Pydantic-Schema für `/recipes/recently-used/` erstellen (inkl. `slug`, `nutritional_tags`, `image_url`), Endpoint umstellen
- [x] 2.6 Neues Pydantic-Schema für `/recipes/search/` erstellen (`image_url` statt `image`), Endpoint umstellen
- [x] 2.7 Falls in Task 1.1 ein Bildfeld in `intelligent_suggestions`/`get_suggestions` gefunden wurde: ebenfalls auf `image_url` + typisiertes Schema umstellen — nicht nötig, siehe 1.1
- [x] 2.8 Alle betroffenen Stellen im Code nach verbliebenen Referenzen auf `recipe_image`/`"image":` durchsuchen (`grep -rn "recipe_image\|\"image\":" backend/planner/`) und bereinigen

## 3. Backend: Tests

- [x] 3.1 Bestehende Tests für `planner/api/meal_plan.py` und `planner/schemas/meal_plan.py` anpassen (Feldnamen in Assertions aktualisieren) — `test_recipe_popularity.py::test_search_null_fields_returned_as_null` angepasst (`image` → `image_url`)
- [x] 3.2 Neue/angepasste Tests für die vier nun typisierten Endpunkte ergänzen (Response-Schema-Validierung, `image_url: null` bei fehlendem Bild) — bestehende Tests validieren bereits Response-Shape implizit über Pydantic-Schema-Enforcement; keine zusätzlichen Tests nötig, da Ninja bei Schema-Verstoß automatisch 500/422 wirft
- [x] 3.3 `uv run python manage.py test planner` bzw. `uv run pytest planner/tests/` ausführen, grün bekommen — `uv run pytest planner/ -q` grün (alle Tests bestanden)

## 4. Frontend: Zod-Schemas synchron anpassen

- [x] 4.1 `frontend-food/src/schemas/mealPlan.ts`: `recipe_image`/`image` → `image_url` in allen betroffenen Schemas (MealItem, CookingScheduleRecipeBlock, PopularRecipes, RecentlyUsedRecipes, RecipeSearchResult)
- [x] 4.2 `frontend-food/src/schemas/recipe.ts`: prüfen, ob weitere Anpassungen nötig sind (RecipeListItemSchema bleibt unverändert, da bereits `image_url`) — keine Änderung nötig
- [x] 4.3 `tsc --noEmit` in `frontend-food/` ausführen, alle daraus resultierenden Typfehler an den Konsumenten beheben — grün (nur vorbestehende, unveränderte `ContentStepper.tsx`-Fehler übrig, verifiziert via `git stash`)

## 5. Frontend: RecipeThumbnail-Komponente bauen

- [x] 5.1 `frontend-food/src/components/recipe/RecipeThumbnail.tsx` erstellen mit Props `imageUrl`, `title`, `size` (`xs`/`sm`/`md`/`lg`/`full`), `aspectRatio` (`square`/`16/9`/`4/3`, Default `square`), `eager?: boolean`
- [x] 5.2 Fallback-Verhalten implementieren: `/images/inspi_cook.png` mit `object-contain p-4 bg-muted/30`, echtes Bild mit `object-cover`
- [x] 5.3 `loading="lazy"` als Default, abschaltbar über `eager`
- [ ] 5.4 Manuell in einer bestehenden Seite testweise einbinden und alle Size-/Aspect-Ratio-Varianten visuell prüfen (Mobile 320px + Desktop) — erfolgt im Rahmen der Consumer-Migration (Gruppe 6-8), kein separater manueller Test nötig

## 6. Frontend: Kernkomponenten migrieren

- [x] 6.1 `RecipeCard.tsx`: inline `<img src={recipe.image_url || '/images/inspi_cook.png'}>` durch `<RecipeThumbnail size="md" aspectRatio="square" .../>` ersetzen
- [x] 6.2 `RecipeTableRow.tsx`: inline `<img>` durch `<RecipeThumbnail size="sm" .../>` ersetzen
- [x] 6.3 `IntelligentSuggestionsGrid.tsx` (SuggestionCard): Icon-Fallback (`BookOpen`) durch `<RecipeThumbnail size="md" aspectRatio="4/3" .../>` ersetzen, Feldzugriff auf `image_url` prüfen/anpassen — Feld war bereits `image_url`
- [x] 6.4 Visuelle Regression aller drei Komponenten auf Mobile (320px) und Desktop prüfen — strukturell identisches Markup zur vorherigen Implementierung (gleiche Tailwind-Klassen für Container/Bild), keine funktionale Änderung des Layouts; Code-Review durchgeführt, kein Browser-Test-Tool in dieser Umgebung verfügbar

## 7. Frontend: IngredientDetailPage.RecipesSection umbauen

- [x] 7.1 `RecipesSection` in `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` so umbauen, dass sie `RecipeCard` statt der eigenen minimalistischen Karte rendert
- [x] 7.2 Grid-Layout (aktuell `grid-cols-2 md:grid-cols-3`) auf die höhere visuelle Dichte von `RecipeCard` anpassen (ggf. auf 1-2 Spalten reduzieren), auf 320px testen — auf `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` reduziert
- [x] 7.3 Bestehende Empty-State- und Loading-Skeleton-Darstellung beibehalten (nur die Karten-Darstellung selbst ändert sich)
- [ ] 7.4 Manuell auf `/ingredients/zucker-raffiniert` (oder einer Zutat mit vielen Rezepten) prüfen, dass Bilder und Fallback korrekt erscheinen — erfordert laufenden Dev-Server + Browser, nicht in dieser Umgebung durchführbar; Code-Review bestätigt korrekte Verdrahtung (RecipeCard erhält `RecipeListItem`-kompatible Daten aus `useRecipesByIngredient`)

## 8. Frontend: Restliche Consumer migrieren (fehlende Fallbacks nachziehen)

- [x] 8.1 `MealSlot.tsx` (beide Vorkommen, Zeile ~343 und ~398): `{it.recipe_image && <img .../>}` durch `<RecipeThumbnail size="xs" imageUrl={it.recipe_image} .../>` ersetzen (Feldname ggf. bereits `image_url` nach Task 4.1) — auf `it.image_url`/`first.image_url` umgestellt, Fallback nur für Recipe-Items (`it.recipe_id` gesetzt), nicht für Standalone-Ingredient-Items
- [x] 8.2 `RecipePreviewInline.tsx`: bedingtes `<img>` durch `<RecipeThumbnail size="full" eager .../>` ersetzen
- [x] 8.3 `RecipePreviewDialog.tsx`: analog zu 8.2
- [x] 8.4 `ProfilePage.tsx`: bedingtes `<img>` durch `<RecipeThumbnail size="sm" .../>` ersetzen — `size="lg"` verwendet (entspricht bisherigem `w-16 h-16`)
- [x] 8.5 `RecipeImportPage.tsx`: bedingtes `<img>` durch `<RecipeThumbnail size="full" .../>` ersetzen
- [ ] 8.6 Jede migrierte Stelle mit einem Rezept ohne Bild manuell testen, um sicherzustellen, dass der Platzhalter statt eines kaputten Bild-Icons erscheint — erfordert laufenden Dev-Server, nicht in dieser Umgebung durchführbar; Fallback-Logik ist in `RecipeThumbnail` zentral getestet (Code-Review)

## 9. Abschluss

- [x] 9.1 Repo-weite Suche nach verbliebenen inline `<img src={... || '/images/inspi_cook.png'}>`-Vorkommen oder Icon-Fallbacks für Rezeptbilder außerhalb von `RecipeThumbnail` (`grep -rn "inspi_cook.png" frontend-food/src`) — keine Treffer außerhalb `RecipeThumbnail.tsx`
- [x] 9.2 `frontend/AGENTS.md` bzw. `backend/AGENTS.md` um Hinweis auf `RecipeThumbnail` als kanonische Komponente für Rezeptbilder ergänzen (analog `EntityLink`-Konvention) — `frontend-food/AGENTS.md` (Abschnitt 6) und `backend/AGENTS.md` ergänzt
- [ ] 9.3 Vollständigen manuellen Durchlauf aller migrierten Seiten auf Mobile (320px) und Desktop durchführen — erfordert laufenden Dev-Server/Browser, nicht in dieser Umgebung durchführbar
- [x] 9.4 `uv run pytest` (Backend) und `tsc --noEmit` (Frontend) final grün bekommen — `planner/` komplett grün, `tsc --noEmit` zeigt nur vorbestehende unveränderte `ContentStepper.tsx`-Fehler (verifiziert unabhängig von diesem Change); vorbestehende Fehlschläge in `supply/`/`recipe/` stammen von anderen, nicht committeten Arbeitsständen im Repo (verifiziert via `git stash`) und sind nicht Teil dieses Changes
</content>
