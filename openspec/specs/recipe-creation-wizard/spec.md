## ADDED Requirements

### Requirement: RecipeWizard ersetzt ContentStepper für Rezept-Erstellung
Die `CreateRecipePage` SHALL einen Rezept-spezifischen 5-Step Wizard (`RecipeWizard`) verwenden anstelle des generischen `ContentStepper`. Andere Content-Typen (GroupSession, Blog, Game) verwenden weiterhin `ContentStepper`.

#### Scenario: Rezept-Erstellungsseite lädt RecipeWizard
- **WHEN** ein Nutzer `/recipes/new` aufruft
- **THEN** wird der `RecipeWizard` mit Step 0 (Methoden-Wahl) angezeigt
- **THEN** der `ContentStepper` wird NICHT gerendert

#### Scenario: Andere Content-Typen unverändert
- **WHEN** ein Nutzer eine Gruppenstunde, Blog oder Spiel erstellt
- **THEN** wird weiterhin der `ContentStepper` verwendet

### Requirement: 5-Step Wizard Struktur
Der `RecipeWizard` SHALL aus fünf aufeinanderfolgenden Steps bestehen: (0) Methoden-Wahl, (1) Zutaten, (2) Metadaten, (3) Steps, (4) Vorschau & Speichern. Jeder Step SHALL einen "Weiter"-Button haben, der die Änderungen des aktuellen Steps via API persistiert und zum nächsten Step navigiert. Ein "Zurück"-Button SHALL zum vorherigen Step navigieren.

#### Scenario: Step-Navigation vorwärts
- **WHEN** der Nutzer auf "Weiter" klickt
- **THEN** werden die Daten des aktuellen Steps via API gespeichert
- **THEN** der Wizard navigiert zum nächsten Step

#### Scenario: Step-Navigation rückwärts
- **WHEN** der Nutzer auf "Zurück" klickt
- **THEN** navigiert der Wizard zum vorherigen Step ohne zu speichern

#### Scenario: Step-Indikator
- **WHEN** der Wizard gerendert wird
- **THEN** eine visuelle Step-Anzeige (z.B. nummerierte Punkte) zeigt den aktuellen Fortschritt

### Requirement: Step 0 — Methoden-Wahl
Step 0 SHALL dem Nutzer drei Methoden zur Rezept-Erstellung anbieten: "Manuell", "Mit KI-Hilfe", "Von URL importieren". Die gewählte Methode bestimmt, wie Step 1 initial befüllt wird.

#### Scenario: Nutzer wählt "Manuell"
- **WHEN** der Nutzer "Manuell" auswählt und auf "Weiter" klickt
- **THEN** der Wizard navigiert zu Step 1 mit leerem Zutaten-Editor
- **THEN** es wird KEIN Draft in der DB erstellt

#### Scenario: Nutzer wählt "Mit KI-Hilfe"
- **WHEN** der Nutzer "Mit KI-Hilfe" auswählt
- **THEN** ein Textfeld erscheint für die Freitext-Beschreibung des Rezepts
- **THEN** nach Eingabe und Klick auf "Generieren" wird `POST /api/recipes/ai-create/` aufgerufen
- **THEN** bei Erfolg wird ein Draft in der DB erstellt und der Wizard navigiert zu Step 1 mit vorausgefülltem Zutaten-Editor

#### Scenario: Nutzer wählt "Von URL importieren"
- **WHEN** der Nutzer "Von URL importieren" auswählt
- **THEN** ein URL-Eingabefeld erscheint
- **THEN** nach Eingabe und Klick auf "Importieren" wird `POST /api/recipes/import-from-url-enhanced/` aufgerufen
- **THEN** eine Vorschau der importierten Daten wird angezeigt
- **THEN** nach Bestätigung wird `POST /api/recipes/` aufgerufen und ein Draft erstellt
- **THEN** der Wizard navigiert zu Step 1 mit vorausgefülltem Zutaten-Editor

#### Scenario: Fehler bei KI-Generierung
- **WHEN** `POST /api/recipes/ai-create/` fehlschlägt
- **THEN** eine verständliche Fehlermeldung wird angezeigt
- **THEN** der Nutzer bleibt in Step 0 und kann es erneut versuchen oder die Methode wechseln

#### Scenario: Fehler bei URL-Import
- **WHEN** `POST /api/recipes/import-from-url-enhanced/` fehlschlägt
- **THEN** eine verständliche Fehlermeldung wird angezeigt
- **THEN** der Nutzer bleibt im URL-Dialog und kann die URL korrigieren

