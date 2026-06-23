
## Bugs (direkt beheben)

### BUG-001: Falsche Stück-zu-Gramm-Anzeige bei Rezept-Zutaten

**Beschreibung:** Bei einer Rezeptzutat mit Stückeinheit (z.B. Zwiebel: 1 Stück = 40g) wird die Umrechnung falsch angezeigt. Statt des korrekten Multiplikationszeichens wird ein Gleichheitszeichen (`=`) angezeigt. Außerdem stimmt die berechnete Grammzahl nicht: Bei 0,5 Stück müssten 20g stehen (0,5 × 40g), aber es wird eine falsche Zahl angezeigt.

**Fundort im Gespräch:** Chunk 1 — Zwiebel im Nudel-Rezept, "0,5? Ist das ein Gleichzeichen? Nee, das soll eigentlich multipliziert sein."

**Soll-Verhalten:**
- Anzeige: `0,5 × 40g = 20g`
- Oder klarer: `0,5 Stück (= 20g)`
- Kein `=` als Operator zwischen Stückzahl und Grammzahl

---

### BUG-002: "Salz und Pfeffer" beim AI-Rezept-Import

**Beschreibung:** Beim Import von Rezepten (z.B. von Chefkoch) über die AI werden automatisch "Salz" und "Pfeffer" als Zutaten mit Mengenangaben importiert. Das ist für die Essensplanung wertlos: Salz und Pfeffer sind Grundausstattung, die niemand einzeln kauft. Sie blähen die Einkaufsliste sinnlos auf.

**Fundort im Gespräch:** Chunk 1 — "Salz und Pfeffer, was für ein Scheiß. Weil das in jedem verfickten Drecks Rezept auf Chefkoch so steht."

**Soll-Verhalten:**
- Eine Blacklist für triviale Gewürze/Grundzutaten beim AI-Import einführen
- Mindestens: Salz, Pfeffer, Wasser
- Diese werden entweder komplett gefiltert oder als "Handlager / Grundausstattung" markiert (erscheinen nicht auf der Einkaufsliste)
- Explizite Konfigurierbarkeit: Admin kann die Blacklist erweitern

---

### BUG-003: Kalorien und Kilojoule überlagern sich im UI

**Beschreibung:** Im Cockpit / Dashboard überlagern sich die Anzeigen für kcal und kJ visuell — sie werden an der gleichen Position angezeigt oder liegen zu nah beieinander, sodass der Text nicht lesbar ist.

**Fundort im Gespräch:** Chunk 3 — "ich habe hier vor kurzem glaube ich hier Kalorien und Kilojul übereinandergelegt"

**Soll-Verhalten:**
- Primär: kcal anzeigen
- kJ entweder im Tooltip oder in Klammern dahinter: `2.500 kcal (10.460 kJ)`
- Kein visueller Overlap

---

### BUG-004: Kalorienberechnung ignoriert Teilfaktoren bei unvollständigen Tagen

**Beschreibung:** Der erste Tag eines Lagers ist oft ein Anreisetag (nur Abendessen, kein Frühstück, kein Mittagessen). Die Kalorien-Soll-Berechnung setzt trotzdem den vollen Tagesbedarf an und erzeugt einen falschen "Kalorien-Mangel"-Hinweis für diesen Tag.

**Fundort im Gespräch:** Chunk 3 — "der erste Tag ist ja auch nur ein halber Tag, also das heißt das hat ja hier irgendwie gar nicht so richtig geraf gerade"

**Soll-Verhalten:**
- Das Kalorien-Soll für einen Tag wird aus den tatsächlich geplanten Mahlzeiten und deren `day_part_factor`-Werten berechnet, nicht als fixer Tageswert
- Beispiel: Nur Abendessen → Soll = 30% des Tagesbedarfs (nicht 100%)
- Die `day_part_factor`-Logik existiert bereits im Backend (laut Spec `meal-plan-suggestions`) — sie muss konsistent in der UI-Darstellung genutzt werden

