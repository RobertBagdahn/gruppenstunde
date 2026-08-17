## Context

Energie wird in der DB in kJ gespeichert (`energy_kj`, `cached_energy_kj`, `cached_energy_total_kj`, `Ingredient.energy_kj`). Teile der UI rechnen bereits zu kcal um (`/ 4.184`), andere zeigen rohe kJ. Die Rule-Engine (`Rule.evaluate()`) vergleicht einen Wert gegen Schwellwerte **in derselben Einheit** — Energie-Schwellen und der eingespeiste Wert sind heute beide kJ.

Entscheidung aus Explore: **physisch auf kcal** umstellen — Schwellen, eingespeister Wert und Anzeige werden kcal, Bestandsregeln per Daten-Migration. Speicher-Feldnamen bleiben kJ.

## Goals / Non-Goals

**Goals**
- Einheitliche kcal-Anzeige überall.
- Energie-Regeln + Seeds + Hinweistexte in kcal.
- Konsistente Auswertung (Wert in kcal vor `evaluate()`).
- Zentraler `kjToKcal`-Helper statt verstreuter `/ 4.184`.

**Non-Goals**
- Keine Umbenennung von DB-Feldern oder Schema-Feldern (`energy_kj` bleibt).
- Keine Änderung der gespeicherten Nährwerte selbst (Ingredient/Recipe-Cache bleiben kJ).
- Keine Soll/Ist-Bar-Komponente (das ist Block B).

## Decisions

- **Konvertierungskonstante zentral**: Ein Helper `kjToKcal(kj) = kj / 4.184` in `frontend-food/src/utils/` (Frontend) und eine analoge Konstante/Funktion im Backend (z.B. in einem `nutrition_units`-Modul oder bestehenden Service). Magische `4.184`-Vorkommen werden ersetzt.
- **Eval-Konvertierung nur für Energie**: In `_evaluate_rules` (`nutrition_aggregation.py`) und `recipe_checks.py` wird ausschließlich für `parameter="energy_kj"` der Wert vor `evaluate()` zu kcal konvertiert; Schwellen sind dann kcal. Alle anderen Parameter bleiben unberührt.
- **`parameter`-Key bleibt `energy_kj`**: Der String-Key wird NICHT umbenannt (würde Seeds, Migrationen, Frontend-Maps brechen). Nur `unit` wird `kcal` und Schwellen/Werte werden kcal. Der Key referenziert weiterhin das kJ-Cache-Feld als Datenquelle.
- **Daten-Migration**: Eine recipe-Migration konvertiert alle `Rule`-Zeilen mit `parameter="energy_kj"`: Schwellen ÷ 4.184, `unit="kcal"`. Idempotenz-Schutz: nur konvertieren, wenn `unit != "kcal"`.
- **getCoverageStatus**: Funktionssignatur arbeitet mit kcal. Entweder Konstante `8368`→`2000` und Aufrufer übergibt kcal, ODER Eingabe bleibt kJ und Konstante bleibt 8368. Gewählt: **kcal-basiert** (Konstante 2000, Aufrufer konvertiert), damit konsistent mit der restlichen kcal-Welt. (Anmerkung: Block B wird diese Funktion später ganz durch das Backend-Soll-Band ersetzen — hier nur kcal-konform machen.)
- **Eingabeformulare**: `IngredientCreatePage` Energie-Eingabe — Entscheidung: Eingabe **bleibt kJ** (Nährwertangaben auf Verpackungen stehen primär in kJ; Label bleibt "Energie (kJ)"). Nur Anzeige-Stellen werden kcal. Falls später kcal-Eingabe gewünscht, separater Change.

## Risks / Trade-offs

- **4,184×-Fehler bei Inkonsistenz**: Wenn Schwellen kcal, Wert aber kJ (oder umgekehrt) → grobe Fehlbewertung. Mitigation: Migration + Eval-Konvertierung + Seeds in einem Change, Tests für die Eval-Konsistenz.
- **Re-Seed nötig**: Nach Code-Änderung müssen `seed_rules`/`seed_all` erneut laufen (oder die Migration deckt Bestand ab). Beide Pfade müssen kcal liefern, damit ein Re-Seed nicht versehentlich kJ zurückbringt.
- **Eingabe kJ vs. Anzeige kcal**: Kann verwirren (Zutat eingeben in kJ, sehen in kcal). Bewusst akzeptiert; Verpackungsangaben sind kJ.

## Migration Plan

1. Helper anlegen (FE + BE), `4.184`-Vorkommen ersetzen.
2. Eval-Pipeline: Energie-Wert vor `evaluate()` zu kcal konvertieren (`nutrition_aggregation.py`, `recipe_checks.py`).
3. Backend-Label/Unit-Maps auf kcal (`suggestion_service`, `improvement_ranking_service`, `nutri_improvement_service`, `supply/choices.py`).
4. Seeds umschreiben (`seed_rules.py`, `seed_all.py`) auf kcal-Schwellen + kcal-Texte.
5. Daten-Migration für Bestands-`Rule`-Zeilen.
6. Frontend-Anzeigen umstellen + `getCoverageStatus` kcal-konform.
7. Admin-Rule-Editor-Label/Unit.
8. Tests, dann Re-Seed auf Staging.

## Open Questions

- Soll der `improvement_ranking_service.py:32`-Konstantwert `"energy_kj": 335.0` (Schritt-Magnitude) ebenfalls ÷ 4.184? (Wahrscheinlich ja, da es ein kJ-Delta repräsentiert — beim Implementieren prüfen.)
- Soll der Admin-Schwellwert-Editor einen Hinweis "Werte in kcal" zeigen, um Verwechslung zu vermeiden? (Empfehlung: ja, kleiner Hilfetext.)
