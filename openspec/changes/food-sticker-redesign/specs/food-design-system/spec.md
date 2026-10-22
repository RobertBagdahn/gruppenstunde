# Spec Delta

## REMOVED Requirements

### Requirement: Grün-basierte Leitfarbe im Light Mode
**Reason**: Die Leitfarbe ist jetzt Petrol; die Bereichsfarben (`--area-*`) und das dunkle Kopfband entfallen. Der alte Text beschreibt außerdem einen Stand (`#15803D`, `#FCFBF8`), der im Code längst nicht mehr gilt.
**Migration**: Siehe die neue Requirement „Petrol-basierte Leitfarbe im Light Mode“ und die Requirements „Weißer Seitengrund“ und „Kategorie-Tönungen nur für Rezepttypen“.

## MODIFIED Requirements

### Requirement: Zentrales Design-Token-System
Das Food Frontend SHALL alle Farben, Schatten, Radien, Schriftgrößen und Schrift-Familien ausschließlich über zentrale Design-Token in `frontend-food/src/index.css` (CSS-Variablen) und `frontend-food/tailwind.config.ts` definieren. Vier semantische Status-Token MUST je als Tripel existieren: `--success`, `--warning`, `--danger`, `--info` jeweils mit `-soft` (Fläche), `-border` (Rand) und `-foreground` (Text auf der Vollfarbe). Sieben Kategorie-Token MUST je als Paar existieren: `--category-breakfast`, `--category-warm`, `--category-cold`, `--category-dessert`, `--category-snack`, `--category-recipe-part`, `--category-drink` mit `-soft` (Tönung) und `-foreground` (Text auf der Tönung). Komponenten MUST diese Token über Tailwind-Utilities referenzieren (z. B. `bg-card`, `text-foreground`, `bg-warning-soft`, `text-warning`, `bg-category-warm-soft`) und SHALL NOT Tailwind-Palettenfarben (z. B. `emerald-500`, `amber-50`, `gray-100`) oder freie Farbwerte verwenden. `--chart-*` SHALL ausschließlich in Diagrammen verwendet werden. Die Nutri-Score-Token `--nutri-a` bis `--nutri-e` bleiben als Fachfarben bestehen und SHALL ausschließlich von `NutriScoreBadge` verwendet werden. Die früheren Token `--hero*` und `--area-*` entfallen. Ein Dark Mode ist nicht Teil dieser Capability.

#### Scenario: Komponente nutzt semantische Token
- **WHEN** eine Komponente eine Flächen-, Text- oder Border-Farbe setzt
- **THEN** verwendet sie eine Token-basierte Utility statt einer Tailwind-Palettenfarbe

#### Scenario: Status-Komponente nutzt semantische Token
- **WHEN** eine Komponente einen Status (Erfolg/Warnung/Fehler/Info) farblich darstellt
- **THEN** verwendet sie `success`, `warning`, `danger` oder `info` (inkl. `-soft`/`-border`) statt `chart-*`, Kategorie-Token oder Palettenfarben

#### Scenario: Kategorie-Tönung nutzt Kategorie-Token
- **WHEN** ein Rezepttyp farblich dargestellt wird (Karte, Chip, Plan-Mahlzeit)
- **THEN** verwendet die Komponente das zugehörige `category-*`-Token und keine Statusfarbe

#### Scenario: Nutri-Score nutzt zentrale Quelle
- **WHEN** eine Komponente einen Nutri-Score anzeigt
- **THEN** rendert sie `NutriScoreBadge` und verwendet weder `NUTRI_SCORE_COLORS` noch `nutri-*`-Klassen direkt

#### Scenario: Keine hartcodierten Status-Farben im Codebase
- **WHEN** `npm run lint` läuft
- **THEN** meldet ESLint jede Tailwind-Palettenfarbe und jede Tailwind-Standard-Schriftgröße in `className` als Fehler

#### Scenario: Keine entfernten Token
- **WHEN** im Quellcode nach `bg-hero`, `text-hero-`, `area-` oder `--hero` gesucht wird
- **THEN** gibt es keinen Treffer

#### Scenario: Theme-Änderung an einer Stelle
- **WHEN** ein Token-Wert (z. B. `--primary`) in `index.css` geändert wird
- **THEN** ändert sich die Farbe konsistent über das gesamte Food Frontend ohne weitere Komponenten-Anpassungen

