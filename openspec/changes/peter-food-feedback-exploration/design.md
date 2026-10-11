# Exploration: Peters Food-Feedback

## Einordnung

Dieses Dokument trennt Screenshotsymptome von bestätigten Ursachen. „Bestätigt“ bedeutet hier Code- oder Cloud-Log-Evidenz; ein vollständiger Browser-Repro wurde nicht für jeden Punkt durchgeführt. Die Cloud-Log-Prüfung war lesend. Es wurden keine Requests ausgelöst und keine Produktionsdaten verändert.

## Rückmeldungsinventar

| ID | Rückmeldung | Einordnung / bisherige Evidenz | Noch zu untersuchen |
|---|---|---|---|
| P-01 | Notizen bei einzelnen Zutaten/Einträgen im Essensplan | **Produktwunsch umgesetzt.** `MealItem.note` speichert bis zu 500 Zeichen; Tages- und Tabellenansicht erlauben Bearbeiten, und Kopierpfade übernehmen die Notiz. Der Scope ist bewusst auf die Planansichten beschränkt; Einkaufslisten/PDFs bleiben unverändert. |
| P-02 | Beim Kopieren einer Mahlzeit/eines Frühstücks aus einem Plan geraten Mengen durcheinander | **Fehler reproduziert.** Beide Backend-Kopierpfade ließen `MealItem.portion` aus. Die Menge 1,5 blieb zwar gleich, wurde danach aber ohne die gewählte Portion interpretiert. Beide Pfade kopieren jetzt Portion, Buffet-Rolle/Anteil und Frühstücks-Assistent-Markierung; Tests vergleichen diese Werte auch bei anderer Ziel-Norm-Portion. | Nach Testabschluss prüfen, ob Peter mit den neuen Fixes noch eine zusätzliche Anzeige-/Skalierungsabweichung reproduzieren kann. |
| P-03 | Im Essensplan die Einheit einer Zutat nachträglich ändern; Beispiel Burger Buns erscheinen als „Gramm (1 g)“ | **UI-Lücke reproduziert und umgesetzt.** Der MealSlot und die Tabellenansicht hatten keinen Portionswechsel. Neue Auswahl lädt aktive Portionen derselben Zutat und der API aktualisiert Portion/Einheit atomar. Gramm-/Milliliter-Aliase werden außerdem als direkte Masse/Volumen angezeigt. | Regressionstest und Build laufen; Verhalten für View-only/synchronisierte Mahlzeiten ist durch das Ausblenden der Aktion abgedeckt. |
| P-04 | Essensplan-Suche zeigt „immer nur so wenig Sachen“ | **Kein reproduzierter Bug; Spezifikation und UI-Test bestätigen das Verhalten.** Die Omnibar zeigt im Filter „Alle“ höchstens fünf Ergebnisse pro Gruppe; für größere Gruppen bietet sie „Alle N Rezepte/Zutaten anzeigen“. Das ist in `openspec/specs/meal-planner-omnibar-search/spec.md` vorgesehen; die Omnibar-Tests bestehen. | Peters UX-Wunsch bleibt offen: klären, ob er mehr direkte Treffer oder Browsing ohne Suchbegriff möchte. Keine unbeabsichtigte Änderung der spezifizierten Ergebnisbegrenzung. |
| P-05 | Buffet-Assistent wirkt unausgereift; Beläge schwer änderbar, man müsse Neues erstellen und könne nicht frei suchen | **Freie Suche und Auswahl sind im aktuellen Code vorhanden und durch 18 Buffet-Builder-Tests abgedeckt.** Pro Rolle gibt es „Weitere hinzufügen…“ ab zwei Zeichen. Die OpenSpec-Changes `buffet-free-selection` und `unified-buffet-wizard` decken Suche und Builder-Flows ab. | Peters konkreten Plan, Berechtigungen und gewünschte Zutat weiterhin manuell prüfen; die automatisierten Tests beweisen nicht, dass alle Katalogeinträge in Peters Produktionskontext auffindbar sind oder die Bedienung für ihn ausreichend ist. |
| P-06 | Ungefähre Stückzahl von Brötchen im Buffet anzeigen | **Produktwunsch umgesetzt.** Der Buffet-Katalog stellt nur aktive, stückartige Portionen mit bestätigtem/importiertem Gewicht als `piece_weight_g` bereit. Der Builder zeigt je ausgewähltem Item die gerundete Gesamt-Näherung anhand Rollenmenge, Item-Anteil und effektiver Personenzahl; ohne vertrauenswürdiges Gewicht, bei Rezepten oder ml-Rollen wird keine Schätzung angezeigt. Regressionstests laufen noch. |
| P-07 | Frühstücks-Extras erscheinen nach Wiederöffnung als „Zutat #299“/„Zutat #7586“ statt mit Namen | **Codefehler bestätigt und behoben.** `refMealItemsToWizardState` stellt Namen jetzt aus MealItem-/Katalogdaten wieder her. Regressionstest prüft den echten Namen. |
| P-08 | Bei Frühstücks-Extras wird die ausgewählte Einheit/Portion nicht übernommen | **Codefehler bestätigt und behoben.** StepExtras hält die gewählte Portion und Eingabemenge; Single- und Bulk-Wizard-Endpunkte validieren und persistieren `portion_id`. Das bestätigte Portionsgewicht wird für die Gramm-Kalkulation verwendet. |
| P-09 | Zahlenfeld lässt keine führende 0 bzw. das vollständige Löschen des Wertes nicht zu | **Codefehler bestätigt und behoben.** Der Rezept-Schritt „Mengenmodifikator“ und Zutaten-Mengen-Dialoge hielten den Wert numerisch kontrolliert und setzten leere Eingaben sofort zurück. Die Felder halten jetzt temporären Text, erlauben das Leeren und validieren positive Werte vor Übernahme. |
| P-10 | Portions-Zauberstab schlägt beim Anwenden mit HTTP 500 fehl | **Produktionsfehler samt Root Cause bestätigt und lokal behoben.** Cloud Run meldete am 05.10.2026 vier fehlgeschlagene Requests für Burger Buns. Eine neue ausgewählte Portion erhielt Rang 1 trotz bestehender aktiver Rang-1-Portion. Neue Portionen erhalten nun den kleinsten freien Rang; ein dennoch auftretender Constraint-Konflikt wird atomar als HTTP 409 statt 500 beantwortet. Regressionstest ergänzt. Noch nicht deployt. |
| P-11 | Frühstücksassistent lässt sich im Essensplan nicht anklicken; Buffet-Knopf ging am PC zeitweise nicht | **Nicht reproduziert.** Im aktuellen `MealSlot` existieren Click-Handler für Frühstücks- und Buffet-Assistent. Screenshot sagt, Buffet funktioniere später am Mac, davor nicht am PC. | Browser/Version, Viewport, Plan-/MealType, Bearbeitungsrecht, Klickziel und eventuelle Console-/Network-Fehler ermitteln. Sowohl leere als auch befüllte Mahlzeit und direkten Breakfast-Route-Einstieg testen. |
| P-12 | Ältere Serverfehler mit Cloud-SQL-Verbindungslimits | **Verwandtes Infrastrukturthema, nicht Ursache von P-10.** Cloud-Run-/Django-Logs zeigen historische Fehler „remaining connection slots are reserved“ (u. a. 02.10.2026) sowie einen älteren 500 beim Laden einer Zutaten-Portionsliste am 20.09.2026. | Prüfen, ob es aktuelle Wiederholungen gibt und ob Cloud-SQL-/Cloud-Run-Verbindungsbudget, Django-Pooling und Instanzkonfiguration inzwischen abgesichert sind. Separat von Portions-Rang-Validierung behandeln. |

