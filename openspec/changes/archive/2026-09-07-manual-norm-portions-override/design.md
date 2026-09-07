## Context

Das Meal-Plan-Frontend verwendet für PATCH-Anfragen einen gemeinsamen Helper. In `frontend-food/src/api/mealPlans.ts` wird eine erfolgreiche Antwort zuerst durch `parseApiResponse` gelesen und danach nochmals mit `res.json()` gelesen. Dadurch ist der Response-Body bereits gesperrt und die Mutation erscheint trotz erfolgreicher Backend-Verarbeitung als Fehler.

Eventgebundene MealPlans berechnen `norm_portions` aktuell aus ihren `MealPlanGroupMember`-Datensätzen. Änderungen an Gruppenmitgliedern, am Aktivitätsfaktor und die Event-Synchronisierung schreiben den berechneten Wert direkt zurück. Für reale Planungssituationen wird zusätzlich eine dauerhafte manuelle Normportionen-Einstellung benötigt.

## Goals / Non-Goals

**Goals:**

- Erfolgreiche Meal-Plan-PATCH-Antworten genau einmal lesen und validieren.
- Für eventgebundene Pläne einen dauerhaften manuellen Normportionen-Override speichern.
- Ganze manuelle Normportionen erlauben.
- Automatische Berechnung als Standard beibehalten.
- Override bei Gruppenänderungen und Event-Synchronisierung respektieren.
- Umschalten zurück auf automatische Berechnung ermöglichen.
- Backend-Pydantic- und Frontend-Zod-Schemas synchron halten.

**Non-Goals:**

- Keine tägliche oder mahlzeitenbezogene Portionsüberschreibung.
- Keine Änderung der bestehenden Normfaktor-Berechnung.
- Keine manuelle Override-Funktion für nicht eventgebundene Pläne.
- Keine Änderung des separaten `Meal.override_portions`-Features.

## Decisions

1. **Persistenter Override-Status im MealPlan-Modell**
   - Ergänzt wird ein boolesches Feld, das den manuellen Modus eindeutig festhält.
   - `norm_portions` bleibt der aktuell wirksame Wert; ein separater Override-Wert ist nicht erforderlich, weil der manuelle Wert beim Aktivieren direkt dort gespeichert wird.
   - Bei aktivem Override dürfen `recalculate_norm_portions()` und die GroupMember-Endpunkte `norm_portions` nicht verändern.
   - Alternative: Den Modus aus einem Sentinel-Wert ableiten. Das wäre fehleranfällig und nicht explizit genug.

2. **Override nur für eventgebundene Pläne im UI**
   - Das Backend akzeptiert den Override nur, wenn der Plan eine Event-Verknüpfung besitzt.
   - Das Food-Frontend zeigt den Umschalter nur bei solchen Plänen; Standalone-Pläne behalten ihre direkte Eingabe.
   - Alternative: Das Feature für alle Pläne anbieten. Das würde den bestehenden einfachen Workflow unnötig verändern.

3. **Einheitlicher PATCH-Response-Parser**
   - `mealPlans.ts` verwendet das Ergebnis eines einzigen `parseApiResponse`-Aufrufs als Schemaeingabe.
   - Der Parser bleibt die zentrale Stelle für strukturierte API-Fehler.
   - Alternative: `response.clone()` verwenden. Das kaschiert den doppelten Lesevorgang statt die Ursache zu entfernen.

4. **Aktivitätsfaktor und Event-Synchronisierung respektieren den Override**
   - Der Aktivitätsfaktor wird weiterhin gespeichert, ändert aber den manuellen Normportionenwert nicht.
   - Neue oder synchronisierte Teilnehmer werden gespeichert, ohne den manuellen Wert zu ersetzen.
   - Beim Zurückschalten auf automatisch wird sofort aus den aktuellen Gruppenmitgliedern neu berechnet.

5. **API-Vertrag**
   - `GET /api/meal-plans/{id}/` und `PATCH /api/meal-plans/{id}/` liefern bzw. akzeptieren ein Feld für den Override-Modus.
   - Der PATCH-Wert für `norm_portions` muss bei aktivem manuellen Modus eine positive ganze Zahl sein.
   - Ein Umschalten auf automatisch löst eine Neuberechnung aus.

## Risks / Trade-offs

- **[Risiko] Bestehende Daten kennen keinen Override-Status.** → Das neue Feld erhält den Default `false`; bestehende Pläne bleiben automatisch bzw. wie bisher manuell bei Standalone-Plänen.
- **[Risiko] Ein Event kann gleichzeitig Teilnehmer synchronisieren und die Einstellung ändern.** → Die Backend-Entscheidung erfolgt pro Request anhand des gespeicherten Override-Status; gezielte API-Tests decken beide Reihenfolgen ab.
- **[Risiko] Der Frontend-Formularzustand ist beim Öffnen des Settings-Panels veraltet.** → Nach erfolgreicher Mutation werden die Meal-Plan-Queries invalidiert; das Panel muss den Override-Modus aus den aktuellen API-Daten initialisieren.
- **[Trade-off] Ganze manuelle Werte sind weniger präzise als Normfaktoren.** → Das entspricht der Nutzerentscheidung und der sichtbaren UI-Bezeichnung „Normportionen“.

## Migration Plan

1. Neue Django-Migration für das boolesche Override-Feld mit Default `false` ausrollen.
2. Backend-API und Schema erweitern, ohne bestehende Pläne umzuschreiben.
3. Food-Frontend-Parser und Settings-UI aktualisieren.
4. Backend- und Frontend-Regressionstests ausführen.

Rollback besteht aus dem Zurückrollen der Anwendungsversion; die additive boolesche Spalte kann bis zu einer späteren Bereinigung bestehen bleiben.

## Open Questions

- Keine. Der API-Feldname ist `norm_portions_manual`.