### Requirement: Lesbares Kontrast- und Border-System
Das Design-System SHALL verbindliche Kontrast-Token definieren, sodass angrenzende Flächen klar voneinander abgegrenzt sind. Karten MUST sich durch den Kartenschatten (`shadow-card`) und optional eine sehr helle Linie (`--line`) vom weißen Grund abheben; verschachtelte umrandete Boxen (Box in Box) SHALL NOT verwendet werden, Untergliederung innerhalb einer Karte erfolgt über Abstand oder Trennlinien. Jede Text-/Hintergrund-Kombination der Token MUST WCAG AA erfüllen (≥ 4,5:1 für normalen Text, ≥ 3:1 für Text ab 18 px bzw. 14 px fett und für Rahmen und Symbole von Bedienelementen). Es gibt genau zwei Textgraus (`--foreground`, `--muted-foreground`), einen Ton für Feldränder, Checkbox-Rahmen und Symbole (`--input` ≈ `#858C87`, mindestens 3:1 gegen Weiß, nie für Text) und eine dekorative Trennlinie (`--line`). Statusfarben (`--warning`, `--danger`, `--success`, `--info`) SHALL NOT als Fläche normaler Aktions-Buttons verwendet werden; nur destruktive Aktionen dürfen `--danger` als Button-Fläche nutzen.

#### Scenario: Karte auf Hintergrund
- **WHEN** eine Card auf dem weißen Seitengrund liegt
- **THEN** ist die Card durch Schatten und/oder sehr helle Linie klar abgegrenzt

#### Scenario: Trennlinien in Listen
- **WHEN** Datenzeilen oder Sektionen durch Linien getrennt werden
- **THEN** verwenden sie `--line` und sind sichtbar, aber ruhig

#### Scenario: Kochen starten
- **WHEN** die Rezeptseite den Button „Kochen starten“ zeigt
- **THEN** verwendet er `--primary-soft` oder `--primary` und nicht `--warning`

#### Scenario: Kontrast-Test
- **WHEN** der automatisierte Kontrast-Test (Vitest über alle Token-Paare aus `index.css`) läuft
- **THEN** erreichen alle Text-/Flächen-Paare ≥ 4,5:1 und alle Rahmen und Symbole ≥ 3:1

### Requirement: Moderne Typografie mit Display- und Body-Schrift
Das Design-System SHALL Bricolage Grotesque als Display-Schrift (Überschriften, Kennzahlen, Gewichte 600–800) und Figtree als Body-Schrift definieren. Beide Schriften MUST vom eigenen Server ausgeliefert werden (selbst gehostet als WOFF2, variable Schnitte, `font-display: swap`, Hauptschrift per `preload`) und als Tailwind-`fontFamily`-Token (`sans`, `display`) bereitgestellt werden. Das Food Frontend SHALL NOT Schriften von Fremdservern (z. B. `fonts.googleapis.com`, `fonts.gstatic.com`) laden. Überschriften (`h1`–`h6`) MUST die Display-Schrift verwenden; Ziffern MUST tabellarisch gesetzt sein.

#### Scenario: Überschrift verwendet Display-Schrift
- **WHEN** ein `h1`–`h3` gerendert wird
- **THEN** verwendet es Bricolage Grotesque

#### Scenario: Fließtext verwendet Body-Schrift
- **WHEN** Fließtext in einer Card oder Liste gerendert wird
- **THEN** verwendet er Figtree

#### Scenario: Keine Fremdserver-Anfrage für Schriften
- **WHEN** eine beliebige Seite geladen wird
- **THEN** geht keine Netzwerk-Anfrage an `fonts.googleapis.com` oder `fonts.gstatic.com`

#### Scenario: Schrift lädt ohne Textsprung
- **WHEN** die Seite zum ersten Mal geladen wird
- **THEN** ist Text sofort in einer Ersatzschrift lesbar und wechselt nach dem Laden ohne sichtbare Layoutverschiebung

