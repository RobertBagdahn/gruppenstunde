# Tasks: recipe-detail-completion

## 1. Sektions-Reihenfolge korrigieren

- [x] 1.1 `RecipeDetailPage.tsx`: Reihenfolge der Sektionen auf Spec ausrichten — Ähnliche Rezepte **vor** ContentLinkSection, ContentLinkSection **vor** Emotionen
- [x] 1.2 Visuell verifizieren: Seite scrollen, Reihenfolge stimmt mit Spec überein

## 2. RecipeUsageInMealPlans

- [x] 2.1 `RecipeUsageInMealPlans.tsx` (NEU) erstellen: zeigt "In X Essensplänen verwendet" wenn `recipe.usage_in_meal_plans_count > 0`; nutzt `bg-card rounded-xl border p-4`, Lucide `CalendarDays`-Icon, kein API-Call nötig
- [x] 2.2 `RecipeDetailPage.tsx`: `<RecipeUsageInMealPlans>` nach Ähnliche Rezepte und vor ContentLinkSection einfügen
- [x] 2.3 Zod-Schema prüfen: `usage_in_meal_plans_count` in `RecipeDetailSchema` vorhanden? Wenn nicht: ergänzen

## 3. Fork-/Versions-Hinweis

- [x] 3.1 `RecipeDetailPage.tsx`: nach Source-URL-Block einen Fork-Hinweis einfügen — `recipe.forked_from` prüfen, wenn gesetzt: "Basiert auf [Titel]" mit Link zu `/recipes/{slug}`; Lucide `GitFork`-Icon; Styling `text-sm text-muted-foreground`
- [x] 3.2 Zod-Schema prüfen: `forked_from` (id + slug + title) in `RecipeDetailSchema` vorhanden? Wenn nicht: ergänzen und Pydantic-Schema im Backend abgleichen

## 4. Histogramme in Analyse-Tabs

- [x] 4.1 `RecipeHistogram.tsx` verstehen: Props, Datenformat, wie `useRecipeTypeStats` eingebunden wird
- [x] 4.2 `PriceTab.tsx`: `RecipeHistogram` für Preis/Portion einbauen, wenn `typeStats?.price_buckets` vorhanden und Count `≥ 10`; `useRecipeTypeStats(recipeType)` Hook übergeben oder direkt in Tab aufrufen
- [x] 4.3 `NutritionTab.tsx`: `RecipeHistogram` für Kalorien/Portion einbauen (≥10 Rezepte)
- [x] 4.4 `NutritionTab.tsx`: `RecipeHistogram` für Protein/Portion einbauen (≥10 Rezepte)
- [x] 4.5 `HealthTab.tsx`: prüfen ob `RecipeNutriScoreDistribution.tsx` die Nutri-Score-Verteilung bereits als Histogramm zeigt; wenn nicht: `RecipeHistogram` ergänzen oder `RecipeNutriScoreDistribution` nutzen
- [x] 4.6 `api/recipes.ts`: `useRecipeTypeStats(recipeType)` Hook vorhanden? Wenn nicht: ergänzen

## 5. Icons: Material Symbols → Lucide

- [x] 5.1 `RecipeSidebar.tsx`: Action-Button-Icons auf Lucide umstellen — `UtensilsCrossed` (Kochen), `Printer` (Drucken), `ShoppingCart` (Einkaufsliste), `Share2` (Teilen), `Copy` (Clonen)
- [x] 5.2 `RecipeMetaCard.tsx`: Grid-Icons auf Lucide umstellen — `UtensilsCrossed` (Kategorie), `User` (Autor), `Clock` (Kochzeit), `Timer` (Vorbereitung), `BarChart2` (Schwierigkeit), `Users` (Altersgruppe), `Eye` (Aufrufe), `Heart` (Likes), `Calendar` (Erstellt)
- [x] 5.3 `RecipeDetailPage.tsx`: Sektions-Header-Icons auf Lucide umstellen — `Smile` (Emotionen), `Sparkles` (Ähnliche Rezepte); `material-symbols-outlined` in `AnalysisSection`-Headern (Zubereitung etc.) dürfen bleiben

## 6. Verifikation

- [x] 6.1 `npm run build` in `frontend-food/` läuft ohne Fehler
- [x] 6.2 Visuell: Sektions-Reihenfolge korrekt (Ähnliche → UsageInMealPlans → ContentLinks → Emotionen → Comments)
- [x] 6.3 Visuell: Fork-Hinweis erscheint bei Rezept mit `forked_from`
- [x] 6.4 Visuell: Histogramme in Preis- und Inhaltsstoffe-Tab (wenn ≥10 Rezepte desselben Typs)
- [x] 6.5 Visuell: Lucide-Icons in Sidebar-Buttons und MetaCard-Grid
- [x] 6.6 `recipe-improvements-empty-state` Tasks 6.1–6.4: manuelle Verifikation im Browser

## Reihenfolge

1 → 2 → 3 → 4 → 5 → 6 (können parallel in 2+3 und 4+5 angegangen werden)
