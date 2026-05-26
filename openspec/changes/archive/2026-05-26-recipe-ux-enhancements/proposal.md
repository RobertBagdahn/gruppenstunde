## Why

Die Rezept- und Einkaufsfeatures in Inspi sind funktional vollständig, aber es fehlen UX-Verbesserungen die den Alltag bei der Lagerplanung deutlich erleichtern: schnelles Importieren von Rezepten, intelligente Einheiten-Umrechnung, bessere Zutateneingabe und druckbare Outputs für offline-Nutzung auf Lagern.

## What Changes

- **URL-Import**: Rezepte von externen Webseiten (Chefkoch, Schema.org/JSON-LD) automatisch importieren
- **Einheiten-Umrechnung**: Umrechnungstabelle (EL→g, Tasse→ml) mit zutatspezifischen Gewichten
- **Unbekannte-Zutaten-Dialog**: Fuzzy-Match beim Speichern von RecipeItems, um Duplikate zu vermeiden
- **Einkaufsliste Ansichtsmodi**: 3 Modi (detailliert, zusammengefasst, nach Rezept gruppiert)
- **Einkaufsliste Druckversion**: Print-optimierte CSS-Ansicht mit Checkboxen
- **Wochenplan PDF-Export**: PDF-Generierung des MealPlans für offline-Nutzung
- **Manuelle Overrides im MealPlan**: Zutaten-Mengen pro MealItem überschreiben ohne Originalrezept zu ändern
- **Rezept-Ordner**: Optionale Ordner-Struktur für persönliche Rezepte (neben Tags)
- **Frühstück-Tool**: Vereinfachte Mahlzeiten (nur Zutatenliste, keine Zubereitungsschritte)
- **Autocomplete mit Ghost-Text**: Verbesserte Zutateneingabe mit Inline-Vorschlägen

## Capabilities

### New Capabilities
- `recipe-url-import`: Import von Rezepten via URL (Schema.org JSON-LD, Chefkoch, EatSmarter Parser)
- `unit-conversion`: Einheiten-Umrechnungssystem (EL→g, Tasse→ml) mit zutatspezifischen Dichten
- `ingredient-fuzzy-match`: Fuzzy-Matching Dialog bei unbekannten/ähnlichen Zutaten beim Speichern
- `shopping-list-views`: Drei Ansichtsmodi für Einkaufslisten + Druckversion
- `meal-plan-export`: PDF-Export für Wochenpläne
- `meal-item-overrides`: Mengen-Overrides pro MealItem im MealPlan
- `recipe-folders`: Ordner-Organisation für persönliche Rezepte
- `simple-meal`: Vereinfachte Mahlzeiten (Frühstück-Tool) ohne Zubereitungsschritte
- `ingredient-autocomplete`: Ghost-Text Autocomplete bei Zutateneingabe

### Modified Capabilities
- `shopping-list`: Neue Ansichtsmodi und Druckversion
- `meal-plan`: Overrides pro MealItem, PDF-Export
- `recipe`: Ordner-Feld, URL-Import-Endpunkt

## Impact

**Backend (Django Apps):**
- `recipe`: Neues Model `RecipeFolder`, neuer Import-Service, URL-Import API-Endpunkt
- `supply`: `UnitConversion` Model, Fuzzy-Match Service für Ingredients
- `planner`: `MealItemOverride` Model, PDF-Export Service
- `shopping`: Neue Query-Parameter für Ansichtsmodi

**Frontend (React):**
- Neue Pages: RecipeImportPage, MealPlanExportPage
- Neue Komponenten: IngredientAutocomplete (Ghost-Text), UnknownIngredientDialog, ShoppingListViewToggle, PrintableShoppingList
- Anpassungen: MealPlanDetailPage (Overrides UI), MyRecipesPage (Ordner), ShoppingListDetailPage (Modi)

**Schemas:**
- Neue Pydantic-Schemas: `RecipeImportSchema`, `UnitConversionSchema`, `MealItemOverrideSchema`, `RecipeFolderSchema`
- Neue Zod-Schemas: Entsprechende Frontend-Pendants

**Migrations:** Ja — neue Models (RecipeFolder, UnitConversion, MealItemOverride, SimpleMeal)

**Dependencies:** PDF-Generierung benötigt `weasyprint` oder `reportlab`
