# Bessere Zutaten-Zuordnung beim Rezept-Import

## Why

Beim Chefkoch-Import im Produktivtest blieben „Prise(n) Salz“, „große Ei(er), Größe L“ und „Mineralwasser mit Kohlensäure“ ohne Zuordnung („Offen“), obwohl die verifizierten Zutaten `Salz`, `Eier (Größe M)` und `Mineralwasser` existieren. Für Eier wurde sogar eine neue Zutat „Ei“ vorgeschlagen, mit dem Hinweis „Ähnlichkeit ausreichend hoch“, obwohl die Kandidaten nur 31 bis 44 % erreichten. Das erzeugt Dubletten (heute schon drei fast gleiche Ei-Zutaten) und Mehrarbeit bei jedem Import.

Ursachen im Matcher (`backend/recipe/services/ingredient_matcher.py`):
- Mengenwörter mit Plural-Klammer („Prise(n)“) werden nicht entfernt, weil die Muster nur `Prise` kennen.
- Plural-Klammern („Ei(er)“), Größenangaben („große“, „Größe L“) und Zusätze („mit Kohlensäure“) bleiben im Namen und verhindern den exakten Treffer.
- Der Text „semantische Ähnlichkeit ausreichend hoch“ wird auch in der Grauzone (30 bis 70 %) ausgegeben.
- Zu „Ei“ gibt es keinen Alias auf „Eier (Größe M)“.

## What Changes

- Neue Namensnormalisierung vor dem Matching: Plural-Klammern auflösen (`Ei(er)` → `Ei`, `Prise(n)` → `Prise`), Größen-/Mengen-Adjektive und Größenangaben („große“, „mittelgroße“, „Größe L“) in die Notiz verschieben, führende Mengenwörter mit Plural-Klammer entfernen.
- Kopfnomen-Zuordnung: Findet die volle Bezeichnung keinen Treffer, wird der Kopf vor `,`, `mit`, `ohne` und Klammern zusätzlich exakt und per Alias geprüft („Mineralwasser mit Kohlensäure“ → `Mineralwasser`). Der Treffer wird als Vorschlag mit Status „Zu prüfen“ geliefert, nicht still bestätigt, und der Zusatz bleibt als Notiz erhalten.
- Kandidaten-Vergleich ignoriert Klammer-Zusätze der vorhandenen Zutat (`Eier (Größe M)` → `Eier`) und berücksichtigt regelmäßige Plurale (`Ei`/`Eier`).
- Hinweistexte sind der Trefferstärke angemessen: „ausreichend hoch“ nur ab Schwelle, in der Grauzone „ähnlich, bitte prüfen“.
- Ist ein verifizierter Kandidat nach der Normalisierung gleich oder Kopf-gleich, wird keine neue Zutat zum Anlegen vorbelegt. „Neu anlegen“ bleibt als Option, ist aber nicht die Vorbelegung.
- Aliase `Ei`, `Eier` → `Hühnerei (Größe M)` und `Salz`-Varianten werden als Seed-/Datenpflege ergänzt ; die fünf Ei-Zutaten werden in `Hühnerei (Größe M)` zusammengeführt.

## Capabilities

### Modified Capabilities
- `ingredient-matching`: Normalisierung, Kopfnomen-Treffer, Grauzonen-Hinweise.
- `recipe-ingredient-review`: Vorbelegung und Status beim Zutaten-Review im Rezept-Wizard.

## Impact

- **Backend:** `backend/recipe/services/ingredient_matcher.py` (Normalisierung, Kopfnomen-Stufe, Texte), `backend/recipe/services/ingredient_parser.py`, `backend/recipe/services/ingredient_review_service.py` (Vorbelegung ohne „neu“), Alias-Daten in `backend/supply`.
- **Frontend (frontend-food):** Zutaten-Review-Schritt zeigt den neuen Status „Zu prüfen“ und die Notiz; keine Schemaänderung erwartet.
- **Daten:** Alias-Einträge. Zusammenführung der fünf Ei-Zutaten in `Hühnerei (Größe M)` ist ein getrennter Datenschritt im gebündelten Prod-Rollout (Dry-Run zuerst, `--apply` nur nach OK).
