# Recipe AI Ingredient Suggestions — Spec (Delta)

## Changed Requirements

### Confirmation Flow (geändert)

1. Klick auf "KI-Vorschläge" ruft `POST /api/recipes/{id}/ai-suggest-ingredients/` auf
2. Ergebnisse werden in einem modalen Dialog angezeigt (nicht direkt angewendet)
3. Dialog zeigt: Zutatname, Portion, Menge pro Vorschlag
4. Jeder Vorschlag hat eine Checkbox (standardmäßig aktiviert)
5. "Alle auswählen" Checkbox im Header
6. Button "Übernehmen (N)" wendet nur die ausgewählten Vorschläge an
7. Button "Verwerfen" schließt den Dialog ohne Änderungen
8. Nach Übernehmen: `POST /api/recipes/{id}/ai-apply-ingredients/` mit gewählten Items, dann Query-Invalidierung und Toast