### Requirement: Reduziertes Gradient- und Schatten-Set
Das Design-System SHALL ein kleines Set an Schatten definieren: `shadow-card` (Karten, einziger Standard-Schatten), `shadow-soft` (gewählte Segmente und kleine Schwebeflächen) und `shadow-raised` (Dialoge, Menüs, Sheets). Verläufe SHALL NOT verwendet werden; sämtliche `gradient-*`-Utilities entfallen. Verspielte Hintergrund- und Bewegungs-Effekte (Rainbow-/Confetti-Hintergründe, dauerhafte Float-/Wiggle-/Pulse-Animationen) SHALL NOT vorkommen. Wiederholte Bewegung (Schleifen) ist nur in Ladeanzeigen erlaubt: Skelett-Schimmer, Ladebalken und Startbildschirm. Sticker, Karten, Icons und Schaltflächen MUST sich nie in einer Schleife bewegen. Bestehende Print-Styles MUST funktionsfähig bleiben.

#### Scenario: Aufgeräumter Flächen-Look
- **WHEN** eine Standard-Inhaltsseite gerendert wird
- **THEN** verwendet sie weiße und helle Token-Flächen ohne Verlauf und ohne dunkle Banner

#### Scenario: Entfernte Gradient-Klassen
- **WHEN** im Code nach `gradient-` gesucht wird
- **THEN** gibt es keinen Treffer

#### Scenario: Wiederholte Bewegung nur beim Laden
- **WHEN** eine Seite mit Sticker, Karten oder Schaltflächen ruht
- **THEN** bewegt sich nichts in einer Schleife; nur Skelett, Ladebalken oder Startbildschirm dürfen sich wiederholt bewegen, und bei „Bewegung reduzieren“ auch diese nicht

#### Scenario: Print bleibt funktionsfähig
- **WHEN** eine druckbare Seite (z. B. Einkaufsliste, Rezept) gedruckt wird
- **THEN** funktionieren die bestehenden Print-Styles weiterhin korrekt und drucken ohne Navigation, Sticker und Schatten

### Requirement: Lebende Styleguide-Page
Das Food Frontend SHALL eine Route `/styleguide` bereitstellen, die als lebendes Showcase alle Design-Token (Farben mit Verwendungszweck und Kontrastwert), die Schrift-Skala, Radien, Abstände, Schatten, Kern-Komponenten (Buttons, Chips und Segmente, Eingaben, Nutri-Score-Badge, Hinweise, Karten, Listenzeilen), das Card-Tabellen-Pattern, die Icon-Regel, die Formatregeln (Preis, Budget, Datum, Mengen) sowie Lade-, Leer-, Fehler-Beispiele darstellt. Die Seite MUST ihre Werte aus den Token und Komponenten beziehen, nicht aus Kopien.

#### Scenario: Styleguide aufrufen
- **WHEN** ein Nutzer `/styleguide` öffnet
- **THEN** sieht er Sektionen für Farben/Token, Schrift, Radien/Abstände/Schatten, Komponenten, Icon-Regel, Formate und Zustände

#### Scenario: Styleguide spiegelt aktuelle Token
- **WHEN** ein Design-Token geändert wurde
- **THEN** zeigt die Styleguide-Page den aktualisierten Wert ohne separate Pflege

### Requirement: Schriftgrößen-Skala
Das Food Frontend MUST genau acht Schriftgrößen verwenden, als Tailwind-Token definiert: `text-caption` (12 px, Chips, Metadaten), `text-body` (14 px), `text-emphasis` (16 px, Fließtext und Eingaben), `text-section` (18 px mobil, 20 px ab `md`, Kartentitel und Gruppen), `text-heading` (22 px mobil, 26 px ab `md`, Abschnittsüberschriften), `text-title` (32 px mobil, 44 px ab `md`, Seitentitel), `text-display` (32 px mobil, 52–56 px ab `lg`, nur Startseite und Rezepttitel) und `text-metric` (32 px, nur Kennzahlen). Kleinere Größen als 12 px und freie Werte (`text-[…]`) SHALL NICHT vorkommen.

#### Scenario: Badge-Text
- **WHEN** ein Badge oder Chip Text zeigt
- **THEN** ist die Schriftgröße 12 px (`text-caption`)

#### Scenario: Kennzahl
- **WHEN** eine Kennzahl wie ein Preis oder eine Kalorienzahl gezeigt wird
- **THEN** verwendet sie `text-metric` (32 px)

#### Scenario: Lint
- **WHEN** eine `.tsx`-Datei `text-[11px]` oder `text-xs`/`text-2xl` außerhalb der Skala enthält
- **THEN** meldet ESLint einen Fehler

