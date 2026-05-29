## 1. Backend: Slug-Lookup prüfen/ermöglichen

- [x] 1.1 Prüfen ob `GET /api/recipes/{slug}/` bereits funktioniert (Backend-Router inspizieren). Falls nicht: Endpunkt hinzufügen der Recipe per Slug auflöst und `RecipeDetailSchema` zurückgibt.
- [x] 1.2 Prüfen ob ein paginierter Listen-Endpunkt `GET /api/recipes/` existiert. Falls nicht: Endpunkt mit Standard-Pagination hinzufügen.

## 2. Frontend: API-Hook für Slug-basiertes Detail

- [x] 2.1 In `frontend/src/api/recipes.ts`: Hook `useRecipeBySlug(slug)` hinzufügen (oder bestehenden `useRecipeDetail` auf Slug umstellen), der `GET /api/recipes/{slug}/` aufruft.
- [x] 2.2 In `frontend/src/api/recipes.ts`: Hook `useRecipeList(page, pageSize)` hinzufügen falls nicht vorhanden.

## 3. Frontend: RecipeDetailPage erstellen

- [x] 3.1 `frontend/src/pages/recipes/RecipeDetailPage.tsx` erstellen: Slug aus URL-Params lesen, `useRecipeBySlug` aufrufen, Loading/Error States.
- [x] 3.2 Desktop-Layout: Content-Bereich (Bild, Titel+Meta, **Zutatenliste (prominent, direkt unter Header)**, Beschreibung, Zubereitung, RecipeHints-Sektion, NutritionContributionPanel, RecipeImprovements, PositiveTraitsBadges) + RecipeSidebar.
- [x] 3.3 Mobile-Layout: Gestapelt mit RecipeHeaderInfo oben, **Zutatenliste prominent unter Header**, RecipeMobileActionBar sticky unten.
- [x] 3.7 Sektion "Gebrochene RecipeHints" erstellen: Filtere Improvements mit `source === "recipe_hint"` und zeige sie in einer eigenen, visuell abgesetzten Sektion (Ampel-Farben je hint_level: error=rot, warn=gelb, info=blau). Titel z.B. "Ernährungs-Hinweise".
- [x] 3.4 Portionen-State verwalten (useState), an PortionScaler und IngredientList durchreichen.
- [x] 3.5 Analyse-Queries einbinden: `useRecipeNutriScore(id)`, `useRecipeImprovements(id)`, `useRecipeNutritionBreakdown(id)` — enabled wenn ID verfügbar.
- [x] 3.6 `EntityLinkContext.Provider value="detail"` um die Seite wrappen.

## 4. Frontend: RecipeListPage erstellen

- [x] 4.1 `frontend/src/pages/recipes/RecipeListPage.tsx` erstellen: Paginierte Card-Grid mit Rezept-Cards (Bild, Titel, NutriScore-Badge, Preis).
- [x] 4.2 "Mehr laden"-Button mit Pagination-State.
- [x] 4.3 `EntityLinkContext.Provider value="list"` um die Seite wrappen, EntityLinks zu Rezept-Detail verwenden.

## 5. Frontend: Routen registrieren

- [x] 5.1 In `frontend/src/App.tsx`: Lazy-Import für `RecipeDetailPage` und `RecipeListPage` hinzufügen.
- [x] 5.2 Routen `/recipes` → `RecipeListPage` und `/recipes/:slug` → `RecipeDetailPage` registrieren.

## 6. Verifikation

- [x] 6.1 Manuell testen: `/recipes` zeigt Liste, `/recipes/apfel-zimt-getrank-20l-2` zeigt Detailseite mit allen Analyse-Panels.
- [x] 6.2 Mobile-View testen (320px, 375px).
- [x] 6.3 TypeScript-Build ohne Fehler (`npm run build`).
