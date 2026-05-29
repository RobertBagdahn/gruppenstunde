## Context

Rezepte werden als normierte 1-Portion gespeichert (`servings=1`). Die aktuellen Mengen sind teilweise unrealistisch. Dies ist ein einmaliger Daten-Fix, kein dauerhafter Service.

## Goals / Non-Goals

**Goals:**
- Einmaliges Management Command das alle 13 Rezepte per Gemini korrigiert
- Structured JSON Output mit Index-basiertem Matching
- Stdout-Ausgabe als Vorher/Nachher-Tabelle
- `recalculate_recipe_cache()` nach Update

**Non-Goals:**
- Dauerhafter Service oder API-Endpunkt
- Frontend-UI
- Wiederverwendbarkeit über den einmaligen Fix hinaus

## Decisions

### 1. Matching per Index
Die KI bekommt eine nummerierte Liste und gibt pro Index die neue Menge zurück.

### 2. Prompt mit Richtwerten
```
Du bist ein Ernährungsexperte. Rezept: "{title}" (Typ: {recipe_type}).
Aktuelle Zutaten (1 Portion):
1. {quantity}g {ingredient_name}
2. {quantity}g {ingredient_name}
...

Schätze realistische Gramm-Mengen für eine sättigende Einzelportion eines Erwachsenen.
Regeln:
- Hauptzutaten (Nudeln, Reis, Kartoffeln, Brot): 100-200g
- Gemüse/Obst: 80-200g
- Fleisch/Fisch: 100-150g
- Milchprodukte: 30-150g
- Gewürze/Öle: realistisch klein (1-15g)
- Das Rezept soll als vollständige Mahlzeit sättigen
Gib für JEDEN Index die korrigierte Menge in Gramm zurück.
```

### 3. Pydantic Response Schema
```python
class NormalizedItem(BaseModel):
    index: int
    quantity_g: float

class NormalizationOutput(BaseModel):
    items: list[NormalizedItem]
```

## Risks / Trade-offs

- **KI-Halluzination**: Prompt-Richtwerte begrenzen das Risiko
- **Irreversibel**: Alte Werte gehen verloren, aber bei nur 13 Rezepten überschaubar
