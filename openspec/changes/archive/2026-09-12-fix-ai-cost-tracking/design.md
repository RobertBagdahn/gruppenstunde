## Context

Alle Gemini-Aufrufe laufen zentral über `core/services/gemini.py` und werden in `AiInteraction` geloggt. Die Kostenberechnung (`_calculate_cost_eur`) nutzt `GEMINI_PRICING` (base.py). Die Aggregation im Dashboard (`content/api/admin.py`) gruppiert nach `AiContextChoices`.

## Decisions

- **Model-Vereinheitlichung statt Preisaufnahme**: `gemini-2.5-flash-lite` ist der einzige abweichende Model-String und wird auf `gemini-3.1-flash-lite` vereinheitlicht (Konsistenz mit allen übrigen Services). Kein zusätzlicher Preis-Eintrag nötig.
- **Warnung bei unbekanntem Model**: `_calculate_cost_eur` loggt `logger.warning` und setzt `pricing_model` weiter auf den Model-String (Audit), `cost_eur` bleibt `None`.
- **Thinking-Tokens**: `output_tokens` wird nur noch als `candidates_token_count` gezählt; `thoughts_token_count` wird nicht mehr addiert (bereits enthalten), bleibt aber als Metrik-Feld erhalten.
- **Kontext-Enum**: `AiContextChoices` wird auf die realen, unprefixten Strings erweitert (eine kanonische Liste). Frontend-Labels bleiben über `aiContextLabels.ts` synchron.
- **Background**: Beide Commands reichen `is_background=True` durch die Service-Schicht (Parameter ergänzen).

## Approach

```
Bug                                  Fix
──────────────────────────────────── ─────────────────────────────────
2.5-flash-lite nicht gepreist        Model → gemini-3.1-flash-lite
unbekanntes Model still None         logger.warning + pricing_model=model
thinking double count                output = candidates only
by_context leer                      Enum ↔ echte context-Strings syncen
Batch nicht als background           is_background=True durchreichen
Rate-Limit 200/5min                  → 100/15min (GLOBAL_LIMIT/WINDOW)
Dashboard 6 Dezimalstellen           → 2 Dezimalstellen (Spec)
```

## Risks / Tradeoffs

- **Enum-Sync**: Neue `context`-Strings, die später hinzukommen, müssen weiterhin gepflegt werden. Alternative (Enum entfernen, Gruppierung rein datengetrieben) wird bewusst nicht gewählt, um Labels stabil zu halten.
- **Model-Wechsel**: Bestehende `AiInteraction`-Zeilen mit `NULL`-Kosten bleiben historisch NULL (keine Rückrechnung).
