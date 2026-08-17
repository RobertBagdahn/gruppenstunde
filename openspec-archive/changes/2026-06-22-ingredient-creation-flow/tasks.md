## 1. Backend — URL-Import-Service und Endpoint

- [x] 1.1 Pydantic-Schemas `IngredientImportUrlIn` und `IngredientImportUrlOut` (mit `ingredient_draft` und optionalem `nutrition`) in `backend/supply/schemas/` erstellen
- [x] 1.2 Service `backend/supply/services/ingredient_url_import_service.py` erstellen — Gemini-Aufruf mit URL, strukturiertes Draft-Objekt zurückgeben (analog `url_import_service.py` bei Rezepten)
- [x] 1.3 Endpoint `POST /api/ingredients/import-from-url/` in `backend/supply/api/ingredients.py` registrieren (auth required, ruft den neuen Service auf)
- [x] 1.4 Endpoint manuell testen (Rewe-Produktseite, Open Food Facts URL)

## 2. Frontend — Zod-Schemas und API-Hooks

- [x] 2.1 Zod-Schema `ingredientImportUrlInSchema` und `ingredientImportUrlOutSchema` in `frontend-food/src/schemas/` erstellen (1:1 zu den Pydantic-Schemas)
- [x] 2.2 Hook `useAiCreateIngredient()` in `frontend-food/src/api/ingredients.ts` (oder `supplies.ts`) erstellen — ruft `POST /api/ingredients/ai-create/` auf, Typ `IngredientDetailOut`
- [x] 2.3 Hook `useIngredientImportUrl()` erstellen — ruft `POST /api/ingredients/import-from-url/` auf, Typ `IngredientImportUrlOut`

## 3. Frontend — CreateIngredientPage mit Stepper

- [x] 3.1 `frontend-food/src/pages/ingredients/CreateIngredientPage.tsx` ersetzen — neue Komponente mit `ContentStepper`, drei Modus-Karten in Step 0
- [x] 3.2 `IngredientFormData`-Interface definieren (Stammdaten: `name`, `description`, `status`, `retail_section_id`) und in der Page verwenden
- [x] 3.3 KI-Modus implementieren: Namenseingabe in Step 0 → `useAiCreateIngredient()` aufrufen → bei Erfolg Step 1 vorausfüllen, `createdSlug` in State speichern
- [x] 3.4 Manuell-Modus implementieren: direktes Springen zu Step 1 mit leerem Formular
- [x] 3.5 URL-Import-Karte als `renderExtraStep0Cards` per Prop in den Stepper injizieren
- [x] 3.6 URL-Import-Modal erstellen (URL-Input, Laden-Zustand, Fehlerdarstellung im Modal) — bei Erfolg Step 1 vorausfüllen
- [x] 3.7 Step 1 Formular bauen: `name` (required), `description` (optional textarea), `status` (select), `retail_section` (select/autocomplete)
- [x] 3.8 Step 2 Speichern-Logik: falls `createdSlug` vorhanden → `PATCH`, sonst → `POST /api/ingredients/` → navigate zu `/ingredients/<slug>`
- [x] 3.9 Auth-Gate für nicht-eingeloggte User hinzufügen (analog anderen Create-Pages)
- [x] 3.10 Loading-/Fehler-States für alle Modi auf Mobile testen (320px Minimum)

## 4. Frontend — UnknownIngredientDialog patchen

- [x] 4.1 In `frontend-food/src/components/recipe/UnknownIngredientDialog.tsx` den `onCreateNew`-Callback so anpassen, dass er zu `/ingredients/new` navigiert
- [x] 4.2 In `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` den Guard-Block (Zeile ~211) entfernen — `handleAddIngredient` mit leerem Slug navigiert nun zu `/ingredients/new`
- [x] 4.3 Manuell testen: unbekannte Zutat in Rezept-Editor tippen → Dialog → "neu anlegen" → landet auf `/ingredients/new`

## 5. Schema-Sync-Prüfung und Abschluss

- [x] 5.1 Sicherstellen dass alle neuen Pydantic-Schemas 1:1 in Zod-Schemas gespiegelt sind (kein `any` in TypeScript)
- [x] 5.2 Keine `console.log` / `print`-Statements in neuem Code
- [x] 5.3 End-to-End-Flow für alle drei Modi manuell durchspielen (KI, Manuell, Mit Link)