---

### BUG-005: Safari-Login auf dem Handy funktioniert nicht

**Beschreibung:** Die deployed App funktioniert nicht auf Safari auf dem iPhone/iPad. Login schlägt fehl oder ist nicht möglich.

**Fundort im Gespräch:** Chunk 1 — "ich muss gerade noch eine technische Sache machen, damit das auch auf dem Safari Browser am Handy geht, aber dann funktioniert das auch, sonst kann man sich nicht einloggen"

**Kontext:** Wahrscheinlich Cookie/Session-Problem (SameSite, Secure-Flag, CORS) — typisches Problem bei Django Session Auth + Safari's ITP.

---

### BUG-006: Zutatennamen zu generisch — AI legt falsche Namen an

**Beschreibung:** Die AI legt Zutaten mit generischen Namen an (z.B. "Erdbeere", "Nudeln") statt mit spezifischen Namen (z.B. "Erdbeere frisch", "Fusilli trocken"). Das führt zu Duplikaten und schlechten Einkaufslisten, weil dieselbe Zutat in verschiedenen Zustandsformen unterschiedlich geplant wird.

**Fundort im Gespräch:** Chunk 2 — "'Erdbeere frisch' ist schon der bessere Name. Ich bin kein Fan mehr davon wenn man 'Nudeln' hinschreibt, sondern man muss sagen 'Fusilli trocken'."

**Soll-Verhalten:**
- AI-Prompt beim Anlegen von Zutaten anpassen: Zustand/Form immer mitgeben (frisch, getrocknet, tiefgefroren, aus der Dose, etc.)
- Vorschlag im UI: "Meintest du 'Erdbeere frisch' oder 'Erdbeere TK'?"
- Validierung: Zutatenname ohne Zustandsangabe gibt eine Warnung

---

### BUG-007: Ähnlichkeitsanalyse erkennt fälschlicherweise ungleiche Zutaten als Duplikate

**Beschreibung:** Die neue Datenqualitäts-Funktion (Vektorembedding-basierte Duplikatserkennung) schlägt "Schweinebauch" und "Schweinenacken" als Duplikate vor — obwohl das zwei völlig verschiedene Fleischstücke sind. Die Ähnlichkeitsschwelle ist zu niedrig eingestellt.

**Fundort im Gespräch:** Chunk 4 — "Schweinebauch und Schweinenacken. Das ist nicht das Gleiche, oder? Nein, das ist das eine ist Nacken, das ist auch."

**Soll-Verhalten:**
- Höhere Ähnlichkeitsschwelle für automatische Zusammenführungs-Vorschläge
- Klare Unterscheidung zwischen "gleiche Zutat, anderer Name" (z.B. "Zwiebeln rot" = "Rote Zwiebeln") und "ähnliche Kategorie, aber verschiedene Zutat" (z.B. Schweinebauch ≠ Schweinenacken)
- Vorschläge vor dem Zusammenführen manuell bestätigen lassen — kein Auto-Merge

---

### BUG-008: Unfertig — Ähnliche Zutat-Analyse hat API-Fehler

**Beschreibung:** Die Datenqualitäts-Seite (Ähnliche Zutaten / Duplikaterkennung) wirft beim Laden API-Fehler. Die Funktion ist noch nicht stabil genug für den Produktiveinsatz.

**Fundort im Gespräch:** Chunk 4 — "API-Fehlers. Aber genau die Idee ist dann halt..."

**Soll-Verhalten:**
- API-Fehler beheben
- Fehlerstate im UI zeigen, wenn der Endpunkt nicht antwortet (kein leerer weißer Screen)

---

### BUG-009: Unfertig — "Ähnliche Rezepte"-Funktion noch nicht implementiert

**Beschreibung:** Die Ähnlichkeitsanalyse existiert für Zutaten, soll aber auch für Rezepte gelten. Die Funktion ist im Gespräch als geplant erwähnt, aber noch nicht umgesetzt.

