## Context

Python `or` und JavaScript `||` behandeln `0` als falsy. `Meal.override_portions` ist `int | None` — `None` bedeutet "nicht gesetzt", `0` ist kein sinnvoller Wert (es gibt keine 0-Personen-Mahlzeit). Die semantische Frage: Soll `override_portions=0` überhaupt erlaubt sein? Aktuell verhindert der Update-Endpunkt `if payload.override_portions > 0 else None` bereits, dass `0` gespeichert wird — aber die Fallback-Logik in `effective_portions` muss trotzdem robust sein.

## Goals / Non-Goals

**Goals:**
- `effective_portions` gibt niemals einen falschen Wert zurück, unabhängig vom Datenbankinhalt
- Die Logik ist in Backend und Frontend identisch und explizit

**Non-Goals:**
- `override_portions=0` als validen Wert einführen (bleibt weiterhin nicht unterstützt)

## Decisions

**D1 — Explizite `None`-Prüfung in Backend und Frontend**
```python
# Backend
def effective_portions(self) -> int:
    if self.override_portions is not None:
        return self.override_portions
    return self.meal_plan.norm_portions or 1
```
```ts
// Frontend
export function effectivePortions(meal, normPortions): number {
  if (meal.override_portions != null) return meal.override_portions;
  return normPortions || 1;
}
```

## Risks / Trade-offs

- Kein Risiko — verhält sich für alle aktuellen Daten identisch (da `override_portions=0` nie gespeichert wird)
