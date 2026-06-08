## Context

Der Essensplaner evaluiert Nährwert-Regeln auf vier Scopes: `recipe`, `meal`, `day`, `meal_event`. In der NutritionView (`NutritionView.tsx`) werden aktuell beide planbezogenen Scopes (`day` und `meal_event`) über einen `Array.find()`-Aufruf vermischt — das erste gefundene Rule-Objekt gewinnt, unabhängig davon ob es eine Tagessumme oder einen Plan-Durchschnitt repräsentiert. Der Nutzer sieht nur eine SollIstBar ohne Kontext, ob die Bewertung eine Summe oder einen Durchschnitt darstellt.

Zusätzlich teilt der `suggestion_service` in `_evaluate_admin_rules()` die Thresholds von `meal_event`-Regeln durch `num_days`. Der Ist-Wert wird ebenfalls geteilt (korrekt), aber die doppelte Division der Thresholds führt zu sinnlos kleinen Schwellwerten in der SollIstBar (z.B. Soll ≥ 382 kcal statt ≥ 1912 kcal bei 5 Tagen).

## Goals / Non-Goals

**Goals:**
- `day`- und `meal_event`-Regeln in NutritionView visuell in getrennten Sektionen darstellen
- SollIstBar zeigt Kontext-Label was gemessen wird ("Summe Tag 3" / "Ø 5 Tage")
- `meal_event`-Thresholds im Suggestions-Endpunkt bleiben ungeteilt (Pro-Tag-Werte)
- SuggestionCard zeigt bei Regel-Vorschlägen den Scope (Tag-Nummer oder Ø-Plan)

**Non-Goals:**
- Keine Sparklines / Trend-Anzeigen pro Tag
- Keine Änderung an `recipe`-Scope-Regeln (Rezept-Detailseite)
- Keine Änderung an `meal`-Scope-Regeln (Einzelmahlzeit-Ansicht)
- Keine Änderung an der Rule-Datenbankstruktur oder dem Admin-Interface

## Decisions

### Decision 1: Threshold-Division rückgängig machen (Backend)

**Ansatz**: In `_evaluate_admin_rules()`, die Division der `min_green`/`max_green`/`target_mid` durch `num_days` für `scope=meal_event` entfernen. Nur `current` wird durch `num_days` geteilt, um den Tagesdurchschnitt zu erhalten.

**Rationale**: Die Rule-Thresholds sind als Pro-Tag-Werte definiert (z.B. "1912-2629 kcal pro Tag"). Der Ist-Wert muss auf Tagesdurchschnitt normalisiert werden, aber die Thresholds bleiben unverändert. Der `Rule.evaluate()`-Aufruf vergleicht bereits `current/n` (Tagesdurchschnitt) mit den Original-Thresholds — das ist korrekt. Nur die an das Frontend ausgelieferten Werte für die SollIstBar waren falsch geteilt.

**Alternativen verworfen**:
- Thresholds vor `Rule.evaluate()` teilen und nach der Evaluierung wieder multiplizieren: unnötig komplex
- Eigene Normalisierungs-Logik im Frontend: verschiebt das Problem, löst es nicht

### Decision 2: NutritionView in zwei Sektionen teilen (Frontend)

**Ansatz**: Statt `rules.find(r => r.scope === 'meal_event' || r.scope === 'day')` werden beide Regeltypen separat abgefragt und in zwei optisch getrennten Blöcken dargestellt:
- **"Summe pro Tag"**: Zeigt `day`-Regeln. Wenn ein spezifischer Tag ausgewählt ist, wird dieser Tageswert gegen die Regel verglichen. Wenn "Gesamter Plan" ausgewählt ist, werden alle Tage einzeln mit ihrem Tages-Ist gegen die day-Regeln verglichen (kurze Liste pro Tag).
- **"Durchschnitt pro Tag (Ø Plan)"**: Zeigt `meal_event`-Regeln, immer den Tagesdurchschnitt (`total / numDays`) gegen die Thresholds.

