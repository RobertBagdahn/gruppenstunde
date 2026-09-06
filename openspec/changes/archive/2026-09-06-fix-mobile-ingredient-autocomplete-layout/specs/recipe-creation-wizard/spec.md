## MODIFIED Requirements

### Requirement: Step 1 — Zutaten (InlineIngredientEditor)
Step 1 SHALL den `InlineIngredientEditor` aus der Rezept-Detailseite als integrierte Komponente darstellen. Oberhalb des Editors SHALL ein Titel-Eingabefeld und eine Rezept-Typ-Auswahl platziert sein. Der Draft wird erstellt, sobald Titel, Rezept-Typ und mindestens eine Zutat existieren. Auf mobilen Viewports SHALL die manuelle Zutaten-Autovervollständigung eine stabile Eingabezeile mit direkt darunterliegenden Kategorie-Pills und darunterliegender Trefferliste bereitstellen.

#### Scenario: Manuelle Zutaten-Eingabe
- **WHEN** der Nutzer in Step 1 mit leerem Editor startet (Manuell-Methode)
- **THEN** kann er Zutaten per `IngredientAutocomplete` oder `IngredientDetailSearchDialog` hinzufügen
- **THEN** der Draft wird via `POST /api/recipes/` erstellt, sobald Titel + Rezept-Typ + ≥1 Zutat vorhanden sind

#### Scenario: Mobile autocomplete row remains stable
- **WHEN** der Nutzer auf einem mobilen Viewport in das Feld „Zutat hinzufügen...“ tippt
- **THEN** bleibt die Eingabezeile einschließlich Detail-Suche exakt 44px hoch und vertikal ausgerichtet
- **THEN** werden Kategorie-Pills direkt unter der Eingabezeile angezeigt
- **THEN** beginnt die Trefferliste unterhalb der Kategorie-Pills

#### Scenario: Mobile category filtering preserves input state
- **WHEN** der Nutzer eine Kategorie-Pill auswählt
- **THEN** bleibt der vorhandene Suchtext erhalten
- **THEN** wird die Trefferliste mit Suchtext und ausgewählter Kategorie aktualisiert
- **THEN** bleibt der Fokus im Eingabefeld erhalten

#### Scenario: Autocomplete closes on blur
- **WHEN** das Eingabefeld den Fokus verliert, ohne dass der Nutzer eine Kategorie oder einen Treffer auswählt
- **THEN** werden Kategorie-Pills und Trefferliste ausgeblendet
- **THEN** bleibt der Suchtext im Eingabefeld erhalten

#### Scenario: Mobile focus scrolls the input into view
- **WHEN** der Nutzer das Zutatenfeld auf einem mobilen Touch-Viewport fokussiert
- **THEN** scrollt die normale Seite das Feld automatisch in den sichtbaren Bereich
- **THEN** bleibt ungefähr 16px Abstand oberhalb des Feldes bestehen
- **THEN** wird kein separater Zutaten-Scrollcontainer verwendet
