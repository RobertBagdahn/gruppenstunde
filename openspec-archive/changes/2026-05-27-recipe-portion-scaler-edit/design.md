## Context

Der `InlineIngredientEditor` (`frontend-food/src/components/recipe/InlineIngredientEditor.tsx`) erlaubt das Bearbeiten von Rezept-Zutaten auf der Detail-Seite. Er hat bereits ein "Portionen (Basis)"-Feld (`editServings`), das aber nur die Metadaten ändert — die Zutatenmengen bleiben unverändert.

Der bestehende `PortionScaler` (Read-Only-Ansicht) skaliert Mengen über einen `servingsMultiplier` — das ist aber ein Anzeige-Feature, kein Edit-Feature.

## Goals / Non-Goals

**Goals:**
- Beim Ändern der Portionszahl im Edit-Modus alle Zutatenmengen proportional umrechnen
- Visuelles Feedback, dass Mengen sich geändert haben
- Verbessertes visuelles Design der Zutatenliste (klarere Units, bessere Abstände)

**Non-Goals:**
- Keine neue API-Endpunkte
- Keine Änderung an der Read-Only `IngredientList`
- Kein Undo/History der Skalierung

## Decisions

### 1. Proportionale Skalierung bei Portionsänderung

Wenn der User die Basis-Portionszahl von `oldServings` auf `newServings` ändert, werden alle Mengen mit `newServings / oldServings` multipliziert.

```
newQuantity = oldQuantity * (newServings / oldServings)
```

Der `editServings`-State wird aktualisiert und die Mengen in `editItems` direkt mutiert (alle als `isDirty` markiert).

### 2. Rundung

Mengen werden auf maximal 2 Dezimalstellen gerundet, um ungerade Werte zu vermeiden.

### 3. UI-Verbesserung

- Unit-Label bekommt mehr Platz (von `w-6` auf `w-14`)
- Notiz-Feld wird nur als Icon-Button angezeigt, expandiert bei Klick
- Leichte farbliche Hervorhebung bei skalierten Werten (kurzes Highlight nach Änderung)

## Risks / Trade-offs

- **Rundungsfehler**: Bei mehrfachem Hin-und-her-Skalieren können Werte driften. Akzeptabel, da User die Werte sieht und korrigieren kann.
- **Alle Mengen werden skaliert**: Auch wenn User schon manuell etwas geändert hat. Alternative wäre nur "unberührte" Mengen zu skalieren — zu komplex für den Mehrwert.
