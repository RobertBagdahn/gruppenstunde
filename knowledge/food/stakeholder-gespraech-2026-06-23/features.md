# Feature-Ideen — Stakeholder-Gespräch 23.06.2026

Alle Features direkt aus dem Transkript extrahiert. Priorisierung: ⭐⭐⭐ hoch / ⭐⭐ mittel / ⭐ niedrig.

---

## FEAT-001: Frühstücks-Wizard (Schritt-Prozess) ⭐⭐⭐

**Fundort:** Chunk 3+4 — "so einen schrittweisen Prozess für Frühstück" / "will ich Brötchen oder will ich Brot?"

**Problem:** Frühstück lässt sich nicht sinnvoll als einzelnes Rezept planen. Es gibt zu viele variable Komponenten und das "Frühstücksproblem" (je mehr Auswahl, desto mehr Reste) erfordert eine eigene Planungslogik.

**Lösung:** 4-stufiger Wizard:
1. **Basis** — Brot / Brötchen / Müsli / Porridge / Overnight Oats (Gramm oder Stück pro Person, Sortenverteilung per Schieberegler)
2. **Belag** — Aufschnitt, Käse, vegane Aufstriche, Süßes (Gesamtmenge + Verteilungsschlüssel; Warnung bei mehr als 2 Sorten pro Kategorie)
3. **Gemüse & Extras** — Tomate, Gurke, Möhre, Obst, Joghurt, Ei (einfache Mengenangabe pro Person; Hinweis: Gemüse nur wenn geschnitten serviert)
4. **Getränke** — Kaffee (+ Milch + Zucker), Kakao (+ Milch), Tee, Saft, Milch pur (Milch wird über alle Verwendungen zusammengerechnet, kein doppelter Eintrag)

**Wichtige Details aus dem Gespräch:**
- Nutella geht immer komplett weg — kein Restrisiko
- Vegane Aufstriche: lieber 2 Sorten als 4
- Gemüse nur wenn geschnitten — ganze Gurke wird nicht angerührt
- Gurken und Tomaten beim Frühstück sind für viele unverzichtbar (explizit erwähnt)
- Frühstück für Tippel / Wandertag: vereinfachte Variante (Knäckebrot, kein Kochen)
- Abreisetag: Resteverwertungsmodus, keine frischen Zutaten

**Details:** Siehe `fruehstuecksplanung.md`

---

## FEAT-002: Rezeptvarianten mit Portionen-Split ⭐⭐⭐

**Fundort:** Chunk 1 — "ich glaube es wäre cool, wenn man ein Rezept hat und quasi angeben kann: vegane Alternative" / "ich brauch das 25 Mal normal und 5 Mal vegan"

**Problem:** Für Gruppen mit gemischten Ernährungsweisen (vegan/nicht-vegan, scharf/mild, mit/ohne Allergene) müssen aktuell zwei separate Rezepte angelegt werden. Änderungen müssen dann doppelt gepflegt werden.

**Lösung:** Ein Rezept kann mehrere benannte **Varianten** haben. Beim Einplanen in den Essensplan wird festgelegt, wie viele Portionen auf welche Variante entfallen.

**Beispiel:**
```
Nudeln mit Tomatensoße — 10 Portionen gesamt

Standard (mit Parmesan)        →  8 Portionen
Vegan (Hefeflocken statt Parm) →  2 Portionen
                                  ──────────
                                    10 ✓
```

**Varianten-Typen:**
- `substitute` — Zutat A durch Zutat B ersetzen (z.B. Quark → Veganer Quark, Weizenmehl → Reismehl)
- `exclude` — Zutat weglassen (z.B. ohne Chili, ohne Käse)
- `add` — Zusätzliche Zutat hinzufügen (z.B. + Sriracha für "Scharf"-Variante)

**Einkaufsliste:**
- Gemeinsame Zutaten → Menge × Gesamtportionen
- Varianten-spezifisch → Menge × Variantenportionen
- Beispiel: Parmesan nur für 8, Hefeflocken nur für 2 Portionen

