# Korrekturliste aus `check_recipe_quantities` (Prod, 12.10.2026)

Grundlage: Bericht auf Prod (READ-ONLY), Statistik von 565 Zutaten. Jede Gruppe wird einzeln freigegeben.
Ausführung immer: Snapshot → Trockenlauf in zurückgerollter Transaktion → Echtlauf → Kontrolle → Eintrag im Prod-Runbook.

## Gruppe A – Rezeptmengen (pro Person)

| # | Rezept | Zeile | Ist | Vorschlag | Begründung |
|---|---|---|---|---|---|
| A1 | #327 Rote Linsen-Kokos-Suppe | Gemüsebrühe-Konzentrat | 40 TL = 200 g | **1 TL = 5 g** | 200 g Brühpulver pro Person ist ca. 40-fach zu viel; 1 TL reicht für ca. 250 ml Brühe |
| A2 | #99 Zucchini-Zitronen-Nudeln | Jodsalz (ri539/540) | 30 Prisen = 30 g | **3 Prisen = 3 g** | Nudelwasser-Salz wird größtenteils abgegossen; zweite Salzzeile (5 Prisen) bleibt |
| A3 | #432 Lagerfeuer-Pizza (Entwurf) | Trinkwasser | 60 × „1 Portion“ = 600 g | **7,5 = 75 g** | Teig mit 125 g Mehl braucht ca. 75 ml Wasser |
| A4 | #432 Lagerfeuer-Pizza (Entwurf) | Frische Hefe | 1 Würfel = 42 g | **0,25 Würfel ≈ 10 g** | 1 Würfel reicht für 500 g Mehl; zusätzlich ist Trockenhefe drin |
| A5 | #530 Apfelringe im Teig (Entwurf) | Weizenmehl, Sprudelwasser | 125 g, 75 g | **31 g, 19 g** | Ausbackteig vermutlich nicht durch 4 geteilt (Zucker und Öl sind geteilt); 1 Apfel pro Person bleibt |
| A6 | #412 Omis Schokoladentorte | alle Zeilen | 320 g pro Stück (70 g Butter, 95 g Puderzucker) | **alle Mengen × 0,33** (≈ 105 g pro Stück) | Torte vermutlich durch ca. 4 statt 12 Stücke geteilt – bitte Quelle prüfen |

**Keine Änderung (plausibel, Hinweis bleibt):** #394 Ahornsirup 30 g (Glasur), #387 Wasser 200 g zum Garen der Linsen, #522 Crêpes 133 g Mehl als Hauptgericht.

## Gruppe B – Portionsgewichte

Bestehende Rezeptzeilen rechnen mit „Anzahl × 150 g“. Damit sich keine Rezeptmenge ändert, wird die alte Portion **nicht umgewichtet**, sondern
1. in „Portion (150 g)“ umbenannt und bestätigt (Rang hinter der neuen Portion),
2. wo sinnvoll eine richtige Stück-Portion mit realistischem Gewicht als Standardportion (Rang 1) angelegt.

Bereits plausibel – nur **bestätigen**: Gemüsepaprika rot „Stück“ 150 g, Gelbe Paprikaschote 150 g, festkochende Kartoffeln „1 mittelgroße (150g)“, Hähnchenbrustfilet „Stück“ 150 g, Lachsfilet „Stück“ 150 g.

Neue Standardportion anlegen (alte → „Portion (150 g)“):

| Zutat | Neue Portion |
|---|---|
| Eisbergsalat | – („Kopf“ 550 g existiert schon) |
| Aubergine | Stück 300 g |
| Champignons | Stück 20 g |
| Gemüsezwiebel | Stück 250 g |
| Gewürzgurke, Essiggurken, Gewürzgurken Chili | Stück 40 g |
| Ingwer | Stück (daumengroß) 20 g |
| Karotte, Möhre | Stück 80 g |
| Kirschtomaten | Stück 15 g |
| Kiwi | Stück 75 g |
| Lauch, Porree | Stange 250 g |
| Limette | Stück 70 g |
| Mango | Stück 350 g |
| Rote Zwiebel | Stück 80 g |
| Rotkohl | Kopf 1000 g |
| Schalotten | Stück 25 g |
| Sellerie (Knolle) | Knolle 600 g |
| Frische Himbeeren, Himbeeren (TK) | Schale 125 g |

Nur umbenennen in „Portion (150 g)“ (keine Stück-Ware): Apfelsaft, Traubensaft, Babyspinat, Rucola, Frische Kräuter, Kräuter der Provence, Kaffirlimettenblätter, Getrocknete Tomaten, Schwarze Oliven, Röstzwiebeln, Salatcreme, Fruchtaufstrich Heidelbeere/Sauerkirsche, Kartoffel-Wedges (TK), Hackfleisch, Fettreduziertes Rinderhack, Rinderhackfleisch fettreduziert, Rindfleisch, Hähnchenfleisch.

