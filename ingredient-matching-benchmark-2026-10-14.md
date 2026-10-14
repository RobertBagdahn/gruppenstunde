# Zutaten-Zuordnung beim Rezept-Import – Benchmark & Vorschläge (14.10.2026)

## Test

- `backend/recipe/tests/test_chefkoch_import_matching_e2e.py` – 10 zufällig gezogene Chefkoch-Rezepte (echtes HTML, gekürzt auf Titel, JSON-LD und Zutatentabelle) laufen durch die echte Review-Pipeline (`preview_recipe_ingredients`: Parser → Matcher → Mengenumrechnung) gegen einen Snapshot des Zutatenkatalogs (5.723 Zutaten, 301 Aliase, 13.483 Portionen).
- Gold-Labels: `backend/recipe/tests/fixtures/chefkoch_matching/expected.py` (110 Zeilen, je akzeptierte Zutaten + erwartete Gramm + Toleranz). „Salz und Pfeffer (n. B.)“ wird erwartet als **2 Zeilen: 1 Prise Jodsalz + 1 Prise gemahlener schwarzer Pfeffer**.
- Ersetzt sind nur Netzwerkabruf und Gemini-Metadaten; ohne KI gemessen, damit der Test deterministisch ist.
- Katalog-Snapshot neu ziehen: `uv run python manage.py export_matching_catalog` (lokale DB).
- Bericht pro Zeile: `CHEFKOCH_BENCHMARK_REPORT=/tmp/report.md uv run pytest recipe/tests/test_chefkoch_import_matching_e2e.py`
- Schwellen sind ein Ratchet (dürfen nur steigen).

## Baseline

| Kennzahl | Wert |
|---|---|
| Richtige Zutat (inkl. „offen“, wenn nichts Passendes existiert) | **61 %** |
| Still **falsch** gewählte Zutat | **11 %** (12 Zeilen) |
| Richtige Zutat gewählt **oder** in Top-5-Kandidaten | 77 % |
| Menge korrekt (bei richtiger Zutat) | 64 % |
| Zeile komplett ohne Nacharbeit | **42 %** |

Eine Seite (neues Chefkoch-Layout ohne JSON-LD) lässt sich **gar nicht** importieren.

## Fehlerbilder

| Ursache | Zeilen | Beispiele |
|---|---|---|
| Einheit/Mengenwort bleibt im Namen | 13 | „Zehe/n Knoblauch“, „Pck. Backpulver“, „Stange/n Lauch“, „8 Blätter Basilikum“, „n. B. Oregano“, „TL, gehäuft Naturjoghurt“, „m.-große Karotte(n)“ |
| Spezifizierer (Klammer/Komma) verworfen → generische Zutat | 8 falsch | „Zwiebel(n) (rot)“ → Zwiebel, „Hefe (Trockenhefe)“ → Hefe (frisch), „Tomaten, passierte“ → Tomaten, „Paprikapulver, edelsüßes“ → geräuchert, „Senf, süßer“ → mittelscharf, „Quark (20 %)“ → Magerquark |
| Kombizeile nicht geteilt | 4 Zeilen / 8 Soll-Zeilen | „Salz und Pfeffer“ → verifizierte Zutat „Salz und Pfeffer“ (usage 35!) |
| Schlechte Aliase | 3 falsch | „Hähnchen“ (ganzes Huhn) → Hähnchenbrustfilet; „Quark“ → Magerquark |
| Komposita / Wortstellung | 6 offen | „Feta-Käse“ ≠ Feta, „Mandel(n) gemahlen“ ≠ „Gemahlene Mandeln“, „Balsamico weiß“ ≠ „Weißer Balsamicoessig“, „Kürbisfleisch“ |
| Dubletten → „Mehrere ähnlich“ statt Auswahl | 3 offen | Rohrzucker (3×), Mozzarella (n×) |
| Menge: Portion falsch erkannt | 6 | „1 EL Limettensaft“ = **2 g** (Maßeinheit 102 „Esslöffel“ hängt an „200 ml“-Portionen), „1 TL Knoblauchpulver“ = 5 g (Portion „1 TL (2g)“ nicht als TL erkannt) |
| Menge: Größe ignoriert | 2 | „3 große Zwiebeln“ = 3 × „kleines Stück“ (150 g), „24 kleine Tomaten“ = 2,9 kg |
| Menge: Stück/Gebinde ohne Gewicht | 10 | 20 Oliven, 10 Kirschtomaten, 1 Glas Weißwein, 1 Bund Rosmarin, Prise Salz |
| Menge: Dichte 1,0 für Pulver | 3 | 1 TL Cayenne = 5 g, 4 EL Püreepulver = 60 g |
| Embedding-Stufe faktisch aus | – | nur 38 von 5.748 Zutaten haben ein Embedding |

