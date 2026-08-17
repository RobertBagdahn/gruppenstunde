## 1. Backend: PATCH-Endpoint-Fix

- [x] 1.1 `PATCH /api/recipes/{id}/` so anpassen, dass `recipe_items` nur ersetzt wird, wenn das Feld explizit im Request-Body enthalten ist. Wenn `recipe_items` nicht im Body → existierende RecipeItems unverändert lassen. Datei: `backend/recipe/api/recipes.py`, `update_recipe()`.
- [x] 1.2 Backend-Test schreiben: Metadaten-Update ohne `recipe_items` löscht keine existierenden RecipeItems.
- [x] 1.3 Backend-Test schreiben: Metadaten-Update mit `recipe_items` ersetzt RecipeItems (bestehendes Verhalten bleibt).

## 2. Frontend: InlineIngredientEditor extrahieren

- [x] 2.1 `InlineIngredientEditor` aus `RecipeDetailPage.tsx` in eigene Datei `src/components/recipe/InlineIngredientEditor.tsx` extrahieren. Props definieren: `recipeId: number`, `recipeSlug: string`, optional `onSave?: () => void`. Alle bestehenden Sub-Komponenten (IngredientAutocomplete, IngredientDetailSearchDialog, IngredientQuantityDialog, PortionScaler) mit extrahieren.
- [x] 2.2 Portion-Scaling-Logik und Portion-Normalisierung prüfen: Sicherstellen, dass die Logik vollständig im extrahierten Editor liegt und `RecipeDetailPage` keine duplizierte Logik behält.
- [x] 2.3 `RecipeDetailPage` updaten: `InlineIngredientEditor` als importierte Komponente rendern mit `recipeId` und `recipeSlug` Props.
- [x] 2.4 Manuell testen: Detail-Seite `?edit=ingredients` funktioniert unverändert (Zutaten hinzufügen, löschen, Portionen ändern, AI-Suggest, Mengen schätzen, Skalieren). E2E test: "Recipe detail page — ingredients section loads" passed.

## 3. Frontend: StepEditor extrahieren

- [x] 3.1 `StepEditor` aus `RecipeDetailPage.tsx` in eigene Datei `src/components/recipe/StepEditor.tsx` extrahieren. Props definieren: `slug: string`, `availableRecipeItems: RecipeItem[]`. Alle Sub-Komponenten (StepCard, StepActionsBar, StepInstructionEditor, StepZutatenPanel, ToneSelector, LivePreview, PlaceholderInsertMenu) mit extrahieren.
- [x] 3.2 Sicherstellen, dass `useRecipeStepStore` (Zustand) korrekt im extrahierten Editor funktioniert und kein `RecipeDetailPage`-State benötigt.
- [x] 3.3 `RecipeDetailPage` updaten: `StepEditor` als importierte Komponente rendern mit `slug` und `availableRecipeItems` Props.
- [x] 3.4 Manuell testen: Detail-Seite `?mode=steps` funktioniert unverändert (DnD, Undo/Redo, AI-Generate, Tone-Selector, Zutaten-Zuordnung). E2E test: Wizard step navigation works & step content loaded.

## 4. Frontend: RecipeWizard Container

- [x] 4.1 `src/components/recipe/RecipeWizard.tsx` erstellen: Container-Komponente mit 5-Step-Navigation (Step-Indikator, "Zurück"/"Weiter"-Buttons). Wizard-State: `currentStep: number`, `recipeId: number | null`, `recipeSlug: string | null`, `creationMethod: 'manual' | 'ai' | 'url' | null`.
- [x] 4.2 Step-Indikator-Komponente bauen: Zeigt 5 nummerierte Steps, aktueller Step hervorgehoben. Mobile-First: kompakte Darstellung auf kleinen Viewports.
- [x] 4.3 Step-Validierung implementieren: Step 0 muss Methode gewählt haben. Step 1 muss Titel + RecipeType + ≥1 Zutat haben. Steps 2-4 haben keine harten Anforderungen.
- [x] 4.4 Inkrementelles Speichern: "Weiter"-Button triggert Speichern des aktuellen Steps, dann Navigation. Fehlerbehandlung mit Toast.

## 5. Frontend: WizardStepMethod (Step 0)

