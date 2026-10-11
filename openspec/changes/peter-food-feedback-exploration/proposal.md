# Peter-Feedback: Food-Fehler und Wünsche untersuchen

## Status und Zweck

**Exploration, keine Implementierungsfreigabe.** Dieses OpenSpec bündelt Peters Rückmeldungen aus den Screenshots sowie den bereits geprüften Produktionsfehler. Ziel ist, jeden Punkt reproduzierbar einzuordnen, fachlich zu klären und erst danach in passende Implementierungs-Changes zu überführen.

## Why

Die Rückmeldungen betreffen mehrere miteinander verbundene Food-Abläufe: Essensplan-Suche und -Einträge, Kopieren von Mahlzeiten, Frühstücks- und Buffet-Builder, Portions-/Einheitenwahl sowie Eingabefelder. Ein Teil sind belegte Fehler, ein Teil UX-Wünsche; andere Punkte sind noch nicht reproduziert. Gleichzeitig existieren bereits aktive OpenSpec-Changes zu Buffet-Suche/-Auswahl und Wizard-Verhalten. Ohne gemeinsame Bestandsaufnahme drohen bestätigte Fehler, Wünsche und bereits geplante Arbeit vermischt oder doppelt umgesetzt zu werden.

Ein Fehler des Portions-Zauberstabs ist in Cloud Run bereits bestätigt: Vier Requests für „Burger Buns Brioche vegan“ endeten am 5. Oktober 2026 innerhalb von knapp zwei Minuten mit HTTP 500. Der Stacktrace zeigt eine Verletzung des Datenbank-Constraints `unique_rank1_portion_per_ingredient`.

## What Changes

- Erfasst alle gemeldeten Fehler und Wünsche mit Status, betroffenem Ablauf, aktueller Code-/Log-Evidenz und offenen Reproduktionsfragen.
- Reproduziert die unbestätigten Punkte mit Peters konkretem Plan, Zutat, Browser und Eingabewerten oder schließt sie als nicht reproduzierbar/erwartetes Verhalten ein.
- Prüft Überschneidungen mit bestehenden Buffet-, Frühstücks-, Einheiten- und Mengen-Changes.
- Erstellt nach der Exploration klar abgegrenzte Implementierungs-Changes mit überprüfbaren Akzeptanzkriterien.

## Nicht-Ziele

- Keine Änderung an Frontend-, Backend-, Datenbank- oder Produktionsdaten in diesem Exploration-Change.
- Keine automatische Prod-Korrektur von Portions-, Zutaten- oder Buffet-Daten.
- Keine vorschnelle Einstufung von Produktwünschen oder absichtlich begrenzter Suche als Bugs.

## Betroffene bestehende Bereiche

- Food-Frontend: `frontend-food/src/pages/planning/`, `frontend-food/src/components/planning/`, `frontend-food/src/pages/planning/breakfast/`, `frontend-food/src/components/buffet/`, `frontend-food/src/components/recipe/`.
- Backend: `backend/planner/` sowie `backend/supply/api/ingredients.py` und `backend/supply/services/portion_magic_wand.py`.
- Relevante aktive OpenSpec-Changes, vor jeder Folgearbeit auf Status und Abnahme prüfen: `buffet-free-selection`, `unified-buffet-wizard`, `fix-wizard-ingredient-review-and-quantities` und `fix-wizard-preview-units`.

## Ergebnis der Exploration

Das Ergebnis soll pro Punkt eine Entscheidung enthalten: **reproduzierter Bug**, **Produktwunsch**, **bestehendes/geplantes Verhalten**, **nicht reproduzierbar** oder **weitere Angaben nötig**. Erst dann werden passende fachliche Anforderungen und Implementierungs-Changes angelegt.
