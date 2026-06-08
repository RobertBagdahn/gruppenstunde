## 1. Backend — Kategorie-Map zentralisieren & dessert hinzufügen

- [x] 1.1 `MEAL_TYPE_TO_RECIPE_TYPES` in `backend/planner/api/meal_plan.py` um `dessert` erweitern
- [x] 1.2 `MEAL_TYPE_TO_RECIPE_TYPES` aus `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` entfernen — Frontend sendet `meal_type`, Backend mappt
- [x] 1.3 Sicherstellen, dass alle drei Endpoints (search, suggestions, popular) die gleiche Map nutzen

## 2. Backend — Mehrstufiger Fallback

- [x] 2.1 Fallback-Logik in `GET /recipes/search/` implementieren: erste Query mit `recipe_type__in=MEAL_TYPE_TO_RECIPE_TYPES[meal_type]`, bei count < limit Rest mit allen Typen auffüllen
- [x] 2.2 Neues Response-Feld `fallback_applied: bool` in Search-Response
- [x] 2.3 Gleiche Fallback-Logik in `GET /recipes/suggestions/` prüfen und harmonisieren

## 3. Backend — Rezept-Ampel (recipe_badge)

- [x] 3.1 `resolve_recipe_badge(recipe, user)` als Utility-Funktion in `backend/recipe/services/` extrahieren
- [x] 3.2 `recipe_badge`-Feld zur RecipeSearchResponse und RecipeSuggestionOut hinzufügen
- [x] 3.3 Ampel in search, suggestions, popular Responses ausliefern

## 4. Backend — Preis pro Portion

- [x] 4.1 `price_per_serving` im Backend berechnen (`cached_price_total / servings`, null wenn eines fehlt)
- [x] 4.2 Feld in Search-, Suggestions- und Popular-Responses ausliefern

## 5. Backend — Zweistufiges Ranking

- [x] 5.1 Sortierung in allen drei Endpoints auf `ORDER BY usage_count DESC, cached_price_total ASC NULLS LAST` ändern
- [x] 5.2 Sicherstellen, dass Fallback-Logik die Sortierung respektiert

## 6. Backend — Harter Diät-Filter (AND)

- [x] 6.1 Query-Parameter `require_nutritional_tags: bool` (default `true`) zu Search- und Suggestions-Endpoints
- [x] 6.2 AND-Filter implementieren: `for tag_id in nutritional_tag_ids: qs = qs.filter(nutritional_tags__id=tag_id)`
- [x] 6.3 Alte `exclude_nutritional_tag_ids`-Logik entfernen

## 7. Backend — Eigene Drafts einschließen

- [x] 7.1 Filter in `GET /recipes/search/` von `status="approved"` auf `Q(status="approved") | Q(owner=request.user)` ändern
- [x] 7.2 Gleiche Änderung für `GET /recipes/suggestions/` und `GET /recipes/popular/`
- [x] 7.3 Sicherstellen, dass Drafts anderer Nutzer NIE erscheinen

## 8. Backend — "Rezept vorschlagen" (Zufällig)

- [x] 8.1 Query-Parameter `random=true` zum Suggestions-Endpoint hinzufügen
- [x] 8.2 Bei `random=true`: Top-20 nach Ranking laden, `random.choice()` — Filter respektieren
- [x] 8.3 Response ist einzelnes RecipeSuggestionOut (nicht Array)

## 9. Backend — "Kürzlich verwendet" Endpoint

- [x] 9.1 Neuen Endpoint `GET /recipes/recently-used/` mit `limit=5`
- [x] 9.2 Query: `MealItem.objects.filter(meal__meal_plan__created_by=user).order_by('-id').values('recipe_id').distinct()[:limit]` — plan-übergreifend
- [x] 9.3 Response mit Ampel, Preis, recipe_type (gleiches Format wie Search-Results)

## 10. Backend — Pydantic Schemas aktualisieren

- [x] 10.1 `RecipeSearchOut` um `recipe_badge`, `price_per_serving`, `fallback_applied` erweitern
- [x] 10.2 `RecipeSuggestionOut` um `recipe_badge`, `price_per_serving`, `recipe_type` erweitern
- [x] 10.3 `RecipePopularItem` um `recipe_badge`, `price_per_serving` erweitern
- [x] 10.4 Neues Schema für Recently-Used Response

## 11. Frontend — Zod Schemas synchronisieren

- [x] 11.1 `RecipeSearchResultSchema` um `recipe_badge`, `price_per_serving` erweitern
- [x] 11.2 `RecipeSuggestionSchema` um `recipe_badge`, `price_per_serving`, `recipe_type` erweitern
- [x] 11.3 `RecipePopularItemSchema` um `recipe_badge`, `price_per_serving` erweitern
- [x] 11.4 `UnifiedSearchResponseSchema` um `fallback_applied` erweitern
- [x] 11.5 Neues Zod-Schema für Recently-Used Response
- [x] 11.6 `MEAL_TYPE_TO_RECIPE_TYPES`-Konstante aus dem Frontend entfernen

