# Design — recipe-improvement-merge

## Context

Heute bestehen zwei parallele Systeme für „was könnte an diesem Rezept besser sein":

**System A — Nutri-Improvement (`nutri_improvement_service.py`, 206 Zeilen):**
Simuliert für jeden Nutri-Score-Parameter (sat_fat, salt, sugar, fibre, protein, energy), welche Änderung die Klasse am meisten verbessert. Liefert aktuell hardcoded Top-3, mit `target_value` als theoretisches Ziel (10%-Verbesserung). Problem: Keine Referenz zum tatsächlichen Schwellenwert einer Klasse, der `target_value` ist nur der nächste Schritt (−10%), nicht der semantisch „gute" Wert.

**System B — Recipe Hints (`RecipeHint` Model + `match_recipe_hints`):**
Konfigurierbare Schwellenwerte pro Parameter (z.B. „salt_g > 1.5 = überschritten"). Jede RecipeHint hat `min_value`/`max_value`/`min_max` (`min` | `max` | `range`), `improvement_text`, `hint_level` (`info` | `warning` | `error`), optional `recipe_type` und `recipe_objective` Filter. Berechnet pro Rezept, welche Rules überschritten sind. Problem: Keine quantitative Priorisierung („wie dringend ist das?"), alle Einträge erscheinen gleichgewichtig.

