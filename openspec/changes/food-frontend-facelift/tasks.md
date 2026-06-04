# Implementation Tasks

> Rein Frontend (`frontend-food/`). Kein Backend, keine Pydantic/Zod/Migrationen. Phasiert — jede Phase ist eigenständig auslieferbar.

## 1. Phase A — Design-Fundament (Token, Typo, Config)

- [x] 1.1 Audit: hartcodierte Farb-Utilities (`emerald-*`, `blue-*`, `gray-*`, `green-*`, `red-*` etc.) und Gradient-Utilities im gesamten `frontend-food/src/` auflisten und Mapping-Tabelle auf Token erstellen
- [x] 1.2 Grün-basierte Palette festlegen (Primär-Hue/Sat/Lightness, Sekundär, Akzent, `--chart-1..5`, Warning/Critical) — Light Mode
- [x] 1.3 `frontend-food/src/index.css`: CSS-Variablen (`--primary`, `--secondary`, `--accent`, `--muted`, `--border`, `--ring`, `--card`, `--chart-*`, `--radius`) auf neue Token setzen
- [x] 1.4 Kontrast-/Border-Token schärfen: `--border` deutlich sichtbar, `--muted-foreground` mit ausreichendem Kontrast, klare `--card`/`--background`-Trennung
- [x] 1.5 Display-Font + Body-Font wählen (z.B. Plus Jakarta Sans / Geist) und in `frontend-food/index.html` mit `display=swap` einbinden; alte `Source Sans 3`-Einbindung ersetzen/ergänzen; `theme-color`-Meta auf neue Leitfarbe
- [x] 1.6 `frontend-food/tailwind.config.ts`: `fontFamily.sans` + `fontFamily.display` setzen; `inspi`-Farbpalette an neue Token anpassen/entfernen; Schatten-Set auf kuratiertes Minimum reduzieren; Radius/Keyframes prüfen
- [x] 1.7 `frontend-food/src/index.css`: Gradient-Utilities auf kuratiertes Set reduzieren; `bg-dots-pattern`/`gradient-rainbow` u.ä. entfernen oder gezielt beschränken; Heading-Regel auf Display-Schrift setzen
- [x] 1.8 Verifizieren: App startet (`npm run dev`), kein Layout-Bruch im Grundgerüst, Print-Styles unverändert funktionsfähig

## 2. Phase B — Shared-Komponenten & Styleguide

- [x] 2.1 shadcn `ui`-Basiskomponenten (Button, Badge, Card, Tabs) auf neue Token/Varianten feinschleifen (clean Look, klare Borders)
- [x] 2.2 Neue Shared-Komponente Card-Tabelle (`frontend-food/src/components/shared/CardTable.tsx` + `DataCardRow`) bauen: Card-Zeilen mit Border, Schatten, Abständen, mobil ab 320px lesbar
- [x] 2.3 `ListPageHero`, `ListPageSearchBar`, `Pagination`, `EmptyState` auf neues Token-System + Display-Schrift umstellen (Hellgrau-Flächen ersetzen)
- [x] 2.4 Icon-Regel umsetzen/dokumentieren: Lucide = Standard-UI/Aktion, Material Symbols = illustrative Ausnahmen
- [x] 2.5 `frontend-food/src/pages/StyleguidePage.tsx` erstellen: Sektionen Farben/Token, Typo-Scale, Buttons/Badges, Cards, Card-Tabelle, Icon-Regel, Empty/Loading-States
- [x] 2.6 Route `/styleguide` in `frontend-food/src/App.tsx` registrieren
- [x] 2.7 Styleguide visuell abnehmen; finale Display-Font und Primär-Grünton kalibrieren

## 3. Phase C — Seiten-Rollout: Home & Rezepte

- [x] 3.1 `pages/HomePage.tsx` auf neues Token-System, Display-Schrift und reduzierte Gradients/Animationen umstellen
- [ ] 3.2 `pages/recipes/RecipeListPage.tsx` + `MyRecipesPage.tsx`: Card-Pattern für Item-Karten, neuer Hero/Such-Container
- [ ] 3.3 `pages/recipes/RecipeDetailPage.tsx` + `RecipeCookingMode.tsx`: Token, Typo, klare Flächen
- [ ] 3.4 `pages/recipes/CreateRecipePage.tsx` / `EditRecipePage.tsx` / `RecipeImportPage.tsx`: Formular-Flächen auf Token/Borders
- [ ] 3.5 Komponenten `components/ingredient/IngredientCard.tsx`, `components/supply/IngredientList.tsx` auf Card-Pattern/Token

## 4. Phase C — Seiten-Rollout: Zutaten & Tabellen

- [ ] 4.1 `pages/ingredients/IngredientListPage.tsx` (+ `IngredientFilterSidebar.tsx`): Card-Pattern, Filter-Sidebar auf Token
- [ ] 4.2 `pages/ingredients/IngredientDetailPage.tsx` / `IngredientCreatePage.tsx`: Token/Typo
- [ ] 4.3 `pages/planning/TableView.tsx`: auf Card-basierte Tabellen-Zeilen (`CardTable`) migrieren, semantische Token-Farben
- [ ] 4.4 `pages/planning/CostDashboard.tsx`: Card-Zeilen, Warning/Critical-Token, `recharts`-Farben aus `--chart-*`
- [ ] 4.5 `pages/planning/MealEventDetailPage.tsx` / `MealEventListPage.tsx`: Token, Card-Pattern, Display-Schrift

## 5. Phase C — Seiten-Rollout: Shopping, Admin, Tools, Charts

- [ ] 5.1 `pages/shopping/ShoppingListPage.tsx` + `ShoppingListDetailPage.tsx`: Card-Pattern, Token, Print-Styles verifizieren
- [ ] 5.2 `pages/admin/*` (AdminPage, ApprovalTab, RuleTab, NutritionalTagTab, RetailSectionTab) + `components/admin/*`: Token/Borders, lesbare Tabellen
- [ ] 5.3 `pages/tools/*` (MealEventLandingPage, NormPortionSimulatorPage) + `components/ToolLandingPage.tsx`: Token, reduzierte Gradients
- [ ] 5.4 `components/charts/*` (NutritionPieChart, NutrientBalanceChart) + `components/suggestions/*` + `components/shared/SollIstBar.tsx`: Farben aus `--chart-*`/Token
- [ ] 5.5 `pages/LoginPage.tsx` / `RegisterPage.tsx`: Token/Typo

## 6. Phase D — Aufräumen & Abnahme

- [ ] 6.1 Audit erneut laufen lassen: keine verbliebenen hartcodierten semantischen Farb-Utilities (außer bewusst kuratierte)
- [ ] 6.2 Mobile-Check 320px über alle migrierten Seiten; Kontrast-Check (keine Hellgrau-auf-Hellgrau-Flächen)
- [ ] 6.3 Print-Styles (Einkaufsliste, Rezept) final verifizieren
- [ ] 6.4 `npm run lint` + `npm run build` (`tsc -b`) grün; keine `console.log`-Statements
- [ ] 6.5 `frontend-food/AGENTS.md` aktualisieren: Token-System, Typo, Icon-Regel, Card-Tabellen-Pattern, Styleguide-Verweis