### Requirement: Step 1 — Zutaten (InlineIngredientEditor)
Step 1 SHALL den `InlineIngredientEditor` aus der Rezept-Detailseite als integrierte Komponente darstellen. Oberhalb des Editors SHALL ein Titel-Eingabefeld und eine Rezept-Typ-Auswahl platziert sein. Der Draft wird erstellt, sobald Titel, Rezept-Typ und mindestens eine Zutat existieren.

#### Scenario: Manuelle Zutaten-Eingabe
- **WHEN** der Nutzer in Step 1 mit leerem Editor startet (Manuell-Methode)
- **THEN** kann er Zutaten per `IngredientAutocomplete` oder `IngredientDetailSearchDialog` hinzufügen
- **THEN** der Draft wird via `POST /api/recipes/` erstellt, sobald Titel + Rezept-Typ + ≥1 Zutat vorhanden sind

#### Scenario: Vorausgefüllte Zutaten nach KI/URL
- **WHEN** der Nutzer Step 1 nach KI-Generierung oder URL-Import betritt
- **THEN** ist der Zutaten-Editor mit den generierten/importierten Zutaten vorausgefüllt
- **THEN** der Nutzer kann Zutaten bearbeiten, hinzufügen oder entfernen
- **THEN** der Draft existiert bereits in der DB (durch KI- oder URL-Flow erstellt)

#### Scenario: Titel und Rezept-Typ im Header
- **WHEN** Step 1 gerendert wird
- **THEN** ein Titel-Eingabefeld und eine Rezept-Typ-Auswahl (Grid mit Icons) sind oberhalb des Zutaten-Editors sichtbar
- **THEN** beide Felder sind Pflichtfelder für die Draft-Erstellung

#### Scenario: Portion-Scaling im Editor
- **WHEN** der Nutzer die Portionszahl im Editor ändert
- **THEN** werden die angezeigten Mengen skaliert
- **THEN** gespeichert wird immer normalisiert auf 1 Portion

### Requirement: Step 2 — Metadaten
Step 2 SHALL die Rezept-Metadaten zur Bearbeitung anbieten: Summary, Description (Markdown-Editor), Difficulty, Execution Time, Preparation Time, Tags, Scout Levels, und Visibility. Beim Klick auf "Weiter" SHALL ein `PATCH /api/recipes/{id}/` die Metadaten persistieren, ohne die in Step 1 gespeicherten Zutaten zu verändern.

#### Scenario: Metadaten speichern ohne Zutaten zu löschen
- **WHEN** der Nutzer in Step 2 auf "Weiter" klickt
- **THEN** wird `PATCH /api/recipes/{id}/` mit den Metadaten-Feldern aufgerufen
- **THEN** die in Step 1 gespeicherten `recipe_items` bleiben unverändert erhalten

#### Scenario: Description als Markdown
- **WHEN** der Nutzer die Beschreibung eingibt
- **THEN** ein `MarkdownEditor` steht zur Verfügung
- **THEN** die Beschreibung wird als Markdown gespeichert

### Requirement: Step 3 — Steps (StepEditor)
Step 3 SHALL den `StepEditor` aus der Rezept-Detailseite als integrierte Komponente darstellen. Der Editor lädt existierende Steps via `useRecipeSteps(slug)` und speichert via `PUT /api/recipes/{slug}/steps/batch`. Die verfügbaren RecipeItems aus Step 1 werden als `availableRecipeItems` an den Editor übergeben.

#### Scenario: StepEditor im Wizard
- **WHEN** Step 3 aktiv ist
- **THEN** der `StepEditor` wird mit den RecipeItems aus Step 1 als `availableRecipeItems` geladen
- **THEN** Steps können per Drag & Drop sortiert werden
- **THEN** Zutaten-Referenzen in Steps verweisen auf reale DB-IDs der RecipeItems

#### Scenario: Steps speichern bei "Weiter"
- **WHEN** der Nutzer in Step 3 auf "Weiter" klickt
- **THEN** `PUT /api/recipes/{slug}/steps/batch` wird mit dem aktuellen Stand des StepEditors aufgerufen

#### Scenario: Keine Steps vorhanden
- **WHEN** das Rezept noch keine Steps hat
- **THEN** der StepEditor zeigt einen leeren Zustand mit "Schritt hinzufügen"-Button und "Aus Zutaten generieren"-Button

### Requirement: Step 4 — Vorschau & Speichern
Step 4 SHALL eine vollständige Vorschau des Rezepts anzeigen: Titel, Rezept-Typ, Zutatenliste, Metadaten (Difficulty, Time, Tags), Beschreibung, und Steps. Ein "Fertigstellen"-Button SHALL den Status auf `submitted` setzen (falls `visibility=public`) und zur Detail-Seite navigieren.

