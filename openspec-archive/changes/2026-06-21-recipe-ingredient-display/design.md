## Context

Die Zutatenliste (`IngredientList`) ist eine zentrale Komponente, die auf der `RecipeDetailPage`, im `RecipePreviewDialog` und in Planungs-Ansichten genutzt wird. Sie empfängt `RecipeItem[]`-Daten vom Backend, die bereits `ingredient_portions` (alle Portionen mit `priority`, `is_default`, `weight_g`) enthalten.

Die bestehende `highPrioPortion`-Logik in `IngredientList.tsx` filtert bereits nach nicht-Default-Portionen und sortiert nach `priority` — aber der `is_default`-Filter schließt fälschlicherweise auch priorisierte Portionen aus wenn diese gleichzeitig `is_default: true` haben. Außerdem wird die Gramm-Sekundäranzeige nur gezeigt wenn eine nicht-Gramm-Primäranzeige vorhanden ist, was bereits korrekt ist.

Das Backend hat keine Änderungen nötig — `priority`, `is_default`, `weight_g` sind bereits in allen API-Responses vorhanden.

## Goals / Non-Goals

**Goals:**
- Icon-Austausch im Zutaten-Header (alle betroffenen Views)
- Badge-Text auf "N Zutaten" erweitern
- Portionsauswahl-Logik in `IngredientList` nach `priority` statt `!is_default` korrigieren
- `handleAddIngredient` in `InlineIngredientEditor` so ändern, dass die höchstpriorisierte Portion mit `quantity: 1` vorausgewählt wird
- Mengen-Ampel als rein Frontend-seitige Berechnung (kein neuer API-Endpunkt)

**Non-Goals:**
- Keine Backend-Änderungen, keine neuen API-Endpunkte
- Keine Schema-Änderungen (Zod/Pydantic)
- Keine Migrationen
- Kein interaktives Umschalten zwischen Portionseinheiten (UnitSwitcher bleibt unverändert)
- Keine Singular/Plural-Behandlung im Badge ("1 Zutaten" ist akzeptabel)

## Decisions

### 1. Portionsauswahl: `priority` statt `!is_default`

**Entscheidung:** Die primäre Nicht-Gramm-Portion wird nach `priority DESC` ausgewählt, der `!is_default`-Filter entfällt.

**Rationale:** `is_default: true` kann auf der Stück-Portion liegen (z.B. Apfel = 1 Stück is_default). Der bisherige `filter((p) => !p.is_default)` schließt dann genau die gewünschte Portion aus. Die `priority`-Logik allein ist ausreichend.

**Alternativen:** `is_default` als alleiniges Kriterium — schlägt fehl bei Zutaten wo `is_default` auf Gramm liegt.

---

### 2. Mengen-Ampel: Reine Frontend-Berechnung ohne neuen Endpunkt

**Entscheidung:** Die Ampel wird als lokale Berechnung in `IngredientList` implementiert. Schwellenwert: Eine Zutat macht mehr als 70% des Gesamtgewichts aus (`item.weight_g / totalWeightG > 0.70`).

**Rationale:** Das Gesamtgewicht der Zutaten ist bereits als `weight_g` pro Item in den `RecipeItem`-Daten vorhanden. Kein zusätzlicher API-Aufruf nötig. Der 70%-Schwellenwert ist ein pragmatischer Startpunkt für Datenfehler-Erkennung.

**Alternativen:** Statistischer Vergleich mit durchschnittlichen Portionsgrößen aus der DB — zu komplex für den ersten Schritt.

---

### 3. Default-Portion im Edit-Modus: Höchste Priority, quantity: 1

**Entscheidung:** In `handleAddIngredient` wird die Portion mit dem höchsten `priority`-Wert aus dem API-Response (`/api/ingredients/<slug>/portions/`) als Default gewählt. Die `quantity` wird auf `1` gesetzt, nicht `0`.

```
// Auswahllogik (Pseudocode)
const bestPortion = portions
  .filter(p => p.weight_g != null && p.weight_g > 0)
  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0]
  ?? portions[0];
```

**Rationale:** Der Nutzer sieht sofort eine sinnvolle Einheit und Menge, muss nur noch die Zahl anpassen. `quantity: 0` ist visuell leer und nicht hilfreich.

---

### 4. Icon: Lucide `UtensilsCrossed`

**Entscheidung:** `UtensilsCrossed` aus Lucide (bereits als Dependency vorhanden) ersetzt `egg_alt` Material Symbol im Zutaten-Header.

**Rationale:** Laut AGENTS.md sollen neue Interaktionen Lucide verwenden. `UtensilsCrossed` assoziiert Kochen/Zutaten klarer als ein Ei.

## Risks / Trade-offs

- **Ampel-Schwellenwert (70%)**: Zu rigide oder zu locker je nach Rezepttyp (z.B. Suppen haben oft eine dominante Zutat). → Mitigation: Der Schwellenwert kann später konfigurierbar gemacht werden. Für jetzt ist 70% ein konservativer Startpunkt.
- **`quantity: 1` als Default**: Für Gramm-Portionen (z.B. `125g Nudeln`) bedeutet das `1 × 125g = 125g`, was oft sinnvoll ist. Für sehr große Portionen (z.B. `1 kg Packung`) könnte `1` zu viel sein. → Mitigation: Nutzer kann sofort überschreiben, KI-Schätzung ist weiterhin verfügbar.

## Migration Plan

Rein Frontend-seitig. Kein Deployment-Risiko. Keine Datenmigration.

1. `IngredientList.tsx` aktualisieren (Portionslogik + Ampel + Icon + Badge)
2. `RecipeDetailPage.tsx` aktualisieren (Icon + Badge im Header)
3. `InlineIngredientEditor.tsx` aktualisieren (`handleAddIngredient` Default-Logik)
4. Alle anderen Views prüfen, die `IngredientList` verwenden (`RecipePreviewDialog`, Planung)

## Open Questions

- Soll der Ampel-Schwellenwert (70%) konfigurierbar sein oder als Konstante bleiben?
- Soll die Ampel auch bei ungewöhnlich *kleinen* Mengen warnen (z.B. 0,1 g Salz in einem Hauptgericht)?
