## Context

Die OpenSpec-Dokumentation ist über viele Changes organisch gewachsen. Dabei wurden ältere Specs nicht immer aktualisiert wenn neuere Changes die Architektur verändert haben. Das Ergebnis: 9 Spec-Dateien enthalten veraltete oder widersprüchliche Aussagen.

Der tatsächliche Code ist die Wahrheit. Die Specs müssen an den Code angeglichen werden.

## Goals / Non-Goals

**Goals:**
- Alle 9 betroffenen Specs an den tatsächlichen Code-Stand angleichen
- Widersprüche zwischen Specs auflösen (neuere Entscheidung gewinnt)
- Konsistente Terminologie für RecipeItem→Portion→MeasuringUnit Beziehung

**Non-Goals:**
- Code-Änderungen (der Code ist korrekt)
- Neue Features beschreiben
- meal-plan-suggestions-tab Change berücksichtigen (der aktualisiert meal-cockpit/spec.md selbst)

## Decisions

**1. Ingredient bleibt standalone** — Ingredient hat 30+ Felder die nichts mit Supply (name, slug, description, image) gemeinsam haben. Der Code bestätigt: `class Ingredient(models.Model)`.

**2. Nur vitamin_c_mg als Mikronährstoff** — Die extended-nutrition-rules Change hat alle anderen Vitamine/Mineralstoffe entfernt. Code bestätigt: nur `vitamin_c_mg` auf Ingredient, nur `cached_vitamin_c_mg` auf Recipe.

**3. servings=1 in DB, Frontend skaliert** — Recipe.servings default=1 enforced via API. RecipeItem.quantity ist immer pro Person. Frontend multipliziert für Anzeige.

**4. Rundung: < 2 → 0.1** — quantity-display-formatting ist die maßgebliche Spec (neuer, umfassender). fine-grained-quantity-rounding wird angeglichen.

**5. RecipeItem → Portion → MeasuringUnit** — RecipeItem hat nur `portion` FK. Kein direktes `measuring_unit` oder `ingredient` Feld. Zugang zu Zutat und Einheit immer über Portion.

## Risks / Trade-offs

- [Risk] meal-cockpit/spec.md wird bald durch meal-plan-suggestions-tab ersetzt → Wir fixen trotzdem, damit die Basis-Spec bis zur Implementierung korrekt ist.
- [Risk] Andere Specs könnten auch noch Referenzen auf alte Vitamin-Felder haben → Wir beschränken uns auf die 9 identifizierten Dateien.