### Requirement: Eckenradien
Das Food Frontend MUST genau vier Radien verwenden: 8 px (`rounded-sm`) für kleine Elemente (Nutri-Score-Badge, Tags, Checkboxen), 12 px (`rounded-lg`) für Bedienelemente (Buttons, Inputs, Selects, Segmente), 20 px (`rounded-xl`) für Karten, Dialoge und Sheets sowie `rounded-full` für Pills, Chips, Avatare und runde Icon-Buttons. Andere Radius-Utilities SHALL NICHT vorkommen.

#### Scenario: Button und Karte
- **WHEN** ein Button in einer Karte gerendert wird
- **THEN** hat der Button 12 px und die Karte 20 px Radius

#### Scenario: Chip
- **WHEN** ein Kategorie-Chip gerendert wird
- **THEN** ist er vollrund

### Requirement: Durchsetzung per ESLint
Die Regeln zu Farben, Schriftgrößen, Radien, Icons, Verläufen und entfernten Token MUST per ESLint im Food Frontend als Fehler durchgesetzt werden (eigene Regel `food/design-tokens`). Die Regel MUST zusätzlich freie Pixelwerte für Abstände (`p-[13px]`), Drehungen außerhalb von Stickern und die entfernten `hero`-/`area`-Klassen melden. `npm run lint` MUST im CI laufen. Tests (`*.test.tsx`) und der Styleguide (`/styleguide`) sind von Palettenregeln ausgenommen, sofern sie Tokens demonstrieren.

#### Scenario: Verstoß im Pull Request
- **WHEN** eine Änderung `bg-amber-50`, `rounded-md` oder `bg-hero` einführt
- **THEN** schlägt `npm run lint` fehl

#### Scenario: Freie Rotation
- **WHEN** eine Änderung `-rotate-6` an einem Element setzt, das kein Sticker oder Logo ist
- **THEN** schlägt `npm run lint` fehl

## ADDED Requirements

### Requirement: Petrol-basierte Leitfarbe im Light Mode
Das Token-System SHALL eine Petrol-Leitfarbe im Light Mode definieren: `--primary` = `#0F6E7A` (Hauptaktion, aktive Navigation, Fortschritt, erledigt), `--primary-foreground` = Weiß, `--primary-dark` = `#0A4F57` (Text und Links in der Leitfarbe auf hellem Grund) und `--primary-soft` = `#E3F3F5` (Nebenaktion, aktive Navigations-Pille, Auswahl). Eine Ansicht MUST höchstens eine Hauptaktion (`--primary` als Fläche) zeigen.

#### Scenario: Primärfarbe ist Petrol
- **WHEN** ein primärer Button gerendert wird
- **THEN** hat er die Fläche `--primary` mit weißer Schrift und mindestens 4,5:1 Kontrast

#### Scenario: Sekundäre Aktion
- **WHEN** neben einer Hauptaktion eine zweite Aktion steht (z. B. „Kochen starten“ neben „Zum Essensplan“)
- **THEN** verwendet sie `--primary-soft` als Fläche mit `--primary-dark` als Schrift

#### Scenario: Aktive Navigation
- **WHEN** ein Navigationspunkt aktiv ist
- **THEN** zeigt er eine `--primary-soft`-Pille mit `--primary-dark` als Schrift

#### Scenario: Diagrammfarben stammen aus der Palette
- **WHEN** ein `recharts`-Diagramm im Food Frontend gerendert wird
- **THEN** verwendet es die `--chart-*`-Token aus derselben harmonischen Palette

### Requirement: Akzent Tomate und keine großen Farbflächen
Das Token-System SHALL den Akzent Tomate (`--spice` = `#DA3A1E`, mindestens 4,5:1 mit weißer Schrift; `--spice-foreground` = `#A8341B`) für Schrittnummern und kleine Hervorhebungen bereitstellen. Das Logo ist das Maskottchen, nicht eine Tomaten-Kachel. Tomate MUST NOT als große Fläche oder als Status verwendet werden. Großflächige dunkle oder farbige Flächen (Banner, Abschnittshintergründe in Leit- oder Statusfarbe) SHALL NOT vorkommen.

