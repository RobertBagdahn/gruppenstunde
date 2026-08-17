## Why

Beim Erstellen eines Rezepts generiert die KI bereits Titel, Beschreibung und Eigenschaften aus dem Freitext — aber Zutaten fehlen komplett. Der User muss diese nach dem Erstellen manuell nachtragen. Da die Infrastruktur für KI-gestützte Zutaten-Extraktion bereits existiert (`suggest_recipe_supplies` + `match_ingredients_to_database`), soll der Refurbish-Endpoint für Rezepte diese Funktionen mitaufrufen und Zutaten direkt im Wizard anzeigen.

## What Changes

- **Backend**: `ai_refurbish()` ruft für `content_type="recipe"` zusätzlich `suggest_recipe_supplies()` + `match_ingredients_to_database()` auf und liefert `suggested_ingredients` im Response mit
- **Backend Schema**: `AiRefurbishOut` bekommt Feld `suggested_ingredients: list[AiIngredientSuggestionOut] = []`
- **Frontend Schema**: `AiRefurbishSchema` (Zod) wird um `suggested_ingredients` erweitert
- **Frontend Wizard Schritt 2**: Neue bearbeitbare Sektion "Zutaten" (Menge/Einheit ändern, löschen, hinzufügen)
- **Frontend Save**: Beim Speichern werden Zutaten direkt als `RecipeItem`s angelegt

## Capabilities

### New Capabilities
- `recipe-ai-ingredient-extraction`: KI-gestützte Zutaten-Extraktion im Rezept-Erstellungs-Wizard mit bearbeitbarer Vorschau in Schritt 2

### Modified Capabilities
<!-- Keine bestehenden Specs betroffen — reine Feature-Erweiterung -->

## Impact

- **Django Apps**: `content` (API + Schema), `recipe` (Save-Logik)
- **Pydantic Schemas**: `content/schemas/ai.py` → `AiRefurbishOut`
- **Zod Schemas**: `frontend/src/schemas/content.ts` → `AiRefurbishSchema`
- **Frontend Pages**: `pages/recipes/CreateRecipePage.tsx`, `components/content/ContentStepper.tsx`
- **API**: `POST /api/content/ai/refurbish/` Response erweitert (nicht-breaking, neues optionales Feld)
- **Migrations**: Keine (kein Model-Change, nur API-Response-Erweiterung)
- **Existierender Code wiederverwendet**: `content/services/ai_supply_service.py` → `suggest_recipe_supplies()`, `match_ingredients_to_database()`