Beide Systeme adressieren dasselbe User-Bedürfnis („zeig mir, wo das Rezept schwächelt und was ich tun kann"), aber mit komplementären Stärken: A hat quantitatives Scoring, B hat konfigurierbare Thresholds und edlere Empfehlungstexte. Die Zusammenführung ist naheliegend.

**Wichtig**: `HealthRule` (im `recipe/models/health_rule.py`) ist ein **separates** Modell für das Cockpit-Dashboard (scope=meal_event/day/meal) und nicht mit `RecipeHint` zu verwechseln. Für die Rezept-Detailseite ist nur `RecipeHint` relevant.

## Goals

- Eine einzige, priorisierte Liste auf der Rezept-Detailseite (Top-5)
- Jeder Eintrag zeigt klar: **aktueller Wert → Schwellenwert → Delta**
- Deterministisches Ranking (keine KI, reproduzierbar)
- RecipeHint bleibt konfigurierbar durch Admins ohne Code-Change
- Backward-compat im UI: bestehender `HintDetailModal` wird weiterverwendet

## Non-Goals

- LLM-basierte Verbesserungsvorschläge (separates Feature, nicht Teil dieses Merges)
- Auto-Apply von Vorschlägen auf das Rezept (existiert bereits via Magic-Button-System, bleibt unverändert)
- Neue RecipeHint-Parameter (nur existierende Rules einbeziehen)
- `HealthRule`-Integration (anderes Modell, anderer Scope, hier nicht relevant)

## Decisions

### Decision 1: Ranking-Formel

**Decision**: `impact_score = clamp(0, 100, 50 * nutri_component + 50 * hint_component)`.

- `nutri_component` = normalisierter Klassengewinn der Nutri-Score-Simulation: `class_improvement / 4.0` (max. 4 Klassen besser möglich), clamped auf 0–1; 0 wenn Parameter nicht in Nutri-Logik oder keine Verbesserung
- `hint_component` = Schwere der Überschreitung einer RecipeHint:
  - für `min_max='max'`: `(current - max_value) / max_value` clamped auf 0–1
  - für `min_max='min'`: `(min_value - current) / min_value` clamped auf 0–1
  - 0 wenn keine Rule überschritten
- Beide Komponenten 50/50 gewichtet, weil keine empirische Grundlage für anderes Verhältnis vorliegt

**Alternatives considered**:
- Nur Nutri-Score-Delta als Ranking → verliert konfigurierbare Rules, alle Admin-Thresholds effektiv wertlos
- Nur RecipeHint-Severity als Ranking → verliert Rezepte ohne überschrittene Rules, obwohl Nutri-Score verbesserbar wäre
- Gewichtung 70/30 pro Nutri → willkürlich ohne Datenbasis

### Decision 2: Deduplizierung

**Decision**: Parameter-Key (`sugar_g`, `salt_g`, etc.) ist Dedup-Key. Bei Kollision: höheren `impact_score` behalten, Empfehlungstexte via `\n\n`-Join kombinieren, `source = 'merged'`.

**Rationale**: User will nicht zweimal „Zucker reduzieren" sehen. Durch Merge der Texte bleibt Admin-Konfiguration sichtbar, ohne Redundanz.

### Decision 3: Schwellenwert-Quelle

**Decision**: Pro Parameter wird `threshold_value` wie folgt bestimmt:
- Falls RecipeHint mit `min_max='max'` existiert: `max_value`, `direction='reduce'`
- Falls RecipeHint mit `min_max='min'` existiert: `min_value`, `direction='increase'`
- Sonst: Nutri-Score-Punktgrenze für eine Klasse besser (aus Nutri-Score-Scoring-Tabelle)

**Rationale**: RecipeHint gewinnt, weil admin-konfigurierbar und semantisch „das ist die Grenze". Nutri-Punktgrenze ist Fallback, damit immer ein Wert vorhanden ist.

### Decision 4: Suggested Ingredients

**Decision**: Pro Vorschlag werden die Top-3 Zutaten zurückgegeben, die am meisten zum Parameter beitragen (sortiert nach `parameter_value_per_item_g * item_amount_g` desc). Wird aus bestehendem `_find_contributing_ingredients`-Helper in `nutri_improvement_service.py` gezogen, erweitert um `id`-Feld.

**Alternatives considered**: Top-1 → zu wenig Auswahl für User. Top-5 → Karten werden zu groß.

### Decision 5: All-Good-Zustand

**Decision**: `all_good: true` wird gesetzt wenn (a) Nutri-Klasse == A **und** (b) keine RecipeHint überschritten. Message: „Dieses Rezept ist in allen bewerteten Dimensionen im grünen Bereich."

**Rationale**: Beide Systeme müssen zufrieden sein, nicht nur eines.

### Decision 6: Quelle-Tag-Sichtbarkeit

**Decision**: `source` (`nutri_score` | `recipe_hint` | `merged`) ist im API-Response enthalten, aber im UI **nicht** prominent angezeigt. Nur als Debug-Info im Details-Modal.

**Rationale**: User interessiert nicht, aus welchem System der Vorschlag kommt; aber Devs/Admins brauchen es für Fehleranalyse. Außerdem entscheidet `source` über die Sichtbarkeit des „Details"-Buttons.

### Decision 7: Endpoint-Naming

**Decision**: `GET /api/recipes/{id}/improvements/` (generisch, nicht „nutri" im Pfad).

**Rationale**: Der Endpoint liefert künftig gemergte Daten aus mehreren Quellen, „nutri" wäre irreführend. „improvements" beschreibt die User-Intention (was kann verbessert werden).

## Risks / Trade-offs

- **Admin-Konfiguration der RecipeHints bekommt größere UI-Wirkung**: Eine falsche Hint (z.B. zu niedriger Threshold) produziert jetzt auch dominante Top-5-Einträge. Mitigiert durch Deterministik (Admins können reproduzierbar testen) und das existierende Admin-Interface.
- **Ranking-Formel ist heuristisch**: 50/50-Gewichtung ist gesetzt, nicht datengetrieben. Falls später A/B-Feedback zeigt, dass Nutri-Delta wichtiger ist, kann die Formel ohne Schema-Change angepasst werden.
- **Breaking API change**: `/nutri-improvements/` und `/recipe-hints/` werden entfernt. Da Projekt keine Backward-Compat verlangt und beide Endpoints nur intern genutzt werden, akzeptabel.
