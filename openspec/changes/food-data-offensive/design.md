# Design: Datenoffensive Essen

## Ausgangslage (lokale Analyse, 25.09.2026)

| Kennzahl | Vorher | Nachher |
|---|---|---|
| Zutaten (aktiv) | 5.918 | 5.731 (180 Duplikate gemergt, 7 Testdaten gelöscht) |
| Ohne Embedding | 5.828 | 0 |
| Zucker > Kohlenhydrate | 4.563 | 0 |
| Nährwerte unplausibel (Regelwerk) | > 5.000 | 4 |
| Ohne Preis | 224 | 2 |
| Ohne/Sonstige Warengruppe | 206 | 7 |
| Veröffentlicht (`verified`) | 712 | 5.660 |
| Test-/Unsinnsrezepte | 97 | 0 (archiviert) |
| KI-Kosten gesamt | – | ≈ 2,40 € (Review) + ≈ 0,15 € (Embeddings) + ≈ 0,02 € (Rezepte) |

## D1 — Regeln vor KI, KI nur gezielt

Die Frage „ganze Artikel per KI prüfen oder gezielt Lücken füllen?“ lösen wir in drei Stufen:

1. **Deterministisch (kostenlos)**: Alles, was aus den vorhandenen Werten folgt. Beispiele: kJ-Werte über 900 durch 4,184 teilen, Energie aus Makros berechnen, Salz = Natrium × 2,5 / 1000, Platzhalter-Nullen als „unbekannt“ (`None`) markieren. Die Import-Signatur „Elternwert 0, Unterwert > 0“ setzt Energie, Fett und KH auf unbekannt, weil deren Einheit bzw. Spalte nicht vertrauenswürdig ist.
2. **KI-Batch-Review (gezielt)**: nur für Zutaten mit verbleibenden Problemen. Das Modell sieht aktuelle Werte und Regelbefunde. Es soll *verdächtige und fehlende* Werte liefern und plausible übernehmen. Übernahme:
   - `None`, verdächtige Felder und Platzhalter-Nullen werden überschrieben,
   - andere Abweichungen mit Sicherheit ≥ 0,8 landen als Vorschlag in `ai_review_notes.suggestions`,
   - bleibt das Profil nach Teilübernahme unplausibel, ersetzt das (in sich konsistente) KI-Profil den ganzen Block,
   - danach werden die harten Regeln erzwungen (Zucker ≤ KH, ges. FS ≤ Fett, Atwater).
3. **Mensch (Cockpit)**: Umbenennungen, Duplikat-Merges, Löschen und Grenzfälle. Nichts davon passiert automatisch.

Ein komplettes KI-„Neu bewerten“ aller Felder ist nicht sinnvoll: teurer, nicht reproduzierbar, und es überschreibt geprüfte Werte. Der Batch-Review kostet bei 15 Zutaten pro Aufruf ca. 0,5 Cent, also rund 2 € für den gesamten Bestand.

## D2 — Warengruppen-Katalog v2 und Kopfwort-Klassifikator

Deutsche Produktnamen tragen den Produkttyp im Kopf des Kompositums (Orangen**saft**) bzw. am Namensanfang („Schokolade Espresso“). Der Klassifikator geht so vor:
- Er prüft pro Token das am spätesten endende, dann das längste Schlüsselwort.
- Marker überschreiben den Grundtyp: TK → TK-Gruppen, Dose/eingelegt → Konserven, getrocknet → Trockenobst/Gewürze, gemahlen → Gewürze, vegan + Fleisch → Fleischersatz.
- Schnittbezeichnungen („filet“, „steak“) übergeben an Fisch bzw. Fleischersatz, falls im Token vorhanden.
- Ganzwort- (`=ei`) und Suffix-Schlüssel (`~öl`) verhindern Fehltreffer wie „Schokoladen**te**ig“ → Ente oder „R**öl**lchen“ → Öl.

Der Katalog ist in `supply/data/retail_sections.py` hinterlegt, eingefroren in Migration `0019`. Legacy-Namen bleiben über `LEGACY_SECTION_ALIASES` auflösbar.

`retail_section_source` (rule/ai/manual) regelt den Vorrang: manuell > KI > Regel. Eine Änderung über die UI (Zutat bearbeiten oder Cockpit) gilt als manuell.

## D3 — Häppchenweise Läufe statt Hintergrundjobs

Cloud Run drosselt die CPU außerhalb von Requests und skaliert über mehrere Instanzen, ein In-Memory-Jobstatus wäre also nicht verlässlich. Jede Cockpit-Aktion verarbeitet deshalb ein begrenztes Häppchen (KI: 45 Zutaten mit 3 parallelen Aufrufen, Embeddings: 60) und liefert `remaining` zurück. Das Frontend (`useChunkedRunner`) schleift mit Fortschrittsbalken und Stopp-Taste. Große Läufe gehen über `manage.py food_data_offensive` (Cloud Run Job oder lokal mit Cloud SQL Proxy).

## D4 — Transfer nach Produktion