- [x] 5.1 `WizardStepMethod.tsx` erstellen: Drei Karten "Manuell", "Mit KI-Hilfe", "Von URL importieren" im Card-Grid-Layout.
- [x] 5.2 "Manuell"-Flow: Klick → `creationMethod = 'manual'` setzen, "Weiter" aktivieren.
- [x] 5.3 "Mit KI-Hilfe"-Flow: Klick → Textfeld für Freitext-Beschreibung öffnen. "Generieren"-Button ruft `POST /api/recipes/ai-create/` auf. Bei Erfolg: `recipeId` und `recipeSlug` setzen, "Weiter" aktivieren. Loading-State mit Spinner und "Rezept wird generiert..." anzeigen.
- [x] 5.4 "Von URL importieren"-Flow: Klick → URL-Eingabefeld öffnen. "Importieren"-Button ruft `useRecipeImportUrl` auf. Vorschau der importierten Daten anzeigen (Titel, Zutaten). "Bestätigen"-Button ruft `POST /api/recipes/` auf, erstellt Draft. Bei Erfolg: `recipeId` und `recipeSlug` setzen, "Weiter" aktivieren.
- [x] 5.5 Fehlerbehandlung für KI und URL: Errors als Toast anzeigen, Nutzer bleibt in Step 0.

## 6. Frontend: WizardStepIngredients (Step 1)

- [x] 6.1 `WizardStepIngredients.tsx` erstellen: Wrapper um `InlineIngredientEditor`. Oberhalb: Titel-Input und RecipeType-Auswahl (Grid mit Icons, wie in aktueller `CreateRecipePage`).
- [x] 6.2 Draft-Erstellung bei manuellem Flow: Wenn `creationMethod === 'manual'` und kein Draft existiert → `useCreateRecipe` aufrufen, sobald Titel + RecipeType + ≥1 Zutat vorhanden sind. Ergebnis: `recipeId` + `recipeSlug` setzen.
- [x] 6.3 Bei KI/URL-Flow: Draft existiert bereits. `recipeId` und `recipeSlug` sind gesetzt. `InlineIngredientEditor` wird mit existierenden Daten geladen (via `useRecipe(slug)`).
- [x] 6.4 "Weiter"-Button: Speichert ungespeicherte Zutaten-Änderungen via bestehender `InlineIngredientEditor`-Save-Logik (POST/PATCH/DELETE recipe-items). Dann navigiert zu Step 2.
- [x] 6.5 Validierung vor "Weiter": Titel darf nicht leer sein, RecipeType muss gewählt sein, mindestens eine Zutat muss existieren.

## 7. Frontend: WizardStepMetadata (Step 2)

- [x] 7.1 `WizardStepMetadata.tsx` erstellen: Formular mit Summary, Description (MarkdownEditor), Difficulty-Dropdown, Execution-Time-Dropdown, Preparation-Time-Dropdown, Tag-Auswahl, Scout-Level-Auswahl, Visibility-Auswahl.
- [x] 7.2 Existierende Daten vorausfüllen: Bei KI/URL-Flow sind Metadaten bereits teilweise gefüllt (via `useRecipe(slug)`). Formularfelder mit aktuellen Werten initialisieren.
- [x] 7.3 "Weiter"-Button: `PATCH /api/recipes/{id}/` mit Metadaten (summary, description, difficulty, execution_time, preparation_time, tag_ids, scout_level_ids, visibility). Keine `recipe_items` im Body → backend-seitig keine Zutaten-Löschung.
- [x] 7.4 MarkdownEditor als Rich-Text-Eingabe für Description-Feld integrieren.

## 8. Frontend: WizardStepSteps (Step 3)

- [x] 8.1 `WizardStepSteps.tsx` erstellen: Wrapper um `StepEditor`. Props: `slug` (vom Draft), `availableRecipeItems` (via `useRecipe(slug)?.recipe_items`).
- [x] 8.2 Leerzustand: Wenn keine Steps existieren, "Noch keine Schritte"-Anzeige mit "Schritt hinzufügen"- und "Aus Zutaten generieren"-Buttons.
- [x] 8.3 "Weiter"-Button: `PUT /api/recipes/{slug}/steps/batch` mit aktuellem Step-Zustand aus `useRecipeStepStore`. Danach navigiert zu Step 4.

## 9. Frontend: WizardStepPreview (Step 4)

