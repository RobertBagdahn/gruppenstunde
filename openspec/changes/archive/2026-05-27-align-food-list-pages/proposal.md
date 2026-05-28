## Why

Die 4 Listenseiten im `frontend-food` (Rezepte, Zutaten, Essensplan, Einkaufslisten) haben stark unterschiedliche Layouts: verschiedene Container-Breiten (max-w-3xl bis max-w-7xl), inkonsistente Header-Patterns, teils fehlende Suchleisten/Filter und unterschiedliche Darstellungsformen (Grid vs. Liste). Das wirkt unprofessionell und verwirrend. Die Rezepte-Seite ist die Referenz mit dem vollstaendigsten Layout (Hero + Search + Sidebar + Grid + Sort + Pagination).

## What Changes

- **Zutaten** (`IngredientListPage.tsx`): Container auf max-w-7xl, Search in Gradient-Container, Filter-Sidebar statt Inline-Dropdowns, Grid-Card-Layout statt Listendarstellung, Sort-Dropdown, Count-Badge im Hero
- **Essensplan** (`MealEventListPage.tsx`): ListPageHero statt eigener Card-Header, Search-Bar hinzufuegen, Grid-Card-Layout beibehalten aber visuell angleichen, Sort-Dropdown, Pagination
- **Einkaufslisten** (`ShoppingListPage.tsx`): Container auf max-w-7xl, Search-Bar in Gradient-Container, Grid-Card-Layout statt Listendarstellung, Count-Badge im Hero
- Gemeinsame Komponenten extrahieren wo sinnvoll (z.B. ListPageSearchBar, ListPageContainer)

## Capabilities

### New Capabilities

- `food-list-page-layout`: Einheitliches Layout-Pattern fuer alle Listen-Seiten im frontend-food (Container, Hero, Search, Filter-Sidebar, Grid, Sort, Pagination)

### Modified Capabilities

- `ingredient-database`: Layout-Aenderung der Listenseite (Sidebar-Filter, Grid-Cards statt Listenzeilen)
- `meal-plan`: Layout-Aenderung der Listenseite (Hero, Search, Pagination)
- `shopping-list`: Layout-Aenderung der Listenseite (Grid-Layout, Search)

## Impact

- **Frontend-Code**: `frontend-food/src/pages/ingredients/IngredientListPage.tsx`, `frontend-food/src/pages/planning/MealEventListPage.tsx`, `frontend-food/src/pages/shopping/ShoppingListPage.tsx`
- **Neue Komponenten**: Ggf. `IngredientCard.tsx`, `MealPlanCard.tsx`, `IngredientFilterSidebar.tsx`, gemeinsame `ListPageSearchBar.tsx`
- **Bestehende Komponenten**: `ListPageHero` (Count-Badge ueberall nutzen)
- **Keine Backend-Aenderungen**: Keine Schema/API-Aenderungen noetig, da Filter-Parameter bereits existieren
- **Keine Migrations**: Rein visuelles Refactoring
