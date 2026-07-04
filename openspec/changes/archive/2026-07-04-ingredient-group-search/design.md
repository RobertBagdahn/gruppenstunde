## Context

Zutaten wie Fusilli, Spaghetti und Penne teilen ein Hyperonym ("Nudeln"), das in der Zutatensuche nicht berücksichtigt wird. Bisher wird nur auf `Ingredient.name` und `IngredientAlias.name` gesucht.

Das bestehende `content.Tag`-System mit Hierarchie, `group`-Feld und Approval-Workflow ist für diesen einfachen Anwendungsfall zu schwerfällig. Ein minimalistisches, dediziertes Model ist die bessere Wahl.

## Goals / Non-Goals

**Goals:**
- Zutaten in Gruppen zusammenfassen (z.B. "Nudeln", "Reis", "Kartoffeln")
- Suche/Filter nach Gruppennamen in `GET /api/ingredients/` und `/suggest/`
- CRUD für Gruppen (Admin-only)
- Gruppen in API-Response exponiert (List/Detail)

**Non-Goals:**
- Keine Hierarchie (Eltern/Kind)
- Kein generisches Tag-System
- Keine Wiederverwendung für andere Entity-Typen (nur Ingredient)
- Keine automatische Gruppenzuweisung (nur manuell)

## Decisions

1. **Eigenes Model statt `content.Tag`** → `IngredientGroup` mit nur `name` + `slug`. Kein `parent`, `group`, `is_approved`, `icon`, etc. Das Tag-System ist für generische Content-Tags gedacht; Ingredient Groups sind eine Suchhilfe, kein Taxonomie-System.

2. **M2M statt FK** → Eine Zutat kann in mehreren Gruppen sein (z.B. "Vollkornnudeln" in "Nudeln" + "Vollkornprodukte").

3. **Suche via `icontains` statt trigram** → Im List-Endpoint reicht `Q(groups__name__icontains=name)`. Im Suggest-Endpoint wird ein dritter Query mit `similarity=0.31` (knapp über threshold) beigemischt, damit Gruppen-Treffer erscheinen aber Name/Alias-Treffer bevorzugt werden.

4. **API unter eigenem Pfad** → `/api/ingredient-groups/` (parallel zu `/api/retail-sections/`, `/api/nutritional-tags/`). CRUD nur für Staff.

5. **Filter via `?group=<slug>`** → Einfach, eindeutig, REST-konform.

## Risks / Trade-offs

- **Kein Bulk-Assign** → Gruppen müssen pro Zutat manuell gesetzt werden. Für den initialen Seed wäre ein Admin-Import-Skript nötig.
- **`icontains` statt `TrigramSimilarity`** → Im List-Endpoint werden exakte Substring-Treffer gesucht, keine Fuzzy-Matches auf Gruppennamen. Das ist akzeptabel, da Gruppennamen kurz und eindeutig sind.
