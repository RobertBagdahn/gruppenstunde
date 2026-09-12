## Context

`gemini_call()` liefert bereits `(response, interaction_id)`, aber viele Services nutzen `response, _` und verwerfen die ID. Feedback ist im Frontend über `AiVoteButtons` + `useVoteAiInteraction` vorhanden. Prompt-Bau ist in den Services verstreut.

## Decisions

- **ID durchreichen statt neu bauen**: Jeder AI-Service, der `gemini_call()` nutzt, gibt `ai_interaction_id` in seinem Rückgabewert und Schema zurück. Endpunkte mit mehreren Calls geben die ID des primären Calls zurück (konsistent zu `ai-vote-coverage`).
- **Zentraler Kontext-Builder**: Eine Funktion `build_prompt_context(user, *, num_persons, recipe_type, ...)` in `core/services/gemini.py` (oder einem neuen `prompt_context.py`) sammelt: Ernährungs-/Nährwert-Tags, Gruppengröße (norm_portions), aktuelle Saison (Monat), Vorrat (falls verfügbar). Services rufen sie auf und hängen den Kontext an ihre bestehenden Prompts an. Es wird bewusst *kein* Feedback-Loop (Votes zurücklesen) in Phase 1 gebaut.
- **Zod-Sync**: Jede Pydantic-Änderung wird 1:1 im Zod-Schema nachgezogen.

## Approach

```
Ebene          Änderung
────────────── ────────────────────────────────────────────────
Service        interaction_id nicht mehr verwerfen
Schema (Py/Zod) ai_interaction_id: str | null ergänzen
API            ID aus Service in Response mappen
Frontend       AiVoteButtons mit interactionId rendern
Prompt         build_prompt_context(...) in Prompts einbetten
```

## Risks / Tradeoffs

- **Antwort-Schemas**: Endpunkte, die Listen/Dicts statt Objekte zurückgeben, brauchen ein Wrapper-Objekt mit `ai_interaction_id` (kleine breaking API-Änderung, aktive Entwicklung erlaubt das).
- **Prompt-Kontext**: Mehr Kontext = mehr Input-Tokens (Kosten steigen minimal); mit `ai-cost-tracking`-Fix korrekt erfasst.
- **Vorrat**: `supply`-Daten sind ggf. groß; nur summarisch (Namen, nicht Mengen) einspeisen, um Prompt-Größe zu begrenzen.
