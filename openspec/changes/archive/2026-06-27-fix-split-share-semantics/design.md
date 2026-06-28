## Context

Das `MealItemSplit`-Model speichert Portionen-Splits als `share`-Float (0.0–1.0) für zwei Typen von `RecipeItem`: Exchange-Gruppen-Mitglieder und optionale Zutaten. Beide Typen teilen sich denselben API-Endpunkt (`PUT /api/meal-plans/{id}/meal-items/{item_id}/splits/`), dasselbe Model und dieselbe Validierungsfunktion `_validate_split_shares`.

Die Semantik von `share` unterscheidet sich jedoch:
- **Exchange-Gruppe**: `share` ist Teil einer Summe. Alle Mitglieder einer Gruppe teilen sich `effectivePortions`. Σ share = 1.0.
- **Optionale Zutat**: `share` ist der Inklusions-Anteil. `share = 0.6` bedeutet "in 60% der Portionen enthalten". Es gibt nur einen Eintrag pro optionaler Zutat.

Die aktuelle Implementierung behandelt beide Typen gleich (Σ=1.0-Prüfung für alles), was optionale Splits mit share < 1.0 unmöglich macht.

## Goals / Non-Goals

**Goals:**
- `_validate_split_shares` erkennt optionale Items und wendet keine Σ=1.0-Prüfung an
- `get_included_fractions` verwendet share direkt für optionale Items (kein `largest_remainder_round`)
- Exchange-Gruppen-Verhalten bleibt unverändert
- `get_split_delta_total` braucht keine Änderung (delta für optionale Items ist bereits korrekt: `(share - 1.0) × kcal`)

**Non-Goals:**
- Keine Frontend-Änderungen
- Keine DB-Migrationen (Model, Constraint bleiben gleich)
- Keine Pydantic/Zod-Schema-Änderungen
- Keine Änderung der API-Endpunkt-Struktur

## Decisions

### Decision 1: Optionale Items in `_validate_split_shares` anders behandeln

**Gewählt:** Validierung prüft für optionale Items nur 0.0–1.0 Range (explizit in der Funktion, obwohl DB-Constraint es bereits sichert). Für Exchange-Gruppen bleibt Σ=1.0.

**Alternativen:**
- *Nur DB-Constraint verlassen*: Spart Code, aber keine kontext-abhängige Fehlermeldung möglich
- *Separate Validierungsfunktion*: Klarere Trennung, aber Overkill für diese kleine Logik

**Begründung:** Explizite Prüfung erlaubt unterschiedliche Fehlermeldungen (Exchange: "Summe muss 100% ergeben" vs. Optional: "Anteil muss zwischen 0% und 100% liegen").

### Decision 2: Optionale Items in `get_included_fractions` direkt verwenden

**Gewählt:** Für optionale Items wird `fractions[ri.id] = splits[ri.id]` direkt gesetzt, ohne `largest_remainder_round`. Der `largest_remainder_round`-Pfad wird nur für Gruppen mit ≥2 Einträgen aufgerufen.

**Alternativen:**
- *Zwei Shares für optional speichern (include + exclude)*: Würde die Semantik vereinheitlichen, aber erfordert Frontend- und Datenmodell-Änderungen
- *Pseudo-Eintrag für "ohne" erzeugen*: Komplex, nicht wartbar

**Begründung:** Minimalinvasiv. Das bestehende Verhalten für Exchange-Gruppen bleibt, und die neue Logik für optionale Items ist ein einfacher Branch.

### Decision 3: get_included_fractions gruppiert Exchange und Optional getrennt

**Gewählt:** In der Loop über `recipe_items` werden optionale Items in `group_members` aufgenommen, aber `largest_remainder_round` wird nur aufgerufen, wenn `len(members) >= 2`. Bei einem Eintrag (optionales Item) wird `rounded_by_item[ri.id] = round(split * effective_portions)` direkt gesetzt.

**Alternativen:**
- *Optionale Items komplett aus group_members ausschließen*: Auch möglich, würde aber die Logik aufsplitten

**Begründung:** Die "≥2"-Prüfung ist einfach zu verstehen und deckt sowohl Exchange-Gruppen (immer ≥2) als auch optionale Items (immer 1) korrekt ab.

## Risks / Trade-offs

- **[Risk] share=0 für optionales Item wird als Inklusion 0% interpretiert.** Der DB-CheckConstraint erlaubt share=0. Ein fehlender Split-Eintrag wird als Default (1.0) interpretiert. Ein expliziter share=0-Eintrag vs. kein Eintrag ist semantisch unterschiedlich — das war vorher schon so, wird jetzt aber funktional.

- **[Risk] Bestehende optionale Splits mit share=1.0 sind kompatibel.** share=1.0 erfüllt beide Interpretationen (Σ=1.0 und Inklusion 100%). Keine Datenmigration nötig.

- **[Trade-off] DRY-Verletzung bei der Gruppen-Key-Logik.** Sowohl `_validate_split_shares` als auch `get_included_fractions` bauen Group-Keys (`exchange:...`, `optional:...`). Könnte man in eine Hilfsfunktion extrahieren. Für diese kleine Änderung wird das bewusst vermieden, um den Change fokussiert zu halten.
