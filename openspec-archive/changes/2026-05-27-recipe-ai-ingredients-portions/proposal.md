## Why

Beim Erstellen eines Rezepts (Schritt 2 "Bearbeiten") müssen Nutzer manuell Zutaten suchen, Portionen auswählen und Mengen eingeben. Das ist zeitaufwändig und fehleranfällig. Ein KI-gestützter Service soll basierend auf Rezepttitel, Beschreibung und Typ automatisch passende Zutaten mit realistischen Portionen und Mengen vorschlagen — alles in einzelnen Gemini Flash Calls mit Structured Output.

## What Changes

- Neuer Backend-Service `recipe/services/ai_ingredients_service.py` der per Gemini Flash Call:
  1. Passende Zutaten für ein Rezept identifiziert (Matching gegen existierende `Ingredient`-Einträge)
  2. Fehlende Zutaten automatisch mit KI-geschätzten Nährwerten anlegt (`status=ai_generated` o.ä.)
  3. Für jede Zutat die passende `Portion` findet oder schätzt
  4. Realistische Mengen (`quantity`) pro Person schätzt
- Neuer API-Endpunkt `POST /api/recipes/{recipe_id}/ai-suggest-ingredients/` der den Service aufruft und vorgeschlagene RecipeItems zurückgibt
- Frontend-Button im Rezept-Editor (Schritt 2) der die KI-Vorschläge abruft und als RecipeItems einfügt

## Capabilities

### New Capabilities
- `recipe-ai-ingredients`: KI-gestütztes Vorschlagen von Zutaten, Portionen und Mengen für ein Rezept basierend auf Titel/Beschreibung/Typ via Gemini Flash Structured Output

### Modified Capabilities

## Impact

- **Backend**: `recipe` App (neuer Service + API-Endpunkt), `supply` App (ggf. neue Ingredients anlegen)
- **Schemas**: Neues Pydantic-Response-Schema für Vorschläge, entsprechendes Zod-Schema im Frontend
- **API**: Neuer Endpunkt unter recipe router
- **Abhängigkeiten**: `google-genai` SDK (bereits vorhanden)
- **Migrations**: Keine DB-Migrations nötig (nutzt existierende Models)
