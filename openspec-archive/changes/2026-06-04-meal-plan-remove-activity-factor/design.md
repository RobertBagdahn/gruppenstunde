## Context

Der `MealPlan` besitzt drei Skalierungsfelder: `norm_portions`, `activity_factor` (PAL, Default 1.5) und `reserve_factor` (Default 1.1). Die Property `scaling_factor = norm_portions × activity_factor × reserve_factor` wird von `supply/services/shopping_service.py` für die Einkaufsmengen verwendet.

Aktuell entsteht dadurch eine doppelte Inflation der Einkaufsmengen (PAL × Reserve ≈ 2.04× bei Beispielplan #8) und eine Inkonsistenz: Kosten- und Nährwert-Berechnungen (`planner/api/meal_plan.py`, `planner/schemas/meal_plan.py`) skalieren nur mit `norm_portions / recipe.servings × factor`, während die Einkaufsliste zusätzlich PAL und Reserve einrechnet.

PAL beschreibt den Kalorienbedarf einer Person und ist bereits Bestandteil des Norm-Portion-Rechners (`supply/services/norm_person_service.py`, Tool unter `/tools/norm-portion-simulator`). Für physische Einkaufsmengen ist PAL fachlich nicht sinnvoll.

Constraint aus `AGENTS.md`: Keine Rückwärtskompatibilität nötig — Feldentfernung inkl. Migration ist erlaubt. Pydantic- und Zod-Schemas müssen synchron bleiben.

## Goals / Non-Goals

**Goals:**
- `activity_factor`/PAL vollständig aus dem MealPlan-Datenmodell und allen MealPlan-Berechnungen entfernen.
- Einkaufsmenge = `norm_portions × reserve_factor` (über `recipe.servings` normalisiert, `MealItem.factor` und `override_portions` wie bisher berücksichtigt).
- Nährwert-/Soll-Ist-Berechnung unverändert bei `norm_portions` belassen.
- Kosten-Tab: Gesamtkosten mit und ohne Reservefaktor ausweisen.
- Pydantic- und Zod-Schemas synchron halten.

**Non-Goals:**
- Keine Änderung am Norm-Portion-Rechner oder `norm_person_service.py` (PAL bleibt dort).
- Keine Daten-Migration von RecipeItems/Portionen (Brot-Daten sind korrekt modelliert).
- Keine Vereinheitlichung der mehreren PAL-Basiswerte im Rechner (separates Thema).
- Keine Änderung an der `override_portions`-/`MealItemOverride`-Logik über das hinaus, was zur Entkopplung von `activity_factor` nötig ist.

## Decisions

### D1: Feld `activity_factor` entfernen statt deprecaten
`MealPlan.activity_factor` wird per Migration gelöscht. Alternative (Feld behalten, nur ignorieren) verworfen, da `AGENTS.md` keine Rückwärtskompatibilität verlangt und ein totes Feld zu Verwirrung führt. Bestehende DB-Werte gehen verloren — bewusst akzeptiert.

Betroffen:
- `planner/models/meal_plan.py` — Feld entfernen, `scaling_factor`-Property → `return self.norm_portions * self.reserve_factor`.
- Migration: `uv run python manage.py makemigrations planner` (RemoveField).

### D2: `scaling` in `shopping_service.py` bleibt `meal_plan.scaling_factor`
Die Mengenformel `quantity * portion.weight_g * factor * scaling / recipe.servings` bleibt strukturell unverändert; nur `scaling_factor` ändert seine Definition (D1). Dadurch minimaler Eingriff im Service und Konsistenz mit bestehender `shopping-list`-Spec. Die `override_portions`-Behandlung (bestehende Spec) bleibt erhalten.

### D3: Kosten-Endpoint liefert zwei Werte
`GET /api/meal-plans/{id}/cost` (bzw. der bestehende Kosten-Endpoint in `planner/api/meal_plan.py`) gibt zusätzlich zu den bisherigen Kosten ein Feld für die Kosten **mit Reserve** zurück.

- Bisher: Kosten = `f(norm_portions)`.
- Neu: `cost_without_reserve` (= bisheriges Verhalten) und `cost_with_reserve` (= `cost_without_reserve × reserve_factor`).
- Pydantic-Response-Schema (`planner/schemas/meal_plan.py`) und Zod-Schema entsprechend erweitern.

Reserve wirkt rein multiplikativ auf die Gesamtkosten — keine Neuberechnung pro Zutat nötig.

### D4: Nährwert-/Soll-Ist unverändert
Die Stellen, die mit `norm_portions / servings × factor` rechnen (`planner/api/meal_plan.py` Nutrition-Endpoint, `planner/schemas/meal_plan.py` Zeilen für `cached_energy_total_kj`/`cached_price_total`), bleiben unangetastet. Da sie `activity_factor` ohnehin nicht verwenden, entsteht hier kein Mengenbruch.

### D5: Frontend — Aktivitätsfaktor-Feld entfernen
In den Essensplan-Einstellungen (`frontend-food`) wird das Aktivitätsfaktor-Eingabefeld entfernt. Der Kosten-Tab erhält die Doppelanzeige „mit/ohne Reserve". Zod-MealPlan-Schemas verlieren `activity_factor`.

## Risks / Trade-offs

- **Datenverlust bestehender `activity_factor`-Werte** → Bewusst akzeptiert (keine Rückwärtskompatibilität nötig); Werte waren fachlich falsch eingesetzt.
- **Andere Aufrufer von `activity_factor` übersehen** → Vor Implementierung repo-weiter Grep auf `activity_factor` (Backend `planner/`, `core/seed_all.py`, `pdf_export.py`; Frontend Schemas/Components). Aktuell bekannt: siehe Impact in proposal.md.
- **Schema-Drift Pydantic/Zod** → Beide in derselben Aufgabe ändern und über Tests/TypeScript-Build absichern.
- **`scaling_override`-Parameter in `generate_shopping_list`** ist toter Code (kein Aufrufer übergibt ihn) → bleibt unverändert, kein Risiko.
- **Kosten-Tab-UX**: zwei Beträge könnten verwirren → klare Labels („Gesamtkosten" vs. „inkl. Reserve").

## Migration Plan

1. Backend: Feld entfernen, `scaling_factor` anpassen, `makemigrations planner`, `migrate`.
2. Service-/API-/Schema-Anpassungen, Seeds bereinigen.
3. Tests anpassen (Shopping-Service, Kosten-API, Migration).
4. Frontend: Zod-Schemas + UI (Einstellungen, Kosten-Tab).
5. Verifikation an Plan #8: Brot ergibt ~6.48 kg (mit Reserve 1.2) bzw. 5.4 kg ohne Reserve.

Rollback: Migration rückwärts (`migrate planner <vorherige>`); Feld-Wiederherstellung verliert die alten Werte — vor Deploy keine produktiven Daten betroffen (aktive Entwicklung).

## Open Questions

- Genauer Name/Pfad des bestehenden Kosten-Endpoints und exakte Response-Felder werden in der Spec/Tasks-Phase aus `planner/api/meal_plan.py` übernommen.
- Soll die Kosten-Doppelanzeige auch im PDF-Export erscheinen? (Vorschlag: vorerst nein, nur „Aktivitätsfaktor"-Zeile entfernen.)