Screenshot-Fall „Frischer Ingwer: ca. 60–80 g“: Format „Name: Menge“ und Bereich „60–80 g“ werden nicht erkannt, der ganze String wird zum Zutatennamen.

## 20 Vorschläge

### A – Parser / Extraktion
1. **Chefkoch-Zutatentabelle als Primärquelle** (`ds-ingredients-table`: Menge+Einheit, Name, Eigenschaften sind getrennte Zellen); JSON-LD nur Fallback. Löst die nicht importierbare Seite und die meisten Einheiten-Reste.
2. **Einheiten-Lexikon mit Chefkoch-Pluralformen**: `Pck.`, `Zehe/n`, `Zweig/e`, `Stange/n`, `Knolle/n`, `Stiel(e)`, `Stängel`, `Blätter`, `Topf`, `Prise(n)`, `TL, gehäuft`, `EL, gestr.`, `Msp.`; Mengenwörter `n. B.`, `etwas`, `einige`; Größen `m.-große`, `große`, `kleine` → Notiz/Größe.
3. **Bereiche, Zirka, „Name: Menge“**: `60–80 g` → 70 g, `ca. 2 kg`, `Frischer Ingwer: ca. 60–80 g` → Ingwer, 70 g, Notiz „frisch“.
4. **Kombizeilen teilen**: „Salz und Pfeffer“, „X und Y“ (wenn beide Teile bekannte Zutaten sind) → eigene Zeilen; Gewürze „n. B.“ → je 1 Prise.
5. **Klammer-/Komma-Inhalt klassifizieren** statt verwerfen: Spezifizierer („rot“, „passierte“, „edelsüß“, „Trockenhefe“, „20 %“) werden Teil der Suche („Tomaten, passierte“ → „passierte Tomaten“); Zusätze („für die Form“, „lauwarm“, „aus der Mühle“) bleiben Notiz.

### B – Matcher
6. **Neues Kandidaten-Scoring**: Token-Jaccard auf normalisierten Tokens (Stemming, Umlaute, Bindestrich-Komposita) + Trigramm + Kopfnomen-Bonus, Wortstellung egal („Mandeln gemahlen“ = „Gemahlene Mandeln“).
7. **Komposita-Zerlegung** gegen die Katalog-Wortliste („Feta-Käse“ → Feta, „Kürbisfleisch“ → Kürbis, „Sellerieblätter“).
8. **Konfliktwörter** (frisch/trocken, rot/weiß, edelsüß/rosenscharf/geräuchert, mager/20 %/40 %, süß/mittelscharf): Kandidat mit widersprechendem Merkmal wird nie automatisch gewählt.
9. **Kanonische Zutat bei Gleichstand**: statt „Mehrere ähnlich“ den verifizierten Alias-Inhaber mit höchster Nutzung vorbelegen (Rohrzucker, Mozzarella); Dubletten-Cluster als Datenpflege-Liste ausgeben.
10. **Embeddings nutzbar machen**: Backfill für alle Zutaten, Embedding als **Reranker** der Top-k (kein Auto-Match); senkt Kandidaten-Rauschen („Mini-Brownies“ für „Eier“).
11. **Alias-Hygiene + Audit-Command**: Alias darf nicht generischer sein als die Zutat („Hähnchen“ → Brustfilet, „Quark“ → Magerquark); Kombi-Zutat „Salz und Pfeffer“ aus dem Matching nehmen.
12. **Lernende Zuordnung**: bestätigte Review-Entscheidungen (normalisierter Quelltext → Zutat) speichern; nächster Import trifft automatisch.
13. **KI-Reranker für offene Zeilen**: ein Gemini-Call pro Rezept wählt je offener Zeile aus den Top-10-IDs oder „neu“, nur als Vorschlag mit Begründung.
14. **Eine Matching-Engine für SQLite und Postgres** (In-Memory-Index, 5.7k Namen) – heute weicht Prod (pg_trgm) vom Test (Levenshtein) ab; Benchmark zusätzlich gegen lokale Postgres.

