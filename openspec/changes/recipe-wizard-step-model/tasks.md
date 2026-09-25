## 0. Voraussetzung

- [ ] 0.1 `ingredient-status-visibility-unification` ist umgesetzt (insb. `create_recipe` mit `created_by`/`draft`, Matcher mit Nutzer); Branch auf diesen Stand bringen

## 1. Backend: Normierung und Feld

- [ ] 1.1 `Recipe.source_servings` (PositiveSmallIntegerField, null) in `recipe/models/recipe.py`; flüchtiges Attribut `input_servings` entfernen; Migration erzeugen und anwenden
- [ ] 1.2 `RecipeCreateIn.input_servings: int | None = Field(None, ge=1, le=100)`; `RecipeUpdateIn.source_servings`; `RecipeDetailOut.source_servings` (statt `input_servings`) in `recipe/schemas/recipes.py`
- [ ] 1.3 `create_recipe` (`recipe/api/recipes.py:681`): 422 bei Zutaten/Review-Zeilen ohne `input_servings`; Mengen teilen; `portions=1`, `source_servings` setzen
- [ ] 1.4 Alle Backend-Aufrufer und Tests von `POST /api/recipes/` prüfen und bei Pro-Portion-Mengen `input_servings=1` senden

## 2. Schema-Sync und API-Hooks (Frontend)

- [ ] 2.1 `schemas/recipe.ts`: `RecipeCreateInSchema.input_servings`, `RecipeDetailSchema.source_servings` (statt `input_servings`), `RecipeUpdateSchema.source_servings`
- [ ] 2.2 Aufrufer von `useCreateRecipe` prüfen (`CreateRecipeModal.tsx`, `InlineIngredientEditor.tsx`, `RecipeDetailPage.tsx`, `RecipeFoldersPage.tsx`, `api/breakfast.ts`, `api/recipeMaterials.ts`) und `input_servings` setzen, wo Zutaten mitgesendet werden
- [ ] 2.3 `useRecipeById` (falls nicht vorhanden) für die Wiederaufnahme

## 3. Frontend: Schritt-Modell

- [ ] 3.1 `components/recipe/wizardSteps.ts`: `WizardStepId`, `WizardStepDef`, `WIZARD_STEPS` mit Labels und Hilfetexten
- [ ] 3.2 `WizardStepContext` + `useWizardStep().registerLeave` (in `components/recipe/wizardContext.tsx`)
- [ ] 3.3 `RecipeWizard.tsx` neu aufbauen: `visibleSteps`, Navigation über IDs, zentraler `createDraft` am Anlegepunkt, zentrale Fehler-/Erfolgs-Toasts; Index-Arithmetik und toten Zweig entfernen
- [ ] 3.4 `WizardStepMethod`, `WizardStepBasis`, `WizardStepIngredients`, `WizardStepMetadata`, `WizardStepSteps`, `WizardStepPreview` von `forwardRef`/`useImperativeHandle` auf `registerLeave` umstellen
- [ ] 3.5 Review-Schritt: Frontend-Division entfernen, Gesamtmengen + `input_servings` senden

## 4. Frontend: URL-State und Wiederaufnahme

- [ ] 4.1 `draft` und `step` über `useSearchParams` (Zod-Enum für `step`), History-Eintrag je Schrittwechsel
- [ ] 4.2 Browser-Zurück: Leave-Handler ausführen, bei `false` URL zurücksetzen
- [ ] 4.3 Wiederaufnahme mit `draft`: Entwurf laden, ungültige/frühe Schritte → `ingredients`, fremder/fehlender Entwurf → „Entwurf nicht gefunden“ mit „Neu beginnen“
- [ ] 4.4 Zurück-Button in `ingredients` bei vorhandenem Entwurf deaktivieren mit Hinweis

## 5. Frontend: Manueller Einstieg

- [ ] 5.1 `WizardStepMethod`: Link „Ohne KI manuell beginnen“; Hinweistext bei leerer Eingabe verweist darauf
- [ ] 5.2 `WizardStepBasis`: manueller Modus ohne KI-Ergebnis, ohne Vorbelegung, Pflichtfelder Titel, Typ, Personenzahl

## 6. Tests

- [ ] 6.1 Backend: Normierung (4 Personen → ÷ 4), 422 ohne `input_servings`, 422 bei 0/150, 403 anonym, `source_servings` gespeichert und per PATCH änderbar ohne Umrechnung; neue Zutat aus Review-Zeile hat `draft` + `created_by`
- [ ] 6.2 Frontend: `RecipeWizard.test.tsx` anpassen; neue Fälle: KI ohne Zutaten legt Entwurf beim Verlassen von `basis` an; manueller Start ohne KI-Aufruf; Doppelklick erzeugt ein Rezept (Idempotenz-Key)
- [ ] 6.3 Frontend: URL-Tests (nach Anlegen `?draft=…&step=ingredients`, Neuladen setzt fort, `step=basis` mit Entwurf → `ingredients`, fremder Entwurf → Meldung)
- [ ] 6.4 Frontend: nie gleichzeitig Erfolgs- und Fehler-Toast
- [ ] 6.5 E2E-Smoke: Rezept per KI-Text anlegen, im Zutatenschritt neu laden, fertigstellen
- [ ] 6.6 `uv run pytest recipe`, `npm run lint`, `npm run typecheck`, `npm test` grün
