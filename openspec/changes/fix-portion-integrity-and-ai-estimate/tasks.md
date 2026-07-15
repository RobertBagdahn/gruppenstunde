## 1. Guard-Rails: Portion-Model & API

- [x] 1.1 `Portion`: Hilfsmethode `is_referenced_by_recipe_items()` (bzw. Query-Check) implementieren
- [x] 1.2 `update_portion`-API-Endpoint (`supply/api/ingredients.py`): Bei Änderung von `weight_g` an referenzierter Portion → neue Portion anlegen statt Update; alte Portion unverändert lassen
- [x] 1.3 Migration: Partial `UniqueConstraint` auf `Portion` für `(ingredient_id)` WHERE `rank=1 AND deleted_at IS NULL`
- [x] 1.4 `delete_portion`-API-Endpoint: Vor Soft-Delete prüfen, ob RecipeItems referenzieren; falls ja → Rebind-Funktion (Task 1.5) aufrufen; falls die zu löschende Portion selbst die einzige aktive `rank=1`-Portion ist → Fehler zurückgeben
- [x] 1.5 Dedizierte Rebind-Funktion implementieren: RecipeItem auf aktuelle `rank=1`-Portion umhängen, `quantity` so umrechnen, dass Gramm-Menge erhalten bleibt
- [x] 1.6 Sicherstellen, dass kein bestehender Code-Pfad (`enrich_seeds`, Import-Commands) `RecipeItem.portion_id` direkt schreibt, außer über die Rebind-Funktion
- [x] 1.7 Unit-Tests: weight_g-Änderung an referenzierter Portion wird umgeleitet; unreferenzierte Portion bleibt änderbar; Unique-Constraint schlägt bei doppeltem rank=1 fehl; Rebind erhält Gramm-Menge; Löschen der letzten rank=1-Portion wird abgelehnt

## 2. Bestandsdaten-Reparatur: Management-Command

- [x] 2.1 Neuen Management-Command `repair_portion_integrity` anlegen (Grundgerüst, Argumente, Logging)
- [x] 2.2 Schritt „Dedupe rank=1": Alle Zutaten mit >1 aktiver rank=1-Portion finden; referenzierte Portion bevorzugen, sonst plausibelstes `weight_g`; verlierende Portion auf freien Rang zurückstufen
- [x] 2.3 Schritt „Rebind toter Referenzen": Alle RecipeItems mit `portion.deleted_at IS NOT NULL` finden und über die Rebind-Funktion (Task 1.5) umhängen
- [x] 2.4 Schritt „AI-Plausibilitätsprüfung": Für alle Rezepte Gesamtgewicht/Portion berechnen, unrealistische Fälle identifizieren (Schwellenwerte analog zur Exploration: >1500g bzw. <30g pro Portion als Einstieg), betroffene RecipeItems neu schätzen lassen (Wiederverwendung/Erweiterung von `RecipeQuantityEstimationService`) und automatisch speichern
- [x] 2.5 Schritt „Cache-Rebuild": Für jedes in Schritt 2.3/2.4 veränderte Rezept `recalculate_recipe_cache()` aufrufen
- [x] 2.6 Reihenfolge im Command erzwingen (2.2 → 2.3 → 2.4 → 2.5), keine Parallelisierung zwischen den Schritten
- [x] 2.7 Unit-Tests für Dedupe-Logik (referenziert gewinnt, sonst Plausibilitäts-Heuristik)
- [x] 2.8 Unit-Tests für Rebind-Massenlauf (mehrere betroffene RecipeItems in einem Lauf)
- [x] 2.9 Command lokal gegen Dev-DB ausführen und Ergebnis stichprobenartig verifizieren (u.a. Rezept 59 "Linsensuppe", Rezept 100 "Käsespätzle")

## 3. AI-Mengenschätzung: Backend