**Fundort im Gespräch:** Chunk 4 — "das gleiche kannst du auch Rezepte eben machen. Ähnliche Zutaten, um einfach dauerhaft diese die Datenqualität hochzuhalten."

**Soll-Verhalten:**
- Ähnliche-Rezepte-Analyse auf der Datenqualitäts-Seite ergänzen
- Erkennt semantisch ähnliche Rezepte (z.B. "Nudeln mit Tomatensoße" ≈ "Pasta Bolognese") und schlägt Konsolidierung vor

---

### BUG-010: "Rezept hinzufügen"-Suche zeigt vegan/vegetarisch-Filter nicht an

**Beschreibung:** In der Mahlzeiten-Suche (wenn man ein Rezept zu einem Essensplan hinzufügt) fehlt ein Filter für vegan/vegetarisch. Der Entwickler hat das selbst im Gespräch als fehlend angemerkt.

**Fundort im Gespräch:** Chunk 3 — "hier sollte eigentlich auch noch mit vegan vegetarisch sein"

**Soll-Verhalten:**
- Vegan/Vegetarisch-Filter in der Rezeptsuche beim Hinzufügen zu einer Mahlzeit ergänzen
- Filter sollte mit dem `nutritional_tags` Feld arbeiten, das bereits auf `MealPlan` und `Recipe` existiert

---

### BUG-011: Unfertig — Referenzmahlzeit-Sync funktioniert nicht korrekt

**Beschreibung:** Die Funktion "Referenzmahlzeit" (eine Vorlage-Mahlzeit, die mit allen gleichartigen Mahlzeiten im Plan verknüpft ist und bei Änderung alle automatisch aktualisiert) funktioniert noch nicht zuverlässig.

**Fundort im Gespräch:** Chunk 3 — "Aber so gut hat das noch nicht funktioniert, das möchte ich nochmal überprüfen."

**Soll-Verhalten:**
- Änderung an einer Referenzmahlzeit propagiert automatisch an alle verknüpften Mahlzeiten (wenn `is_synced=True`)
- Alternativ: expliziter "Für alle übernehmen"-Button mit Bestätigungsdialog

---

### BUG-012: Unfertig — Portionen-Drag-and-Drop in Einkaufsliste funktioniert nicht

**Beschreibung:** In der Zutatenliste kann man die Standardportion (Rank 1) per Drag-and-Drop nach oben schieben — das funktioniert laut Gespräch aktuell nicht korrekt.

**Fundort im Gespräch:** Chunk 3 — "zumindest theoretisch kann man das verschieben glaube ich ist gerade irgendwie ein Bug, sondern dass hier auf jeden Fall dann irgendwie nach oben schieben können und der Rank 1 ist dann immer der der angezeigt wird"

**Soll-Verhalten:**
- Drag-and-Drop für `Portion.rank` funktioniert
- `rank=1` wird immer als Standardportion in der Einkaufsliste verwendet
- Beispiel: Bei Mehl ist "1 kg" sinnvoller als "1 Tasse" als Standardeinheit

---

### BUG-013: Einkaufsliste zeigt keine Stückzahl-Äquivalente für Brot/Backwaren

**Beschreibung:** In der Einkaufsliste wird z.B. "Vollkornbrot: 1,3 kg" angezeigt, aber keine Umrechnung in Scheiben ("ca. 26 Scheiben"). Der Entwickler hat das als gewünschtes Feature beschrieben, das noch fehlt.

**Fundort im Gespräch:** Chunk 3 — "sollen auch hier quasi Stückzahlen angezeigt werden, also wie viel Scheibenbrot das wären damit man weiß okay ich will 1,3 Kilo"

**Soll-Verhalten:**
- Wenn eine Zutat eine Stück-Portion hat (z.B. "1 Scheibe = 50g"), die Gramm-Angabe in der Einkaufsliste automatisch in Stück umrechnen und anzeigen
- Format: `Vollkornbrot: 1.300g (≈ 26 Scheiben)`

---