#### Scenario: Vollständige Vorschau
- **WHEN** Step 4 aktiv ist
- **THEN** alle Rezept-Daten (Zutaten, Metadaten, Steps) werden als nicht-editierbare Vorschau angezeigt

#### Scenario: Fertigstellen
- **WHEN** der Nutzer auf "Fertigstellen" klickt
- **THEN** das Rezept wird final gespeichert
- **THEN** bei `visibility=public` wird der Status auf `submitted` gesetzt
- **THEN** der Nutzer wird auf `/recipes/{slug}` weitergeleitet

#### Scenario: Als Draft speichern
- **WHEN** der Nutzer auf "Als Entwurf speichern" klickt
- **THEN** das Rezept behält den Status `draft`
- **THEN** der Nutzer wird auf `/recipes/{slug}` weitergeleitet

### Requirement: InlineIngredientEditor als standalone Komponente
Der `InlineIngredientEditor` SHALL aus der `RecipeDetailPage` extrahiert werden, sodass er sowohl auf der Detail-Seite (`?edit=ingredients`) als auch im Wizard (Step 1) funktioniert. Der Editor akzeptiert Props für `recipeId`/`slug` und optional `initialItems`.

#### Scenario: Editor im Wizard-Kontext
- **WHEN** der `InlineIngredientEditor` im Wizard Step 1 gerendert wird
- **THEN** er nutzt die gleichen API-Hooks (`useCreateRecipeItem`, `useUpdateRecipeItem`, `useDeleteRecipeItem`)
- **THEN** er zeigt die gleichen UI-Komponenten (`IngredientAutocomplete`, `IngredientDetailSearchDialog`, `PortionScaler`)

#### Scenario: Editor auf Detail-Seite unverändert
- **WHEN** der `InlineIngredientEditor` auf der Detail-Seite (`?edit=ingredients`) gerendert wird
- **THEN** alle bestehenden Funktionen (AI-Suggestions, Mengen schätzen, Skalieren, Exchange Groups) bleiben erhalten

### Requirement: StepEditor als standalone Komponente
Der `StepEditor` SHALL aus der `RecipeDetailPage` extrahiert werden, sodass er sowohl auf der Detail-Seite (`?mode=steps`) als auch im Wizard (Step 3) funktioniert. Der Editor akzeptiert Props für `slug` und `availableRecipeItems`.

#### Scenario: Editor im Wizard-Kontext
- **WHEN** der `StepEditor` im Wizard Step 3 gerendert wird
- **THEN** er nutzt die gleichen Hooks (`useRecipeSteps`, `useBatchUpdateSteps`)
- **THEN** er zeigt die gleichen Komponenten (`StepCard`, `StepActionsBar`, `StepZutatenPanel`)

#### Scenario: Editor auf Detail-Seite unverändert
- **WHEN** der `StepEditor` auf der Detail-Seite (`?mode=steps`) gerendert wird
- **THEN** alle bestehenden Funktionen (DnD, AI-Generate, Tone-Selector, Undo/Redo) bleiben erhalten

### Requirement: Mobile-First Wizard Layout
Der Wizard SHALL auf mobilen Geräten (320px+ Breakpoint) vollständig bedienbar sein. Steps SHALL als vertikaler Flow mit klaren Call-to-Action-Buttons dargestellt werden.

#### Scenario: Mobile Step-Navigation
- **WHEN** der Wizard auf einem Viewport < 768px angezeigt wird
- **THEN** "Weiter" und "Zurück" Buttons sind am unteren Rand fixiert (sticky)
- **THEN** der Step-Indikator ist kompakt und benötigt maximal eine Zeile

### Requirement: KI-gestützte Erstbefüllung über ai-create
Der Wizard Step 0 SHALL bei Auswahl von "Mit KI-Hilfe" den existierenden `POST /api/recipes/ai-create/` Endpoint nutzen. Dieser erstellt einen vollständigen Draft mit Titel, Beschreibung, Rezept-Typ, Difficulty, Dauer und Zutaten (inkl. Portion-Matching).

#### Scenario: KI erstellt vollständigen Draft
- **WHEN** der Nutzer eine Beschreibung wie "Nudelauflauf mit Hackfleisch und Käse überbacken" eingibt
- **THEN** `POST /api/recipes/ai-create/` liefert einen Draft mit Titel, recipe_type, difficulty, execution_time und recipe_items
- **THEN** der Draft wird in der DB gespeichert (status=draft)
- **THEN** der Wizard navigiert zu Step 1 mit den KI-generierten Zutaten