`apply_to_prod.py` leert Tabellen und lädt Fixtures neu. Dabei gehen Nutzerdaten verloren, die inzwischen in Produktion entstanden sind. Die Datenoffensive nutzt stattdessen ein slug-basiertes Paket:

```
manage.py migrate
manage.py food_offensive_apply            # Dry-Run
manage.py food_offensive_apply --apply
manage.py food_data_offensive --apply --steps embeddings
```

Das Paket (`data/food/data_offensive_package.json`) enthält korrigierte Felder, Merges, Löschungen, archivierte Rezepte und Rezeptkategorien. Die Anwendung ist idempotent, respektiert manuelle Warengruppen und verursacht keine KI-Kosten. End-to-End verifiziert auf einer frischen Kopie des Ausgangsstands: identisches Ergebnis.

## D5 — Prompt-Review Zauberstab (`suggest_all_fields`)

| Befund im alten Prompt | Änderung |
|---|---|
| Keine aktuellen Werte → Modell rät blind, Vergleich im Dialog wenig aussagekräftig | Aktuelle Werte, Warengruppe, Preis und Regelbefunde als Kontext |
| Keine Plausibilitätsregeln → Zucker > KH, kJ statt kcal möglich | Gemeinsame `INGREDIENT_DATA_RULES` (auch in Fill-Missing, AI-Create, Batch) plus serverseitiges Klemmen |
| Bezugsgröße unklar (roh/gekocht, Pulver/zubereitet) | „Pro 100 g im Verkaufszustand“, Getränke pro 100 ml ≈ 100 g |
| US-Kohlenhydrate (inkl. Ballaststoffe) bei Saaten | EU-Definition explizit |
| Keine Warengruppe | Enum aus Katalog v2 mit Beispielen (Saft ≠ Obst) |
| Freitext für Viskosität/Lagerung | Enums (`solid/beverage/powder`, `dry/refrigerated/frozen/ambient`) |
| „Google Search Grounding“ im Docstring, aber nicht aktiviert | Behauptung entfernt; Grounding bewusst aus (Kosten, Latenz) |
| Namensvorschlag zu offensiv („Milch“ → „Kuhmilch 3,5 %“ immer) | Nur bei Marke, Menge, Werbesprache, Tippfehler oder zu vagem Namen |

### Vorschläge zur weiteren Prompt-Erweiterung

1. **Produktform-Feld** (`product_form`: frisch/TK/Konserve/getrocknet/Pulver/Getränk/zubereitet) als eigenes Model-Feld. Damit werden Warengruppe, Dichte und Nutri-Score-Tabelle (Getränk) deterministisch ableitbar.
2. **Referenz-Anker**: 3–5 verifizierte Zutaten derselben Warengruppe mit Werten in den Prompt legen (Few-Shot aus eigenen Daten). Das verbessert Konsistenz innerhalb einer Gruppe deutlich.
3. **BLS-Schlüssel / Quelle** zurückgeben lassen (`source`: BLS, Etikett, Schätzung). Schätzungen im Cockpit markieren.
4. **Allergene** (14 EU-Hauptallergene) als strukturierte Liste statt freier Ernährungstags.
5. **Grounding nur für Markenprodukte** (Sicherheit < 0,6) gezielt einschalten, dann mit EAN-Suche.
6. **Selbstkonsistenz**: bei Sicherheit < 0,6 einen zweiten Aufruf mit anderer Temperatur und nur übereinstimmende Werte übernehmen.

## D6 — Vorschläge, damit es nicht wieder passiert

- **Import-Gate**: Jeder Import (REWE, URL, Cooklang, KI-Create) läuft durch `propose_deterministic_repair` + `detect_nutrition_issues`. Unplausible Zutaten landen als Entwurf in der Cockpit-Queue, nie als `verified`.
- **Eindeutige Namen erzwingen**: Nach dem Merge einen Partial-Unique-Index `Lower(name) WHERE deleted_at IS NULL` einführen. Alle Anlegepfade nutzen dann einen gemeinsamen `get_or_create_ingredient_by_name` (heute 7 verschiedene Slug-Schleifen). `ai_create_ingredient` verwendet vorhandene Namen bereits wieder.
- **E2E-Tests nicht gegen die Entwicklungs-DB** laufen lassen oder Testdaten mit Präfix anlegen und im Teardown löschen. Die 180 Duplikate und 97 Testrezepte stammen daher.
- **Fixtures mit Signals laden** bzw. nach `loaddata` immer `food_data_offensive --steps embeddings` ausführen (in `seed_all` integrieren).
- **Nächtlicher Health-Check** (Cloud Scheduler → `food_data_offensive` im Dry-Run) mit Report der KPI-Deltas.
- **Qualitäts-Score** berücksichtigt Plausibilität (umgesetzt). Nächster Schritt: Score < 60 verhindert Veröffentlichung.
- **Datenmodell**: „unbekannt“ konsequent `NULL` statt Default `0` (Model-Defaults `default=0` bei Nährwerten entfernen).