**Datenmodell (neu):**
- `RecipeVariant` — benannte Variante (Name, Beschreibung, is_default, sort_order)
- `RecipeVariantItem` — Änderungen je Variante (change_type, substitute_portion, substitute_quantity, add_portion, add_quantity)
- `MealItemVariantAllocation` — Portionszuweisung im Essensplan (meal_item, variant, portions)

**Details:** Siehe `rezeptvarianten.md`

---

## FEAT-003: Optionale Zutaten im Rezept ⭐⭐

**Fundort:** Chunk 1 — "Zutaten auch noch als optional zu bauen, und dann während man das in den Essensplan hinzufügt, entscheidet, ob man das haben will oder nicht"

**Problem:** Manche Zutaten sind situationsabhängig optional (z.B. Chili: ja für Rover, nein für Kinder). Aktuell muss dafür ein zweites Rezept angelegt werden.

**Lösung:**
- `RecipeItem` bekommt ein `is_optional`-Boolean-Feld
- Beim Hinzufügen ins Meal: optionale Zutaten werden angezeigt mit Checkbox "Miteinplanen?"
- Optionale Zutaten erscheinen in der Einkaufsliste nur, wenn sie aktiviert wurden
- Unterschied zu Varianten: Optional ist für einzelne Zutaten pro Meal-Instanz; Varianten sind für wiederkehrende, benannte Alternativen

**Beispiele:**
- Chili im Gyros: optional (für Kindergruppen deaktivieren)
- Parmesan auf der Pasta: optional (für Veganer deaktivieren)
- Knoblauch: optional (wenn jemand allergisch)

---

## FEAT-004: Packungsrundung & Restewarnung in der Einkaufsliste ⭐⭐⭐

**Fundort:** Chunk 4 — "der Rewe Lieferservice kann dir keine 0,3 Packungen veganen Brotaufstrich einpacken" / "lieber genau richtig als zu viel"

**Problem:** Die App berechnet theoretisch perfekte Mengen (z.B. 1,3 Gläser Aufstrich), die beim Einkauf nicht umsetzbar sind. Man kauft immer ganze Packungen. Wenn man dann alles aufrundet, hat man bei vielen Artikeln zu viel.

**Lösung:**
- Jede Zutat bekommt ein `package_size`-Feld (Packungsgröße in Gramm, z.B. "1 Glas = 370g")
- Einkaufsliste zeigt: Nettobedarf + aufgerundete Kaufmenge
- Format: `Veganer Aufstrich: 481g benötigt → 2 Gläser à 370g kaufen (+59g Rest)`
- Warnung bei vielen Sorten einer Kategorie: "4 verschiedene Aufstriche → ca. 4 angebrochene Gläser am Ende"
- Smarte Rundungsempfehlung: "Statt 1,4 kg Käse + 3,2 Packungen Salami: lieber 2 Packungen Käse + 4 Packungen Salami kaufen" (Sorten reduzieren)

---

## FEAT-005: AI-Vorschlagsmaßnahmen (klickbare Quick-Fixes) ⭐⭐

**Fundort:** Chunk 3 — "die Idee wäre, man bekommt eine Maßnahme: skaliere Nudeln von 1,0 auf 1,3"

**Problem:** Der Vorschläge-Tab zeigt Probleme (z.B. "Kalorien zu niedrig an Tag 3"), aber gibt keine konkrete Handlungsanweisung. Der Nutzer weiß nicht was er tun soll.

**Lösung:** Jeder rote/gelbe Vorschlag bekommt eine klickbare Maßnahme:
- `[Anwenden]` — direkte Anpassung (z.B. Faktor von 1,0 auf 1,3 erhöhen)
- `[Snack erstellen]` — öffnet Rezeptsuche gefiltert nach Snack/Mahlzeittyp
- `[Alternativen anzeigen]` — zeigt günstigere oder kalorienreichere Rezepte

---

## FEAT-006: Rezept-Skalierung beim Bearbeiten (für N Personen denken) ⭐⭐

**Fundort:** Chunk 1 — "so kalkuliere ich halt immer, für 4 Portionen. Ich hatte das irgendwann mal eingebaut und irgendwie ist das aber wieder verloren gegangen."

