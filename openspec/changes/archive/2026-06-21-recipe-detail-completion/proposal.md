# recipe-detail-completion

## Problem

Der Change `redesign-recipe-detail-v2` wurde am 21. Juni 2026 archiviert. Tasks aus Groups 6–8 (Layout, Histogramme, Advanced Features) wurden fälschlicherweise als abgehakt markiert, ohne implementiert zu werden. Diese Lücken werden jetzt sauber erfasst und umgesetzt.

## Was fehlt (geprüft am 21. Juni 2026)

### Sektions-Reihenfolge
Die aktuelle Reihenfolge in `RecipeDetailPage.tsx` weicht von der Spec ab:
- Zubereitung steht korrekt nach Zutaten, aber `defaultOpen={false}` ist bereits gesetzt ✓
- Emotionen erscheinen **vor** Ähnlichen Rezepten (Spec: Ähnliche → ContentLinks → Emotionen → Comments)
- `ContentLinkSection` erscheint **nach** Emotionen statt davor

### Fehlende Komponenten
- `RecipeUsageInMealPlans.tsx` — "In X Essensplänen verwendet" (Backend-Daten vorhanden: `usage_in_meal_plans_count`)
- Fork-/Versions-Hinweis — "Basiert auf [Originaltitel]" wenn `forked_from` gesetzt

### Histogramme nicht integriert
- `RecipeHistogram.tsx` existiert, ist aber in keinem Tab eingebaut
- `PriceTab.tsx`, `NutritionTab.tsx`, `HealthTab.tsx`: Histogram-Integration fehlt

### Icon-Regel-Verstöße
- `RecipeSidebar.tsx`, `RecipeMetaCard.tsx`, `RecipeDetailPage.tsx` verwenden `material-symbols-outlined` für Action-Buttons
- AGENTS.md schreibt Lucide für alle Standard-UI-Aktionen vor

### Specs mit Widersprüchen bereinigt
- `recipe-detail-page/spec.md` — auf neue Entscheidungen aktualisiert ✓
- `recipe-detail-reorganized/spec.md` — auf neue Entscheidungen aktualisiert ✓

## Entscheidungen (festgelegt 21. Juni 2026)

- **Placeholder**: Kleiner dezenter Placeholder (max-w-xs, 4:3, gestrichelt) — Code korrekt, keine Änderung nötig
- **Sidebar**: Metadaten + PortionScaler + Aktionen — Code korrekt, keine Änderung nötig
- **Zubereitung**: `defaultOpen=false` — bereits korrekt implementiert ✓
- **Unter dem Titel**: Nur Summary — bereits korrekt implementiert ✓
- **Fehlende Komponenten**: `RecipeUsageInMealPlans` prioritär
- **Icons**: Material Symbols → Lucide jetzt umstellen
- **Histogramme**: Integration in Analyse-Tabs umsetzen

## Scope

- Kein Backend-Aufwand (alle Daten sind vorhanden)
- Nur Frontend: `RecipeDetailPage.tsx`, `RecipeSidebar.tsx`, `RecipeMetaCard.tsx`, Tabs, neue Komponenten
- `recipe-improvements-empty-state`: manuelle Verifikation (Tasks 6.1–6.4) separat durchführen
