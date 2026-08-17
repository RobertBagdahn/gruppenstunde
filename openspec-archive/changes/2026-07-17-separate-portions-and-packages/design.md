## Context

Aktuell sind `Portion` (Rezept-Messung: "1 EL", "100g") und Packung (Einkaufsgröße: "500g Packung") in einem einzigen `Portion`-Model vermischt. Das `is_system`-Flag, rank=9999 für `g`, Auto-Creation via `post_save`-Signal und diverse Backfill-Commands sind Workarounds für diese konzeptionelle Unschärfe. Die Zutat-Detailseite zeigt alles in einer gemischten Liste mit "System"-Badges und Lock-Icons.

Ziel: `Package` als eigenständiges Model extrahieren, `is_system` komplett entfernen, Gramm implizit machen (`RecipeItem.portion` nullable), Code drastisch vereinfachen.

## Goals / Non-Goals

**Goals:**
- Neues `Package`-Model mit eigenem API-CRUD, getrennt von `Portion`
- `is_system`-Feld, System-Portion-Signal und Backfill-Commands ersatzlos entfernen
- `g`-Portion (rank=9999) eliminieren — Gramm-Fallback über nullable FK
- KI-Extraction: Portionen + Packages in einem kombinierten Apply-Endpunkt
- Frontend: zwei getrennte Sektionen auf Zutat-Detailseite
- Migration via `RunPython` (kein separater Command)

**Non-Goals:**
- `RecipeItem.portion` nullable ist Datenmodell-Änderung, aber Änderungen an Rezept-Berechnungslogik separat (Gramm-Fallback-Rechnung kann im gleichen Change passieren, da trivial)

## Decisions

### Decision 1: Package als separates Model (nicht als Portion-`type`-Feld)

**Gewählt:** Eigenes `Package`-Model mit `name`, `weight_g`, `rank`, `ingredient` FK.

**Alternativen:**
- `type`-Feld auf Portion (`portion` vs `package`): Weniger DB-Änderung, aber weiterhin Vermischung. Packages brauchen kein `measuring_unit`, keine `quantity`. Würde Leerfelder erzwingen oder nullable machen.
- Gleiches Model, getrennte API-Filter: Löst das UI-Problem, aber nicht die Datenmodell-Schwäche.

**Begründung:** Package ist ein anderes Konzept mit anderen Feldern. Eigenes Model = Typsicherheit, keine Null-Felder, saubere Trennung im Code.

### Decision 2: Package ohne measuring_unit und quantity

**Gewählt:** Nur `name`, `weight_g`, `rank`, kein `measuring_unit`, kein `quantity`.

**Begründung:** Eine Packung wird immer in Gramm gemessen. "500g Packung" — das Gewicht *ist* die Einheit. `weight_g` = 500 bedeutet genau das. Kein `quantity`-Feld nötig, das immer 1 wäre.

### Decision 3: RecipeItem.portion nullable — Gramm implizit

**Gewählt:** `RecipeItem.portion = None` → System interpretiert als Gramm (`quantity` bedeutet Gramm).

**Begründung:** Ohne System-Portionen brauchen wir keinen "g"-DB-Eintrag. Impliziter Fallback ist die sauberste Lösung. `weight_g_per_unit` existiert nicht, also ist `quantity × 1g` die einzige sinnvolle Interpretation.

**Betroffene Stellen:**
- `RecipeItem.compute_weight()` / `recipe/services/` — wenn `portion is None`, return `quantity` (in Gramm)
- Recipe-Cache-Recalculation — gleicher Check
- Alle Stellen, die `recipe_item.portion.weight_g` direkt referenzieren, müssen nullable prüfen

### Decision 4: Migration per RunPython

**Gewählt:** `RunPython` in der Django-Migration, kein separater Command.

**Ablauf:**
1. `Package`-Tabelle erstellen
2. Alle `Portion` mit `is_system=True AND name ILIKE 'packung'` → in `Package`-Rows umwandeln
3. Alle `Portion` mit `is_system=True AND name ILIKE 'g'` → löschen (RecipeItems auf `portion=NULL` rebinden wo nötig)
4. Alle `Portion` mit `is_system=True AND name ILIKE 'stück'` → `is_system=False` setzen
5. `is_system`-Spalte droppen
6. `RecipeItem.portion` nullable machen

**Reihenfolge der Migrationen:**
- Migration 1: `Package`-Model + `Portion` ohne `is_system`
- Migration 2: `RecipeItem.portion` nullable
- Keine `RunPython`-Migration allein — die Daten-Operationen passieren in Migration 1 nach der Schema-Änderung

### Decision 5: Kombinierter ai-apply-Endpunkt

**Gewählt:** `POST /{slug}/portions/ai-apply/` → `POST /{slug}/ai-apply/` (neue Route), akzeptiert `portions` + `packages`.

**Begründung:** Ein atomarer Call = kein inkonsistenter Zwischenzustand. `replace_all` löscht bestehende Portionen UND Packages in einer Transaktion.

### Decision 6: Quality Score ohne System-Portion-Check

**Gewählt:** System-Portion-Check (5% Gewicht) ersatzlos entfernen. Die anderen 95% (Nährwerte, Preis, phys. Daten, Klassifikation, Scout-Felder) bleiben.

**Begründung:** Ohne System-Portionen gibt es keinen Standard-Satz, den wir prüfen könnten. Die Existenz von mindestens einer Portion *und* einer Packung könnte man prüfen, aber das ist fürs Scoring wenig relevant.

### Decision 7: AI-Prompt ohne system_gramm

**Gewählt:** `system_gramm` komplett aus Prompt und Schema entfernen. KI liefert nur noch `portions` (rezeptportionen, belag, backmengen) und `packages` (packungen).

**Begründung:** Gramm ist jetzt implizit. Die KI muss keine "name='g', weight_g=1" Suggestion mehr liefern — das war immer Redundanz.

## Risks / Trade-offs

- **[Risk] RecipeItem.portion=NULL → Berechnungen müssen nullable handlen**: Jede Stelle, die `portion.weight_g` direkt dereferenziert, würde crashen. → **Mitigation**: Alle `portion__weight_g` Zugriffe im Codebase auditieren und mit `IFNULL`/`COALESCE` absichern. Tests schreiben.
- **[Risk] Migration löscht "g"-Portionen, die von RecipeItems referenziert werden**: → **Mitigation**: In der RunPython-Migration alle RecipeItems mit `portion.name='g'` auf `portion=NULL` umstellen.
- **[Risk] Shopping-Service-Logik muss komplett umgestellt werden**: `get_shopping_portion()` und `build_package_display()` nutzen aktuell Portion-Filter mit `is_system`. → **Mitigation**: Neue Implementierung direkt auf `Package`-Model.

## Open Questions

Keine — alle Design-Entscheidungen sind geklärt.
