# Design: recipe-detail-completion

## Entscheidungen

### 1. Sektions-Reihenfolge korrigieren
Spec-konforme Reihenfolge (aus `recipe-detail-page/spec.md`):
1. Breadcrumb
2. Titel + Summary + Bearbeiten/Löschen
3. Source-URL
4. Bild/Placeholder
5. Modifikations-Banner (wenn dirty)
6. RecipeMetaCard (nur mobile, `lg:hidden`)
7. Zutaten
8. Zubereitung (defaultOpen=false)
9. Themen-Tags
10. Analyse-Tabs
11. Rezeptregeln
12. Ähnliche Rezepte
13. RecipeUsageInMealPlans (neu)
14. ContentLinkSection
15. Emotionen
16. Comments

Aktuelle Abweichungen: Emotionen vor Ähnliche, ContentLinkSection nach Emotionen.

### 2. RecipeUsageInMealPlans
Einfache Anzeigekomponente — kein API-Call nötig, Daten kommen aus `recipe.usage_in_meal_plans_count` (bereits in `RecipeDetailOut`). Nur anzeigen wenn `> 0`. Kein Link zu einzelnen Plänen nötig in erster Version (Zähler reicht).

### 3. Fork-Hinweis
Inline in `RecipeDetailPage.tsx` unter dem Titel-Block. Bedingung: `recipe.forked_from !== null`. Link zu `/recipes/{forked_from.slug}` wenn vorhanden.

### 4. Histogramme in Tabs
`RecipeHistogram.tsx` nutzt `useRecipeTypeStats(recipe.recipe_type)`. Integration:
- `PriceTab`: Preis/Portion Histogramm, wenn `typeStats?.price_buckets` vorhanden und `≥10` Rezepte
- `NutritionTab`: Kalorien/Portion + Protein/Portion Histogramme
- `HealthTab`: Nutri-Score-Verteilung (bereits `RecipeNutriScoreDistribution.tsx` vorhanden — prüfen ob Histogramm-Variante nötig)

### 5. Icons: Material Symbols → Lucide
Nur in den betroffenen Komponenten der Detailseite:
- `RecipeSidebar.tsx`: Action-Buttons (Kochen, Drucken, Einkaufsliste, Teilen, Clonen)
- `RecipeMetaCard.tsx`: Grid-Icons (schedule, person, etc.)
- `RecipeDetailPage.tsx`: Inline-Icons in Sektions-Headern (mood, auto_awesome, etc.)

Illustrative Icons (große Sektions-Icons in `AnalysisSection`) dürfen Material Symbols bleiben.