#### Scenario: Schrittnummer
- **WHEN** die Zubereitungsschritte eines Rezepts gezeigt werden
- **THEN** stehen die Nummern gerade in kleinen Flächen aus Tomate und weißer Schrift

#### Scenario: Kein Banner
- **WHEN** eine Seite gerendert wird
- **THEN** gibt es keine Fläche von mehr als 120 px Höhe in Leit- oder Statusfarbe

### Requirement: Weißer Seitengrund
Alle Seiten des Food Frontends SHALL auf weißem Grund (`--background` = Weiß) dargestellt werden. Abgrenzung erfolgt über Karten (`shadow-card`), Linien (`--line`) und Abstand, nicht über getönte Seitenflächen. Ein getönter Streifen (`--muted`) ist nur für Segmente, Hinweise und Tracks zulässig.

#### Scenario: Seitenhintergrund
- **WHEN** eine beliebige Seite gerendert wird
- **THEN** ist der Seitenhintergrund Weiß

### Requirement: Kategorie-Tönungen nur für Rezepttypen
Die Kategorie-Token SHALL ausschließlich Rezepttypen kennzeichnen: Frühstück, Warme Mahlzeit, Kalte Mahlzeit, Nachtisch, Snack, Rezeptteil und Getränk. Sie MUST als Fläche mit Text im zugehörigen `-foreground` auftreten, NEVER als Statusanzeige. Mahlzeit-Köpfe im Essensplan bleiben neutral; ein Mahlzeit-Eintrag trägt die Tönung des Rezepttyps seines Rezepts.

#### Scenario: Rezeptkarte
- **WHEN** eine Rezeptkarte ohne Foto gerendert wird
- **THEN** zeigt die Bildfläche die Tönung des Rezepttyps mit dessen Symbol

#### Scenario: Mahlzeit im Plan
- **WHEN** ein Rezept in einer Mahlzeit des Essensplans steht
- **THEN** trägt der Eintrag die Tönung des Rezepttyps, der Mahlzeit-Kopf bleibt neutral

#### Scenario: Rezeptteil und Getränk
- **WHEN** ein Rezept vom Typ „Rezeptteil“ oder „Getränk“ gezeigt wird
- **THEN** trägt es die Tönung Sand bzw. Rosa mit dem zugehörigen Symbol, und Warm und Nachtisch bleiben durch Text und Symbol unterscheidbar

### Requirement: Statusdarstellung mit Rand und Icon
Hinweise zu Status (Warnung, Fehler, Erfolg, Info) MUST durch Fläche (`-soft`), Rand (`-border`) und ein Icon dargestellt werden, damit sie sich nie nur durch Farbe von Kategorie-Tönungen unterscheiden. Fehlende Mahlzeiten und Pflichtlücken MUST als Warnung mit Rand erscheinen.

#### Scenario: Fehlende Mahlzeit
- **WHEN** im Plan eine Mahlzeit fehlt
- **THEN** zeigt der Hinweis Warnfläche, Warnrand und ein Warn-Icon

### Requirement: Sticker und Verspieltheit
Verspielte Elemente SHALL sparsam eingesetzt werden: Ein Sticker (gelbe Marke, leicht gedreht) darf höchstens einmal pro Ansicht erscheinen. Schräg gestellt sind nur Sticker und das Logo; Schrittnummern, Karten und Texte MUST gerade stehen. Sticker MUST nur aus bereits vorhandenen Daten abgeleitet werden (z. B. „Neu“, „noch N Tage“) und tragen keine Information, die sonst nirgends steht.

#### Scenario: Ein Sticker pro Ansicht
- **WHEN** eine Seite mehrere stickerfähige Elemente enthält
- **THEN** wird höchstens eines als Sticker gerendert, die übrigen als flache Tags

#### Scenario: Reduzierte Bewegung
- **GIVEN** der Nutzer hat „Bewegung reduzieren“ aktiviert
- **WHEN** Sticker oder Einblend-Animationen erscheinen
- **THEN** erscheinen sie ohne Animation

### Requirement: Tippflächen und Eingabegrößen
Alle interaktiven Elemente MUST auf Touch-Viewports (unter 768 px) mindestens 44 × 44 px groß sein. Eingabefelder, Selects und Textareas MUST mobil mindestens 16 px Schriftgröße haben. Die Mindestbreite 320 px MUST ohne horizontales Scrollen des Seiteninhalts nutzbar bleiben.

