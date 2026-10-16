## Context

`IngredientMatcher._match_core` parst den Rohnamen (`IngredientNameParser`), strippt Mengen/Einheiten per Regex und prüft danach vier Stufen: exakter Name/Alias/Jaccard, Fuzzy (pg_trgm + Levenshtein), Embedding (nie Auto-Treffer), menschlicher Dialog. Namen, die Plural-Klammern, Größenangaben oder Zusätze enthalten, erreichen die exakte Stufe nie und fallen in Fuzzy/Embedding oder „Offen“.

## Goals / Non-Goals

**Goals:**
- Die drei Produktivtest-Fälle liefern einen Vorschlag mit der richtigen verifizierten Zutat.
- Keine falsche Behauptung „Ähnlichkeit ausreichend hoch“ in der Grauzone.
- Keine neue Zutat als Vorbelegung, wenn ein verifizierter Kopf-Treffer existiert.

**Non-Goals:**
- Kein Umbau der Stufen oder der Embedding-Kalibrierung.
- Keine automatische Bestätigung von Kopf-Treffern ohne Nutzer-Klick.
- Kein Zusammenführen bestehender Dubletten in diesem Change (Datenschritt separat).

## Decisions

- **Normalisierung als eigene, reine Funktion** `normalize_ingredient_name(raw) -> NormalizedName(name, note, head, qualifiers)` in `ingredient_matcher.py` (oder `ingredient_parser.py`), testbar ohne DB. Sie löst `(n)`, `(er)`, `(en)`, `(e)`, `(s)` auf, verschiebt Größen-Adjektive (`groß(e)`, `mittelgroß(e)`, `klein(e)`) und `Größe [SMLX]+` in Qualifier und trennt den Kopf bei `,`, ` mit `, ` ohne ` und Klammern. Alternative „LLM nochmal fragen“ wurde verworfen (Kosten, nicht deterministisch).
- **Kopfnomen-Stufe nach Stufe 1, vor Fuzzy.** Erst voller Name (wie bisher), dann Kopf per exaktem Namen/Alias. Treffer ergeben `needs_review=True` mit Kandidat vorbelegt, `matched_via="head"`, Grund „Zutat stimmt bis auf Zusatz überein“ und dem Zusatz in der Notiz. Alternative „still bestätigen“ wurde verworfen: „mit Kohlensäure“ ist inhaltlich relevant.
- **Kandidatennamen für den Vergleich normalisieren.** Klammer-Zusätze (`(Größe M)`) werden für den Vergleich entfernt; Plural-Mapping nutzt die vorhandene Plural-Logik (Spec `ingredient-plural-matching`) statt einer zweiten Implementierung.
- **Texte nach Stärke.** Neue Konstanten für Hinweistexte: ab `FUZZY_THRESHOLD` „ausreichend ähnlich“, in der Grauzone „ähnlich, bitte prüfen“. Der Text darf nicht mehr „ausreichend hoch“ lauten, wenn `confidence < FUZZY_THRESHOLD`.
- **Keine Neu-Vorbelegung bei Kopf-Treffer.** In `ingredient_review_service.py` wird `is_new` nur gesetzt, wenn weder Voll- noch Kopf-Treffer noch Kandidat ≥ Grauzone existiert; sonst bleibt „Neue Zutat anlegen“ eine auswählbare Option ohne Vorbelegung.
- **Aliase als Daten.** `Ei`, `Eier` → `Hühnerei (Größe M)` per Alias-Migration/Seed. Die Dubletten `Hühnerei (Größe M)` und `Hühnereier Größe M` werden separat zusammengeführt (bestehende Merge-Werkzeuge der Datenqualität).

- **Auto-Importe nehmen Treffer direkt.** Nicht-interaktive Aufrufer (URL-Import ohne Review, KI-Zutatenvorschläge) übernehmen jedes Ergebnis mit `ingredient_id`. Damit werden auch Kopf- und Plural-Treffer dort direkt verwendet, der Zusatz bleibt in der Notiz. Das reduziert Dubletten („Zwiebeln frisch“ nutzt `Zwiebel frisch`, wie `ingredient-plural-matching` es verlangt). Nur der Review im Wizard zeigt sie als „Zu prüfen“.

## Risks / Trade-offs

- [Falsche Kopf-Treffer, z. B. „Kokosmilch“ → „Milch“] → Kopf wird nur an `,`, `mit`, `ohne`, Klammern getrennt, nie mitten im Wort; Treffer ist immer nur Vorschlag.
- [Regel-Wildwuchs] → Normalisierung bekommt Tabellentests mit allen Fällen aus dem Produktivtest und aus bestehenden Matcher-Tests.
- [Größen-Verlust] → Größe bleibt als Notiz erhalten; die Zutat `Eier (Größe M)` trägt die Größe ohnehin im Namen.

## Migration Plan

Code ohne Migration. Alias-Seed als Datenmigration/Management-Command mit Dry-Run, Ausführung im gebündelten Prod-Rollout, `--apply` nur nach OK.

## Open Questions

Keine. Entschieden (nach dem Prod-Dry-Run vom 2026-10-04, der fünf Ei-Zutaten zeigte): `Eier (Größe M)`, `Hühnereier Größe M`, `Hühnerei` und `Hühnereier` werden im Prod-Rollout in `Hühnerei (Größe M)` zusammengeführt (die meistgenutzte, 22 Nutzungen). `Ei` und `Eier` werden Aliase, die übrigen Namen werden vom Merge als Aliase übernommen. Merge per bestehendem Datenqualitäts-Werkzeug, Dry-Run zuerst, `--apply` nur nach ausdrücklichem OK.
