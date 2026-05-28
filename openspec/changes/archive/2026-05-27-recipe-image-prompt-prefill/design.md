## Context

Der `AiImageModal` in `TitleImageEditor.tsx` füllt beim Öffnen den Prompt mit `[title, summary].filter(Boolean).join(' - ')` vor. Das ist generisch und ergibt für Rezepte keinen guten Bild-Prompt. Die Komponente hat bereits Zugriff auf `contentType`, `title` und `summary`.

## Goals / Non-Goals

**Goals:**
- Content-type-spezifische Prompt-Templates im Frontend
- Für `recipe`: Food-Foto-optimierter Vorschlag
- Für andere Typen: bestehende Logik beibehalten oder ebenfalls verbessern

**Non-Goals:**
- Kein neuer API-Endpoint
- Kein AI-Call für Prompt-Generierung
- Keine Zutaten-Integration (würde Props-Änderung erfordern)

## Decisions

1. **Template-Map im Frontend**: Ein Objekt `PROMPT_TEMPLATES` mappt `contentType` auf eine Template-Funktion `(title, summary) => string`
2. **Rezept-Template**: `"Ein appetitliches Foto von ${title}"` — kurz, klar, Food-fokussiert
3. **Andere Typen optional verbessern**:
   - `session`: `"Eine Illustration einer Pfadfinder-Aktivität: ${title}"`
   - `game`: `"Eine Illustration eines Spiels: ${title}"`
   - `blog`: `"Eine Illustration zum Thema: ${title}"`
   - Fallback: bestehende Logik `title - summary`
4. **Beide Frontends**: Änderung in `frontend/` und `frontend-food/` identisch

## Risks / Trade-offs

- **Trade-off**: Statische Templates sind weniger kreativ als AI-generierte Vorschläge, aber kostenlos und instant
- **Risiko**: Minimal — User kann Prompt jederzeit manuell anpassen
