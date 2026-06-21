## Why

Die Zutatenverwaltung im `InlineIngredientEditor` (Rezept-Detailseite) und in der `CreateRecipePage` hat mehrere UX- und Logikschwächen, die bei täglicher Nutzung auffallen: Das Hinzufügen-Feld ist visuell kaum als Eingabefeld erkennbar, Zutaten können mehrfach eingefügt werden, wieder-gelöschte Zutaten werden statt wiederverwendet neu angelegt, die AI-Mengenschätzung ignoriert den Portions-Skalierungskontext beim Anwenden, und der AI-Apply-Endpunkt erzeugt serverseitig Duplikate, wenn er mehrfach aufgerufen wird. Diese Fehler brechen den Erwartungs-Vertrag an einer der meistgenutzten Stellen der Food-App.

## What Changes

**Frontend — InlineIngredientEditor (`frontend-food/src/components/recipe/InlineIngredientEditor.tsx`)**
- **Hinzufügen-Feld als Input-Container stylen**: Sichtbare Card-Umrandung mit Plus-Icon und Label "Zutat hinzufügen" um das `IngredientAutocomplete`-Input, sodass die Eingabemöglichkeit eindeutig ist
- **Duplikat-Prüfung beim Hinzufügen**: Wenn die Zutat bereits in `editItems` (auch als `isDeleted` markiert) existiert, SHALL das bestehende Item wiederhergestellt werden (`isDeleted: false`) statt ein neues Item anzulegen. Toast-Hinweis "Zutat bereits vorhanden – wiederhergestellt"
- **AI-Mengenschätzung respektiert Display-Servings**: Beim Apply (`handleApplyEstimate`) SHALL die eingesetzte `quantity` mit dem aktuellen `servings`-Skalierungsfaktor multipliziert werden, damit die gespeicherte Per-1-Portion-Menge korrekt ist

**Frontend — CreateRecipePage (`frontend-food/src/pages/recipes/CreateRecipePage.tsx`)**
- **Hinzufügen-Feld als Input-Container stylen** (gleiche Pattern wie InlineIngredientEditor)
- **Duplikat-Prüfung beim Hinzufügen**: Wenn Zutat bereits in `ingredients` existiert, SHALL kein neues Item eingefügt werden (Toast-Hinweis)

**Frontend — AI-Suggestions-Flow (`InlineIngredientEditor.handleApplyAiSuggestions`)**
- **CSRF-Token im Fetch-Header mitsenden** für `ai-suggest-ingredients` und `ai-apply-ingredients` (Session-Auth benötigt CSRF bei POST)
- **Client-seitiger Duplikat-Check**: Vor dem Apply sollen Vorschläge, deren `ingredient_id` bereits in `editItems` (active oder `isDeleted`) vorkommt, herausgefiltert oder markiert werden

**Backend — `recipe/api/items.py::ai_apply_ingredients`**
- **Serverseitiger Duplikat-Schutz**: Der Apply-Endpunkt SHALL keine `RecipeItem`s für `portion_id`s erzeugen, deren `ingredient_id` bereits in einem `RecipeItem` des Rezepts existiert (Race-Condition-Schutz)

**Backend — `recipe/services/ai_ingredients_service.py::RecipeQuantityEstimationService`**
- **Einheiten-Konsistenz**: Die `_build_response`-Methode verwendet die Default-Portion statt der editierten Portion für die AI-Mengen-Schätzung — dies führt zu falschen Werten, wenn User eine nicht-default Portion editiert. Die Schätzung soll auf der aktuell im Rezept gespeicherten Portion basieren oder die Antwort soll die Portion-ID zurückgeben, damit das Frontend die Konvertierung korrekt durchführt

## Capabilities

### New Capabilities
- `recipe-ai-quantity-estimate`: AI-gestützte Mengenschätzung für bestehende RecipeItems — bisher nicht spezifiziert, jetzt mit Display-Servings-Kontext und Portions-Konsistenz

### Modified Capabilities
- `recipe-inline-edit`: UX-Klarheit des Hinzufügen-Feldes (Card-Container), Duplikat-Prüfung beim Hinzufügen, Wiederherstellen gelöschter Items statt Neu-Anlegen
- `recipe-ai-ingredients`: Serverseitiger Duplikat-Schutz im Apply-Endpunkt, Client-seitiges Filtern gegen Editor-State, CSRF bei Fetch-Calls
- `recipe-portion-scaling-edit`: AI-Mengenschätzung respektiert Display-Servings beim Apply (Skalierungs-Faktor-Loop)

## Impact

- **Backend**: `backend/recipe/api/items.py` (Apply-Endpunkt mit Dedup-Logik), `backend/recipe/services/ai_ingredients_service.py` (`_build_response` reparieren), `backend/recipe/schemas/items.py` (ggf. `EstimateQuantityItemOut` um `portion_id` ergänzen)
- **Frontend-Food**: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` (Haupt-Änderungen), `frontend-food/src/pages/recipes/CreateRecipePage.tsx` (Add-Field-UX + Dup-Check)
- **Pydantic-Schemas**: `EstimateQuantityItemOut` ggf. um `portion_id`-Feld erweitern
- **Zod-Schemas**: `frontend-food/src/schemas/recipe.ts` — `EstimateQuantityItem`-Typ synchron halten
- **Migrationen**: Keine — nur Logik- und UX-Änderungen, keine Model-Feld-Änderungen
- **Tests**: Backend-Tests für `ai_apply_ingredients` Dedup; Frontend-Tests für InlineIngredientEditor Duplikat-Handling
