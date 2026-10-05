## Why

Rückmeldungen zum Food-Frontend vermischen bestätigte Fehler, bereits vorhandenes Verhalten und Wünsche. Ohne klare Abgrenzung drohen unnötige Änderungen an der Omnibar oder am Buffet-Builder sowie fachlich unbelegte Stückzahlschätzungen. Dieses Vorhaben hält fest, was bereits beabsichtigt und abgedeckt ist, und definiert die nötigen Klärungs- und Prüfschritte für die offenen Punkte.

## What Changes

- Die Omnibar-Begrenzung auf fünf Treffer je Gruppe in „Alle“ bleibt beabsichtigt; „Alle anzeigen“ führt in die jeweilige vollständige Ergebnisgruppe. Keine Änderung am Suchverhalten ohne reproduzierten Fehler.
- Die Suche im Buffet-Builder gilt als vorhandenes Verhalten, nicht als fehlende Funktion. Peters konkreter Plan-/Rollenfall wird manuell geprüft; ein Bug wird nur bei reproduzierbarem Fehlverhalten angelegt.
- Zutaten-Notizen und ungefähre Brötchen-Stückzahlen werden als Wünsche behandelt, nicht als bestätigte Bugs.
- Vor einer Umsetzung von Notizen werden Geltungsbereich (Zutat, Rezept oder beides) und Anzeigeorte fachlich geklärt.
- Brötchen-Stückzahlen dürfen nur geschätzt werden, wenn passende Portionsgewichte bestätigt sind. Ohne bestätigte Gewichte wird keine Stückzahl erfunden oder als verlässlich dargestellt.

Notizen und Brötchen-Schätzungen bleiben offen: Für Notizen fehlen Umfang und Anzeigeorte, für Stückzahlen bestätigte Portionsgewichte.

## Capabilities

### Modified Capabilities
- `meal-planner-omnibar-search`: bereits spezifiziertes Verhalten (fünf Treffer je Gruppe und „Alle anzeigen“) als beabsichtigte Grenze erhalten; kein Produktverhalten wird geändert.

## Impact

- OpenSpec-Anforderungen und manuelle Abnahme, keine vorab festgelegte Änderung an Backend, API, Datenmodell oder UI.
- Änderungen für Notizen oder Stückzahlschätzungen sind ausdrücklich nicht Teil dieses Vorhabens, solange die genannten fachlichen Entscheidungen beziehungsweise Portionsgewichte fehlen.
- Ein reproduzierter Fehler im Plan-/Rollenfall wird mit konkreten Reproduktionsschritten als separates Bugfix-Vorhaben spezifiziert.
