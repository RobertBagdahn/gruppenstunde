# Diagnose: Plan „Bundesrat 2026“ (#18, 09.–11.10.2026)

Read-only-Abfrage gegen Prod am 11.10.2026 (Cloud SQL Proxy, Session `READ ONLY`). Plan: 34 Normportionen, Reserve 1,0.

## Betroffene Mahlzeiten

| Mahlzeit | Personen | Eintrag | Faktor |
|---|---|---|---|
| Sa 10.10. Mittag (#212) | 35 | Baguette „Teriyaki-Tofu“ (#529) | 1,0 |
| | 35 | Gegrilltes Gemüse & Hummus auf Baguette (#527) | 1,0 |
| | 35 | Sweet Onion Sauce (#528, `source_servings=4`) | 1,0 |
| Sa 10.10. Abend (#213) | 37 | BBQ Jackfruit Pulled Pork Burger (#523, `source_servings=None`) | 1,5 |

## Zwiebeln (netto, ohne Reserve)

| Rezept | Menge pro Person | Gesamt |
|---|---|---|
| Sweet Onion Sauce | **2 mittelgroße Zwiebeln (160 g)** | 5 600 g ≈ 70 Zwiebeln |
| Baguette Teriyaki | 30 g Speisezwiebel | 1 050 g |
| Pulled Pork Burger | **1 mittelgroße Zwiebel (80 g)** × Faktor 1,5 | 4 440 g ≈ 55 Zwiebeln |
| **Summe** | | **≈ 11 kg** |

## Salat (netto)

| Rezept | Menge pro Person | Gesamt |
|---|---|---|
| Baguette Teriyaki: Eisbergsalat | **0,5 „1 Stück (150 g)“** = 75 g | 2 625 g ≈ 17,5 „Stück“ |
| Hummus-Baguette: Babyspinat | 0,2 „1 Stück (150 g)“ = 30 g | 1 050 g |

## Ursachen

1. **Rezeptdaten, nicht die Hochrechnung.** Die lineare Skalierung rechnet korrekt; die Pro-Person-Mengen sind zu hoch:
   - Sweet Onion Sauce: Alle anderen Zeilen wurden beim Teilen durch 4 Personen geteilt (z. B. 12,5 ml Wasser, 0,63 Butter), die Zwiebel steht aber mit 2,0 Stück pro Person drin – sehr wahrscheinlich nicht geteilt (erwartet ≈ 0,5).
   - Burger: 1 mittelgroße Zwiebel pro Burger, zusätzlich Faktor 1,5; `source_servings` fehlt (Herkunft unklar).
   - Eisbergsalat: 0,5 Stück pro Baguette. Die Portion „1 Stück“ hat nur 150 g (ein Kopf wiegt eher 500–600 g); gemeint waren vermutlich wenige Blätter (≈ 20–30 g).
2. **Zwei Baguette-Varianten mit je Faktor 1,0.** Am Samstagmittag zählt jede Person für beide Baguettes (zusammen 163 g Baguette pro Person plus beide Beläge). Wenn jede Person nur ein Baguette isst, müsste jede Variante Faktor ≈ 0,5 haben (oder als Varianten-Einträge geplant werden).
3. **Fehlende Sichtbarkeit.** Die Mengen pro Rezept und Person sind im Plan nirgends gesammelt sichtbar; die Ausreißer fielen erst in der Einkaufsliste auf. Die Plausibilitätswarnung (> 1500 g bzw. > 50 Stück pro Person) greift hier nicht.

## Folgen für diesen Change

- Die Mengenansicht zeigt genau diese Lage: Zwiebel ≈ 11 kg mit drei Beiträgen und der Menge pro Person je Rezept.
- Die planweite Anpassung hätte Peter erlaubt, „Zwiebel gesamt“ zu reduzieren, ohne die Rezepte anzufassen.

## Getrennt zu erledigen (nicht Teil dieses Changes)

- Rezept #528 Sweet Onion Sauce: Zwiebel auf Pro-Person-Menge korrigieren.
- Rezept #523 Burger: Zwiebelmenge prüfen.
- Rezept #529 Baguette Teriyaki: Eisbergsalat-Menge prüfen; Portion „1 Stück (150 g)“ von Eisbergsalat prüfen.
- Prüfen, ob beim Normalisieren/Import weitere Rezepte einzelne nicht geteilte Zeilen haben (Ausreißer je Zeile gegenüber `source_servings`).
- Hinweis an Peter: Alternativen in einer Mahlzeit mit Faktor < 1 bzw. als Varianten planen.

## Rezeptdaten-Prüfung (Prod, 12.10.2026, nur lesend)

231 Rezepte geprüft.

- **Nicht geteilte Zeilen** (Rezept mit `source_servings > 1`, ganze Stückzahl neben gebrochenen Mengen): #528 Sweet Onion Sauce (Zwiebel 2 Stück, eindeutig falsch, erwartet 0,5) und #530 Apfelringe im Teig (1 Apfel pro Person, plausibel).
- **Zwiebel/Knoblauch/Salat/Kräuter > 60 g pro Person:** 22 Zeilen. Auffällig: #528 (160 g), #340 Caesar Diät Wrap (1 ganzer „Stück“ Eisbergsalat), #523 Burger (1 Zwiebel, 80 g). Gurke 100 g in Salaten/Bowls und Zwiebeln in Suppen sind plausibel.
- **Portion „1 Stück (150g)“ bei Eisbergsalat:** Ein Kopf wiegt ca. 500–600 g. Die Einkaufsliste zeigt dadurch zu viele „Stück“ (Bundesrat: 17,5 statt ca. 5 Köpfe).
- **Doppelte Zwiebel-Zutaten:** „Zwiebel“, „Speisezwiebel“, „Gemüsezwiebel(n)“ werden getrennt aufgeführt und nicht zusammengezählt.

Korrekturen erfordern Roberts Freigabe (Prod-Daten).
