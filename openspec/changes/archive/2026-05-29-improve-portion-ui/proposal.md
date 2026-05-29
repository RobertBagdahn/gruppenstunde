## Why

Die Portionen-Verwaltung auf der Zutaten-Detailseite (Food Frontend) ist für Nutzer schwer verständlich. Die Anzeige `(1g, ~1g Gewicht)` ist kryptisch, das Ranking der Portionen ist nicht editierbar, und es fehlt Kontext darüber was die Felder bedeuten.

## What Changes

- **Anzeige verbessern**: Statt `(quantity g, ~weight_g g Gewicht)` nur noch `≈ {weight_g}g` anzeigen – das berechnete Gewicht ist die relevante Info
- **Ranking editierbar machen**: ▲/▼ Buttons pro Portion zum Verschieben der Reihenfolge (Mobile-optimiert statt Drag & Drop)
- **Bessere Labels im Edit-Modus**: Das Quantity-Feld klar als "Anzahl Portionen" labeln

## Capabilities

### New Capabilities

- `portion-ranking`: Hoch-/Runter-Buttons zum Ändern der Sortierreihenfolge von Portionen einer Zutat

### Modified Capabilities

_(keine)_

## Impact

- **Frontend**: `frontend-food/src/pages/supplies/IngredientDetailPage.tsx` – `PortionCard` Komponente
- **Backend API**: Muss einen Endpunkt zum Ändern des `rank`-Felds bereitstellen (oder bestehender Update-Endpunkt akzeptiert `rank`)
- **Schemas**: Prüfen ob `rank` bereits im Update-Schema enthalten ist (Pydantic + Zod)
- **Keine Migrations nötig**: `rank` Feld existiert bereits im Model
