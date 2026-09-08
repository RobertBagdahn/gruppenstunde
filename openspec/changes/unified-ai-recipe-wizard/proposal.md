## Why

Die Rezepterstellung im Food-Frontend bietet aktuell drei konkurrierende Wege (Manuell, KI, URL) plus eine verwaiste vierte Route `/recipes/import`. Alle Wege teilen sich eine Datenschicht, in der sechs reproduzierte Fehler stecken: Der URL-Import quittiert reale Links mit HTTP 500, ein Zod/Pydantic-Vertragsbruch lässt selbst erfolgreiche Importe im Frontend scheitern, Zutaten verdoppeln sich, Mengen werden stillschweigend in Gramm verfälscht, und der Wizard löscht beim Klick auf "Weiter" die KI-generierte Zubereitung — wodurch das Rezept auf der Detailseite gar nicht mehr bearbeitbar ist.

Eine reine UI-Vereinheitlichung würde nur eine schönere Oberfläche über denselben defekten Kern legen. Datenschicht und Wizard müssen zusammen saniert werden.

## What Changes

### Fehlerbehebungen in der Import- und Speicher-Pipeline

- **BREAKING** `recipe/services/url_import_service.py` `_resolve_portion()` verändert bestehende `Portion`-Stammdaten nicht mehr. Das Umbenennen einer gefundenen Portion (aktuell Zeilen 1114–1118) entfällt ersatzlos. Es verursacht `IntegrityError: unique_portion_name_per_ingredient` und damit HTTP 500, weil die Kollisionsprüfung `deleted_at__isnull=True` filtert, der DB-Constraint aber alle Zeilen umfasst.
- **BREAKING** `RecipeDraftOut.tag_ids` und das Zod-Gegenstück werden angeglichen. Backend liefert UUID-Strings (`import_schemas.py:62` `list[str]`), Frontend erwartet Zahlen (`recipeImport.ts:43` `z.array(z.number())`). Jeder von Gemini gelieferte Tag lässt `RecipeImportUrlResponseSchema.parse()` werfen.
- Der Gemini-Prompt in `_call_gemini_for_metadata()` übergibt Zutaten strukturiert statt als konkatenierten String (`url_import_service.py:738`). Gemini spiegelt sonst `"300 g Hähnchenbrustfilet(s)"` als `original_name` zurück, wodurch der Merge-Key nie trifft und aus 10 Zutaten 17 werden.
- Zutaten ohne auflösbare Einheit erzeugen kein `portion_id: null` mehr. Solche Positionen werden als klärungsbedürftig markiert und im Wizard vom Nutzer entschieden, bevor gespeichert werden kann.
- Der Metadaten-Schritt sendet nur noch tatsächlich geladene oder geänderte Werte. Aktuell überschreibt `RecipeWizard.handleNext` (Zeilen 205–216) `description`, `summary`, `difficulty`, `execution_time` und `preparation_time` mit Leerstrings aus dem uninitialisierten `metadataRef`.
- `PATCH /api/recipes/{id}/` weist leere Werte für `difficulty`, `execution_time` und `preparation_time` zurück, statt sie mit HTTP 200 zu persistieren.
- `RecipeDetailPage` rendert den Zubereitungs-Editor auch bei leerer `description`, damit fehlender Inhalt ergänzbar bleibt statt die Bearbeitung unmöglich zu machen.

### Vereinheitlichung auf einen KI-Weg

- Die Methodenwahl in Wizard-Step 0 entfällt. Stattdessen ein einzelnes Smart-Feld, das URL, kopierten Rezepttext oder eine Freitext-Idee entgegennimmt und den Typ serverseitig erkennt.
- Schlägt der direkte Seitenabruf fehl, rekonstruiert Gemini mit Google Search Grounding die Rezeptdaten aus der URL, statt den Nutzer mit einer Fehlermeldung stehenzulassen.
- Der Wizard wird auf fünf Schritte mit Hilfetexten neu geschnitten: Smart-Eingabe, Basis & Portionen, Zutaten, Zubereitung, Vorschau.
- Der Wizard fragt die Personenzahl des Originalrezepts ab und erklärt die interne Normierung auf eine Portion.
- **BREAKING** Die verwaiste Route `/recipes/import` und `RecipeImportPage.tsx` werden entfernt.
- Der bisher wirkungslose Deeplink `/recipes/new?ingredient=<slug>` aus `IngredientDetailPage.tsx:513` wird im Wizard ausgewertet.

### Tests