### BUG-014: Nährwert-Ampel — Zu-viel-Ballaststoffe-Regel fehlt / verhält sich falsch

**Beschreibung:** Die Ampel-Regel für Ballaststoffe ("mehr ist besser") ist korrekt, aber das System zeigt auch "zu viele Ballaststoffe" als Problem an, obwohl das kein sinnvolles Ernährungsziel für ein Pfadfinderlager ist.

**Fundort im Gespräch:** Chunk 3 — "zu viele Ballaststoffe ich habe mal Schmerzen, das nicht gewünscht"

**Soll-Verhalten:**
- Für Ballaststoffe: nur Minimum-Regel (min_yellow / min_green), kein Maximum
- Für Zucker: nur Maximum-Regel (max_green / max_yellow), kein Minimum
- Für Protein: nur Minimum-Regel, kein Maximum
- Die Seed-Regeln (`seed_rules` Management Command) müssen diese Richtungen korrekt abbilden

---

### BUG-015: Unfertig — Essensplan Export / Drucken fehlt komplett

**Beschreibung:** Es gibt keine Möglichkeit, den Essensplan zu exportieren, zu drucken oder als Link zu teilen. Der Entwickler hat das selbst als fehlend benannt.

**Fundort im Gespräch:** Chunk 3 — "das fehlt noch komplett dass man hier teilen kann und dass man hier drucken kann und so weiter, und irgendwelche Links verschicken kann"

**Soll-Verhalten:**
- Druckansicht / PDF-Export für den Essensplan (analog zur Druckansicht bei Rezepten, die bereits existiert)
- Teilbarer Link (public URL) für den Essensplan
- Exportformat: mindestens PDF, optional CSV für die Einkaufsliste

---

### BUG-016: Unfertig — Zubereitungsschritte / Kochplan fehlt im Essensplan

**Beschreibung:** Der Stakeholder fragt nach einer chronologischen Zubereitungsübersicht: Welche Rezepte müssen wann vorbereitet werden? Diese Funktion existiert noch nicht.

**Fundort im Gespräch:** Chunk 3 — "die die Zubereitung den Zubereitungsstab, dass man da andere Rezepte chronologisch untereinander hat mit der Zubereitung"

**Soll-Verhalten:**
- Eine Ansicht / Export, der alle Rezepte eines Tages chronologisch nach Zubereitungszeit sortiert
- Zeigt: Rezeptname, Zubereitungszeit, Startzeit (rückwärts von Servierzeit berechnet)
- Hilft dem Kochteam, den Küchenablauf zu planen

---

### BUG-017: Hallal/Allergie-Filter schlägt keine Verstöße vor, obwohl Rezepte nicht konform sind

**Beschreibung:** Wenn ein MealPlan als "Halal" markiert wird, sollte das System Warnungen für nicht-Halal-Rezepte anzeigen. Laut Gespräch zeigt die App "keine Verstöße" an, obwohl die eingeplanten Rezepte sehr wahrscheinlich nicht Halal-konform sind.

**Fundort im Gespräch:** Chunk 3 — "dann müsste der quasi hier irgendwo an die Allergie-Sachen, moment keine Verstöße, ja ganz bestimmt nicht"

**Soll-Verhalten:**
- Wenn `MealPlan.nutritional_tags` z.B. "Halal" enthält, alle `MealItem.recipe`-Zutaten gegen dieses Tag prüfen
- Zutaten ohne das entsprechende Tag → Warnung im Vorschläge-Tab
- Das `nutritional_tags` Feld existiert bereits auf beiden Modellen — die Prüflogik im Suggestion Service fehlt noch

---

### BUG-018: Preisangabe-Bezug unklar — pro 100g oder pro kg?

**Beschreibung:** Beim Anlegen einer Zutat ist unklar, ob der eingegebene Preis "pro 100g" oder "pro kg" gilt. Der Stakeholder fragt explizit danach.

**Fundort im Gespräch:** Chunk 2 — "Preis, was bezieht der Preis? Preis pro 100 Gramm oder Preis pro Kilo?"

