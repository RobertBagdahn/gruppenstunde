## Context

Der Breakfast Wizard (`frontend-food/src/pages/planning/breakfast/*`) berechnet Zutatenmengen rein kcal-basiert in Gramm (`breadItemGrams`, `toppingItemGrams` in `lib/breakfastCalc.ts`). Die Anzeige beschränkt sich bisher überall auf `"{Math.round(grams)}g"`. Der Essensplan-Editor (`pages/planning/MealSlot.tsx`) hat für Items mit einer echten Portions-`measuring_unit` (Stück/Scheibe/Packung) bereits einen fertigen Anzeigepfad über das backend-berechnete Feld `portion_display` (siehe Capability `portion-weight-display`). Für Items mit `measuring_unit_name = "g"` (u.a. alle vom Breakfast Wizard erzeugten Items) fällt der Code jedoch auf reine Gramm-Anzeige zurück.

Die notwendigen Rohdaten für eine Portionsableitung existieren bereits im Katalog: `BreakfastPortion { name, weight_g, priority, is_default }` wird pro Zutat vom Endpunkt `breakfast_catalog.py` geliefert und ist im Zod-Schema `BreakfastPortionSchema` abgebildet.

Dieser Change fügt eine reine Frontend-Anzeigeschicht hinzu, die aus (Gramm-Menge + Portionsdaten der Zutat) einen Zusatz-String berechnet — ohne die Speicher- oder Eingabeeinheit zu ändern.

## Goals / Non-Goals

**Goals:**
- Einheitliche, wiederverwendbare Funktion `deriveGramPortionHint(grams, portions)` in `frontend-food/src/lib/portionQuantityHint.ts`, die für Gramm-Anzeigen den Zusatz-Hinweis berechnet.
- Anwendung dieser Funktion an allen identifizierten Anzeigeorten (StepBasis, StepBelag, StepCockpit, MealSlot, IngredientDetailPage, ShoppingView-Backend-Äquivalent).
- Konsistentes Format, Rundung und Schwellwertverhalten über alle Orte hinweg.
- Kein Einfluss auf gespeicherte Daten, Berechnungen oder API-Requests — rein abgeleitete Anzeige.

**Non-Goals:**
- Keine Änderung der Eingabe-/Speichereinheit (bleibt Gramm/`quantity_g`).
- Keine editierbare Portions-Eingabe im Essensplan-Editor (bleibt Gramm-Input).
- Keine Änderung an Backend-Datenmodellen oder Migrationen.
- Keine KI-gestützte automatische Ergänzung fehlender Portionsdaten (nur Verlinkung zur manuellen Bearbeitung).

## Decisions

### 1. Reine Frontend-Berechnung statt Backend-Feld

**Entscheidung**: Der Portionshinweis wird im Frontend aus bereits geladenen Katalog-/Ingredient-Portionsdaten berechnet, nicht als neues Backend-Feld.