**Problem:** Rezeptmengen werden für 1 Normportion gespeichert. Beim Eingeben denkt man aber immer in "für 4 Personen" (reale Kochmengen). Ohne Skalierung muss man alle Mengen selbst durch 4 teilen.

**Lösung:**
- Vor dem Bearbeiten: Schieberegler "Mengen anzeigen für X Personen"
- Alle Mengenfelder zeigen hochgerechnete Werte (z.B. 400g statt 100g)
- Im Hintergrund wird alles auf 1 Normportion gespeichert
- Der Schieberegler ist nur eine View-Transformation, keine Datenänderung

---

## FEAT-007: Essensplan aus anderem Plan kopieren (einzelne Mahlzeiten) ⭐⭐

**Fundort:** Chunk 3 — "wir hatten mal das Pfingstlager, da hatten wir Dienstag ein geiles Mittagessen, den Gulasch — ich will diesen ganzen Eintrag einfach kopieren"

**Problem:** Bewährte Mahlzeiten aus alten Plänen müssen manuell neu zusammengestellt werden.

**Lösung:**
- Beim Hinzufügen einer Mahlzeit: Button "Aus bestehendem Plan kopieren"
- Suche über alle eigenen und geteilten Pläne nach Mahlzeiten
- Einzelne Mahlzeiten (inkl. aller MealItems) in den aktuellen Plan übernehmen

---

## FEAT-008: Referenzmahlzeiten (Vorlage für wiederkehrende Mahlzeiten) ⭐⭐

**Fundort:** Chunk 3 — "so eine Referenzfrühstück erstellen... wenn du das jetzt hier änderst, ändert sich automatisch das Frühstück in allen verknüpften Events"

**Problem:** Standardmahlzeiten (z.B. ein typisches Lagerfrühstück) müssen für jedes Event neu zusammengestellt werden. Änderungen müssen überall manuell nachgezogen werden.

**Lösung:**
- Referenzmahlzeiten sind benannte Mahlzeitstvorlagen (z.B. "Herzhafte Pfadfinder-Frühstück")
- Eine Referenzmahlzeit kann mit beliebig vielen Mahlzeiten in verschiedenen Plänen verknüpft werden (`ref_meal` FK existiert bereits im Modell)
- Änderung an der Referenzmahlzeit → propagiert automatisch an alle verknüpften Mahlzeiten (wenn `is_synced=True`)
- Oder: expliziter "Für alle übernehmen"-Button mit Bestätigungsdialog

---

## FEAT-009: KI-Vorschlag Feedback (Daumen hoch/runter) ⭐

**Fundort:** Chunk 1 — "wie kann man, vielleicht könnte man bei diesen KI-Vorschlägen so einen Daumen nach unten machen und sagen, das ist völliger Unsinn"

**Problem:** Die AI-generierten Verbesserungsvorschläge für Rezepte (z.B. "füge Mandelmus hinzu für mehr Kohlenhydrate") sind manchmal sinnlos. Es gibt keinen Weg, das der AI mitzuteilen.

**Lösung:**
- Daumen-hoch / Daumen-runter pro KI-Vorschlag
- Negatives Feedback → Vorschlag wird nicht mehr für dieses Rezept angezeigt
- Langfristig: Feedback verbessert den AI-Prompt

---

## FEAT-010: Essensplan teilen mit Gruppen und Einzelpersonen ⭐⭐

**Fundort:** Chunk 1 — "du kannst ein Rezept privat machen, in einer Gruppe teilen... alle Leute die in der Sommerfahrt-Lagerleitungsgruppe sind können editieren, alle in der normalen Gruppe können sehen"

**Problem:** Aktuell gibt es keine Möglichkeit, Essenspläne mit bestimmten Personen oder Gruppen zu teilen (weder lesend noch editierend).

**Lösung:**
- Sichtbarkeitsmodell: privat / Gruppe (edit) / Gruppe (read) / öffentlich
- Gruppen selbst anlegen und Personen hinzufügen
- Typischer Use-Case: Lagerleitung kann bearbeiten, alle Teilnehmer können lesen
- Hinweis: Backend-Infrastruktur laut Gespräch bereits vorhanden, Buttons im Frontend fehlen noch