**Soll-Verhalten:**
- Eindeutiges Label direkt neben dem Preisfeld: "Preis pro kg" oder "Preis pro 100g"
- Alternativ: Einheit auswählbar machen (Dropdown: pro 100g / pro kg / pro Stück)
- Das bestehende Feld `price_per_kg` im Backend legt nahe, dass es pro kg ist — das muss im UI klar kommuniziert werden

---

### BUG-019: Mahlzeit-Suche — Filter fehlen (vegan, vegetarisch, Diät)

**Beschreibung:** In der Rezeptsuche beim Hinzufügen zu einer Mahlzeit fehlen Filteroptionen für vegan, vegetarisch und Diät/Unverträglichkeiten. Der Entwickler bestätigt das selbst und merkt an, dass der bestehende "Diät"-Filter unfertig ist.

**Fundort im Gespräch:** Chunk 2 — "hier sollte eigentlich auch noch mit vegan vegetarisch sein" / "theoretisch kannst du auch hier noch den Diät, ich hab das jetzt einfach mal Diät genannt"

**Soll-Verhalten:**
- Filter: vegan / vegetarisch / laktosefrei / glutenfrei — basierend auf `nutritional_tags`
- Filter für Rezepttyp (Frühstück / warme Mahlzeit / kalte Mahlzeit / Snack / Getränk)
- "Diät"-Filter umbenennen zu "Ernährungsweise" oder "Eigenschaften"

---

### BUG-020: Essensplan-Liste — Trennung "meine Pläne / geteilte / Referenz" fehlt noch

**Beschreibung:** Die Übersichtsseite der Essenspläne zeigt nur nach Datum sortierte Pläne. Die geplante Dreiteilung in "Meine Pläne", "Geteilte Pläne" und "Referenz-Pläne" (vom Tool verifizierte Vorlagen) ist noch nicht umgesetzt.

**Fundort im Gespräch:** Chunk 2 — "das baue ich jetzt noch mal neu, dass man meine Pläne sieht, die mir geteilten Pläne und Referenz-Pläne"

**Soll-Verhalten:**
- Drei Tabs oder Sektionen: "Meine Pläne" / "Geteilt mit mir" / "Referenz-Vorlagen"
- Referenz-Pläne sind vom System verifiziert, können kopiert oder als Vorlage genutzt werden
- Einzelne Mahlzeiten aus Referenz-Plänen in eigene Pläne übernehmen

---

### BUG-021: Nährwert-Vergleich auf Rezeptdetailseite — Skalierung skaliert nicht mit

**Beschreibung:** Auf der Rezeptdetailseite kann man die Portionszahl ändern (z.B. "für 4 Personen"). Die Nährwert-Einordnungsbalken (Vergleich mit ähnlichen Rezepten) skalieren dabei nicht mit — sie zeigen weiterhin die Werte für 1 Person.

**Fundort im Gespräch:** Chunk 1 — "wobei das hier unten skaliert noch nicht mit, also das hier vorne schon. Und das hier hinten sollte ja eh pro 100 Gramm sein, das sollte auch pro 100 Gramm sein und das hier sollte auf jeden Fall mit skalieren. Das muss ich noch einbauen."

**Soll-Verhalten:**
- Alle Nährwert-Anzeigen, die sich auf die Gesamtportion beziehen, skalieren wenn die Personenzahl geändert wird
- Einordnungsbalken ("teuer / günstig", "viel Protein / wenig Protein") immer pro 100g berechnen — unabhängig von der Skalierung

---

### BUG-022: Rezept-URL-Import wirft Fehler auf Production

**Beschreibung:** Der URL-Import für Rezepte (z.B. von Chefkoch) funktioniert auf der deployed Production-Umgebung nicht und wirft einen Fehler. Lokal war es zuletzt funktionsfähig. Der Entwickler deutet an, dass er gerade an dem Feature arbeitet.