### C – Menge & Portion
15. **Portion-Erkennung korrigieren**: „1 TL (2g)“/„1 EL (10ml)“ als TL/EL erkennen; Maßeinheit-Name nur Fallback; Datenfix für Maßeinheit 102 „Esslöffel“ an ml-Portionen.
16. **Größenadjektive** wählen die passende Stückportion oder skalieren (klein × 0,6, groß × 1,4).
17. **Standardgewichte für Stück/Gebinde ohne KI** (Zehe 5 g, Bund Kräuter 20 g, Topf Basilikum 25 g, Stange Lauch 200 g, Knolle Sellerie 700 g, Pck. Backpulver 16 g, Pck. Vanillezucker 8 g, Glas Wein 150 ml, Dose Tomaten 400 g …); KI nur danach.
18. **Prise / „n. B.“-Defaults**: Prise = 0,5 g, Gewürz „n. B./etwas“ = 1 Prise, Öl „n. B.“ = 1 EL – als „geschätzt“ markiert.
19. **Dichte nach Kategorie** statt 1,0 für 90 % der Zutaten (Pulver ≈ 0,5, Öl 0,92, Honig 1,4).

### D – Neu anlegen
20. **„Zutat anlegen“ per Knopfdruck in jeder offenen Zeile**: normalisierter Name („Ingwer“ statt „Frischer Ingwer: ca. 60–80 g“), Zauberstab-Anreicherung (Nährwerte, Portionen, Aliase), voller Editor zum Überstimmen, Dubletten-Check vor dem Speichern, neue Zutat danach sofort mit umgerechneter Menge gewählt.

## Baseline-Bericht pro Zeile

**rows=114 ingredient=61% wrong=11% candidate_recall=77% grams=64% fully_ok=42%**

