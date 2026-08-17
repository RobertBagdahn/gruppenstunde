## Context

Zutaten haben 30+ Felder (Nährwerte, Scores, Physik) plus Portionen und Aliase. Rezepte haben Metadaten (Beschreibung, Schwierigkeit, Dauer, Tags) plus Zutaten-Items. Beim Anlegen und Pflegen werden diese oft unvollständig gelassen.

Bestehende Infrastruktur:
- `core/services/gemini.py` → `gemini_call()` mit Auth + Rate Limiting
- `supply/services/ingredient_ai_service.py` → Step-basierter Service (ohne Search Grounding)
- `recipe/services/ai_ingredients_service.py` → Rezept-Zutaten-Vorschläge (ohne Search Grounding)
- `frontend/src/pages/supplies/IngredientDetailPage.tsx` → Zutat-Detailseite
- Recipe-Detailseite existiert als Inline-Edit-Ansicht (kein separates Page-File)

## Goals / Non-Goals

**Goals:**
- Vier Zauberstab-Funktionen: Zutat vervollständigen, Zutat erstellen, Rezept vervollständigen, Rezept erstellen
- Google Search Grounding für verlässlichere Daten in allen Calls
- Ein einziger strukturierter Gemini-Call pro Aktion (kein Multi-Step)
- Dialog mit Vorschlägen, einzeln per Checkbox übernehmbar
- Bei Zutat-Vervollständigung auch Portionen und Aliase vorschlagen
- Bei Rezept-Vervollständigung Metadaten (Beschreibung, Tags, Schwierigkeit, Dauer, Pfadfinderstufen) vorschlagen
- Bei Rezept-Erstellen auch Zutaten-Items mit Mengen vorschlagen

**Non-Goals:**
- Bestehenden Step-basierten IngredientAIService ersetzen
- Batch-Suggest für mehrere Entitäten gleichzeitig
- Quellen-Referenzen aus dem Grounding anzeigen
- Bilder generieren

## Decisions

### 1. Google Search Grounding via `google_search` Tool

```python
from google.genai import types

config = types.GenerateContentConfig(
    response_mime_type="application/json",
    response_schema=SomeSchema,
    tools=[types.Tool(google_search=types.GoogleSearch())],
)
```

### 2. Vier Endpoints, vier Schemas

| Endpoint | Input | Output Schema |
|----------|-------|---------------|
| `POST /api/ingredients/{slug}/ai-suggest-all/` | — | `IngredientSuggestAllOut` (Nährwerte + Scores + Physik + Portionen + Aliase) |
| `POST /api/ingredients/ai-create/` | `{ name: str }` | `IngredientAiCreateOut` (komplette Zutat) |
| `POST /api/recipes/{id}/ai-suggest-all/` | — | `RecipeSuggestAllOut` (Metadaten) |
| `POST /api/recipes/ai-create/` | `{ title: str, description?: str }` | `RecipeAiCreateOut` (Metadaten + Zutaten-Items) |

### 3. Ingredient Suggest Schema (erweitert um Portionen + Aliase)

```python
class IngredientSuggestAllSchema(BaseModel):
    # Nährwerte pro 100g
    energy_kj: float | None
    protein_g: float | None
    fat_g: float | None
    fat_sat_g: float | None
    carbohydrate_g: float | None
    sugar_g: float | None
    fibre_g: float | None
    salt_g: float | None
    sodium_mg: float | None
    fructose_g: float | None
    lactose_g: float | None

    # Bewertungen
    nutri_score: str | None  # A-E
    nova_score: int | None   # 1-4
    child_score: int | None  # 1-10
    scout_score: int | None  # 1-10
    environmental_score: int | None  # 1-10
    fruit_factor: float | None  # 0.0-1.0

    # Physik
    physical_density: float | None
    physical_viscosity: str | None
    durability_in_days: int | None
    max_storage_temperature: int | None

    # Portionen (neu)
    portions: list[PortionSuggestion] | None

    # Aliase (neu)
    aliases: list[str] | None

class PortionSuggestion(BaseModel):
    name: str  # z.B. "1 Esslöffel", "1 Tasse"
    weight_g: float  # Gewicht in Gramm
```

### 4. Recipe Suggest Schema

```python
class RecipeSuggestAllSchema(BaseModel):
    description: str | None
    difficulty: str | None  # easy/medium/hard
    duration_minutes: int | None
    servings: int | None
    recipe_type: str | None
    scout_levels: list[str] | None  # wölflinge, jungpfadfinder, pfadfinder, rover
    tags: list[str] | None  # Tag-Namen

class RecipeAiCreateSchema(BaseModel):
    title: str
    description: str
    difficulty: str
    duration_minutes: int
    servings: int
    recipe_type: str
    items: list[RecipeItemSuggestion]

class RecipeItemSuggestion(BaseModel):
    ingredient_name: str
    quantity: float
    unit: str  # z.B. "g", "ml", "Stück"
```

### 5. Ingredient Create Flow

`POST /api/ingredients/ai-create/` mit `{ name: "Vanillepuddingpulver" }`:
1. Gemini mit Search Grounding sucht alle Infos
2. Backend erstellt Ingredient + Portionen + Aliase automatisch
3. Response gibt die erstellte Zutat zurück (redirect zur Detailseite)

### 6. Recipe Create Flow

`POST /api/recipes/ai-create/` mit `{ title: "Kaiserschmarrn", description?: "..." }`:
1. Gemini mit Search Grounding sucht Rezeptinfos
2. Backend erstellt Recipe + matched/erstellt Ingredients + RecipeItems
3. Response gibt das erstellte Rezept zurück (redirect zur Detailseite)

### 7. Model: `gemini-2.5-flash`

Search Grounding kompatibel und schnell genug.

### 8. Frontend: Gemeinsame Dialog-Komponente

Eine `AiSuggestDialog` Basiskomponente die für alle vier Anwendungsfälle wiederverwendet wird:
- Loading-Skeleton
- Suggestion-Liste mit Checkboxen
- "Alle auswählen" / "Ausgewählte übernehmen"
- Feld-spezifische Renderer (Text, Zahl, Liste)

### 9. Übernahme-Pattern

- **Vervollständigen**: User wählt Felder aus → PATCH auf bestehende Entität
- **Erstellen**: Alles wird übernommen (kein Checkbox-Dialog), direkt erstellt, User kann danach editieren

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Search Grounding langsam (5-15s) | Skeleton-Loader, Timeout auf 30s |
| Halluzinierte Nährwerte | User prüft und übernimmt einzeln |
| Structured Output + Search Grounding Kompatibilität | Testen; Fallback ohne Grounding |
| Ingredient-Matching bei Recipe Create (Name → DB-Zutat) | Fuzzy-Match auf bestehende Zutaten, bei Nicht-Match neue anlegen |
| Portionen-Duplikate bei Suggest | Vor dem Anlegen prüfen ob Portion mit gleichem Namen schon existiert |
| Rate Limit | 100/15min reicht für manuellen User-Klick |
