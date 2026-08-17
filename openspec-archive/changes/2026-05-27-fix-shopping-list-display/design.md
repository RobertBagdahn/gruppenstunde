## Context

Die Einkaufsliste wird aus `shopping_service.py` generiert. RecipeItems haben eine `portion` mit `weight_g`. Viele Gewürze/Soßen haben `weight_g=0`, was zu "0 g" führt. Manche RecipeItems haben kein verlinktes Ingredient (gelöscht oder nie gesetzt), was "Unbekannt" erzeugt. Skalierung auf kleine Portionen erzeugt Brüche wie "0,3 x Knoblauchzehe".

## Goals / Non-Goals

**Goals:**
- Sinnvolle Darstellung für Zutaten ohne Grammgewicht (Portionsname statt "0 g")
- Immer einen lesbaren Namen anzeigen (nie "Unbekannt")
- Natürliche Portionsmengen < 1 auf 1 aufrunden

**Non-Goals:**
- Daten-Migration (fehlende `weight_g` nachpflegen)
- Neue UI-Komponenten
- Änderung der DB-Modelle

## Decisions

1. **Fallback-Kette für Anzeige bei weight_g=0**: Wenn `portion.weight_g == 0`, wird die Zutat mit `quantity × portion.name` angezeigt (z.B. "2 EL", "1 Prise") statt "0 g". Im Shopping-Service wird ein `display_text`-Feld mitgeliefert.

2. **Fallback-Kette für Ingredient-Name**: `ingredient.name` → `portion.ingredient.name` → `portion.name` → RecipeItem `note`-Feld → "Zutat". Niemals "Unbekannt" anzeigen.

3. **Aufrundung natürlicher Portionen**: In der Einkaufsliste werden Mengen < 1 bei natürlichen Portionen (Stück, Zehe, etc.) auf 1 aufgerundet. Bei messbaren Einheiten (EL, TL, Prise) bleiben Brüche erlaubt.

4. **Backend liefert Daten, Frontend entscheidet nicht selbst**: Die Fallback-Logik wird im Backend (Schema-Resolver) implementiert, damit alle Clients konsistente Daten bekommen.

## Risks / Trade-offs

- Aufrundung auf 1 kann zu leichtem Überschuss bei Einkauf führen — akzeptabel, besser als "0,3 x Zehe"
- Fallback auf `portion.name` könnte technische Namen enthalten (z.B. "100g") — besser als "Unbekannt"