**Fundort im Gespräch:** Chunk 1 — "Und jetzt haben wir einen Fehler, sehr gut. Dann müssen wir das leider einmal lokal starten. Ich weiß nicht, ich habe glaube ich gerade hier so ein paar... ich arbeite hier gerade an so einem URL-Ding."

**Soll-Verhalten:**
- URL-Import auf Production stabil
- Fehler-State im UI klar kommunizieren: "Import fehlgeschlagen — bitte URL prüfen oder manuell anlegen"

---

### BUG-023: Rezeptsuche — Synonyme blockieren nicht die Auswahl des Oberbegriffs

**Beschreibung:** Das Synonymsystem (z.B. "Nudeln" → "Fusilli") soll verhindern, dass jemand den generischen Begriff "Nudeln" als Zutat auswählt. Aktuell findet die Suche die Zutat über das Synonym, aber verhindert die Auswahl des generischen Namens nicht — man kann immer noch "Nudeln" direkt auswählen.

**Fundort im Gespräch:** Chunk 2 — "damit möchte ich quasi verhindern, wenn dann jemand nach Nudeln sucht, dann darf er nicht mehr Nudeln auswählen, sondern muss Fusilli"

**Soll-Verhalten:**
- Zutaten ohne Zustandsangabe (generische Namen) werden in der Suchauswahl deprioritisiert oder ausgeblendet
- Wenn Synonym-Match gefunden: direkt auf die spezifische Zutat weiterleiten
- Oder: generische Zutaten mit einem "⚠ zu unspezifisch"-Badge markieren

---

### BUG-024: AI-Rezeptvorschlag findet Zutat doppelt (Zwiebel / Zwiebeln)

**Beschreibung:** Beim automatischen Zutaten-Vorschlag (AI schlägt weitere Zutaten für ein Rezept vor) erscheint "Zwiebeln" obwohl die Zutat bereits im Rezept ist. Das Matching zwischen "Zwiebel" und "Zwiebeln" (Singular/Plural) schlägt fehl.

**Fundort im Gespräch:** Chunk 1 — "das hier dürfte halt nicht sein, der dürfte halt nicht Zwiebeln finden. Wobei, ah, Zwiebeln und Zwiebel. Das ist ganz oft eine Katastrophe."

**Soll-Verhalten:**
- Bereits im Rezept enthaltene Zutaten werden aus den AI-Vorschlägen ausgeschlossen
- Singular/Plural-Normalisierung beim Matching (Zutat "Zwiebel" = "Zwiebeln")

---

### BUG-025: Nährwertvergleich-Balken bei Zutaten außerhalb des Wertebereichs bricht

**Beschreibung:** Wenn eine Zutat weit außerhalb des normalen Wertebereichs liegt (z.B. ein Getränk mit 500g statt üblicher 280–360g Portion), wird der Einordnungsbalken nicht korrekt angezeigt — er zeigt "0 Euro" als teuerstes Getränk an, obwohl das Getränk selbst das teuerste ist.

**Fundort im Gespräch:** Chunk 1 — "das teuerste ist 0 Euro, also das ist jetzt genau das teuerste Getränk halt"

**Soll-Verhalten:**
- Wenn die aktuelle Zutat außerhalb des angezeigten Bereichs liegt, den Balken entsprechend erweitern und die eigene Position klar markieren
- Kein "0 Euro" als Maximalwert anzeigen

---

### BUG-026: Nährwertplausiblitätsprüfung meldet falsche Werte — Apfelzimt-Porridge mit 1.400 kcal/100g

**Beschreibung:** Die Datenqualitäts-Seite (Nährwert-Plausibilitätsprüfung) findet Zutaten mit offensichtlich falschen Nährwerten, z.B. "Apfelzimt-Porridge: 1.400 kcal / 100g". Das zeigt, dass importierte Zutaten keine automatische Plausibilitätsprüfung beim Import durchlaufen.

**Fundort im Gespräch:** Chunk 4 — "das Apfel-Zimt-Porridge hat irgendwie 1.400 Kalorien pro 100 Gramm"

