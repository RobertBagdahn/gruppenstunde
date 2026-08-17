## 1. Gemeinsame Komponenten erstellen

- [x] 1.1 `ListPageSearchBar` Komponente erstellen (`frontend-food/src/components/shared/ListPageSearchBar.tsx`): Gradient-Container mit Such-Input, Such-Button und optionalem "Neu erstellen"-Button. Props: `placeholder`, `value`, `onChange`, `onSubmit`, `createLabel?`, `createHref?`, `onCreateClick?`, `gradientClasses`
- [x] 1.2 `IngredientCard` Komponente erstellen (`frontend-food/src/components/ingredient/IngredientCard.tsx`): Card mit Name, Retail-Section, Nutri-Score-Badge, Preis, Energie. Styling analog zu RecipeCard.
- [x] 1.3 `IngredientFilterSidebar` Komponente erstellen (`frontend-food/src/components/ingredient/IngredientFilterSidebar.tsx`): Sidebar mit Radio-Filtern fuer Retail-Section und Status. Styling analog zu RecipeFilterSidebar.

## 2. Zutaten-Listenseite angleichen

- [x] 2.1 `IngredientListPage.tsx` refactoren: Container auf max-w-7xl, ListPageHero mit totalCount/countLabel
- [x] 2.2 Inline-Search ersetzen durch `ListPageSearchBar` mit amber/orange Gradient
- [x] 2.3 Inline-Filter-Dropdowns ersetzen durch `IngredientFilterSidebar` (flex-row Layout mit Sidebar links)
- [x] 2.4 Listen-Darstellung ersetzen durch responsives Grid mit `IngredientCard` (grid-cols-1 sm:2 md:3 lg:4)
- [x] 2.5 Sort-Dropdown hinzufuegen (Neueste, Aelteste, Name A-Z, Name Z-A)

## 3. Essensplan-Listenseite angleichen

- [x] 3.1 `MealEventListPage.tsx` refactoren: Container auf max-w-7xl, Card-Header ersetzen durch `ListPageHero` mit Count-Badge
- [x] 3.2 `ListPageSearchBar` hinzufuegen mit primary/indigo Gradient
- [x] 3.3 Sort-Dropdown hinzufuegen (Neueste, Aelteste, Name A-Z)
- [x] 3.4 Grid-Layout angleichen (grid-cols-1 md:2 lg:3), bestehende Inline-Cards in eigene `MealPlanCard.tsx` extrahieren
- [x] 3.5 Pagination hinzufuegen (API unterstuetzt bereits paginierte Responses)

## 4. Einkaufslisten-Seite angleichen

- [x] 4.1 `ShoppingListPage.tsx` refactoren: Container auf max-w-7xl, ListPageHero mit totalCount/countLabel
- [x] 4.2 `ListPageSearchBar` hinzufuegen mit teal/cyan Gradient
- [x] 4.3 Sort-Dropdown hinzufuegen (Neueste, Aelteste, Name A-Z)
- [x] 4.4 Listen-Darstellung ersetzen durch responsives Grid (grid-cols-1 sm:2 md:3) mit bestehender `ShoppingListCard`

## 5. Rezepte-Seite: ListPageSearchBar extrahieren

- [x] 5.1 `RecipeListPage.tsx` refactoren: Inline-Search-Container durch `ListPageSearchBar` ersetzen (keine visuelle Aenderung, nur Komponenten-Extraktion)
