## Why

Beim Anlegen und Pflegen von Zutaten und Rezepten müssen viele Felder manuell ausgefüllt werden. Ein KI-gestützter "Zauberstab" mit Google Search Grounding soll auf Detail-Seiten verlässliche Daten vorschlagen, die einzeln übernommen werden können. Das betrifft:

1. **Zutaten vervollständigen**: Nährwerte, Bewertungen, Physik, Portionen, Aliase
2. **Rezepte vervollständigen**: Fehlende Metadaten (Beschreibung, Schwierigkeit, Dauer, Tags, Pfadfinderstufen) per Search Grounding vorschlagen
3. **Zutaten anlegen**: Zauberstab der aus einem Namen eine komplette Zutat erstellt
4. **Rezepte anlegen**: Zauberstab der aus einem Titel/Beschreibung ein Rezept mit Zutaten erstellt

## What Changes

- Neuer Backend-Endpoint `POST /api/ingredients/{slug}/ai-suggest-all/` — vervollständigt bestehende Zutat (Nährwerte, Bewertungen, Physik, Portionen, Aliase) in einem Call
- Neuer Backend-Endpoint `POST /api/ingredients/ai-create/` — erstellt eine komplette Zutat aus nur einem Namen
- Neuer Backend-Endpoint `POST /api/recipes/{id}/ai-suggest-all/` — vervollständigt bestehende Rezept-Metadaten
- Neuer Backend-Endpoint `POST /api/recipes/ai-create/` — erstellt ein Rezept mit Zutaten aus Titel/Beschreibung
- Zauberstab-Button auf Zutat-Detailseite und Rezept-Detailseite
- Zauberstab-Button auf Create-Seiten/Dialogen für Zutaten und Rezepte
- Dialog-Komponente die Vorschläge anzeigt mit Checkbox pro Feld zur einzelnen Übernahme
- Alle Calls nutzen Gemini mit Google Search Grounding für verlässlichere Daten

## Capabilities

### New Capabilities
- `ingredient-ai-suggest`: KI-gestütztes Vervollständigen und Erstellen von Zutaten (Nährwerte, Bewertungen, Physik, Portionen, Aliase) via Gemini Search Grounding
- `recipe-ai-suggest`: KI-gestütztes Vervollständigen und Erstellen von Rezepten (Metadaten, Zutaten) via Gemini Search Grounding

### Modified Capabilities

## Impact

- **Backend**: `supply` App — neue Endpoints + Service für Ingredient Suggest/Create; `recipe` App — neue Endpoints + Service für Recipe Suggest/Create
- **Frontend**: `IngredientDetailPage.tsx` + Ingredient-Create-Flow — Zauberstab + Dialog; Recipe-Detailseite + Recipe-Create-Flow — Zauberstab + Dialog; neue Hooks in `api/supplies.ts` und `api/recipes.ts`; neue Zod-Schemas
- **Dependencies**: Google Gemini API mit Search Grounding (bereits im Projekt vorhanden)
- **Migrations**: Keine — nutzt bestehende Model-Felder