**Soll-Verhalten:**
- Beim Import (AI oder URL) automatische Plausibilitätsprüfung: kcal/100g zwischen 0 und 900 (Fett-Maximum)
- Zutaten außerhalb dieses Bereichs werden als "unplausibel" markiert und erscheinen prominent in der Datenqualitäts-Ansicht
- Kein Import ohne Warnung bei Werten > 900 kcal/100g

---

### BUG-027: Unfertig — Ähnliche Rezepte zusammenlegen funktioniert noch nicht

**Beschreibung:** Auf der Datenqualitäts-Seite sollen ähnliche Rezepte (z.B. "Lagerfeuer-Pfannenpizza" und "Knusprige Lagerfeuer-Pilz-Pizza") zusammengelegt werden können. Die Funktion ist geplant, aber der Zusammenlegen-Button fehlt noch.

**Fundort im Gespräch:** Chunk 4 — "Hier kann man halt jetzt quasi auch zusammenlegen. Geht noch nicht, aber das ist die Idee."

**Soll-Verhalten:**
- Zusammenlegen-Button in der Ähnliche-Rezepte-Ansicht
- Bestätigungsdialog: Welches Rezept wird das "Hauptrezept", welches wird gelöscht/als Alias markiert?

---

### BUG-028: Unfertig — Rezeptbearbeitung für mehrere Personen zeigt falsche Mengen

**Beschreibung:** Es gab mal eine Funktion, bei der man vor dem Bearbeiten eines Rezepts die Personenzahl einstellen konnte (z.B. "für 4 Personen"), sodass man in vertrauten Mengen denken kann. Diese Funktion wurde eingebaut, ist aber irgendwann wieder verloren gegangen.

**Fundort im Gespräch:** Chunk 1 — "Ich hatte das irgendwann mal eingebaut und irgendwie ist das aber wieder verloren gegangen, offensichtlich. Ich hatte das sogar schon mal getestet."

**Soll-Verhalten:**
- Vor dem Bearbeiten eines Rezepts: Personenzahl wählbar (z.B. 4 Personen)
- Alle Mengenfelder zeigen die hochgerechneten Werte (z.B. 400g statt 100g für 4 Personen)
- Im Hintergrund wird alles auf 1 Normportion gespeichert

---

### BUG-029: Einkaufsliste — Reserve-Anteil nicht sichtbar, aber Stakeholder will Transparenz

**Beschreibung:** Die Einkaufsliste zeigt die Gesamtmenge inklusive Reserve, macht aber nicht transparent, wie viel davon Reserve ist. Der Stakeholder möchte das explizit sehen (z.B. "1,3 kg — davon 0,1 kg Reserve").

**Fundort im Gespräch:** Chunk 3 — "ich hätte mal überlegt, ob das Sinn macht, dass man hier stehen hat, 1,3 Kilo, davon kommen so und so viel aus der Reserve"

**Soll-Verhalten:**
- Optional einblendbar: Aufschlüsselung "Nettomenge + Reserve" in der Einkaufsliste
- Kompakte Variante: `1.300g (inkl. 10% Reserve)`
- Kann über Einstellungen ein-/ausgeblendet werden

---


### BUG-031: Druckansicht Rezept — Anleitung standardmäßig eingeklappt

**Beschreibung:** In der Druckansicht eines Rezepts ist die Zubereitungsanleitung standardmäßig eingeklappt. Das ergibt für eine Druckansicht keinen Sinn — beim Drucken soll alles sichtbar sein.

**Fundort im Gespräch:** Chunk 3 — "vor allem ist die Anleitung nicht ausgeklappt, ist natürlich noch besser"

**Soll-Verhalten:**
- In der Druckansicht alle Sektionen standardmäßig ausgeklappt (Zutaten, Zubereitung, Nährwerte)
- `@media print` CSS: alle `<details>` oder Accordion-Elemente automatisch öffnen
