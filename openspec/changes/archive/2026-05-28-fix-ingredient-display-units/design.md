## Context

Ein `RecipeItem` hat:
- `quantity` (float) — die Menge im Editor
- `measuring_unit` (FK, nullable) — direkte Einheit am Item (z.B. "Prise", "Teelöffel")
- `portion` (FK, nullable) — verknüpfte Portion (hat eigene `measuring_unit` + `weight_g`)

Das aktuelle Backend-Schema `RecipeItemOut.resolve_measuring_unit_name()` fällt auf `portion.measuring_unit.name` zurück wenn keine direkte `measuring_unit` am Item ist. Das liefert oft "Gramm", weil Portionen typischerweise Gramm als Basis-Unit haben.

Das Frontend prüft ob die Unit in `WEIGHT_VOLUME_UNITS` ist. Wenn ja → `formatQuantity(qty * portion.weight_g)`. Wenn `weight_g = 0` → "0 g".

## Goals / Non-Goals

**Goals:**
- Zutaten in der Originaleinheit des Editors anzeigen (15 Pr, 2 TL, 5 EL, 30 g)
- Gramm-Umrechnung nur für echte Gewichts-/Volumeneinheiten
- Nie "0 g" wenn die tatsächliche Menge > 0 ist
- Kommazahlen statt Rundung auf 0

**Non-Goals:**
- Änderung der Editor-Logik (funktioniert korrekt)
- Neue DB-Felder oder Migrationen
- Änderung der Portion-Datenstruktur

## Decisions

### 1. Backend: Zwei getrennte Felder statt Fallback-Resolve

Das Schema liefert künftig:
- `measuring_unit_name`: Nur die direkte Unit des RecipeItems (NULL wenn keine)
- `portion_measuring_unit_name`: Die Unit der verknüpften Portion (für Gramm-Umrechnung)

Alternativ (einfacher): `resolve_measuring_unit_name` gibt die **Portion-Name** zurück (z.B. "Prise") statt der Portion's measuring_unit. Aber das ist semantisch falsch.

**Entscheidung**: Den Resolve so ändern, dass er bei fehlendem `measuring_unit` am Item den **Portion-Namen** als Display-Einheit zurückgibt — NICHT die `portion.measuring_unit.name`. Das ist was der Editor zeigt.

Warte — schauen wir nochmal: Der Editor zeigt "15 Pr" für Butter. Das `Pr` kommt von der `MeasuringUnit` die am RecipeItem direkt hängt. Das Problem ist dass `RecipeItem.measuring_unit_id` NULL ist und stattdessen nur eine `portion_id` gesetzt ist.

**Eigentliche Entscheidung**: Das Frontend muss die Logik ändern:
- Wenn `measuring_unit_name` vorhanden und NICHT in `WEIGHT_VOLUME_UNITS` → direkt anzeigen: `"{quantity} {unit}"`
- Wenn `measuring_unit_name` in `WEIGHT_VOLUME_UNITS` → `formatQuantity()` wie bisher
- Wenn `measuring_unit_name` NULL → nur Zutat-Name ohne Menge ("nach Bedarf")
- Ergebnis von `formatQuantity` darf nie "0 g" sein wenn Input > 0 — stattdessen Kommazahl

### 2. Backend-Fix: Resolve stoppt Fallback auf Portion-Unit

`resolve_measuring_unit_name` soll NICHT auf `portion.measuring_unit.name` zurückfallen. Stattdessen:
- Wenn `obj.measuring_unit` → dessen Name
- Sonst → `None`

Die Portion-Infos (`ingredient_portions` mit `weight_g`) sind bereits separat verfügbar für die Gramm-Berechnung.

### 3. Frontend: WEIGHT_VOLUME_UNITS erweitern oder invertieren

Statt eine Whitelist für Gewichtseinheiten: Nur `g`, `gramm`, `kg`, `kilogramm`, `ml`, `milliliter`, `l`, `liter` als Gewichts-/Volumeneinheiten behandeln. Alles andere (Pr, TL, EL, Stück, Pck, etc.) wird direkt als `"{qty} {unit}"` angezeigt.

### 4. Nie 0 anzeigen wenn Menge > 0

`formatQuantity` muss bei kleinen Werten Kommazahlen zurückgeben statt auf 0 zu runden. Z.B. `0,3 g` statt `0 g`.

## Risks / Trade-offs

- **Risiko**: Bestehende Rezepte deren `measuring_unit_id` NULL ist UND die keine Portion haben → zeigen dann gar keine Menge. Das ist aber korrekt ("nach Bedarf").
- **Trade-off**: Die Gramm-Umrechnung für Portionen (z.B. "ca. 0,3 x Pck.") funktioniert weiterhin über `ingredient_portions` — unabhängig von der Hauptanzeige.
- **Kompatibilität**: Essensplan/Einkaufsliste nutzen möglicherweise dieselbe Logik → dort prüfen.