#### Scenario: Chip auf dem Handy
- **WHEN** ein Kategorie-Chip auf 390 px Breite gerendert wird
- **THEN** ist seine Tippfläche mindestens 44 px hoch

#### Scenario: Eingabefeld fokussieren
- **WHEN** ein Nutzer auf iOS ein Eingabefeld antippt
- **THEN** zoomt die Seite nicht automatisch hinein

### Requirement: Rezeptbild-Fallback nach Rezepttyp
Ein Rezept ohne Foto SHALL durch `RecipeThumbnail` als Fläche in der Kategorie-Tönung seines Rezepttyps mit dem zugehörigen Lucide-Symbol dargestellt werden. Seiten MUST keine eigenen Platzhalterbilder oder Icon-Ersatzdarstellungen verwenden.

#### Scenario: Rezept ohne Foto
- **WHEN** `image_url` leer ist
- **THEN** zeigt `RecipeThumbnail` die Tönung und das Symbol des Rezepttyps und kein defektes `<img>`

### Requirement: Maskottchen als Logo und Favicon
Das Inspi-Maskottchen SHALL das Logo in der Kopfzeile, das Favicon und das Bild im Startbildschirm sein. Es erscheint zusätzlich in Leer- und Fehlerzuständen, auf den Rechtsseiten und auf der Tool-Landing.

#### Scenario: Logo in der Kopfzeile
- **WHEN** eine Seite mit Kopfzeile geladen wird
- **THEN** zeigt das Logo links das Maskottchen (rund 40 px) neben dem Schriftzug „Inspi Food“

#### Scenario: Favicon
- **WHEN** der Browser das Favicon lädt
- **THEN** ist es das Maskottchen in 32, 180, 192 und 512 px

#### Scenario: Mobile Abläufe ohne Kopfzeile
- **WHEN** ein Ablauf auf dem Handy keine Kopfzeile hat (Kochmodus, Assistenten)
- **THEN** erscheint das Logo dort nicht; der Ablauf hat sein Schließen-Symbol

### Requirement: Maskottchen-Dateien sind klein
Die Dateien für Logo und Favicon SHALL optimiert ausgeliefert werden: Logo höchstens 256 px und 60 KB, jede Favicon-Größe höchstens 60 KB. Die Originale mit mehr als 1 MB DÜRFEN NICHT im Bundle oder als Favicon verwendet werden.

#### Scenario: Gewicht der Logo-Datei
- **WHEN** das Build-Ergebnis geprüft wird
- **THEN** ist die Logo-Datei höchstens 60 KB groß und das Original mit 2048 px nicht enthalten

#### Scenario: Favicon-Gewicht
- **WHEN** `index.html` das Favicon einbindet
- **THEN** zeigt es auf eine Datei unter 60 KB

### Requirement: Sticker-Quellen aus vorhandenen Feldern
Ein Sticker SHALL nur aus vorhandenen Feldern entstehen, in dieser Priorität: „Beliebt“ für die ersten zehn der bestehenden Sortierung „Meistgesehen“, „Neu“ für Rezepte mit `created_at` höchstens 14 Tage alt, „Ohne Kochen“ für `preparation_method` `none` oder `raw`, sonst das Zubereitungsart-Label (Backen, Braten, Grillen). Kochen erzeugt keinen Sticker.

#### Scenario: Beliebtes Rezept
- **WHEN** ein Rezept unter den ersten zehn der Sortierung „Meistgesehen“ liegt
- **THEN** zeigt es den Sticker „Beliebt“

#### Scenario: Neues Rezept
- **WHEN** ein Rezept höchstens 14 Tage alt ist und nicht beliebt
- **THEN** zeigt es den Sticker „Neu“

#### Scenario: Ohne Kochen
- **WHEN** `preparation_method` `none` oder `raw` ist und das Rezept weder beliebt noch neu ist
- **THEN** zeigt es den Sticker „Ohne Kochen“

#### Scenario: Zubereitungsart
- **WHEN** `preparation_method` Backen, Braten oder Grillen ist und keine der Regeln davor greift
- **THEN** zeigt es das Label der Zubereitungsart als flachen Tag, und höchstens ein Sticker erscheint pro Ansicht