- Playwright deckt den vereinheitlichten Weg mit deterministischen KI-Fixtures ab (Erfolg, blockierte Quelle, unklare Einheit, Metadaten-Erhalt).
- Ein separater Live-Test prüft echten URL-Import und echte KI-Erstellung außerhalb des Standardlaufs.

## Capabilities

### New Capabilities

- `unified-recipe-creation`: Einheitlicher KI-gestützter Erstellungsweg mit Smart-Eingabefeld, Quellenerkennung, Grounding-Fallback und Hilfetexten pro Schritt.
- `recipe-import-integrity`: Garantien der Import-Pipeline — keine Mutation bestehender Portionen, keine Zutaten-Duplikate, keine stillen Null-Portionen, synchrone Pydantic/Zod-Verträge.
- `recipe-wizard-data-preservation`: Schutz bereits vorhandener Rezeptinhalte vor Überschreiben durch nicht bearbeitete Wizard-Felder, inklusive serverseitiger Ablehnung leerer Auswahlfelder.

### Modified Capabilities

- `recipe-creation-wizard`: Die Methodenwahl in Step 0 entfällt; der Wizard wird auf einen einzigen KI-gestützten Einstieg mit neuer Schrittfolge umgestellt.
- `recipe-url-import`: Die Option "Von URL importieren" ist keine eigenständige Auswahl mehr, sondern Teil der Smart-Eingabe; Grounding-Fallback und `portion_id`-Garantie werden verbindlich.
- `recipe-url-import-errors`: Ergänzt um Fehlerfälle für Portions-Kollisionen und den Grounding-Fallback bei blockierten Quellen.
- `recipe-serving-input-context`: Die Abfrage der Original-Personenzahl wird verpflichtender Bestandteil des neuen Schritts "Basis & Portionen".
- `recipe-wizard-tag-mapping`: `tag_ids` sind durchgängig UUID-Strings über Backend und Frontend hinweg.

## Impact

### Backend (Django-Apps)

- `recipe/services/url_import_service.py`: `_resolve_portion()`, `_build_recipe_items_v2()`, `_call_gemini_for_metadata()`, `_ingredient_key()`, `import_recipe_from_url()`
- `recipe/services/import_service.py`: Grounding-Fallback bei `SourceUnreachableError`
- `recipe/services/recipe_ai_suggest_service.py`: `ai_create_recipe()` setzt `visibility` und `authors` konsistent
- `recipe/api/recipes.py`: `update_recipe()` Validierung, neuer bzw. erweiterter Smart-Eingabe-Endpunkt
- `supply`: keine Modelländerung, aber `Portion` wird vom Import nur noch lesend bzw. anlegend genutzt

### Pydantic-Schemas

- `recipe/schemas/import_schemas.py`: `RecipeDraftOut.tag_ids`, `RecipeItemDraftOut.portion_id` inklusive Klärungsstatus
- `recipe/schemas/recipes.py`: `RecipeUpdateIn` Validierung für `difficulty`, `execution_time`, `preparation_time`

### Zod-Schemas (synchron zu halten)

- `frontend-food/src/api/recipeImport.ts`: `RecipeDraftSchema.tag_ids`, `RecipeItemDraftSchema`
- `frontend-food/src/schemas/recipe.ts`: abgeleitete Typen

### Frontend (React-Pages und Komponenten)

- `frontend-food/src/components/recipe/RecipeWizard.tsx`, `WizardStepMethod.tsx`, `WizardStepIngredients.tsx`, `WizardStepMetadata.tsx`, `WizardStepSteps.tsx`, `WizardStepPreview.tsx`
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx`, `RecipeDetailPage.tsx`
- Entfernt: `frontend-food/src/pages/recipes/RecipeImportPage.tsx` und Route in `App.tsx:78`

### Migrationen

Keine Modelländerungen und damit keine neue Migration erforderlich. Bestehende Migrationen bleiben unverändert.

Zu prüfen ist der Datenbestand: Durch den bisherigen Import können bereits `RecipeItem`-Zeilen mit `portion_id = NULL` existieren, deren Mengen fälschlich als Gramm interpretiert werden. Ein Management Command soll diese Fälle auflisten, damit sie bewertet werden können.

### Tests

- `backend/recipe/tests/`: Regressionstests für Portions-Kollision, Merge-Duplikate, leere PATCH-Werte
- `e2e/tests/recipe-workflows.spec.ts`: Umstellung auf den vereinheitlichten Weg
- Neu: Live-Test für echten URL-Import und echte KI-Erstellung