- [x] 3.1 `EstimateQuantityItemOut`-Schema (`recipe/schemas/items.py`) um `portion_id: int` erweitern
- [x] 3.2 `RecipeQuantityEstimationService._build_response()`: `target_portion`-Auflösung robust gegen soft-gelöschte/nicht-existente rank=1-Kandidaten machen (nutzt jetzt eindeutigen rank=1 dank Task 1.3); `portion_id` von `target_portion` in Response aufnehmen
- [x] 3.3 Backend-Plausibilitätscheck beim Speichern: Im Update-Pfad für RecipeItems (bzw. dediziertem Endpoint für Apply-Flow) `quantity × portion.weight_g` gegen erwarteten Gramm-Wert prüfen (Toleranz ±1%), bei Abweichung Fehler zurückgeben
- [x] 3.4 Unit-Tests: Item auf non-rank=1-Portion → Response referenziert rank=1-portion_id; Item auf soft-gelöschter Portion → Response ignoriert diese; Item bereits auf rank=1 → unverändert korrekt
- [x] 3.5 Regressionstest exakt mit Rezept-59-Szenario (Olivenöl/Jodsalz/Pfeffer-Konstellation) nachbauen

## 4. AI-Mengenschätzung: Frontend

- [x] 4.1 `EstimateQuantityItemSchema` (Zod, `frontend-food/src/schemas/recipe.ts`) um `portion_id: z.number()` erweitern
- [x] 4.2 `handleApplyEstimate()` (`InlineIngredientEditor.tsx`): `portion_id` und `quantity` gemeinsam in einem State-Update übernehmen, `measuring_unit_name`/Label passend zur neuen Portion aktualisieren
- [x] 4.3 AI-Estimate-Vorschau-Tabelle: Anzeige von Alt/Neu-Werten überprüfen und ggf. anpassen (Kombination aus Gramm primär + Portion-Kontext sekundär, siehe frühere Diskussion), damit z.B. "0.01 Gramm (1g)" nicht mehr verwirrt
- [x] 4.4 Frontend-Test: Apply-Flow mit unterschiedlicher `portion_id` in Alt/Neu → beide Felder werden aktualisiert, `isDirty: true`

## 5. Edit-Mode: Robuste Gramm-Berechnung

- [x] 5.1 `normalizeItems()` (`InlineIngredientEditor.tsx`): Editierbaren `quantity`-Wert aus `item.weight_g`/`item.quantity`-Verhältnis berechnen statt aus fragiler `ingredient_portions.find()`-Lookup
- [x] 5.2 Sicherstellen, dass Label/Einheit weiterhin korrekt auf die (ggf. nicht mehr in `ingredient_portions` gelistete) aktuelle Portion referenziert, ohne auf `weight_g=1`-Fallback zurückzufallen
- [x] 5.3 `getItemWeightG()` auf Konsistenz mit der neuen `normalizeItems()`-Logik prüfen (keine doppelte/abweichende Berechnung mehr nötig)
- [x] 5.4 Frontend-Unit-Test: RecipeItem mit `portion_id`, das nicht in `ingredient_portions` enthalten ist (soft-gelöscht) → korrekter Gramm-Wert aus `item.weight_g`, nicht `weight_g=1`-Fallback
- [ ] 5.5 Manuelle Verifikation im Browser: Rezept 59 im Edit-Mode öffnen, Jodsalz-Zeile zeigt plausible Gramm-Menge

## 6. Rollout & Validierung

- [x] 6.1 `makemigrations --check` und `showmigrations` gegen lokale DB prüfen
- [x] 6.2 Reparatur-Command (Aufgabe 2) einmalig gegen Dev-DB ausführen, Ergebnis für Rezept 59 und Rezept 100 verifizieren (Gesamtgewicht/Portion plausibel, keine doppelten rank=1 mehr)
- [x] 6.3 Live-Test wiederholen: `estimate_quantities()` für Rezept 59 aufrufen, "Übernehmen" simulieren, prüfen dass keine der drei zuvor korrumpierten Zutaten (Olivenöl, Jodsalz, Pfeffer) mehr abweicht
- [x] 6.4 Vor Produktions-Rollout: DB-Backup/Snapshot als Sicherheitsnetz vor dem produktiven Reparatur-Lauf
- [x] 6.5 Reparatur-Command gegen Produktions-DB ausführen (nach Backup)
- [x] 6.6 Stichprobe auf Produktion: mehrere zuvor als unplausibel identifizierte Rezepte (z.B. "Kartoffelsuppe", "Nudeln mit veganem Pesto") auf realistische Mengen prüfen