| Seite | Zeile | Ergebnis | Gewählt | Kandidaten | Menge | Erwartet |
|---|---|---|---|---|---|---|
| Griechische-Teigtasche | 2 Pck. Blätterteig (TK) | open, cand. hit | — | Blätterteig glutenfrei (TK), Blätterteig | — | Blätterteig, 900 g |
| Griechische-Teigtasche | 1 Zwiebel(n) | ok | Zwiebel | Zwiebel | 50 g (1.0× kleines Stück) | Speisezwiebeln / Zwiebel, 100 g |
| Griechische-Teigtasche | 1 Knoblauchzehe(n) | ok | Knoblauchzehe | Knoblauchzehe | 5 g (1.0× Zehe) | Knoblauchzehe / frischer Knoblauch, 5 g |
| Griechische-Teigtasche | 2 EL Olivenöl | ok | Natives Olivenöl Extra | Natives Olivenöl Extra | 20 g (2.0× EL) | Olivenöl nativ extra / Natives Olivenöl Extra, 22 g |
| Griechische-Teigtasche | 500 g Hackfleisch (gemischt) | ok | Hackfleisch | Hackfleisch | 500 g (3.33× Stück) | Hackfleisch (gemischt Rind und Schwein) / Hackfleisch gemischt, 500 g |
| Griechische-Teigtasche | 1 Dose Tomate(n) (stückige (425 g)) | open, cand. hit | — | Tomaten (stückig, Dose), Tomaten stückig, Tomaten stückig Datterini | — | Stückige Tomaten / Tomaten (stückig, Dose), 425 g |
| Griechische-Teigtasche | Salz und Pfeffer (schwarzer) → Salz | WRONG | Salz und Pfeffer | Salz und Pfeffer | 5 g (1.0× Stück) | Jodsalz / Salz, 0.4 g |
| Griechische-Teigtasche | Salz und Pfeffer (schwarzer) → Pfeffer | not split | — |  | — | gemahlener schwarzer Pfeffer / Pfeffer, Schwarz, 0.4 g |
| Griechische-Teigtasche | 1 Pck. Feta-Käse | open, no hit | — | Pfefferkäse, Raclettekäse, Schafskäse | — | Feta, 200 g |
| Griechische-Teigtasche | etwas Oregano (getrockneter) | open, cand. hit | — | Oregano getrocknet | — | Oregano getrocknet |
| Griechische-Teigtasche | 1 Ei(er) | ok | Hühnerei | Hühnerei | 60 g (1.0× Stück) | Hühnerei (Größe M) / Hühnereier Größe M, 60 g |
| Griechische-Teigtasche | 1 EL Milch | ok | Milch | Milch | 16 g (0.08× Glas) | Kuhmilch 3,5 % Fett / Milch, 15 g |
| Axels-Wurstsalat.html | 400 g Fleischwurst | open (new ok) | — | Vegane Fleischwurst | — | Lyoner, 400 g |
| Axels-Wurstsalat.html | 200 g Feta-Käse | open, no hit | — | Feta-Creme, Feta Kräuter, Reibekäse | — | Feta, 200 g |
| Axels-Wurstsalat.html | 20 Oliven (schwarz, entsteint) | ok, amount missing | Oliven | Oliven | — | Oliven / Oliven ohne Stein, 80 g |
| Axels-Wurstsalat.html | 10 Kirschtomate(n) | ok, amount missing | Kirschtomaten | Kirschtomaten, Kirschtomaten (Dose) | — | Kirschtomaten / Cherrytomaten, 150 g |
| Axels-Wurstsalat.html | 1 Zwiebel(n) (rot) | WRONG | Zwiebel | Zwiebel | 50 g (1.0× kleines Stück) | Rote Zwiebel / Rote Zwiebeln, 100 g |
| Axels-Wurstsalat.html | 1 Knoblauchzehe(n) | ok | Knoblauchzehe | Knoblauchzehe | 5 g (1.0× Zehe) | Knoblauchzehe / frischer Knoblauch, 5 g |
| Axels-Wurstsalat.html | 1 Zweig/e Thymian | open, cand. hit | — | Thymian, Frischer Thymian, Getrockneter Thymian | — | Thymian / Thymian (frisch) |
| Axels-Wurstsalat.html | 4 EL Essig (Weißweinessig) | ok | Weißweinessig | Weißweinessig | 60 g (4.0× Esslöffel) | Weißweinessig, 60 g |
| Axels-Wurstsalat.html | 2 EL Olivenöl | ok | Natives Olivenöl Extra | Natives Olivenöl Extra | 20 g (2.0× EL) | Olivenöl nativ extra / Natives Olivenöl Extra, 22 g |
| Axels-Wurstsalat.html | Pfeffer (schwarz, gemahlen) | ok, amount missing | gemahlener schwarzer Pfeffer | gemahlener schwarzer Pfeffer | — | gemahlener schwarzer Pfeffer / Pfeffer, Schwarz, 0.4 g |
| Mandel-Amaretto-Kuchen | 6 m.-große Ei(er) | open, cand. hit | — | Mini-Brownies, Gemüsebrühe heiß, TK-Brokkoli | — | Hühnerei (Größe M) / Hühnereier Größe M, 360 g |
| Mandel-Amaretto-Kuchen | 150 g Rohrzucker | open, cand. hit | — | Dunkler Rohrzucker, Brauner Rohrzucker, Rohrzucker braun | — | Rohrzucker braun, 150 g |
| Mandel-Amaretto-Kuchen | 1 Prise(n) Salz | ok, amount missing | Salz | Salz | — | Jodsalz / Salz, 0.4 g |
| Mandel-Amaretto-Kuchen | 200 g Mandel(n) (gemahlen) | open, no hit | — | Cantuccini Mandel, Cerealien Mandel, Mehl, Mandel | — | Gemahlene Mandeln / Mandeln gemahlen, 200 g |
| Mandel-Amaretto-Kuchen | 3 EL Amaretto | open (new ok) | — | Soja-Quarkalternative Mango Kinder, Quark-Joghurt Protein Gebrannte Mandel | — | neu, 45 g |
| Mandel-Amaretto-Kuchen | etwas Butter (und Semmelbrösel für die Form) | ok | Butter | Butter | 10 g (1.0× Stück) | Deutsche Markenbutter / Butter |
| Mandel-Amaretto-Kuchen | 200 g Schmand | ok | Schmand | Schmand | 200 g (2.0× 100g) | Schmand, 200 g |
| Mandel-Amaretto-Kuchen | 250 g Quark (20 %) | WRONG | Magerquark | Magerquark | 250 g (1.0× Becher) | Speisequark 20%, 250 g |
| Mandel-Amaretto-Kuchen | 1 EL Honig (flüssiger und neutraler) | ok, amount off | Blütenhonig | Blütenhonig | 10 g (1.0× 1 EL Honig) | Blütenhonig, 20 g |
| Frittierte-Sesambaellc | 400 g Reismehl (Kleb-) | open (new ok) | — | Weizenmehl Type 405, Reis Korean Style (TK), Weizenmehl Type 550 Bio | — | neu, 400 g |
| Frittierte-Sesambaellc | 4 EL Reismehl (normales) | open (new ok) | — | Risoni (Nudelreis), Gemüsemais Bio (Glas), Reisriegel Crunchy Milch | — | neu, 40 g |
| Frittierte-Sesambaellc | 4 EL Kartoffelpüreepulver | ok, amount off | Kartoffelpüree-Pulver | Kartoffelpüree-Pulver, Kartoffelpüree-Pulver vegan Bio, Kartoffeltaler | 60 g (0.6× 100g) | Kartoffelpüree-Pulver, 30 g |
| Frittierte-Sesambaellc | 8 EL Zucker (oder Rohrzucker) | ok | weißer Haushaltszucker | weißer Haushaltszucker | 80 g (8.0× 1 EL Zucker) | weißer Haushaltszucker / Haushaltszucker (Saccharose), 100 g |
| Frittierte-Sesambaellc | 1 Pck. Backpulver | open, cand. hit | — | Backpulver (Natron-Basis) | — | Backpulver (Natron-Basis), 16 g |
| Frittierte-Sesambaellc | 400 ml Wasser (warmes) | ok | Leitungswasser | Leitungswasser | 400 g (40.0× 1 Portion) | Leitungswasser, 400 g |
| Frittierte-Sesambaellc | 200 g Bohnen (Mungo-, geschält) | WRONG | Bohnen | Bohnen | 199 g (0.83× Dose) | neu, 200 g |
| Frittierte-Sesambaellc | 200 g Zucker | ok | weißer Haushaltszucker | weißer Haushaltszucker | 200 g (2.0× 100g Zucker) | weißer Haushaltszucker / Haushaltszucker (Saccharose), 200 g |
| Frittierte-Sesambaellc | 1 Pck. Vanillezucker | open, cand. hit | — | Vanillezucker | — | Vanillezucker, 8 g |
| Frittierte-Sesambaellc | 100 g Sesam | ok, amount missing | Sesam | Sesam | — | Sesam, 100 g |
| Frittierte-Sesambaellc | 1 Liter Öl | ok | Öl | Öl | 920 g (92.0× Esslöffel) | raffiniertes Sonnenblumenöl / Öl, 920 g |
| Challah.html | 1 EL Hefe (Trockenhefe) | WRONG | Hefe (frisch) | Hefe (frisch), Hefe (trocken), Frische Hefe | 15 g (0.15× 100g Hefe (frisch)) | Trockenhefe / Hefe (trocken), 10 g |
| Challah.html | 1 EL Zucker | ok | weißer Haushaltszucker | weißer Haushaltszucker | 10 g (1.0× 1 EL Zucker) | weißer Haushaltszucker / Haushaltszucker (Saccharose), 12.5 g |
| Challah.html | 1 EL Salz | ok | Salz | Salz | 18 g (60.0× Prise) | Jodsalz / Salz, 16 g |
| Challah.html | 750 g Mehl | ok | Weizenmehl Type 405 | Weizenmehl Type 405 | 750 g (7.5× Tasse Mehl) | Weizenmehl Type 405 / Weizenmehl, 750 g |
| Challah.html | 2 Ei(er) | ok | Hühnerei | Hühnerei | 120 g (2.0× Stück) | Hühnerei (Größe M) / Hühnereier Größe M, 120 g |
| Challah.html | 5 EL Öl | ok | Öl | Öl | 50 g (5.0× Esslöffel) | raffiniertes Sonnenblumenöl / Öl, 50 g |
| Challah.html | 75 ml Wasser (lauwarm) | ok | Leitungswasser | Leitungswasser | 75 g (7.5× 1 Portion) | Leitungswasser, 75 g |
| Challah.html | 1 Ei(er) | ok | Hühnerei | Hühnerei | 60 g (1.0× Stück) | Hühnerei (Größe M) / Hühnereier Größe M, 60 g |
| Challah.html | 1 Prise(n) Zucker | ok, amount missing | weißer Haushaltszucker | weißer Haushaltszucker | — | weißer Haushaltszucker / Haushaltszucker (Saccharose), 0.4 g |
| Challah.html | 1 Prise(n) Salz | ok, amount missing | Salz | Salz | — | Jodsalz / Salz, 0.4 g |
| Timballo-di-Riso.html | 250 g Hackfleisch, gemischtes | ok | Hackfleisch | Hackfleisch, Hackfleisch (gemischt Rind und Schwein) | 250 g (1.67× Stück) | Hackfleisch (gemischt Rind und Schwein) / Hackfleisch gemischt, 250 g |
| Timballo-di-Riso.html | 1 Zwiebel(n) | ok | Zwiebel | Zwiebel | 50 g (1.0× kleines Stück) | Speisezwiebeln / Zwiebel, 100 g |
| Timballo-di-Riso.html | 3 große Champignons | ok, amount missing | Champignons | Champignons | — | Champignons, 90 g |
| Timballo-di-Riso.html | 1 Knoblauchzehe(n) | ok | Knoblauchzehe | Knoblauchzehe | 5 g (1.0× Zehe) | Knoblauchzehe / frischer Knoblauch, 5 g |
| Timballo-di-Riso.html | n. B. Olivenöl | open, cand. hit | — | Sardinen in Olivenöl, Thunfisch in Olivenöl, Grüne Oliven | — | Olivenöl nativ extra / Natives Olivenöl Extra |
| Timballo-di-Riso.html | n. B. Salz und Pfeffer → Salz | open, no hit | — | Salz und Pfeffer | — | Jodsalz / Salz, 0.4 g |
| Timballo-di-Riso.html | n. B. Salz und Pfeffer → Pfeffer | not split | — |  | — | gemahlener schwarzer Pfeffer / Pfeffer, Schwarz, 0.4 g |
| Timballo-di-Riso.html | 8 Blätter Basilikum | open, cand. hit | — | frisches Basilikum, Basilikum frisch, Getrockneter Basilikum | — | frisches Basilikum / Basilikum-Blatt, frisch, 3.2 g |
| Timballo-di-Riso.html | 2 Ei(er) (hart gekocht) | ok | Hühnerei | Hühnerei | 120 g (2.0× Stück) | Hühnerei (Größe M) / Hühnereier Größe M, 120 g |
| Timballo-di-Riso.html | n. B. Oregano | open, no hit | — | Salat Vegano, Gyros vegan, Parmigiano Reggiano | — | Oregano getrocknet |
| Timballo-di-Riso.html | 50 g Rohschinken (gewürfelt) | open (new ok) | — | Rohschinken leicht | — | Parmaschinken / Serrano-Schinken, 50 g |
| Timballo-di-Riso.html | 150 g Käse (nach Wahl) | ok | Gouda | Gouda | 150 g (1.5× 100g) | Gouda / Käse gerieben, 150 g |
| Timballo-di-Riso.html | 70 g Parmesan (gerieben) | ok | Parmigiano Reggiano | Parmigiano Reggiano | 70 g (7.0× Esslöffel) | Parmigiano Reggiano / Parmesan gerieben, 70 g |
| Timballo-di-Riso.html | 225 g Reis | ok | Langkornreis parboiled | Langkornreis parboiled | 225 g (2.25× 100g Reis) | Risottoreis / Risotto-Reis, 225 g |
| Timballo-di-Riso.html | 50 g Erbsen (TK) | ok | Erbsen (Tiefkühl) | Erbsen (Tiefkühl), Junge Erbsen (TK), Himbeeren (TK) | 50 g (0.5× 100g) | Erbsen (Tiefkühl), 50 g |
| Timballo-di-Riso.html | 1 Dose Tomaten, passierte | WRONG | Tomaten | Tomaten, Tomaten (Dose), Tomaten (stückig, Dose) | 400 g (1.0× Dose) | Passierte Tomaten, 450 g |
| Timballo-di-Riso.html | 1 Glas Weißwein | ok, amount missing | Weißwein | Weißwein | — | Weißwein, 175 g |
| Lammkeule-nach-feiner- | 15 Zehe/n Knoblauch | open, cand. hit | — | frischer Knoblauch, Knoblauch gepresst, Brotchips Knoblauch | — | Knoblauchzehe / frischer Knoblauch, 75 g |
| Lammkeule-nach-feiner- | 1 Bund Rosmarin (frisch) | ok, amount missing | Rosmarin | Rosmarin | — | Rosmarin (frisch) / Rosmarin, 20 g |
| Lammkeule-nach-feiner- | 3 große Paprikaschote(n), bunte | ok | Paprikaschoten | Paprikaschoten | 450 g (3.0× Stück) | Gemüsepaprika rot / Paprikaschoten, 600 g |
| Lammkeule-nach-feiner- | 3 große Zwiebel(n) | ok, amount off | Zwiebel | Zwiebel | 150 g (3.0× kleines Stück) | Speisezwiebeln / Zwiebel, 450 g |
| Lammkeule-nach-feiner- | 4 große Tomate(n) | ok | Tomaten | Tomaten | 480 g (4.0× Stück) | Tomaten, 600 g |
| Lammkeule-nach-feiner- | 2 m.-große Karotte(n) | open, cand. hit | — | Karotte, Eiweiß-Toastbrötchen Karotte | — | Karotte / Karotten, 160 g |
| Lammkeule-nach-feiner- | 2 Stange/n Lauch | open, cand. hit | — | Lauch | — | Lauch / Porree, 400 g |
| Lammkeule-nach-feiner- | 3 Stängel Sellerieblätter | open (new ok) | — | Mandelsplitter, Kaffirlimettenblätter, Lorbeerblätter | — | neu |
| Lammkeule-nach-feiner- | 300 g Kürbisfleisch | open, no hit | — | Rindfleisch, Hackfleisch, Kürbiskerne | — | Kürbis (Hokkaido) / Kürbis (Butternut), 300 g |
| Lammkeule-nach-feiner- | 12 EL Olivenöl (Extra virgin) | ok | Natives Olivenöl Extra | Natives Olivenöl Extra | 120 g (12.0× EL) | Olivenöl nativ extra / Natives Olivenöl Extra, 120 g |
| Lammkeule-nach-feiner- | 1 Lammkeule(n) (mit Knochen, ca. 2kg) | open (new ok) | — | Flammkuchen Steinofen (TK), Flammkuchen (TK), Laugenbrötchen (TK) | — | neu, 2000 g |
| Lammkeule-nach-feiner- | 8 EL Waldhonig | ok | Waldhonig | Waldhonig | 120 g (1.2× 100g) | Waldhonig / Blütenhonig, 160 g |
| Lammkeule-nach-feiner- | etwas Salz und Pfeffer (aus der Mühle) → Salz | WRONG | Salz und Pfeffer | Salz und Pfeffer | 5 g (1.0× Stück) | Jodsalz / Salz, 0.4 g |
| Lammkeule-nach-feiner- | etwas Salz und Pfeffer (aus der Mühle) → Pfeffer | not split | — |  | — | gemahlener schwarzer Pfeffer / Pfeffer, Schwarz, 0.4 g |
| Gefuelltes-Brathaehnch | 1.5 kg Hähnchen (frisch oder TK, mit Innereien) | WRONG | Hähnchenbrustfilet | Hähnchenbrustfilet | 1500 g (10.0× Portion) | neu, 1500 g |
| Gefuelltes-Brathaehnch | 3 TL Salz | ok | Salz | Salz | 15 g (3.0× TL) | Jodsalz / Salz, 15 g |
| Gefuelltes-Brathaehnch | 1 TL Cayennepfeffer (gemahlen) | ok, amount off | Cayennepfeffer | Cayennepfeffer | 5 g (5.0× Prise) | Cayennepfeffer, 2 g |
| Gefuelltes-Brathaehnch | 0.5 TL Pfeffer (gemahlen) | ok | gemahlener schwarzer Pfeffer | gemahlener schwarzer Pfeffer | 1 g (4.17× 1 Prise Pfeffer) | gemahlener schwarzer Pfeffer / Pfeffer, Schwarz, 1 g |
| Gefuelltes-Brathaehnch | 1 TL Paprikapulver, rosenscharfes | WRONG | Paprikapulver (geräuchert) | Paprikapulver (geräuchert) | — | Paprikapulver edelsüß / Paprika edelsüß, 2.5 g |
| Gefuelltes-Brathaehnch | 2 TL Paprikapulver, edelsüßes | WRONG | Paprikapulver (geräuchert) | Paprikapulver (geräuchert) | — | Paprikapulver edelsüß / Paprika edelsüß, 5 g |
| Gefuelltes-Brathaehnch | 6 EL Rapsöl | ok, amount off | Rapsöl | Rapsöl | 83 g (8.28× 1 Portion) | Rapsöl / Raps- oder Sonnenblumenöl, 60 g |
| Gefuelltes-Brathaehnch | 1 TL Knoblauchpulver | ok, amount off | Knoblauchpulver | Knoblauchpulver | 5 g (2.5× 1 TL (2g)) | Knoblauchpulver, 2.5 g |
| Gefuelltes-Brathaehnch | 1 EL Limettensaft | ok, amount off | Limettensaft | Limettensaft | 2 g (0.01× 200 ml) | Limettensaft, 15 g |
| Gefuelltes-Brathaehnch | Innereien (vom Hähnchen) | open (new ok) | — | Sonnenweizen (Hartweizen), Veganes Schnitzel Hähnchen-Art, Vegane Crispy Burger Hähnchen-Art | — | neu |
| Gefuelltes-Brathaehnch | 0.25 Knolle/n Sellerie | open, cand. hit | — | Sellerie (Knolle) | — | Sellerie (Knolle), 175 g |
| Gefuelltes-Brathaehnch | 0.5 Bund Lauchzwiebel(n) | ok, amount missing | Lauchzwiebel | Lauchzwiebel | — | Lauchzwiebel / Lauchzwiebeln, 50 g |
| Gefuelltes-Brathaehnch | 2 TL Senf, süßer | WRONG | mittelscharfer Senf | mittelscharfer Senf | 10 g (2.0× 1 TL Senf) | neu, 10 g |
| Gefuelltes-Brathaehnch | 3 TL, gehäuft Naturjoghurt (3,5 % Fett) | open, cand. hit | — | Naturjoghurt 3,5 % Fett, Joghurt 0,1 % Fett, Naturjoghurt 3,8% | — | Naturjoghurt 3,5 % Fett, 24 g |
| Gefuelltes-Brathaehnch | 2 TL Salz | ok | Salz | Salz | 10 g (2.0× TL) | Jodsalz / Salz, 10 g |
| Gefuelltes-Brathaehnch | 1 Prise(n) Cayennepfeffer | ok, amount missing | Cayennepfeffer | Cayennepfeffer | — | Cayennepfeffer, 0.4 g |
| Gefuelltes-Brathaehnch | einige Stiele Gartenkräuter (Schnittlauch, Petersilie, Bergbohnenkraut) | open, no hit | — | Seitan-Aufschnitt Paprika vegan, Seitan-Aufschnitt Pfeffer vegan, Seitan-Aufschnitt Spicy Beans vegan | — | Frische Kräuter / Kräuter |
| Gefuelltes-Brathaehnch | 1 TL Knoblauchpulver | ok, amount off | Knoblauchpulver | Knoblauchpulver | 5 g (2.5× 1 TL (2g)) | Knoblauchpulver, 2.5 g |
| Tomatensalat-mit-Kalbs | 800 g Tomate(n) gemischte | open, no hit | — |  | — | Tomaten, 800 g |
| Tomatensalat-mit-Kalbs | 2 Knoblauchzehe(n) | open, no hit | — |  | — | Knoblauchzehe / frischer Knoblauch, 10 g |
| Tomatensalat-mit-Kalbs | 4 Stiele Thymian | open, no hit | — |  | — | Thymian / Thymian (frisch) |
| Tomaten-Mozzarella-Tur | 3 EL Sonnenblumenkerne | ok | Sonnenblumenkerne | Sonnenblumenkerne | 45 g (1.5× Sonnenblum Kern Handvoll) | Sonnenblumenkerne, 30 g |
| Tomaten-Mozzarella-Tur | 24 kleine Tomate(n) | ok, amount off | Tomaten | Tomaten | 2880 g (24.0× Stück) | Tomaten / Cocktailtomaten, 960 g |
| Tomaten-Mozzarella-Tur | 375 g Mozzarella | open, no hit | — | Mozzarella Basilikum, Mozzarella Bio, Mozzarella Mini | — | Mozzarella aus Kuhmilch, 375 g |
| Tomaten-Mozzarella-Tur | 1 Topf Basilikum | open, cand. hit | — | frisches Basilikum, Basilikum frisch, Getrockneter Basilikum | — | frisches Basilikum / Basilikum-Blatt, frisch, 30 g |
| Tomaten-Mozzarella-Tur | 4 EL Balsamico weiß | open, no hit | — | Spargel (weiß) | — | Weißer Balsamicoessig, 60 g |
| Tomaten-Mozzarella-Tur | 2 EL Pesto grün | ok | Pesto | Pesto | 30 g (2.0× EL) | Pesto Basilico / Pesto, 30 g |
| Tomaten-Mozzarella-Tur | 2 EL Wasser | ok, amount off | Leitungswasser | Leitungswasser | 2 g (0.01× 200 ml) | Leitungswasser, 30 g |
| Tomaten-Mozzarella-Tur | 4 EL Olivenöl | ok | Natives Olivenöl Extra | Natives Olivenöl Extra | 40 g (4.0× EL) | Olivenöl nativ extra / Natives Olivenöl Extra, 44 g |
| Tomaten-Mozzarella-Tur | Salz und Pfeffer → Salz | WRONG | Salz und Pfeffer | Salz und Pfeffer | 5 g (1.0× Stück) | Jodsalz / Salz, 0.4 g |
| Tomaten-Mozzarella-Tur | Salz und Pfeffer → Pfeffer | not split | — |  | — | gemahlener schwarzer Pfeffer / Pfeffer, Schwarz, 0.4 g |
