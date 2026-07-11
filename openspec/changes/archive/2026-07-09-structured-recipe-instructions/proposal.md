## Why

Nutzer kochen nach Rezepten mit undurchschauaren Textbeschreibungen. Zutaten sind in einer separaten Liste, Anleitungsschritte sind freier Markdown — keine Verbindung zwischen „Zwiebeln schneiden" und dem Zutateneintrag „5 Zwiebeln". Das ist fehleranfällig, unflexibel bei Portion-Skalierung und bietet keine Struktur für moderne Koch-Interfaces.

Das Stakeholder-Feedback war klar: „Punkt 1 — links die Zutaten, rechts was man machen muss. Dann Punkt 2..." Ein strukturiertes Schritt-für-Schritt-System mit Zutatenverlinkung würde die Koch-Experience transformieren.

## What Changes

- **Datenmodell**: Neue `RecipeStep` + `RecipeStepIngredient` Django-Modelle mit FK zu bestehenden `RecipeItem`, `sort_order`, Dauer, Sektionsname, Platzhalter-Syntax
- **API**: Neue Endpunkte für Step-CRUD (`PUT /steps/batch`, `GET /steps`, etc.), Step-Validierung, Batch-Updates
- **Frontend**: Interaktiver Drag-and-Drop Step-Editor mit inline-Editing, Live-Vorschau, Undo/Redo (einfach), Zutaten-Zuordnung
- **KI-Integration**: Backend-Service für Step-Generierung aus Zutaten und automatische Zutaten-Zuordnung (Phase 1 MUSS), Umschreibung und Autocomplete später (Phase 2)
- **Platzhalter-System**: Zutaten im `instruction`-Text als `{name}` oder `{uuid}` mit automatischer Auflösung zu konkreten Mengen (z.B. „500g Mehl")
- **Backward-Compatibility**: Alte Rezepte bleiben funktionsfähig mit Fallback auf heuristische Schrittparsung; neue Rezepte erhalten strukturierte Steps
- **Rendering**: Strukturierte Step-Anzeige auf Detailseite (collapsible Akkordeon), optimierter Kochmodus mit schritt-relevanten Zutaten, verbessertes Druck-Layout (zweispaltig)

**KEINE Breaking Changes**: `description`-Feld bleibt als Fallback erhalten.

## Capabilities

### New Capabilities

- `recipe-structured-steps`: Rezeptanleitungen als strukturierte Schritt-Abfolge mit Zutaten-Verlinkung, Dauer, Sektionen (optional), Platzhalter-Auflösung und KI-gestützte Generierung
- `recipe-step-editor`: Interaktiver Drag-and-Drop Editor für Schritte mit inline-Editing, Live-Vorschau, Undo/Redo, Zutaten-Management pro Schritt

### Modified Capabilities

- `recipe-detail`: Zeigt nun strukturierte Steps statt flache Markdown-Beschreibung (wenn vorhanden), fallback zu alt
- `recipe-cooking`: Kochmodus zieht Schritte und schritt-relevante Zutaten aus strukturiertem System, nicht aus geparstem Markdown
- `recipe-create`: Beim Anlegen kann ein Rezept sofort mit strukturierten Steps erstellt werden
- `recipe-import`: URL-Imports (Gemini) liefern jetzt strukturierte Steps, nicht nur transiente `steps`-Liste

## Impact

**Backend (Django)**
- Neue App-Files: `recipe/models/steps.py` (RecipeStep, RecipeStepIngredient Modelle)
- Neue Services: `recipe/services/step_ai_service.py` (KI für Steps)
- Neue Migrationen (Recipe.steps → RecipeStep FK)
- API Router: `/api/recipes/{slug}/steps/*` Endpunkte
- Pydantic-Schemas: RecipeStepOut, RecipeStepIngredientOut, RecipeStepsBatchIn
- Import-Services aktualisieren (url_import_service.py, cooklang-Fallback-Parser)

**Frontend-Food (React/TS)**
- Neue Komponenten: `StepEditor.tsx` (main component), `StepCard.tsx`, `StepZutatenPanel.tsx`, `LivePreview.tsx`
- Zustand-Store: `useRecipeStepStore` mit Undo/Redo
- Zod-Schemas: RecipeStepSchema, RecipeStepIngredientSchema
- API-Hooks: `useRecipeSteps()`, `useBatchUpdateSteps()`
- KI-Integration: `useGenerateStepsFromItems()`, `useSuggestIngredientAssignment()`
- Aktualisierte Components: `RecipeDetailPage` (Steps-Section), `RecipeCookingMode` (Step-basiert), `RecipePrintPage` (Zweispalten-Layout)
- UI-Library: `dnd-kit` für Drag-and-Drop

**Migrations**
- Bestehende <50 Rezepte: Optional via Button „Aus Beschreibung migrieren" (KI-gestützt), oder Fallback bleibt bestehen
- Keine Datenverlust-Szenarien (description bleibt)

**Dependencies**
- Backend: Existierende (Django, Gemini)
- Frontend: `dnd-kit/core`, `dnd-kit/utilities`, `dnd-kit/sortable` (neue DnD-Library)

