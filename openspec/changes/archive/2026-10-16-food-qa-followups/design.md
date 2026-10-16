## Context

Alle Punkte stammen aus dem QA-Durchlauf vom 2026-10-10 und wurden am 2026-10-12 gegen main geprüft. Der Plan zeigt Preis-Abdeckung (`price_coverage`, „Zutat ohne Preis“), aber keine Nährwert-Abdeckung. Die Einkaufsliste aggregiert über `ingredient_id`. Rezeptzeilen mit `portion_id = null` werden in Plan und Liste ausgelassen.

## Goals / Non-Goals

**Goals:**
- Datenlücken sichtbar machen statt still als 0 zu rechnen.
- Eine Zutat erscheint pro Einkaufsliste nur einmal.
- Kleine UX-Fehler beheben, ohne neue Konzepte einzuführen.

**Non-Goals:**
- Grenzwerte und Listen-Aktualität (eigene Changes).
- Massenbereinigung der Zutaten-Stammdaten (läuft über `food-data-offensive`).

## Decisions

1. **Nährwert-Abdeckung analog zu `price_coverage`.** Die Berechnung liefert je Mahlzeit `nutrition_coverage` mit fehlenden Zutaten; der Plan-Check erhält einen Alert-Typ `missing_nutrition`. Energie bleibt eine Summe der bekannten Werte; die UI kennzeichnet sie als unvollständig. Alternative „fehlende Werte blockieren die Berechnung“ verworfen, weil Pläne dann unbenutzbar würden.
2. **Zeilen ohne Portion erzeugen einen Plan-Check-Alert** `recipe_item_without_ingredient` mit Rezeptname. Die Zeile bleibt in der Berechnung ausgelassen.
3. **Standard-Gramm-Portion für Zutaten ohne Portion.** Bei der Auswahl im Editor wird eine Gramm-Portion bereitgestellt (die Basisportion `g` existiert pro Zutat). Verbleibt der Fall ohne Möglichkeit, wird die Zutat im Dropdown mit Hinweis markiert und nicht auswählbar.
4. **Dubletten über kanonische Zutat.** Die Einkaufsliste löst `ingredient_id` über eine vorhandene Merge-/Alias-Zuordnung auf und aggregiert pro kanonischer Zutat. Falls keine Zuordnung existiert, wird sie für bekannte Dubletten-Paare angelegt (Datenpflege in der Task-Liste). Alternative „Namensähnlichkeit zur Laufzeit“ verworfen: nicht deterministisch.
5. **Aufrunden nur in der Anzeige kaufbarer Einheiten.** `quantity_g` bleibt exakt; Stück- und Packungsanzahl werden mit `ceil` angezeigt, Gramm-/Kilogrammwerte bleiben gerundet wie bisher.
6. **Slug:** `ß` wird vor `slugify` zu `ss` ersetzt (zentral in `content/models/core.py`). Bestehende Slugs bleiben unverändert (keine Rückwärtskompatibilität nötig, aber keine Massenumbenennung wegen Links).
7. **Titel:** Pydantic-Validator trimmt und prüft Mindestlänge nach dem Trimmen (Basisschema `ContentCreateIn`).
8. **Standard-Zubereitungszeit** wird im Schema auf „Keine Angabe“ gesetzt, sofern die Choices diesen Wert haben; sonst wird ein Wert ergänzt.

## Risks / Trade-offs

- [Nährwert-Warnungen wirken bei vielen Altdaten laut] → Warnung nur im Plan-Check und als Hinweis an der Mahlzeit, nicht als Fehler.
- [Falsche Zusammenführung zweier Zutaten] → Zuordnung nur für geprüfte Paare, Quelle der Menge bleibt in `sources` sichtbar.
- [Standardzeit „Keine Angabe“ verändert Filter „Dauer“] → Rezepte ohne Angabe fallen aus Dauer-Filtern; im Filter-Hinweis erwähnen.

## Open Questions

- Soll die Zusammenführung der Dubletten (Entscheidung 4) über das vorhandene Merge-Werkzeug (`ingredient-merge-ui`) oder ein neues Alias-Feld laufen? Vor Umsetzung klären.
- Gilt „Keine Angabe“ als zulässiger Wert für `execution_time` in den Choices?
