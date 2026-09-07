## Context

Die Änderung `manual-norm-portions-override` hat den einmaligen Response-Body-Fehler behoben und einen persistenten Override-Modus eingeführt. Eine nachgelagerte Prüfung zeigte jedoch, dass mehrere bestehende Pfade den Zustand noch inkonsistent behandeln: `previous_norm_portions` wird beim manuellen Setzen nicht zuverlässig gepflegt, Event-Synchronisierung erzeugt bei Wiederholung Duplikate, nullable Datumswerte werden ohne Prüfung an Zeitzonenfunktionen übergeben und abgeleitete TanStack-Query-Daten bleiben nach Änderungen veraltet.

## Goals / Non-Goals

**Goals:**

- Manuelle Normportionen beim Wechsel zurück auf automatische Berechnung korrekt wiederherstellen.
- Event-Teilnehmer-Synchronisierung idempotent und aktuell machen.
- PATCH-Eingaben für Datumswerte und den Override robust validieren.
- Standalone-Pläne von der automatischen GroupMember-Neuberechnung trennen.
- `datetime-local`-Felder korrekt in der Europe/Berlin-Zeitzone bedienen.
- Alle von Normportionen, PAL oder Teilnehmern abhängigen Frontend-Queries aktualisieren.
- Regressionstests für Backend-Zustandsübergänge, UI-Payloads und den echten PATCH-Hook ergänzen.

**Non-Goals:**

- Keine neue Override- oder Datenmodellfunktion.
- Keine Änderung der Normfaktor-Formel.
- Keine Änderung der fachlichen Bedeutung von `previous_norm_portions` außerhalb des MealPlan-GroupMember-Kontexts.
- Keine allgemeine Migration aller Datumsfelder im Food-Frontend.

## Decisions

1. **Override-Fallback explizit pflegen**
   - Beim Übergang in den manuellen Modus wird der aktuelle automatische Wert als `previous_norm_portions` gesichert, bevor der manuelle Wert gespeichert wird.
   - Beim Deaktivieren wird mit GroupMembers neu berechnet; ohne GroupMembers wird der gesicherte Fallback verwendet.
   - Alternative: Den manuellen Wert nur aus dem aktuellen `norm_portions` ableiten. Das ist beim Deaktivieren nicht möglich, weil dieser Wert gerade ersetzt werden soll.

2. **Event-Sync als Replace-Sync**
   - Alle `synced_from_event=True`-Mitglieder des Plans werden vor dem Neuaufbau entfernt. Manuell gepflegte Mitglieder bleiben bestehen.
   - Damit ist ein identischer Sync idempotent und entfernte Event-Teilnehmer verschwinden aus dem synchronisierten Bestand.
   - Alternative: Per `person_id` upserten. Das wäre komplexer und müsste zusätzlich Teilnehmer ohne `person_id` über einen stabilen Schlüssel abgleichen.

3. **Strikte PATCH-Validierung**
   - `norm_portions_manual` akzeptiert kein `null`.
   - Datumswerte werden vor `timezone.is_naive` geprüft. `null` wird als bewusstes Leeren behandelt, während ein neuer Bereich nur mit gültigem Start/Ende verarbeitet werden darf.
   - Endzeit vor Startzeit wird mit einem deutschen `HttpError(400)` abgelehnt.
   - Standalone-Pläne lösen bei einer PAL-Änderung keine GroupMember-Neuberechnung aus.

4. **Zentrale lokale Datums-Konvertierung im SettingsPanel**
   - API-ISO-Werte werden über eine kleine lokale Hilfsfunktion in `datetime-local`-Werte umgewandelt.
   - Beim Speichern werden lokale Eingaben als ISO-Werte mit korrekter Zeitzoneninterpretation gesendet.
   - Alternative: Nur `slice(0, 16)` weiterverwenden. Das ist bei UTC-Werten in Europe/Berlin falsch und kann Datum/Uhrzeit verschieben.

5. **Zentrale MealPlan-Query-Invalidierung**
   - Nach Plan- und GroupMember-Mutationen werden Detaildaten sowie `nutrition`, `shopping-list`, `costs`, `cooking-schedule`, `meal-plan-suggestions` und abhängige intelligente Vorschläge invalidiert.
   - Die Invalidierung bleibt im TanStack-Query-Layer und wird nicht in Seiten dupliziert.

## Risks / Trade-offs

- **[Risiko] Bestehende synchronisierte GroupMembers werden beim Sync gelöscht und neu erstellt.** → Manuelle Mitglieder bleiben erhalten; Tests prüfen Anzahl, `person_id` und Idempotenz.
- **[Risiko] Datumswerte können bei bestehenden Plänen historisch als UTC-naiv gespeichert sein.** → Die Konvertierung wird nur für explizite ISO-Offset-Werte angewendet; API-Tests prüfen die gesendeten Werte.
- **[Risiko] Mehr Query-Invalidierungen verursachen zusätzliche Requests.** → Nur betroffene MealPlan-Keys werden invalidiert; aktive Ansichten erhalten dafür garantiert aktuelle Mengen.
- **[Risiko] Die bestehende Semantik von `previous_norm_portions` ist historisch uneinheitlich.** → Übergangstests dokumentieren das Verhalten bei manueller Aktivierung, Deaktivierung und leerer Mitgliederliste.

## Migration Plan

1. Keine neue Migration erforderlich; das bestehende `norm_portions_manual`-Feld wird weiterverwendet.
2. Backend-Validierung und Sync-Logik deployen.
3. Food-Frontend-Datums- und Query-Logik deployen.
4. Vollständige Backend- und Food-Frontend-Tests ausführen.

Rollback ist durch Zurückrollen der Anwendungsversion möglich; es werden keine neuen Datenbankstrukturen eingeführt.

## Open Questions

- Keine.
