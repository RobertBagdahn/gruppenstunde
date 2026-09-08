# recipe-creation-wizard Specification

## Purpose
Multi-step wizard for creating recipes through one unified smart input flow, editing all recipe data, and preserving it through completion.

## Requirements

### Requirement: RecipeWizard ersetzt ContentStepper für Rezept-Erstellung
Die `CreateRecipePage` SHALL einen Rezept-spezifischen 5-Step Wizard (`RecipeWizard`) verwenden anstelle des generischen `ContentStepper`. Andere Content-Typen (GroupSession, Blog, Game) verwenden weiterhin `ContentStepper`.

#### Scenario: Rezept-Erstellungsseite lädt RecipeWizard
- **WHEN** ein Nutzer `/recipes/new` aufruft
- **THEN** wird der `RecipeWizard` mit Step 0 (Smart-Eingabe) angezeigt
- **THEN** der `ContentStepper` wird NICHT gerendert

#### Scenario: Andere Content-Typen unverändert
- **WHEN** ein Nutzer eine Gruppenstunde, Blog oder Spiel erstellt
- **THEN** wird weiterhin der `ContentStepper` verwendet

### Requirement: 5-Step Wizard Struktur
Der `RecipeWizard` SHALL aus fünf aufeinanderfolgenden Steps bestehen: (0) Smart-Eingabe, (1) Basis & Portionen, (2) Zutaten, (3) Zubereitung, (4) Vorschau & Speichern. Jeder Step SHALL einen "Weiter"-Button haben, der die Änderungen des aktuellen Steps via API persistiert und erst nach erfolgreichem Abschluss zum nächsten Step navigiert. Ein "Zurück"-Button SHALL zum vorherigen Step navigieren. Die Fertigstellung in Step 4 SHALL den Status gemäß der Sichtbarkeit des Rezepts behandeln. Jeder Step SHALL einen erklärenden deutschen Hilfetext anzeigen.

#### Scenario: Step-Navigation vorwärts
- **WHEN** der Nutzer auf "Weiter" klickt
- **THEN** werden alle Änderungen des aktuellen Steps via API gespeichert
- **THEN** wartet der Wizard auf den erfolgreichen Abschluss der Speicherung
- **THEN** navigiert der Wizard zum nächsten Step

#### Scenario: Step-Navigation bei Speichervorgang
- **WHEN** der Nutzer während einer laufenden Speicherung erneut auf "Weiter" klickt
- **THEN** wird keine zweite Speicherung gestartet
- **THEN** bleibt der bestehende Speichervorgang maßgeblich für die Navigation

#### Scenario: Step-Navigation rückwärts
- **WHEN** der Nutzer auf "Zurück" klickt
- **THEN** navigiert der Wizard zum vorherigen Step ohne ungespeicherte Änderungen stillschweigend zu verwerfen

#### Scenario: Step-Indikator
- **WHEN** der Wizard gerendert wird
- **THEN** eine visuelle Step-Anzeige (z.B. nummerierte Punkte) zeigt den aktuellen Fortschritt

#### Scenario: Hilfetext pro Step
- **WHEN** ein beliebiger Step aktiv ist
- **THEN** SHALL ein deutscher Hilfetext den Zweck des Steps erklären

#### Scenario: Private Fertigstellung
- **WHEN** ein Nutzer im Vorschau-Step ein privates Rezept fertigstellt
- **THEN** wird kein öffentlicher Statusübergang ausgelöst
- **THEN** navigiert der Wizard nach erfolgreicher Fertigstellung zur Rezeptdetailseite

#### Scenario: Öffentliche Fertigstellung
- **WHEN** ein Nutzer im Vorschau-Step ein öffentliches Rezept fertigstellt
- **THEN** wird der Statusübergang zu `submitted` erfolgreich persistiert
- **THEN** navigiert der Wizard erst nach erfolgreicher Antwort zur Rezeptdetailseite

#### Scenario: Fertigstellung schlägt fehl
- **WHEN** die Statuspersistenz im Vorschau-Step fehlschlägt
- **THEN** bleibt der Nutzer im Vorschau-Step
- **THEN** wird eine deutsche Fehlermeldung angezeigt

### Requirement: Step 0 — Smart-Eingabe
Step 0 SHALL ein einzelnes Smart-Eingabefeld anbieten, das eine URL, einen kopierten Rezepttext oder eine Freitext-Idee entgegennimmt. Der Eingabetyp SHALL serverseitig erkannt werden. Eine Auswahl zwischen Erstellungsmethoden SHALL NICHT angeboten werden.

