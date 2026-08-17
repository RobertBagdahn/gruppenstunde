## Why

Die Zutaten-Erstellung in Inspi ist ein fragmentiertes Erlebnis: Es gibt eine monolithische Formularseite mit 30+ Feldern ohne Modus-Auswahl, der Backend-Endpoint `POST /api/ingredients/ai-create/` existiert vollständig aber hat keinen Frontend-Aufrufer, und wenn ein User im Rezept-Editor eine unbekannte Zutat tippt und "neu anlegen" klickt, landet er in einer Sackgasse (TODO-Kommentar in `InlineIngredientEditor.tsx:211`). Analog zur bewährten Rezept-Erstellung soll nun auch die Zutaten-Erstellung einen geführten, moduswählenden Flow erhalten.

## What Changes

- Neue Zutaten-Erstellungspage `/ingredients/new` mit `ContentStepper` (Modus-Auswahl: KI / Manuell / Mit Link)
- **Mit KI**: Name eingeben → `POST /api/ingredients/ai-create/` → Felder vorausgefüllt → bestätigen
- **Manuell**: Leeres Formular (nur Stammdaten im Stepper, Rest auf Detailseite bearbeitbar)
- **Mit Link**: URL eingeben → neuer Backend-Endpoint scraped die Seite per Gemini → Felder vorausgefüllt
- Neuer Backend-Endpoint `POST /api/ingredients/import-from-url/` analog zu `import-from-url-enhanced` bei Rezepten
- Neuer Frontend-Hook `useAiCreateIngredient()` und `useIngredientImportUrl()`
- `UnknownIngredientDialog` "neu anlegen"-Button navigiert zu `/ingredients/new` statt Toast-Fehlermeldung
- Die bestehende `IngredientCreatePage` (monolithisches Formular) wird durch die neue Stepper-Page ersetzt

## Capabilities

### New Capabilities

- `ingredient-creation-stepper`: Geführter Erstellungsflow für Zutaten mit drei Modi (KI, Manuell, URL-Import) über den wiederverwendeten `ContentStepper`
- `ingredient-url-import`: Backend-Endpoint und Frontend-Hook zum Scrapen von Produktseiten (Rewe, dm, Edeka, Open Food Facts etc.) per Gemini — KI erkennt die Quelle selbst

### Modified Capabilities

- `ingredient-database`: Die bestehende Erstellungs-UX ändert sich grundlegend (neuer Einstiegspunkt, Stepper statt Vollformular)
- `ingredient-ai-suggest`: Der bestehende `ai-create`-Endpoint bekommt nun einen vollständigen Frontend-Aufrufer

## Impact

**Backend:**
- `backend/supply/api/ingredients.py`: Neuer Endpoint `POST /api/ingredients/import-from-url/`
- Neuer Service analog zu `backend/recipe/services/url_import_service.py` für Zutaten-URL-Import
- Pydantic-Schemas für Import-Request/Response (`IngredientImportUrlIn`, `IngredientImportUrlOut`)

**Frontend (frontend-food/):**
- `src/pages/ingredients/IngredientCreatePage.tsx`: Ersetzt durch neuen Stepper-basierten Flow
- `src/api/ingredients.ts` (oder `supplies.ts`): Neue Hooks `useAiCreateIngredient()`, `useIngredientImportUrl()`
- `src/components/recipe/UnknownIngredientDialog.tsx`: "neu anlegen"-Button navigiert zu `/ingredients/new`
- `src/components/ingredient/IngredientStepper.tsx` (neu): Wrapper um `ContentStepper` für Zutaten

**Keine Migrationen** — nur neue API-Endpunkte und Frontend-Änderungen; das `Ingredient`-Model bleibt unverändert.
