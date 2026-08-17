## Why

Die Backend-Validierung `_validate_split_shares` erzwingt `Σ share = 1.0` für **alle** Split-Gruppen — sowohl Exchange-Gruppen als auch optionale Items. Bei Exchange-Gruppen ist das korrekt (die Anteile innerhalb einer Gruppe ergeben zusammen 100%). Bei optionalen Items repräsentiert `share` jedoch den **Inklusions-Anteil** (0.0–1.0), nicht eine Teilmenge einer 1.0-Summe. Das führt dazu, dass das Speichern eines optionalen Splits mit `share < 1.0` (z.B. "in 60% der Portionen enthalten") mit HTTP 400 abgelehnt wird. Der Service-Layer `get_included_fractions` hat denselben Denkfehler und rundet optionale Shares fälschlich via `largest_remainder_round` auf 100% auf.

## What Changes

- **Backend-Validierung**: `_validate_split_shares` unterscheidet zwischen Exchange-Gruppen (Σ = 1.0) und optionalen Items (nur 0.0–1.0 Range, bereits via DB-CheckConstraint abgedeckt)
- **Backend-Service**: `get_included_fractions` behandelt optionale Items direkt als Inklusions-Fraktion ohne `largest_remainder_round`
- **Fehlermeldungen**: Kontext-abhängig — Exchange-Gruppen: "Die Summe der Anteile muss 100% ergeben.", optionale Items: "Der Anteil muss zwischen 0% und 100% liegen."
- **Spec**: `meal-item-splits/spec.md` korrigiert — Σ=1.0 Constraint gilt nur für Exchange-Gruppen, nicht für optionale Items

## Capabilities

### Modified Capabilities

- `meal-item-splits`: Share-Semantik für optionale Items von Σ=1.0 auf Inklusions-Anteil (0.0–1.0) geändert. **BREAKING** für bestehende optionale Splits mit share=1.0 (keine Änderung nötig, da share=1.0 beide Interpretationen erfüllt).

## Impact

- `backend/planner/api/meal_plan.py:810-836` — `_validate_split_shares` um optionale Items erweitern
- `backend/planner/services/split_service.py:51-111` — `get_included_fractions` für optionale Items korrigieren
- `backend/recipe/tests/test_exchanges_and_splits.py` — Neue Tests für optionale Items
- `openspec/specs/meal-item-splits/spec.md` — Spec-Anforderung und Szenarien korrigieren

Keine Änderungen an: Frontend, Datenbank-Schema, Pydantic/Zod-Schemas, Migrationen.
