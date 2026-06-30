## Context

Für `fibre_g` sind alle Schwellen reine Untergrenzen: Frontend-Fallback `NutritionView.tsx:86-93` (`max_green = max_yellow = null`), Chart-Baseline `NutrientBalanceChart.tsx:30` (`{ min: 25, max: null }`), Backend-Seeds `seed_rules.py` (alle `max = None`). Die Ampel-Logik überspringt bei `max = null` jeden Obergrenzen-Check (`evaluateRuleStatus` `NutritionView.tsx:148-160`; `Rule.evaluate()` `rule.py:159-179`) — eine „zu viel"-Ampel ist also unmöglich. `SollIstBar.tsx:96-97,106-114` stellt min-only bereits korrekt dar („Soll: ≥ 25 g", keine Obergrenzen-Zone).

Verbleibendes Problem: `NutrientBalanceChart.getSollAndRange` (`:63-74`) setzt `mid = target.min ?? target.max ?? 0` → für fibre `mid = 25` (Minimum). Der gezeichnete „Soll"-Balken (`:114-117`) steht damit auf dem Minimum; ein Ist-Balken darüber wirkt wie eine Überschreitung. Zusätzlich könnten auf einzelnen Umgebungen veraltete `fibre_g`-Rules mit gesetztem max existieren (API liefert sie ungefiltert, `rules.py:12-15`, und sie hätten Vorrang vor dem Fallback `NutritionView.tsx:322-335`).

Constraints: Keine Ampel-Logik-Änderung nötig. UI-only Fix + Datenhygiene. `uv run`.

## Goals / Non-Goals

**Goals:**
- Reine Untergrenzen-Nährstoffe werden im Chart als Mindest-Schwelle dargestellt; Werte über dem Minimum erscheinen nicht als „zu viel".
- Keine veralteten `fibre_g`-Rules mit Maximum in der DB.

**Non-Goals:**
- Keine Änderung der Ampel-/Evaluierungslogik (ist bereits korrekt).
- Keine Einführung eines neuen Rule-Typs/`rule_type` (das min/max-Nullable-Modell deckt „nur Untergrenze" bereits ab).

## Decisions

### D1: Chart-Darstellung für min-only-Nährstoffe
`NutrientBalanceChart` behandelt Nährstoffe mit `max = null` gesondert: statt einer Soll-Säule auf dem Minimum wird das Minimum als Schwelle/Linie dargestellt, und ein Ist-Wert ≥ Minimum wird als „erreicht/gut" markiert (nicht als Überschreitung).

- **Warum**: behebt die alleinige verbleibende (visuelle) Ursache; konsistent mit `SollIstBar`, das es bereits korrekt macht.

### D2: Datenhygiene via Re-Seed
Sicherstellen, dass `fibre_g`-Rules ausschließlich Untergrenzen haben (Re-Seed mit `seed_rules --clear` bzw. Bereinigungs-Check). Optional ein Test/Check, dass keine `fibre_g`-Rule ein Maximum gesetzt hat.

### Betroffene Dateien
- Frontend: `frontend-food/src/components/charts/NutrientBalanceChart.tsx` (Hauptänderung), `frontend-food/src/components/shared/SollIstBar.tsx` (nur prüfen), `frontend-food/src/pages/planning/NutritionView.tsx` (nur prüfen).
- Backend: `backend/recipe/management/commands/seed_rules.py` (Re-Seed/`--clear`-Pfad), optional Test/Check.

### API-Änderungen
- Keine.

## Risks / Trade-offs

- **Andere min-only-Nährstoffe** (z.B. Protein-Mindestwerte) profitieren ebenfalls — gewünscht; sicherstellen, dass max-basierte Nährstoffe (Zucker, Salz) unverändert als Obergrenze dargestellt bleiben.
- **Re-Seed überschreibt angepasste Rules** → `--clear` bewusst einsetzen; ggf. nur fibre_g-Maxima bereinigen statt alles.

## Migration Plan

1. Chart-Darstellung für `max = null` anpassen, Tests.
2. Datenhygiene-Check/Re-Seed der Rules.
3. Keine DB-Schema-Migration. Rollback code-seitig.

## Open Questions

- Soll die Datenbereinigung als Migration/Management-Command erzwungen werden oder reicht der dokumentierte Re-Seed-Schritt? Annahme: Check/Command, der fibre_g-Maxima entfernt, idempotent.