**Begründung**: Die Wizard-Schritte (StepBasis, StepBelag, StepCockpit) berechnen Gramm-Werte bereits rein clientseitig aus `WizardState` + Katalog-Cache (kein Server-Roundtrip pro Slider-Änderung). Ein Backend-Feld würde bei jeder Slider-Bewegung einen API-Call erfordern und die Live-Aktualisierung (siehe Requirement „Live-Aktualisierung") verlangsamen. Für `ShoppingListItem.display_quantity` bleibt die bestehende Backend-Berechnung (Capability `shopping-list-package-display`) erhalten, wird aber um „benannte Portion bevorzugen" erweitert.

**Alternative verworfen**: Erweiterung von `portion_display` (Backend, `MealItem`) auf Gramm-Items — hätte eine Migration/Recompute-Logik für Bestandsdaten und einen zusätzlichen API-Rundtrip in `MealSlot.tsx` erfordert, obwohl die Zutat-Portionsdaten dort über den Katalog-Cache bereits im Frontend vorliegen.

### 2. Portion-Auswahl nach `priority`-Feld

**Entscheidung**: Primäre Portion = niedrigster `priority`-Wert mit `weight_g > 0` (nicht `is_default`).

**Begründung**: `priority` ist bereits das kanonische Ranking-Feld in `BreakfastPortionSchema` und wird vom Backend für die Sortierung der Portionsliste verwendet (vgl. Capability `portion-ranking`). `is_default` markiert dagegen die im UI vorausgewählte Portion für manuelle Mengeneingabe, was ein anderer Zweck ist.

### 3. Sekundäre Portion nur bei „sinnvoll unterscheidbar"

**Entscheidung**: Eine zweite Portionsart wird nur angezeigt, wenn sie einen anderen Namen als die primäre hat und `weight_g > 0` ist (z.B. Scheibe + Packung, nicht Scheibe + Scheibe-Variante).

**Begründung**: Vermeidet redundante oder verwirrende Doppelanzeigen bei Zutaten mit mehreren fast identischen Portionsvarianten (z.B. „Scheibe dünn" / „Scheibe dick").

### 4. Schwellwert 0,1 statt Rundung auf 0

**Entscheidung**: Portionswerte `< 0,1` werden komplett ausgeblendet statt als `"0,0"` angezeigt.

**Begründung**: Ein Wert wie „0,02 Packung Salz" liefert keinen praktischen Mehrwert und würde eher verwirren als helfen (entspricht Nutzerentscheidung aus der Exploration).

### 5. Essensplan-Editor: Erweiterung des bestehenden Fallback-Zweigs

**Entscheidung**: In `MealSlot.tsx` wird der bestehende `isIngredient && !meal.is_synced`-Fallback-Zweig (aktuell `{Math.round(quantity_g)}g`) um den Portionshinweis ergänzt; der bereits funktionierende `portion_display`-Zweig für echte Portions-Items bleibt unverändert.

**Begründung**: Minimalinvasive Änderung, kein Risiko für den bereits korrekt funktionierenden Portion-Anzeigepfad.

## Risks / Trade-offs

- **[Risiko]** Doppelte Rundungslogik (Backend `format_weight` für Gramm, Frontend für Portionen) könnte langfristig divergieren.
  → **Mitigation**: `portionQuantityHint.ts` importiert/dupliziert bewusst nur die Portionsrundung (1 Nachkommastelle, Komma), nicht die Gramm-Rundungsstufen aus `quantity-display-formatting` — beide bleiben unabhängig testbar.
- **[Risiko]** Performance: Portionsberechnung läuft bei jeder Slider-Bewegung im Wizard erneut.
  → **Mitigation**: Reine arithmetische Operation (Division + Rundung), kein Deep-Clone oder Netzwerkzugriff — vernachlässigbarer Overhead.
- **[Risiko]** Uneinheitliche Priorität-Daten in Bestandszutaten (fehlende oder doppelte `priority=1`).
  → **Mitigation**: Fallback-Kette (niedrigster `priority` mit `weight_g > 0` → falls keiner, keine Anzeige), keine Annahme über Eindeutigkeit erzwungen.
- **[Trade-off]** `ShoppingView`/`ShoppingListItem.display_quantity` wird weiterhin backend-seitig berechnet (anders als die restliche rein-Frontend-Lösung) — akzeptiert, um die bestehende, getestete Backend-Logik (Capability `shopping-list-package-display`) nicht zu duplizieren.

## Migration Plan

Kein Datenbank-Migrationsbedarf. Rollout als reine Frontend-Anzeigeänderung + kleine Backend-Erweiterung der `display_quantity`-Berechnung (Named-Portion-Bevorzugung). Rollback: Revert der betroffenen Commits, keine Datenmigration rückgängig zu machen.

## Open Questions

- Muss `breakfast_catalog.py` die `portions`-Liste bereits nach `priority` sortiert zurückgeben, oder übernimmt das Frontend die Sortierung? (Wird in Task-Phase geprüft; falls Backend nicht sortiert, sortiert `portionQuantityHint.ts` selbst.)