---

## FEAT-011: Empfehlungsalgorithmus — "Ähnliche Rezepte" ⭐

**Fundort:** Chunk 4 — "unten drunter sieht man dann die 10 ähnlichsten Nudeln mit Tomatensoße"

**Problem:** Nutzer finden keine Inspiration für Alternativen zu einem Rezept und wissen nicht, welche ähnlichen Rezepte existieren.

**Lösung:**
- Auf der Rezeptdetailseite: Sektion "Ähnliche Rezepte" (via Vektor-Embedding, existiert bereits für Zutaten)
- Im Essensplan beim Hinzufügen: "Alternativen zu diesem Rezept anzeigen"
- Auf der Datenqualitäts-Seite: ähnliche Rezepte zur Konsolidierung vorschlagen

---

## FEAT-012: Datenqualitäts-Dashboard — Strukturierter Review-Prozess ⭐⭐

**Fundort:** Chunk 4 — "ich würde versuchen, strukturiert durchzugehen und dann versuchen, halb mit AI und halb mit Menschen zu korrigieren"

**Problem:** Die Datenqualitäts-Seite zeigt Probleme (fehlende Preise, Duplikate, falsche Nährwerte), aber es gibt keinen strukturierten Workflow, diese abzuarbeiten.

**Lösung:**
- Review-Queue: Zutaten/Rezepte werden nacheinander zur Überprüfung angezeigt
- AI schlägt Korrekturen vor, Mensch bestätigt oder lehnt ab
- Status-Tracking: "überprüft", "ausstehend", "ignoriert"
- Kategorien: Fehlende Preise / Nährwert-Plausibilität / Duplikate / fehlende Klassifizierung / falsche Packungsgrößen

---

## FEAT-013: Markt-Ankündigung generieren ⭐

**Fundort:** Chunk 3 — "heute abschicken, morgen im Markt anrufen und sagen: ich habe eine große Bestellung abgeschickt, können Sie reinschauen ob genügend Bestände da sind"

**Problem:** Bei Großbestellungen ist es Best Practice, den Markt vorher anzurufen, damit Artikel nachbestellt werden. Das ist mühsam manuell zu formulieren.

**Lösung:**
- Button auf der Einkaufsliste: "Markt-Ankündigung generieren"
- AI generiert formatierten Text für den Marktleiter mit allen Großmengen-Artikeln und Datum
- Als Text kopierbar

---

## FEAT-014: REWE Lieferservice Export ⭐

**Fundort:** Chunk 3+4 — "theoretisch sogar, dass man das dann alles einfügt... ich habe im Hintergrund die REWE-Referenz gespeichert"

**Problem:** Einkaufsliste manuell in die REWE-App übertragen ist aufwändig. Chefkoch hat diese Funktion, aber ohne saubere Artikelreferenzen.

**Lösung (langfristig):**
- Export der Einkaufsliste direkt in REWE Lieferservice
- Vorteil gegenüber Chefkoch: Inspi hat die REWE-Artikelreferenz im Hintergrund gespeichert (der Preis wurde schon mit diesem Artikel berechnet)
- Alternativ-Vorschläge bei nicht verfügbaren Artikeln

---

## FEAT-015: Externe Mahlzeiten mit Kostenpauschale ⭐⭐

**Fundort:** Chunk 3 — "wir essen hier extern, dann kann man quasi das Geld antippen was man blockieren will, z.B. Burger essen: 12 Euro — und der rechnet das aus der Liste raus"

**Problem:** Wenn eine Gruppe extern isst (Restaurant, Burgerladen), soll das trotzdem im Essensplan als "satt" verbucht werden und der Kostenbetrag im Budget erscheinen — ohne Rezeptplanung.

**Lösung:** Bereits teilweise implementiert (`Meal.is_external`, `Meal.external_cost_per_person` existieren im Modell). UI-Umsetzung vervollständigen:
- Mahlzeit als "extern" markieren
- Kostenpauschale pro Person eingeben
- Kalorien-Schätzung optional eingebbar (`Meal.external_energy_kcal`)
- Diese Mahlzeit erscheint im Tagesplan, aber nicht in der Einkaufsliste

