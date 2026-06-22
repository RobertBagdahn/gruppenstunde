## Context

`IngredientEditPage.tsx` hat mehrere unabhängige Bugs:

1. **energyKj**: Der State heißt `energyKj`, speichert aber `energy_kcal`. kJ = 4.184 × kcal — ein Nutzer, der den Variablennamen sieht oder die KI, die das Feld befüllt, könnte den falschen Wert eingeben.

2. **cooking_factor min="1"**: HTML `min="1"` blockt Werte < 1. Fleisch verliert beim Garen ~25-40% Gewicht (Faktor ~0.6-0.75). Diese Zutaten können nicht korrekt erfasst werden.

3. **Rang-Tausch**: Die Funktion tauscht `index` (0-basiert) als Rang. Tatsächliche Rang-Werte in der DB sind 1-basiert und nicht zwingend kompakt (können 1, 5, 10 sein). Nach Reorder werden alle Ränge auf 0, 1, 2... gesetzt.

4. **powder fehlt**: Viskositäts-Option `"powder"` ist im Dropdown nicht vorhanden. Bestehende Powder-Zutaten werden beim Speichern auf `"solid"` überschrieben.

5. **Umlaute**: 7 Stellen mit `ae`/`oe`/`ue` statt `ä`/`ö`/`ü`.

## Goals / Non-Goals

**Goals:**
- `energyKcal`-State klar benennen; kein Umrechnungsfehler möglich
- `cooking_factor` erlaubt Werte < 1 (Schrumpfung)
- Rang-Tausch nutzt tatsächliche `rank`-Feldwerte der Portionen
- `"powder"` als Viskositätsoption verfügbar
- Alle Umlaute korrekt

**Non-Goals:**
- Umrechnung kJ↔kcal in der UI (der einzige gespeicherte Wert bleibt kcal)
- Komplette Überarbeitung des Ingredient-Formulars

## Decisions

**D1 — Rang-Tausch mit echten Rank-Werten**
```ts
const handleMoveUp = (index: number) => {
  const portion = portions[index];
  const prev = portions[index - 1];
  // Tausche die rank-Werte der beiden Portionen
  await updatePortion({ portionId: portion.id, data: { rank: prev.rank } });
  await updatePortion({ portionId: prev.id, data: { rank: portion.rank } });
};
```
Voraussetzung: `portions`-Array ist nach `rank` sortiert und enthält die `rank`-Feldwerte.

**D2 — Backend: Status-Guard für non-Staff**
```python
if "status" in data and data["status"] == "verified" and not request.user.is_staff:
    raise HttpError(403, "Nur Admins können den Status auf 'verified' setzen")
```

## Risks / Trade-offs

- Rang-Tausch mit echten Werten setzt voraus, dass keine doppelten Rang-Werte existieren. Das Formular sollte nach einer Reorder-Aktion den Array neu laden, was via `queryClient.invalidateQueries` sichergestellt ist.