## 12. Frontend — API Hooks

- [x] 12.1 `useRecipeSearch` um `meal_type`-Parameter erweitern (statt `recipe_type` direkt zu setzen)
- [x] 12.2 `useRecipeSearch` um `require_nutritional_tags`-Parameter erweitern
- [x] 12.3 `useRecipeSuggestions` um `require_nutritional_tags`-Parameter erweitern
- [x] 12.4 `usePopularRecipes` Response-Typ aktualisieren
- [x] 12.5 Neuen Hook `useRecentlyUsedRecipes` erstellen
- [x] 12.6 Neuen Hook `useRandomRecipeSuggestion` erstellen

## 13. Frontend — RecipeBadge Komponente

- [x] 13.1 `RecipeBadge.tsx` in `components/recipe/` erstellen: farbiger Punkt + Label + Tooltip
- [x] 13.2 Props: `badge: "verified" | "community" | "draft"`, optional `showLabel: boolean`

## 14. Frontend — RecipeSearchCard Komponente

- [x] 14.1 `RecipeSearchCard.tsx` in `components/recipe/` erstellen: Card mit Ampel, Titel, Diät-Badges, Preis, Usage Count
- [x] 14.2 Mobile-optimiert (min 320px)

## 15. Frontend — CategoryPills Komponente

- [x] 15.1 `CategoryPills.tsx` in `components/recipe/` erstellen: horizontale scrollbare Pills
- [x] 15.2 Props: `selected`, `onChange`, `mealType` (für Default-Auswahl)
- [x] 15.3 Mobile: `overflow-x-auto` mit versteckter Scrollbar

## 16. Frontend — RecentlyUsedSection Komponente

- [x] 16.1 `RecentlyUsedSection.tsx` in `components/recipe/` erstellen
- [x] 16.2 Nutzt `useRecentlyUsedRecipes`, rendert kompakte Cards
- [x] 16.3 Leerer State: Section ausblenden

## 17. Frontend — RecipeSearchDialog umbauen

- [x] 17.1 `MEAL_TYPE_TO_RECIPE_TYPES`-Import entfernen, stattdessen `mealType` an Backend senden
- [x] 17.2 Select-Dropdown durch `CategoryPills` ersetzen
- [x] 17.3 Ergebnisliste auf `RecipeSearchCard` umstellen
- [x] 17.4 Allergen-Ausschluss-Checkbox durch "Nur [Diät-Tags]"-Checkbox ersetzen
- [x] 17.5 Fallback-Hinweis anzeigen wenn `fallback_applied === true`
- [x] 17.6 "Kürzlich verwendet"-Section oberhalb der Ergebnisliste einbauen
- [x] 17.7 Empty State: "Keine Ergebnisse" + Link "→ Neues Rezept erstellen"
- [x] 17.8 Popular-Section mit neuen Feldern (Ampel + Preis) aufwerten
- [x] 17.9 `nutritionalTagIds` als initiale `require_nutritional_tags` nutzen

## 18. Frontend — MealSlot umbauen

- [x] 18.1 Prominenten CTA-Button "Rezept wählen" im leeren MealSlot rendern
- [x] 18.2 "Noch kein Rezept zugeordnet"-Text anklickbar machen → öffnet Dialog
- [x] 18.3 "Rezept vorschlagen"-Button: `useRandomRecipeSuggestion` → RecipePreviewDialog → bestätigen
- [x] 18.4 Inline-Such-Ergebnisse mit Ampel-Punkt und Preis aufwerten
- [x] 18.5 Inline-Suche: `require_nutritional_tags` aus Plan-Tags ableiten
- [x] 18.6 Inline-Suche: Fallback-Hinweis wenn keine Ergebnisse
- [x] 18.7 Alle Änderungen nur bei `canEdit && !meal.is_synced && !meal.is_external`

## 19. Frontend — Integration & Qualität

- [x] 19.1 TypeScript strict: kein `any`
- [x] 19.2 Mobile-Test: 320px, Dialog, Pills scrollen
- [x] 19.3 Design-System: keine hartcodierten Farben, HSL-Tokens
- [x] 19.4 Keine `console.log` Statements
- [x] 19.5 Lint & Typecheck laufen lassen

## 20. Backend — Tests

- [x] 20.1 Test: dessert in MEAL_TYPE_TO_RECIPE_TYPES
- [x] 20.2 Test: Fallback liefert Ergebnisse über alle recipe_types
- [x] 20.3 Test: recipe_badge korrekt für verified, community, draft
- [x] 20.4 Test: price_per_serving Berechnung
- [x] 20.5 Test: Ranking usage_count DESC, price ASC NULLS LAST
- [x] 20.6 Test: AND-Filter für nutritional_tags (vegan+glutenfrei)
- [x] 20.7 Test: require_nutritional_tags=false zeigt alle Rezepte
- [x] 20.8 Test: Eigene Drafts sichtbar, fremde nicht
- [x] 20.9 Test: Random Suggestion respektiert Filter
- [x] 20.10 Test: Recently Used liefert nur eigene Rezepte