#### Scenario: Nutzer fügt eine Rezept-URL ein
- **WHEN** der Nutzer eine URL einfügt und die Analyse auslöst
- **THEN** SHALL das Backend die Seite abrufen und die Rezeptdaten extrahieren
- **THEN** SHALL bei Erfolg ein Draft erstellt werden und der Wizard zu Step 1 navigieren

#### Scenario: Nutzer fügt einen kopierten Rezepttext ein
- **WHEN** der Nutzer einen mehrzeiligen Rezepttext mit Mengenangaben einfügt und die Analyse auslöst
- **THEN** SHALL das Backend Zutaten und Schritte aus dem Text extrahieren
- **THEN** SHALL bei Erfolg ein Draft erstellt werden und der Wizard zu Step 1 navigieren

#### Scenario: Nutzer beschreibt eine Rezeptidee
- **WHEN** der Nutzer eine kurze Beschreibung wie "Käsespätzle für 4 Personen" eingibt und die Analyse auslöst
- **THEN** SHALL das Backend ein vollständiges Rezept generieren
- **THEN** SHALL bei Erfolg ein Draft erstellt werden und der Wizard zu Step 1 navigieren

#### Scenario: Analyse schlägt fehl
- **WHEN** die Analyse mit einem Fehler endet
- **THEN** SHALL eine verständliche deutsche Fehlermeldung angezeigt werden
- **THEN** SHALL der Nutzer in Step 0 bleiben und die Eingabe korrigieren können
- **THEN** SHALL kein unvollständiger Draft zurückbleiben

### Requirement: Step 2 — Zutaten
Step 2 SHALL den `InlineIngredientEditor` als integrierte Komponente darstellen. Die Mengen SHALL für die in Step 1 festgelegte Original-Personenzahl angezeigt werden. Positionen ohne aufgelöste Einheit SHALL hervorgehoben und vor dem Fortfahren geklärt werden.

#### Scenario: Vorausgefüllte Zutaten nach der Analyse
- **WHEN** der Nutzer Step 2 betritt
- **THEN** ist der Zutaten-Editor mit den analysierten Zutaten vorausgefüllt
- **THEN** der Nutzer kann Zutaten bearbeiten, hinzufügen oder entfernen

#### Scenario: Mengen im Kontext der Original-Personenzahl
- **WHEN** der Nutzer in Step 1 eine Original-Personenzahl festgelegt hat
- **THEN** SHALL der Editor die Gesamtmengen für diese Personenzahl anzeigen
- **THEN** SHALL beim Speichern auf eine Portion normiert werden

#### Scenario: Klärungsbedürftige Position blockiert das Fortfahren
- **WHEN** mindestens eine Zutat keine aufgelöste Einheit besitzt
- **THEN** SHALL der "Weiter"-Button die Navigation verhindern
- **THEN** SHALL eine deutsche Meldung die betroffenen Zutaten benennen

#### Scenario: Zutat per Suche ergänzen
- **WHEN** der Nutzer eine weitere Zutat hinzufügen möchte
- **THEN** stehen `IngredientAutocomplete` und `IngredientDetailSearchDialog` zur Verfügung

### Requirement: Step 3 — Metadaten und Zubereitung
Step 3 SHALL die Zubereitungsschritte sowie Schwierigkeit, Zubereitungszeit und Vorbereitungszeit zur Bearbeitung anbieten. Beim Fortfahren SHALL ausschließlich veränderter oder aus dem Rezept geladener Inhalt persistiert werden; uninitialisierte Standardwerte MUST NICHT gesendet werden.

#### Scenario: Zubereitung bearbeiten
- **WHEN** der Nutzer Zubereitungsschritte hinzufügt, ändert oder umsortiert
- **THEN** SHALL genau ein Batch-Update die Änderungen persistieren

#### Scenario: Vorhandene Inhalte bleiben ohne Eingabe erhalten
- **WHEN** der Nutzer Step 3 ohne jede Eingabe verlässt
- **THEN** SHALL die vorhandene Beschreibung des Rezepts unverändert bleiben
- **THEN** SHALL Schwierigkeit, Zubereitungszeit und Vorbereitungszeit unverändert bleiben

