# Technischer Entwurf: Feedback-Triage Food-Frontend

## Kontext

Die Rückmeldung betrifft vier verschiedene Sachverhalte: optionale Zutaten-/Rezeptnotizen, eine gewünschte Brötchen-Stückzahlschätzung, die absichtliche Begrenzung der Omnibar-Treffer und einen noch nicht manuell geprüften Anwendungsfall des Buffet-Builders. Nur der letzte Punkt ist eine offene Fehlerprüfung. Für die ersten zwei fehlen Produktentscheidungen beziehungsweise verlässliche Quelldaten.

Die bestehende Omnibar-Spezifikation (`openspec/specs/meal-planner-omnibar-search/spec.md`) definiert in „Alle“ höchstens fünf Treffer pro Gruppe und „Alle anzeigen“. Die aktive Buffet-Builder-Änderung (`openspec/changes/buffet-free-selection/specs/buffet-builder/spec.md`) definiert bereits eine Suche „Weitere hinzufügen…“ pro aktiver Rolle.

## Entscheidungen

1. **Keine Änderung an der Omnibar auf Basis dieser Rückmeldung.** Die Fünfergrenze ist gewollt. „Alle anzeigen“ muss die entsprechende Rezepte- oder Zutatenansicht öffnen. Das Verhalten ist in der bisherigen Abnahme als getestet dokumentiert; nur ein neuer reproduzierbarer Gegenbefund rechtfertigt einen Code-Fix.
2. **Keine zweite Suche im Buffet-Builder spezifizieren oder implementieren.** Die vorhandene Suche wird für den konkret gemeldeten Plan-/Rollenfall manuell durchgespielt. Vor dem Test müssen Plan, Rolle, Suchbegriff, ausgewähltes Ergebnis und erwartetes Ergebnis feststehen. Ein Fehler wird anhand dieser Angaben reproduziert und separat spezifiziert.
3. **Notizen bleiben bis zur Produktklärung außerhalb der Implementierung.** Es ist offen, ob Notizen nur Zutaten, nur Rezepte oder beide betreffen. Zusätzlich sind die Anzeigeorte und der Lebenszyklus (Erstellen/Bearbeiten/Anzeigen) zu entscheiden. Erst danach kann ein umsetzbarer Daten-/API-/UI-Umfang festgelegt werden.
4. **Keine unbelegten Brötchen-Stückzahlen.** Eine Näherung darf nur aus bestätigten Gramm-pro-Stück- oder Portionsgewichten abgeleitet werden. Unbestätigte oder fehlende Gewichte müssen zu keiner Anzeige oder zu einer klar als nicht verfügbar gekennzeichneten Schätzung führen, nicht zu einer scheinpräzisen Stückzahl.
5. **Klarer Übergang bei Befunden.** Falls die manuelle Prüfung einen Bug reproduziert, werden Ist-/Soll-Verhalten, Plan-/Rollenberechtigungen und Reproduktionsschritte in einer separaten Änderung festgehalten. Dieses Vorhaben erfindet keine erwartete Rollenlogik.

## Manuelle Abnahme

### Omnibar – Regression ausschließen

- Eine Suche mit mehr als fünf passenden Rezepten und Zutaten in „Alle“ durchführen.
- Prüfen, dass höchstens fünf Treffer pro Gruppe angezeigt werden.
- „Alle anzeigen“ je Gruppe aktivieren und prüfen, dass die vollständige passende Kategorie erreichbar ist.
- Keine Anpassung vornehmen, wenn dieses Verhalten wie spezifiziert funktioniert.

### Buffet-Builder – Peters Fall

Vor Ausführung zu ergänzen: Plan beziehungsweise reproduzierbarer Testdatensatz, ausführende Benutzerrolle/Berechtigung, Mahlzeit, Buffet-Vorlage und -Rolle, Suchbegriff, erwartetes Ergebnis.

Danach Suche mit diesen Angaben ausführen, Auswahl speichern und nach erneutem Öffnen prüfen. Ergebnisse und tatsächliches Verhalten dokumentieren. Ohne diese Eingaben ist eine aussagekräftige manuelle Prüfung nicht möglich.

## Offene Fragen

- Sollen Notizen an Zutaten, Rezepten oder beiden gespeichert werden?
- An welchen konkreten Stellen sollen Notizen erscheinen (z. B. Bearbeitungsansicht, Rezept-/Zutatendetail, Plan, Einkaufsliste)?
- Sind Notizen privat, geteilt oder öffentlich sichtbar, und wer darf sie bearbeiten?
- Welche bestätigten Portionsgewichte gelten für Brötchen und aus welcher verlässlichen Quelle stammen sie?
- Was genau ist Peters Plan-/Rollenfall (Plan, Mahlzeit, Rolle, Berechtigung, Suchbegriff, Erwartung)?