```
┌──────────────────────────────────────────────────────────┐
│  📊 Tageswerte (Summe pro Tag)                            │
│                                                           │
│  Tag 1 (Mo 01.06)                                        │
│  🔥 Energie  2100 kcal  ████████████░░░░   Soll: 1912-2629│
│  🏋️ Protein    52 g   ██████████░░░░░░   Soll: 45-80    │
│                                                           │
│  Tag 2 (Di 02.06)                                        │
│  🔥 Energie  1500 kcal  ██████░░░░░░░░░░   Soll: 1912-2629│
│  ...                                                      │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  📈 Plan-Durchschnitt (Ø über 5 Tage)                     │
│                                                           │
│  🔥 Energie  1880 kcal  ███████████░░░░░   Soll: 1912-2629│
│  🏋️ Protein    48 g   ██████████░░░░░░   Soll: 45-80    │
│  ...                                                      │
└──────────────────────────────────────────────────────────┘
```

Wenn ein einzelner Tag ausgewählt ist, wird nur dieser Tag in der "Summe"-Sektion gezeigt. Die "Durchschnitt"-Sektion ist dann ausgeblendet (ein einzelner Tag ist bereits Summe = Durchschnitt).

**Rationale**: Klare visuelle Hierarchie. Zwei Abschnitte mit eigenen Überschriften machen sofort ersichtlich, ob eine Summe oder ein Durchschnitt bewertet wird.

### Decision 3: SollIstBar erhält `scopeLabel`-Prop (Frontend)

**Ansatz**: Neuer optionaler `scopeLabel?: string` Prop an `SollIstBar`. Wenn gesetzt, wird er als kleines Label über dem "Ist/Soll"-Text angezeigt.

**Rationale**: Minimal-invasiv. Existierende Verwendungen der SollIstBar bleiben unverändert. Nur Aufrufer, die Kontext liefern wollen, setzen den Prop.

### Decision 4: SuggestionCard zeigt Scope-Badge (Frontend)

**Ansatz**: Die `scope_label` aus der Suggestions-API enthält bereits Kontext (z.B. "Tag 1: Energie" oder "Gesamt: Energie (Durchschnitt)"). Dies wird als prominentes Badge oberhalb der Suggestion-Nachricht angezeigt, statt als kleines graues Label.

Zusätzlich: Bei `category=nutrition` und `scope=event` (meal_event) wird ein "Ø Plan" Badge ergänzt. Bei `scope=day` ein "Summe Tag N" Badge.

**Rationale**: Der Scope ist für den Nutzer entscheidend, um die Bewertung einordnen zu können. Ein Badge macht ihn auf den ersten Blick sichtbar.

## Risks / Trade-offs

- **[Risk] NutritionView wird komplexer**: Die Trennung in zwei Sektionen erhöht die Komponenten-Komplexität. → **Mitigation**: Beide Sektionen nutzen dieselbe `SollIstBar`-Komponente und teilen sich die `evaluateRuleStatus`-Logik. Extraktion in eine lokale `RuleSection`-Subkomponente.
- **[Risk] Performance bei vielen Tagen**: Wenn ein Plan 14 Tage hat und "Gesamter Plan" ausgewählt ist, zeigt die "Summe"-Sektion 14 × N-Regeln. → **Mitigation**: Bei "Gesamter Plan"-Auswahl nur die Durchschnitt-Sektion anzeigen, oder die Tages-Sektion standardmäßig einklappen. Laut Nutzer-Feedback reicht die Trennung, daher akzeptabel.
- **[Trade-off] meal_event ohne Tagesselektion**: Wenn ein einzelner Tag ausgewählt ist, ist der Tagesdurchschnitt identisch mit der Tagessumme. Die Durchschnitt-Sektion ist dann redundant. → **Entscheidung**: Bei Tagesselektion Durchschnitt-Sektion ausblenden.