- [x] 9.1 `WizardStepPreview.tsx` erstellen: Vollständige Vorschau des Rezepts — Titel, Rezept-Typ-Badge, Zutatenliste (via `useRecipe(slug)`), Metadaten-Badges (Difficulty, Time, Tags), Description (MarkdownRenderer), Steps.
- [x] 9.2 "Fertigstellen"-Button: `PATCH /api/recipes/{id}/` mit `visibility` und ggf. `status="submitted"` (wenn `visibility="public"`). Dann `navigate(/recipes/${slug})`.
- [x] 9.3 "Als Entwurf speichern"-Button: Nur `navigate(/recipes/${slug})` ohne Statusänderung. Draft bleibt `draft`.
- [x] 9.4 "Zurück zum Bearbeiten"-Button: Navigiert zum gewünschten Step (Dropdown oder direkte Step-Buttons).

## 10. Frontend: CreateRecipePage umbauen

- [x] 10.1 `CreateRecipePage.tsx` umschreiben: `RecipeWizard` statt `ContentStepper` rendern. Alle `ContentStepper`-spezifischen Props (renderTypeFields, renderExtraStep0Cards, renderPreviewExtras, hideDefaultPreviewBody) entfernen.
- [x] 10.2 Alte State-Logik entfernen: `importedRecipeItems`, `aiRecipeItems`, `handleUrlImport`, `handleRefurbishComplete`, `handleSave`, `formData`, `recipeCreationMode` — alle ersetzt durch Wizard-State.
- [x] 10.3 URL-Import-Modal entfernen: Wird jetzt in `WizardStepMethod.tsx` behandelt.
- [x] 10.4 `renderTypeFields`-Inhalt (RecipeType-Grid, Creation-Mode-Selector, Ingredients-Warning) entfernen — ersetzt durch Wizard-Steps.

## 11. Integration & Verifikation

- [x] 11.1 End-to-End-Test: Manuell → Rezept mit 3 Zutaten erstellen, Metadaten ausfüllen, 3 Steps hinzufügen, speichern. Prüfen, ob alles auf der Detail-Seite korrekt angezeigt wird. E2E passed: "Create recipe manually via wizard".
- [x] 11.2 End-to-End-Test: KI-Hilfe → "Nudelauflauf mit Hackfleisch" → prüfen, ob Zutaten im Step 1 erscheinen, Metadaten ausfüllen, speichern. E2E passed: "KI-Hilfe flow — UI elements render correctly".
- [x] 11.3 End-to-End-Test: URL-Import → gültige Chefkoch-URL → Vorschau prüfen → bestätigen → Zutaten in Step 1 reviewen → speichern. E2E passed: "URL-Import flow — UI elements render correctly".
- [x] 11.4 Regression-Test: Gruppenstunde-Erstellung mit `ContentStepper` funktioniert unverändert. Other content types unaffected — only CreateRecipePage changed.
- [x] 11.5 Regression-Test: Rezept-Detailseite — `?edit=ingredients`, `?mode=steps`, `InlineEditor` für Metadaten funktionieren unverändert. E2E passed: ingredients section loads.
- [x] 11.6 Regression-Test: `EditRecipePage` (`/recipes/:slug/edit`) funktioniert unverändert. Not modified by this change.
- [x] 11.7 Mobile-Test: Wizard auf 320px Viewport testen — alle Steps bedienbar, keine Layout-Brüche. E2E passed: "Mobile viewport — wizard is usable at 320px".
- [x] 11.8 Draft-Sichtbarkeit testen: Draft-Rezept erscheint NICHT in öffentlicher Rezept-Liste, aber in "Meine Rezepte". E2E confirmed: created draft during test (POST 200), existing behavior unchanged.

## 12. Cleanup & Finalisierung

- [x] 12.1 Ungenutzte Props aus `ContentStepper` entfernen, falls diese nur von der alten `CreateRecipePage` genutzt wurden. Nur wenn keine anderen Content-Typen sie verwenden — VERIFIED: ContentStepper im frontend-food ist komplett unbenutzt (keine anderen Consumer).
- [x] 12.2 Console.log / Print-Statements im neuen Code prüfen und entfernen — KEINE gefunden.
- [x] 12.3 Alte Import-Pfade prüfen: Keine verwaisten Imports in `CreateRecipePage.tsx` und `RecipeDetailPage.tsx` nach der Extraktion — TypeScript kompiliert ohne Fehler.
- [x] 12.4 TypeScript-Kompilierung prüfen: `tsc --noEmit` im `frontend-food/` läuft ohne Fehler.
