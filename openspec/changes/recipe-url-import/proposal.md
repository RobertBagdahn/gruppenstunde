## Why

Rezepte manuell einzugeben ist zeitaufwändig. Viele Nutzer haben bereits Rezepte auf Websites gefunden und wollen diese schnell importieren. Aktuell gibt es keine Möglichkeit, eine URL einzugeben und ein vollständiges Rezept mit korrekt verknüpften Zutaten (inkl. Nährwerte und Scores) automatisch anzulegen.

## What Changes

- **Neue UI-Option** auf der "Rezept erstellen"-Seite: "Von URL importieren" als dritte Karte neben "Mit KI-Hilfe" und "Manuell"
- **Neuer Backend-Endpoint** `POST /api/recipes/import-from-url/` der:
  - Webseite fetcht und schema.org/Recipe JSON-LD bevorzugt parst
  - Gemini + Google Search Grounding nutzt um Rezept-Metadaten, Zutaten und Nährwerte zu extrahieren
  - Existierende Ingredients per Textsuche (name + aliases) vorfiltern und Gemini matchen lässt
  - Fehlende Ingredients mit allen Feldern (Nährwerte, Scores, Aliases, Portionen) automatisch anlegt
- **Neues Model-Feld** `Recipe.source_url` (URLField) für die Quell-Attribution
- **Pydantic-Schemas**: Neues `RecipeImportUrlInput` und `RecipeImportUrlResponse` Schema
- **Zod-Schemas**: Entsprechende Frontend-Schemas für Request/Response
- **Migration**: Neues `source_url` Feld auf Recipe

## Capabilities

### New Capabilities
- `recipe-url-import`: Vollständiger URL-Import-Flow mit Gemini-basierter Analyse, Ingredient-Matching gegen DB, automatischer Ingredient-Erstellung mit Nährwerten/Scores, und Vorschau vor dem Speichern

### Modified Capabilities
_(keine — die bestehende `recipe-url-import` Spec wird durch die neue ersetzt)_

## Impact

- **Backend Apps**: `recipe` (neuer Endpoint, neues Feld), `supply` (Ingredient-Erstellung)
- **Frontend Pages**: `/recipes/new` (neue Import-Option + URL-Eingabe-UI)
- **APIs**: Neuer Endpoint `POST /api/recipes/import-from-url/`
- **Schemas**: Neue Pydantic-Schemas in `recipe/schemas/`, neue Zod-Schemas in `frontend/src/schemas/`
- **Dependencies**: Google Gemini API mit `google_search_retrieval` Tool, Web-Scraping (httpx + BeautifulSoup oder ähnlich)
- **Migration**: `recipe` App bekommt neues `source_url` Feld