#### Scenario: Beschreibung als Markdown
- **WHEN** der Nutzer die Beschreibung bearbeitet
- **THEN** steht ein `MarkdownEditor` zur Verfügung
- **THEN** wird die Beschreibung als Markdown gespeichert

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
Der `InlineIngredientEditor` SHALL aus der `RecipeDetailPage` extrahiert werden, sodass er sowohl auf der Detail-Seite (`?edit=ingredients`) als auch im Wizard (Step 2) funktioniert. Der Editor akzeptiert Props für `recipeId`/`slug` und optional `initialItems`.

#### Scenario: Editor im Wizard-Kontext
- **WHEN** der `InlineIngredientEditor` im Wizard Step 2 gerendert wird
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

### Requirement: KI-gestützte Erstbefüllung über die Smart-Eingabe
Der Wizard SHALL die Smart-Eingabe in Step 0 nutzen, um einen vollständigen Draft mit Titel, Beschreibung, Rezept-Typ, Schwierigkeit, Dauer und Zutaten inklusive Portion-Matching zu erzeugen. Alle danach im Wizard vorgenommenen manuellen Änderungen SHALL beim Weitergehen und nach einem Reload erhalten bleiben.

#### Scenario: Analyse erstellt vollständigen Draft
- **WHEN** der Nutzer eine URL, einen Rezepttext oder eine Beschreibung eingibt und die Analyse auslöst
- **THEN** SHALL ein Draft mit Titel, recipe_type, difficulty, execution_time und recipe_items entstehen
- **THEN** SHALL der Draft mit Status `draft` gespeichert werden
- **THEN** SHALL der Wizard zu Step 1 navigieren

#### Scenario: Draft wird manuell angepasst
- **WHEN** der Nutzer Zutaten, Metadaten oder Zubereitung des Drafts ändert und den jeweiligen Step verlässt
- **THEN** werden die manuellen Änderungen via API gespeichert
- **THEN** überschreibt kein späterer Query-Refresh die manuellen Änderungen

### Requirement: Recipe creation wizard persists edits across steps
The recipe creation wizard SHALL persist the complete state of the active step before advancing. Ingredient changes, metadata including summary and description, and preparation-step changes MUST be sent to the server before navigation, and the wizard MUST remain on the current step when persistence fails.

#### Scenario: Ingredient edits are persisted before metadata navigation
- **WHEN** a user changes the recipe title, type, or ingredients and clicks `Weiter`
- **THEN** the ingredient state and recipe title/type SHALL be persisted before the preparation step becomes active

#### Scenario: Metadata summary and description are persisted before step navigation
- **WHEN** a user changes the short summary and Markdown description and clicks `Weiter`
- **THEN** the recipe update request SHALL contain both fields and the values SHALL be visible after reload

#### Scenario: Preparation edits are persisted exactly once
- **WHEN** a user changes a preparation instruction and clicks `Weiter`
- **THEN** exactly one batch step update SHALL contain the edited instruction before the preview step becomes active

#### Scenario: Failed persistence blocks navigation
- **WHEN** the active-step persistence request fails
- **THEN** the wizard SHALL remain on the active step, SHALL show the structured German error, and SHALL preserve the local edit for retry

### Requirement: Recipe creation import paths are deterministic and complete
Der vereinheitlichte Erstellungsweg SHALL editierbare Zutaten, Metadaten, Zubereitungsschritte, Portionssemantik und Quellenangaben über Fertigstellung und Reload hinweg erhalten. Dies gilt gleichermaßen für die Eingabetypen URL, Rezepttext und Freitext-Idee.

#### Scenario: Draft aus Freitext-Idee unterstützt manuelle Anpassungen
- **WHEN** ein deterministischer Draft aus einer Freitext-Idee erzeugt wurde und der Nutzer Zutaten oder Zubereitung ändert
- **THEN** SHALL die manuellen Änderungen persistiert und nicht durch veraltete KI-Antwortdaten ersetzt werden

#### Scenario: URL-Eingabe erhält Quellenangaben
- **WHEN** eine deterministische URL-Analyse bestätigt wurde
- **THEN** SHALL das erzeugte Rezept Quell-URL, unterstützte Tags, erkannte Portionssemantik, importierte Positionen und importierte Zubereitungsschritte behalten

#### Scenario: Fehlgeschlagene Analyse erzeugt kein Teilrezept
- **WHEN** die Analyse einen klassifizierten Quellen- oder Verarbeitungsfehler zurückgibt
- **THEN** SHALL die Oberfläche den zugeordneten deutschen Fehler anzeigen
- **THEN** SHALL nicht zu einem teilweise erstellten Rezept navigiert werden
