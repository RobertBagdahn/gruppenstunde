## Context

Die "Rezept erstellen"-Seite bietet aktuell zwei Wege: KI-Hilfe (Freitext) und Manuell. Viele Nutzer haben bereits Rezepte auf externen Websites gefunden. Ein URL-Import spart erheblich Zeit und legt dabei auch fehlende Zutaten mit vollständigen Nährwertdaten an.

Bestehende Infrastruktur:
- `core/services/gemini.py` — zentraler Gemini-Client mit Rate Limiting (`gemini_call()`)
- `recipe/services/ai_ingredients_service.py` — existierender KI-Service für Zutaten-Extraktion
- Vertex AI Gemini mit ADC, kein API Key
- `supply/models/ingredient.py` — Ingredient mit 30+ Feldern, IngredientAlias, Portion

## Goals / Non-Goals

**Goals:**
- URL eingeben → vollständiges Rezept mit verknüpften Zutaten als Vorschau
- Existierende Ingredients per Textsuche + Gemini-Matching wiederverwenden
- Neue Ingredients mit Nährwerten, Scores, Aliases und Portionen automatisch anlegen
- Quell-URL am Rezept speichern

**Non-Goals:**
- Kein Batch-Import (mehrere URLs gleichzeitig)
- Kein periodisches Re-Sync mit der Quell-URL
- Kein Bild-Download von der Quell-Seite (vorerst)
- Keine Unterstützung für Login-geschützte Rezeptseiten

## Decisions

### 1. Parsing-Strategie: schema.org zuerst, Gemini als Fallback

**Entscheidung**: Webseite fetchen, zuerst nach `schema.org/Recipe` JSON-LD suchen. Falls vorhanden, strukturiert parsen. Falls nicht oder unvollständig, den HTML-Body an Gemini übergeben.

**Alternativen**:
- Immer Gemini: Teurer, langsamer, aber konsistenter
- Nur schema.org: Zu viele Seiten ohne strukturierte Daten

**Rationale**: schema.org ist zuverlässiger und kostenlos. Gemini als Fallback deckt den Rest ab.

### 2. Ein kombinierter Gemini-Call für Extraktion + Matching

**Entscheidung**: Ein einziger Gemini-Call mit Google Search Grounding der:
- Rezept-Metadaten extrahiert/validiert
- Für jede Zutat: gegen vorgefilterter DB-Kandidaten matcht ODER neue Zutat mit allen Feldern generiert

**Alternativen**:
- Separate Calls pro Zutat: Zu langsam (10-15 API-Calls)
- Zwei Phasen (erst extrahieren, dann matchen): Doppelte Latenz

**Rationale**: Ein Call minimiert Latenz. Gemini kann im Kontext aller Zutaten bessere Entscheidungen treffen.

### 3. Textsuche als Vorfilterung für Ingredient-Matching

**Entscheidung**: Pro extrahierter Zutat eine `icontains`-Suche auf `Ingredient.name` + `IngredientAlias.name`. Top-5 Kandidaten an Gemini übergeben.

**Alternativen**:
- Embedding-Similarity: Overhead für Setup, overkill
- Komplette DB-Liste: Zu viel Token-Verbrauch

**Rationale**: Einfach, schnell, gute Recall für deutsche Zutaten-Namen.

### 4. Web Scraping mit httpx + BeautifulSoup

**Entscheidung**: `httpx` für async-fähiges HTTP, `beautifulsoup4` für HTML/JSON-LD Parsing.

**Alternativen**:
- `requests`: Nicht async, aber würde auch funktionieren
- Playwright/Selenium: Overkill, die meisten Rezeptseiten brauchen kein JS-Rendering

**Rationale**: Leichtgewichtig, bereits im Python-Ökosystem bewährt.

### 5. Gemini-Modell und Grounding-Config

**Entscheidung**: `gemini-2.0-flash` mit `google_search_retrieval` Tool für Nährwert-Recherche. Structured JSON output via `response_mime_type: "application/json"`.

**Rationale**: Flash ist schnell genug für die Latenz, Grounding liefert aktuelle Nährwertdaten.

## API-Design

```
POST /api/recipes/import-from-url/
```

**Request** (Pydantic: `RecipeImportUrlInput`):
```json
{ "url": "https://example.com/recipe/..." }
```

**Response** (Pydantic: `RecipeImportUrlResponse`):
```json
{
  "recipe_draft": {
    "title": "...",
    "description": "...",
    "servings": 4,
    "preparation_time": 15,
    "execution_time": 30,
    "recipe_type": "main_dish",
    "source_url": "https://..."
  },
  "recipe_items": [
    {
      "ingredient_id": 42,
      "ingredient_name": "Zwiebel",
      "quantity": 2.0,
      "measuring_unit_id": 5,
      "measuring_unit_name": "Stück",
      "note": "rot",
      "is_new_ingredient": false
    }
  ],
  "created_ingredients": [
    {
      "id": 123,
      "name": "Harissa-Paste",
      "aliases": ["Harissa"],
      "nutri_class": 3
    }
  ]
}
```

## Betroffene Dateien

**Backend:**
- `recipe/models/recipe.py` — neues Feld `source_url`
- `recipe/schemas/` — neue Schemas `RecipeImportUrlInput`, `RecipeImportUrlResponse`
- `recipe/services/url_import_service.py` — neuer Service (Haupt-Pipeline)
- `recipe/api/` — neuer Endpoint
- Migration für `source_url`

**Frontend:**
- `src/pages/recipes/new/` — dritte Option-Card + URL-Eingabe
- `src/schemas/recipe.ts` — neue Zod-Schemas
- `src/hooks/useRecipeImportUrl.ts` — TanStack Query Mutation

## Datenbank-Migration

- `Recipe.source_url = URLField(max_length=500, blank=True, default="")`
- Einfaches `ALTER TABLE ADD COLUMN`, kein Datenverlust

## Risks / Trade-offs

- **[Latenz 10-30s]** → Loading-Hinweis im UI: "Rezept wird analysiert... Das kann einen Moment dauern."
- **[Gemini Halluzination bei Nährwerten]** → Google Search Grounding minimiert das; User kann in Vorschau korrigieren
- **[Webseite blockt Scraping]** → User-Agent setzen, bei 403/Timeout klare Fehlermeldung
- **[Token-Limit bei großen Seiten]** → HTML auf relevante Teile trimmen (recipe container, `<main>`, etc.)
- **[Rate Limit]** → Nutzt existierendes `gemini_call()` mit globalem Limit
