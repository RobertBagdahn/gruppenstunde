## Context

Der `ContentStepper` ist eine generische Komponente für alle Content-Typen (Session, Blog, Game, Recipe). Er ruft `/api/content/ai/refurbish/` auf, um aus Freitext strukturierte Daten zu generieren. Das Backend unterscheidet per `content_type`-Parameter, ob Zutaten vorgeschlagen werden sollen — aber der Frontend-Call sendet diesen Parameter nicht mit.

Betroffene Dateien:
- `frontend-food/src/api/ai.ts` — `useRefurbish()` Mutation
- `frontend-food/src/components/content/ContentStepper.tsx` — ruft refurbish auf
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx` — nutzt ContentStepper

## Goals / Non-Goals

**Goals:**
- `content_type` an den Refurbish-Endpoint durchreichen, damit Rezepte Zutaten-Vorschläge erhalten
- Rückwärtskompatibel: andere Content-Typen (session, blog, game) sollen weiterhin ohne `content_type` funktionieren (Default "session")

**Non-Goals:**
- Backend-Änderungen (funktioniert bereits korrekt)
- Änderungen am Zutaten-Matching-Algorithmus
- Neue API-Endpoints

## Decisions

**1. `content_type` als optionalen Parameter in `useRefurbish()` ergänzen**

Die Mutation akzeptiert `{ raw_text, content_type?, signal? }`. Default bleibt undefined (Backend nimmt dann "session").

**2. ContentStepper erhält eine optionale `contentType`-Prop**

Statt den Content-Type aus dem Kontext zu raten, wird er explizit übergeben. CreateRecipePage setzt `contentType="recipe"`.

**3. Kein separater Endpoint nötig**

Der bestehende `/api/content/ai/refurbish/` mit `content_type`-Parameter reicht aus.

## Risks / Trade-offs

- **Minimales Risiko**: Nur ein zusätzlicher Parameter im JSON-Body. Bestehendes Verhalten bleibt für alle Nicht-Rezept-Seiten unverändert.
- **Kein Rollback nötig**: Keine DB-Migrationen, kein Breaking Change.
