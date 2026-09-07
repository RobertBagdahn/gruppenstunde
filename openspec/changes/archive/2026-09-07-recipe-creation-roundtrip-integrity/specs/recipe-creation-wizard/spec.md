## MODIFIED Requirements

### Requirement: 5-Step Wizard Struktur
Der `RecipeWizard` SHALL aus fünf aufeinanderfolgenden Steps bestehen: (0) Methoden-Wahl, (1) Zutaten, (2) Metadaten, (3) Steps, (4) Vorschau & Speichern. Jeder Step SHALL einen "Weiter"-Button haben, der die Änderungen des aktuellen Steps via API persistiert und erst nach erfolgreichem Abschluss zum nächsten Step navigiert. Ein "Zurück"-Button SHALL zum vorherigen Step navigieren.

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

### Requirement: Step 3 — Steps (StepEditor)
Step 3 SHALL den `StepEditor` aus der Rezept-Detailseite als integrierte Komponente darstellen. Der Editor lädt existierende Steps via `useRecipeSteps(slug)` und speichert via `PUT /api/recipes/{slug}/steps/batch`. Die verfügbaren RecipeItems aus Step 1 werden als `availableRecipeItems` an den Editor übergeben. Der Editor SHALL seinen aktuellen Stand dem Wizard zum Speichern zur Verfügung stellen.

#### Scenario: Steps speichern bei "Weiter"
- **WHEN** der Nutzer in Step 3 auf "Weiter" klickt
- **THEN** wird der aktuelle Stand des StepEditors genau einmal mit `PUT /api/recipes/{slug}/steps/batch` gespeichert
- **THEN** wird bei erfolgreicher Antwort der lokale Dirty-Status gelöscht

#### Scenario: Stepspeicherung schlägt fehl
- **WHEN** `PUT /api/recipes/{slug}/steps/batch` fehlschlägt
- **THEN** bleibt der Nutzer in Step 3
- **THEN** bleiben die lokalen Änderungen im Editor erhalten

### Requirement: KI-gestützte Erstbefüllung über ai-create
Der Wizard Step 0 SHALL bei Auswahl von "Mit KI-Hilfe" den existierenden `POST /api/recipes/ai-create/` Endpoint nutzen. Dieser erstellt einen vollständigen Draft mit Titel, Beschreibung, Rezept-Typ, Difficulty, Dauer und Zutaten (inkl. Portion-Matching). Alle danach im Wizard vorgenommenen manuellen Änderungen SHALL beim Weitergehen und nach einem Reload erhalten bleiben.

#### Scenario: KI erstellt vollständigen Draft
- **WHEN** der Nutzer eine Beschreibung wie "Nudelauflauf mit Hackfleisch und Käse überbacken" eingibt
- **THEN** `POST /api/recipes/ai-create/` liefert einen Draft mit Titel, recipe_type, difficulty, execution_time und recipe_items
- **THEN** der Draft wird in der DB gespeichert (status=draft)
- **THEN** der Wizard navigiert zu Step 1 mit den KI-generierten Zutaten

#### Scenario: KI-Draft wird manuell angepasst
- **WHEN** der Nutzer Zutaten, Metadaten oder Zubereitung eines KI-Drafts ändert und den jeweiligen Step verlässt
- **THEN** werden die manuellen Änderungen via API gespeichert
- **THEN** überschreibt kein späterer Query-Refresh die manuellen Änderungen