---

## FEAT-017: Essensplan Export / Drucken / Teilen ⭐⭐⭐

**Fundort:** Chunk 3 — "das fehlt noch komplett, dass man hier teilen kann und drucken kann und irgendwelche Links verschicken kann"

**Problem:** Fertige Essenspläne können weder gedruckt, noch exportiert, noch als Link geteilt werden.

**Lösung:**
- Druckansicht / PDF-Export (analog zur bereits vorhandenen Rezept-Druckansicht)
- Öffentlicher Link (read-only) zum Teilen mit dem Kochteam
- CSV-Export der Einkaufsliste
- In der Druckansicht: alle Sektionen standardmäßig ausgeklappt (`@media print`)

---

## FEAT-019: Kochplan-Druckversion pro MealPlan ⭐⭐⭐

**Fundort:** Chunk 3 — "ich wollte irgendwo so einen Export-Button einbauen" / "das gleiche stelle ich mir beim Essensplan vor, dass man hier auch drucken kann" / "die Zubereitung, dass man da andere Rezepte chronologisch untereinander hat mit der Zubereitung"

**Problem:** Der fertige Essensplan existiert nur digital in der App. Das Kochteam vor Ort braucht aber eine ausdruckbare, chronologisch aufgebaute Arbeitsunterlage — ohne Laptop, ohne App, ohne Internet.

**Lösung:** Eine dedizierte Druckansicht / PDF-Export für den gesamten MealPlan, aufgebaut als **Schritt-für-Schritt Kochplan**:

### Struktur der Druckversion

**Seite 1 — Übersicht**
- Lagername, Datum, Anzahl Personen (Normportionen × Reservefaktor)
- Tagesübersicht: alle Tage mit Mahlzeiten auf einen Blick (Tabelle)
- Budget-Übersicht (falls gesetzt)

**Pro Tag — eine Sektion**
- Tagesheader: Datum, Wochentag, Gesamtkalorien des Tages
- Pro Mahlzeit (chronologisch nach Uhrzeit):
  - Mahlzeitname + Uhrzeit
  - Alle Rezepte dieser Mahlzeit
  - Pro Rezept:
    - Titel + Mengenangabe skaliert auf echte Personenzahl (nicht Normportion)
    - Zutatenliste mit tatsächlichen Kaufmengen (z.B. "800g Fusilli" statt "80g/Person")
    - Zubereitungsschritte (aus `Recipe.description` / Anleitung)
    - Zubereitungszeit + empfohlene Startzeit (rückwärts von Servierzeit berechnet)
  - Hinweise / Notizen der Mahlzeit (`Meal.note`, wenn `note_is_published=True`)

**Letzte Seite — Einkaufsliste**
- Alle Zutaten aggregiert, gruppiert nach Warengruppe
- Mit Packungsmengen (aufgerundet auf ganze Einheiten)
- Optional: nach Einkaufsdatum aufgeteilt

### Wichtige Details

- **Mengen immer in realen Kochmengen** — nicht in Normportionen, sondern `norm_portions × reserve_factor × quantity_per_portion`
- **Alle Sektionen ausgeklappt** — kein JavaScript-Toggle, reines HTML/CSS für `@media print`
- **Großdruck-freundlich** — min. 12pt Schrift, hoher Kontrast, keine Hintergrundfarben
- **Rezept-Varianten** werden getrennt aufgeführt (z.B. "Nudeln — 8× Standard / 2× Vegan")
- **Externe Mahlzeiten** erscheinen als Platzhalter: "Abendessen extern (Burgerladen) — ca. 12€/Person"

### Umsetzungsweg

- Backend: Endpunkt `GET /api/meal-plans/{id}/print/` liefert vollständig gerenderte HTML-Seite (oder PDF via WeasyPrint / wkhtmltopdf)
- Frontend: Button "Drucken / PDF" öffnet Print-Preview in neuem Tab
- Alternativ einfacher: Frontend rendert eine `/meal-plans/{slug}/print`-Route, die `@media print`-optimiertes CSS nutzt und `window.print()` auslöst