## Gruppe C – Duplikate und Aliase

**Zusammenführen** (Quelle → Ziel; Ziel ist jeweils die meistgenutzte Zutat):

| Quelle | Ziel |
|---|---|
| Salz (#7541), Speisesalz (#7089) | Jodsalz (#145) |
| Knoblauchzehe (#6847) | frischer Knoblauch (#37) |
| Natives Olivenöl Extra (#7245), Olivenöl extra vergine (#7490) | Olivenöl nativ extra (#166) |
| Tomatenpaste (#7144) | Tomatenmark zweifach konzentriert (#6) |
| Sonnenblumenöl (#168), Pflanzenöl (#7306), Speiseöl (#7539) | raffiniertes Sonnenblumenöl (#6864) |
| Geräuchertes Paprikapulver (#6868) | Edelsüß Paprikapulver geräuchert (#6860) |
| Weizenmehl (#6677) | Weizenmehl Type 405 (#116) |
| Butter (#7563) | Deutsche Markenbutter (#94) |
| Kristallzucker (#7278) | weißer Haushaltszucker (#120) |
| Parmesan (#7615) | Parmigiano Reggiano (#8) |
| Möhre (#42), Speisemöhren (#297) | Karotte (#41) |
| Speisekartoffel festkochend (#7528) | festkochende Kartoffeln (#291) |
| Glatte Petersilie (#7253) | frische Petersilie (#161) |
| Vollkornbrot (#3937) | Vollkornbrot geschnitten (#138) |
| Basilikum frisch (#6909) | frisches Basilikum (#6897) |
| Senf mittelscharf (#4457) | mittelscharfer Senf (#176) |
| Langkornreis (#738) | Langkornreis parboiled (#185) |
| Kakaopulver ungezuckert (#7275) | Backkakao (#124) |
| Blattspinat (#6954) | frischer Blattspinat (#4) |
| Fusilli (#2842), Spiralnudeln (#5199) | Fusilli Nudeln trocken (#186) |
| Schlagsahne 30 % Fett (#95) | Schlagsahne (#5893) |
| Gemüsebrühe, konzentriert oder pulverisiert (#7529) | Gemüsebrühepulver (#7071) |
| Joghurt (#7556) | Naturjoghurt 3,5 % Fett (#98) |
| Geräucherter Tofu (#6853) | Räuchertofu (#111) |
| Kokosfett nativ (#207) | Kokosfett (#6816) |
| Rote Linsen (#1848) | rote Linsen getrocknet (#7162) |
| Muskat (#7179) | Muskatnuss gemahlen (#153) |
| Tahin (#7134), Tahini (#182) | Sesammus (Tahin) (#6850) |
| Zartbitterschokolade 70 % (#505), Dunkle Schokolade (#506) | Zartbitterschokolade (#3497) |
| Frühstücksbacon (#3267) | Frühstücksspeck (#90) |
| gekochter Hinterschinken (#88) | Kochschinken (#89) |
| Gouda jung 48 % F.i.Tr. (#1855) | Gouda jung (#2185) |
| Lachsfilet frisch (#605) | Lachsfilet (#504) |

**Alias entfernen** (verschiedene Produkte, Alias ist falsch oder zu allgemein):

| Alias | entfernen bei | Grund |
|---|---|---|
| Öl | Olivenöl-Zutaten | allgemeines „Öl“ soll neutrales Öl treffen |
| Rapsöl | Speiseöl (vor dem Merge) | Rapsöl ist eigene Zutat |
| Grana Padano | Parmigiano Reggiano | anderer Käse |
| Kakaopulver | Backkakao (nach Merge) | „Kakaopulver“ ist das gesüßte Getränkepulver |
| Nudeln | Fusilli Nudeln trocken | allgemeiner Begriff, eigene Zutat „Nudeln“ |
| Schwäbische Spätzle | Eier-Spätzle getrocknet | anderes Produkt |
| Schwäbische Knöpfle | Frische Eierspätzle | anderes Produkt |
| Frischkäse natur | Frischkäse Doppelrahmstufe | andere Fettstufe |
| Linsen | Berglinse und rote Linsen | zu allgemein |
| Olivenöl | (nach Merges) nur bei Olivenöl (#7598) | raffiniertes Olivenöl bleibt eigene Zutat |

Danach Statistik und Bericht neu erzeugen; Rest-Konflikte als „Kein Duplikat“ markieren.
