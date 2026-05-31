## Why

Stakeholder-Bugmeldung: Einkaufslisten zeigen falsche Mengen (z.B. 660g Knoblauch statt 120g für 8 Personen), und importierte Rezepte haben unrealistische Portionsmengen (280g Joghurt pro Portion). Die Ursache: 73 von 189 Rezepten in der Prod-DB haben `servings > 1`, obwohl die Konvention `servings=1` (alle Mengen pro 1 Portion) vorsieht. Manche davon sind bereits normalisiert aber `servings` wurde nicht auf 1 gesetzt, andere haben Gesamtmengen gespeichert.

## What Changes

- **Prod-DB-Korrektur**: Management Command zum Normalisieren aller Rezepte auf `servings=1` (53 Rezepte: nur `servings` setzen; 18 Rezepte: Mengen durch `servings` teilen; 2 Rezepte: AI-Schätzung für kaputte Daten)
- **Backend Shopping-Service**: Defensiv durch `recipe.servings` teilen als Sicherheitsnetz (`supply/services/shopping_service.py`)
- **Import-Stepper (Food-Frontend)**: Beim Rezept-Import aus URL einen expliziten Schritt einbauen, der die erkannten Portionsmengen anzeigt und den User fragt ob sie korrekt sind, mit Option zur Normalisierung auf 1 Portion
- **Save-Normalisierung**: Sicherstellen, dass beim Speichern von Rezepten immer `servings=1` erzwungen wird
- **Backend-Validierung**: API-seitige Validierung, dass `servings` beim Erstellen/Updaten immer 1 ist

## Capabilities

### New Capabilities
- `recipe-portion-normalization`: Daten-Normalisierung aller Rezepte auf servings=1, Management Command, Import-Stepper für Portionsvalidierung

### Modified Capabilities
- `recipe-url-import`: Import-Flow bekommt zusätzlichen Validierungsschritt für Portionsmengen
- `shopping-list`: Shopping-Service teilt defensiv durch `recipe.servings`
- `recipe`: Validierung dass servings immer 1 ist bei Create/Update

## Impact

- **Django Apps**: `recipe` (Models, API-Validierung), `supply` (Shopping-Service), `shopping` (from-recipe Endpoint)
- **Pydantic Schemas**: `RecipeCreateIn`, `RecipeUpdateIn` — Validierung `servings=1`
- **Zod Schemas**: `RecipeImportUrlResponseSchema` — Portionsvalidierung im Frontend
- **Frontend-Food**: `CreateRecipePage.tsx` (Import-Stepper), `InlineIngredientEditor.tsx` (Save-Normalisierung)
- **Migrations**: Keine Schema-Änderungen, nur Daten-Migration via Management Command
- **Prod-DB**: 73 Rezepte werden aktualisiert, davon 18 mit Mengen-Division
