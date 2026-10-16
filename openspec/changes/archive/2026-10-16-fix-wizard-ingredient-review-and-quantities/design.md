## Context

Review-Zeilen werden aus `preview_recipe_ingredients` aufgebaut. Die vorgeschlagene Portionszahl kommt aus `_suggested_portion_count` → `UnitGramConverter.convert_to_portion_count`, das immer über Gramm geht: `Menge × Einheit → g` (Standardmaß, Volumen × Dichte oder KI-Schätzung für Behälter) und dann `g / Gewicht der Rang-1-Portion`. Die Rang-1-Portion der Zutat ist oft genau die Einheit des Rezepts (EL, Stück), ihr Gewicht ist ein anderer Wert als das Standardmaß, daher entstehen 1,84 statt 2.

Im Frontend füllt `focusSearch()` nur den Fokus. `selectIngredient` setzt `is_new: false`, löscht aber `new_ingredient_draft` nicht, weshalb `showDraftFields` weiter greift. Zusätzlich fällt der kontrollierte Suchwert mit `row.selected_ingredient_name || row.suggested_ingredient_name` nach dem Löschen auf den KI-Vorschlag zurück. Die Mengenfelder in `IngredientQuantityDialog` und `RecipeSearchDialog` wandeln jeden Tastendruck sofort in eine Zahl um und ersetzen leere/ungültige Zwischenstände über `|| 1`.

## Goals / Non-Goals

**Goals:**
- Mengen wie „1 Zwiebel“, „2 EL Olivenöl“ erscheinen im Review so, wie sie im Rezepttext stehen.
- Das Ändern einer Zutat verhält sich wie in jedem Suchfeld (Text ersetzen, Formular konsistent); das vollständige Löschen bleibt als leerer, unvollständiger Suchtext sichtbar.
- Dezimalmengen unterstützen schrittweise Eingabe mit Komma oder Punkt; ein ungültiger Zwischenstand verändert den Eingabetext nicht und kann nicht bestätigt werden.

**Non-Goals:**
- Keine Änderung der Standardmaße oder der KI-Schätzung für Behälter (Dose, Glas, Bund).
- Keine automatische Neugenerierung der Zubereitungsschritte.

## Decisions

- **Portion-Direktabgleich vor Gramm-Umrechnung.** In `convert_to_portion_count` zuerst prüfen, ob `unit` (normalisiert, inkl. Plural) dem Namen oder der Messeinheit einer aktiven Portion der Zutat entspricht. Dann ist das Ergebnis `quantity` (Portion hat `quantity` 1) bzw. `quantity / portion.quantity`. Nur sonst der bisherige Gramm-Weg. Alternative „Standardmaße angleichen“ wurde verworfen, weil die Portionsgewichte je Zutat zu Recht variieren (EL Öl vs. EL Mehl).
- **Stück als Sonderfall.** Leere Einheit oder „Stück“ mit Stückportion (Name enthält die Zutat oder „Stück“) ergibt `quantity`; ohne Stückportion bleibt der bisherige Weg.
- **Text beim Fokus markieren und Suchtext separat kontrollieren.** `focusSearch` ruft nach `focus()` `select()` auf. Der Review hält den sichtbaren Suchtext explizit im editierbaren Zustand, statt leere Strings mit einem Fallback auf den KI-Vorschlag zu ersetzen. Das Löschen des Feldes hebt weiterhin die alte Ingredient-ID auf. Alternative „Feld beim Klick leeren“ wurde verworfen, weil der Nutzer den alten Namen als Ausgangspunkt braucht.
- **Dezimale Eingabe als Rohtext.** Mengenfelder verwenden `type="text"` mit `inputMode="decimal"` und halten den noch nicht abgeschlossenen Text separat. Ein zentraler Parser akzeptiert deutsches Komma und Punkt; Menge wird nur als endliche positive Zahl bestätigt. Kein Keypress-Fallback auf 1 und kein Clamp während des Tippens. `IngredientQuantityDialog`, `RecipeSearchDialog` und der Mengenwert im Draft-Dialog verwenden dieselbe Parsing-Regel.
- **Wiederverwendbares Dezimalfeld für Mengen-/Faktor-Editoren.** `DecimalInput` hält den Rohtext bis zur gültigen Zahl und übergibt nur gültige Werte; bei ungültigem Inhalt wird beim Verlassen des Feldes der zuletzt gültige Wert wiederhergestellt. Das gilt auch für Rezeptschritt-Modifikatoren, Referenzmahlzeit-Faktoren und Frühstücks-Extras.
- **Draft räumen in `selectIngredient`.** `new_ingredient_draft: null`, Status auf „Zu prüfen“/„Bestätigt“ wie bisher.
- **Layout.** Chip-Reihe im Dropdown mit `flex-wrap` oder horizontalem Scroll im Container (`overflow-x-auto`, `max-w-full`), keine feste Breite, die die Spalte verlässt.
- **Stale-Schritte als Hinweis, nicht als Auto-Aktion.** Die importierten Schritte entstehen vor dem Zutaten-Review. Der Review-Store setzt daher einen Merker `ingredientsChangedSinceImport`, sobald eine Zeile entfernt, hinzugefügt oder durch eine andere Zutat ersetzt wird (Mengenänderungen zählen nicht). Der Schritt „Zubereitung“ zeigt dann einen Hinweis, der mit „Verstanden“ quittiert werden kann und auf „KI Generierung“ verweist.

## Risks / Trade-offs

- [Falscher Direktabgleich, z. B. Einheit „EL“ passt zu Portion „EL“ mit Gewicht 0 g] → Direktabgleich nur bei Portionen mit vertrauenswürdigem Gewicht, sonst bisheriger Weg.
- [Bestehende Tests erwarten die Gramm-Umrechnung] → Tests gezielt um Fälle erweitern, bestehende Erwartungen für Metrik und Behälter unverändert lassen.
- [Ungültiger Zwischenstand wird bestätigt] → Bestätigungsaktionen sind deaktiviert, solange keine endliche Menge ≥ Mindestmenge geparst werden kann.
- [Hinweis nervt, wenn nur Mengen geändert wurden] → der Merker reagiert nur auf Zutatenwechsel, nicht auf Mengen; „Verstanden“ blendet ihn aus.

## Migration Plan

Keine Datenmigration.

## Open Questions

Keine.
