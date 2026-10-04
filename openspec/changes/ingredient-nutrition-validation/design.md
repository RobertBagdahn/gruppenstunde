## Context

`nutrition_plausibility.detect_nutrition_issues(values, name=...)` liefert Befunde mit Code, Label, betroffenen Feldern und `auto_fixable`. Create und Update speichern Nährwerte ohne diese Prüfung. Die Grenzen im Service sind bewusst großzügig (Makro-Summe-Befund ab 105 g wegen US-„total carbs“), damit echte Importdaten nicht fälschlich fallen.

## Goals / Non-Goals

**Goals:**
- Physikalisch unmögliche Werte können nicht gespeichert werden, weder über die Zutaten-Seiten noch über den Wizard-Dialog.
- Feldgenaue Fehlermeldung statt generischem Fehler.

**Non-Goals:**
- Keine automatische Reparatur beim Speichern (das macht das Datenqualitäts-Cockpit).
- Keine Prüfung von Vitaminen oder Scores.
- Keine rückwirkende Bereinigung von Bestandsdaten.

## Decisions

- **Harte und weiche Befunde trennen.** Hart (422): `invalid_value`, `macro_sum_gt_100`, `sugar_gt_carbs`, `sat_fat_gt_fat`. Weich (Warnung): alles andere (`energy_mismatch`, `energy_kj_as_kcal`, `macros_missing`, `all_zero` u. ä.). Entscheidung des Nutzers: Unmögliches ablehnen, Rest warnen.
- **Prüfung auf dem gemergten Profil.** Bei Update werden Payload-Werte über die gespeicherten gelegt und geprüft, damit z. B. „Zucker erhöhen“ gegen die vorhandenen Kohlenhydrate geprüft wird. Die Prüfung wird übersprungen, wenn kein Nährwertwert gegenüber dem gespeicherten Wert geändert wird (die Formulare senden immer alle Felder).
- **Ein Fehlerformat.** `422` mit `detail` (deutscher Text) und `fields` (Liste der Feldnamen). Das Frontend ordnet `fields` den Eingabefeldern zu. Alternative „nur Toast“ wurde verworfen, weil sie das Problem im Produktivtest war.
- **`ApiError` bekommt optionale Zusatzfelder (`extra`).** Der Fehler-Contract (`detail`, `code`) bleibt unverändert, Zusatzschlüssel wie `fields` (hier) oder `existing` (Duplikat-409 in `food-ui-polish-prod-test`) werden additiv in die Antwort gemischt; das Frontend liest sie im `ApiError` als `fields` und `existing`.
- **Warnungen in der Antwort.** `nutrition_warnings: [{code, label, fields}]` am Ingredient-Out, das UI zeigt sie nach dem Speichern.
- **Zod spiegelt nur die harten Regeln.** Die Grenzwerte werden als Konstanten in Backend und Frontend geführt und per Test gegeneinander abgesichert (Beispielfälle in beiden Testsuites).

## Risks / Trade-offs

- [Echte Daten mit Summe knapp über 100 g (Rundung) werden abgelehnt] → Schwelle des Service (`MACRO_SUM_LIMIT = 100.5`) nutzen, nicht 100.
- [Importe/Seeds rufen dieselben Endpunkte] → Prüfung nur an den API-Endpunkten, nicht im Modell; Seeds und Management-Commands bleiben unberührt.
- [Frontend und Backend driften auseinander] → gemeinsame Testfälle.

## Migration Plan

Keine Migration. Rollout mit dem normalen Deploy.

## Open Questions

Keine.
