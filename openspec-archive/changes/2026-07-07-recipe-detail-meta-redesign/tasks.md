## 1. Action-Buttons (Drucken/Bearbeiten/Löschen)

- [x] 1.1 Material-Symbols-Ligaturen (`print`/`edit`/`delete`) durch `lucide-react`-Icons (`Printer`, `Pencil`, `Trash2`) ersetzen
- [x] 1.2 Buttons als kompakte quadratische Icon-Buttons (`w-9 h-9`) ohne sichtbaren Text umbauen, `title` + `aria-label` beibehalten
- [x] 1.3 Titel-Bereich und Action-Buttons in einer Flex-Row (`justify-between`) rechtsbündig neben dem Titel anordnen

## 2. RecipeMetaCard Basis-Redesign

- [x] 2.1 Card-Padding/Radius vergrößern (`rounded-2xl`, `p-5`), Preis-Typografie auf `text-3xl` erhöhen
- [x] 2.2 Nutri-Score-Badge als rundes Badge (`rounded-full`, fixe Breite/Höhe) statt rechteckigem Chip darstellen
- [x] 2.3 Icon-Container (graue Kreis-/Quadrat-Hintergründe) für jedes Meta-Item im Grid ergänzen

## 3. RecipeMetaCard Erweiterungen

- [x] 3.1 Preis-pro-Portion als kleine Zweitzeile unter dem Gesamtpreis ergänzen (z.B. „0,46 €/Portion")
- [x] 3.2 Tooltip/`title`-Attribut am Nutri-Score-Badge mit Kurzerklärung der Bewertung ergänzen
- [x] 3.3 Visuelle Trennung zwischen Statistik-Feldern (Aufrufe/Likes) und Rezept-Fakten (Kochzeit, Vorbereitung, Schwierigkeit, Altersgruppe) einziehen (z.B. Trennlinie oder Gruppierung im Grid)
- [x] 3.4 „Erstellt am" ans Ende der Liste verschieben und gedimmter darstellen als die übrigen Fakten
- [x] 3.5 Icon-Container-Hintergrundfarbe an Primary-Akzentfarbe anlehnen statt neutralem Grau

## 4. Sticky & Loading State

- [x] 4.1 `RecipeMetaCard`-Container in der Sidebar auf Desktop (`lg:sticky lg:top-20`) sticky positionieren
- [x] 4.2 Skeleton-Loading-State für Preis/Nutri-Score ergänzen, solange `totalPriceEur`/`cached_nutri_class` noch nicht verfügbar sind

## 5. Validierung

- [ ] 5.1 Manuell in Desktop- und Mobile-Breite (`RecipeDetailPage`) prüfen: keine doppelten Icon-Texte, Buttons rechtsbündig neben Titel, Meta-Card korrekt gruppiert
- [x] 5.2 Lint/Typecheck für `frontend-food` ausführen (`npm run lint` / `tsc --noEmit`)