## Aktueller technischer Befund zur Rang-Kollision

- Datenbankregel: `unique_rank1_portion_per_ingredient` erlaubt je Zutat nur eine aktive, nicht supersedierte Portion mit Rang 1.
- Der reguläre Portion-Anlege-Endpunkt prüft den Konflikt und liefert eine fachliche Validierungsantwort. Der Portions-Zauberstab erstellt in `backend/supply/services/portion_magic_wand.py` eine ausgewählte Portion mit dem aus der Operation übernommenen Rang bzw. Rang 1 als Fallback; der beobachtete `IntegrityError` wird an dieser Stelle nicht in eine kontrollierte API-Antwort übersetzt.
- Die vorhandenen Magic-Wand-Tests bestehen (im gezielten Lauf insgesamt 25 Tests mit Kopier-Tests), decken aber die Kombination „bestehende gewichtete Rang-1-Portion plus neue ausgewählte Rang-1-Portion“ nicht ab. Ein Test, bei dem eine ungewichtete Rang-1-Portion ersetzt wird, deckt den Konflikt nicht ab, weil die Quelle zuvor entfernt wird.
- Ein Log-Query nach demselben Constraint über die letzten 30 Tage fand in Cloud Run die vier Fehler vom 05.10. sowie die dazugehörigen Cloud-SQL-Constraint-Logs; keine weiteren Cloud-Run-Anwendungsfehler mit diesem exakten Constraint im abgefragten Zeitraum.

## Bereits existierende OpenSpec-Arbeit und Abgrenzung

Vor Implementierung den aktuellen Status und die Abnahme dieser Changes verifizieren:

- `openspec/changes/buffet-free-selection`: freie Buffet-Suche/Auswahl und Builder-Zustände.
- `openspec/changes/unified-buffet-wizard`: Frühstückseinstieg und gemeinsamer Wizard-Ablauf.
- `openspec/changes/fix-wizard-ingredient-review-and-quantities`: Mengen-/Eingabeverhalten im Rezept-Review.
- `openspec/changes/fix-wizard-preview-units`: Einheitenanzeige in der Rezept-Wizard-Vorschau.

Diese Changes betreffen verwandte Abläufe, beweisen aber nicht, dass Peters konkreter Fehler bereits behoben oder in Produktion verfügbar ist. P-10 (Magic-Wand-Rangkonflikt), P-01 (Item-Notiz) und die belegten Frühstücks-Extras-Roundtrip-Probleme sind gesondert auf Überschneidungen zu prüfen.

## Offene Produktfragen

1. Sollen Notizen an Einzelzutaten, allen MealItems oder beiden angehängt werden? Müssen sie in Einkaufsliste, Kochplan und Export erscheinen?
2. Soll eine Mahlzeit-Kopie Mengen exakt erhalten oder auf die Norm-Portionen des Zielplans umrechnen? Welche Werte sind die maßgebliche Erwartung?
3. Soll nachträgliche Einheitenauswahl in der Essensplan-Zeile möglich sein, oder genügt eine korrekte Auswahl beim Hinzufügen?
4. Soll die Omnibar mehr als fünf Treffer pro Kategorie direkt zeigen, oder ist „Alle anzeigen“ der gewünschte Weg?
5. Welche Filter und welche Datenquellen sollen für die Suche im Buffet-Builder gelten? Muss ein noch nicht im Zutaten-/Rezeptkatalog vorhandener Belag dort erstellt werden können?
6. Soll die Brötchenstückzahl nur angezeigt werden, wenn ein vertrauenswürdiges Stückgewicht vorhanden ist? Wie sichtbar muss die Unsicherheit der Näherung sein?
7. Welche konkrete Rezeptanlage-/Mengenmaske löst P-09 aus?
8. Welche Browser-/Berechtigungsbedingungen lösen P-11 aus?
9. Wie soll der Portions-Zauberstab bei bereits belegtem Rang 1 fachlich reagieren?
