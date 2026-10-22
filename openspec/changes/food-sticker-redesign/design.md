# Design

## Context

Siehe `proposal.md` für Motivation und Umfang. Ausgangslage im Code (Stand der Analyse):

- **Tokens** liegen komplett in `frontend-food/src/index.css` (HSL-Variablen) und `tailwind.config.ts`. Komponenten nutzen semantische Utilities (`bg-card`, `text-foreground`, `shadow-card`, `rounded-xl`); der Look lässt sich daher zu großen Teilen über Token-Werte umstellen (214× `shadow-card`, 541× `rounded-xl`, 730× `rounded-lg`, 553× `bg-muted`).
- **Kopfband**: `HeroBand` (full-bleed `bg-hero`), `PageHeader` und `TitleBand` darauf aufgebaut; 39 Dateien nutzen sie, `bg-hero*`-Utilities kommen 92× vor, plus `skeleton-on-hero` in `index.css`/`skeleton.tsx` und der Boot-Bildschirm in `index.html` (`#1F4D3A`).
- **Navigation**: `components/layout/FoodLayout.tsx` hat oben fünf Punkte (Rezepte, Zutaten, Essensplan, Material, Einkaufslisten) im Kopfband, mobil unten vier (Start, Rezepte, Essensplan, Einkaufen).
- **Bereichsfarben** `--area-*` (30 Stellen) färben Icon-Kacheln und Navigationspunkte; sie entfallen.
- **Schriften**: Bricolage Grotesque und Figtree sind schon konfiguriert (`font-display`, `font-sans`), werden aber per `<link>` von Google geladen.
- **Regeln**: `eslint-rules/design-tokens.js` (Palette, Größen, Radien, Verläufe, Material Symbols) und `src/__tests__/designRules.test.ts`. Die Specs `food-design-system` und `food-list-page-layout` beschreiben teils noch den älteren Look „Frisch & offen“ (`#15803D`), nicht den heutigen Code.
- **Tests**: Vitest (144 Testdateien), ein eigenes Playwright-Paket unter `e2e/` (Projekte `chromium`, `mobile-320`, `tablet`, `desktop`, `mocked`, `live`; Mock-Daten per `page.route`), CI-Job `food-checks` in `.github/workflows/deploy.yml`, der nur `sh e2e/food-release-check.sh` (Projekt `mocked`) ausführt.
- **Auslieferung**: Vite-Build, nginx im Container (`Dockerfile.frontend-food`, `nginx.conf.template`): statische Dateien 1 Jahr `immutable`, `index.html` `no-cache`, SPA-Fallback.
- **Entwürfe**: Referenz-HTML unter `reference/` (20 Screens, Styleguide, Zustände); die Entwurfstexte sind Beispiele, die Beschriftungen im Code bleiben maßgeblich („Kochen starten“, „Zum Essensplan“, „Neues Rezept“, „Neuer Essensplan“).

## Goals / Non-Goals

**Goals:**
- Ein einziger, token-gesteuerter Look für alle Nutzerseiten, der die Entwürfe auf Handy (390 px, mindestens 320 px) und Desktop (1440 px) wiedergibt.
- Der Look ist durch Regeln, Screenshots und Barrierefreiheitsprüfung abgesichert und blockiert den Release bei Verstößen.
- Möglichst viel des Umbaus über Token und geteilte Komponenten, damit Seiten nur noch dünn angepasst werden müssen.
- Keine Änderung von API, Schemas, Routen-Logik (außer Material-Reiter) und Geschäftslogik.

**Non-Goals:**
- Neue Funktionen aus den Entwürfen (Lagerliebling der Woche, „Überrasch mich“, „Wer holt was“, Offline-Einkaufsmodus, Kochmodus-Timer, kuratierte Vorlagen, Schrittdauern und „Nächste Schritte“; die Lesefelder dafür fehlen). Sie haben eigene OpenSpec-Changes. Der Wochenraster der Desktop-Planseite ist eine Darstellung der vorhandenen Plan-Daten; wo die bestehende Tagesliste oder Tabelle (`DayPlanView`, `TableView`) das Gleiche zeigt, bekommt sie den neuen Stil, statt eine zweite Ansicht zu bauen.
- Server- oder Vorab-Rendering, Sitemap-Erzeugung (eigener Change; hier nur Markup, `robots.txt`).
- Dark Mode, Änderungen am Haupt-Frontend (`frontend/`).
- Die verworfenen Nuancen der Leinwand (Tomate als Hauptfarbe, Linie statt Schatten, runde Teller, 5er-Navigation, andere Hauptfarben): Basis ist Petrol + Bricolage mit Schatten-Karten und rechteckigen Bildflächen.
- Lighthouse-Schwellen und Firefox/WebKit-Matrix (bewusst nicht Teil der Testtiefe).

## Decisions

### D1 Token-Namen bleiben, Werte und Satz ändern sich
Die shadcn-Namen (`primary`, `card`, `muted`, `foreground`, `border`, `input`) bleiben; nur Werte ändern sich. Neu: `primary-dark`, `line`, `category-{breakfast,warm,cold,dessert,snack}` (+ `-soft`, `-foreground`). Entfernt: `hero*`, `area-*`, `shadow-float`, `gradient-*`. **Alternative**: neuer Token-Namensraum (z. B. `sticker-*`). Verworfen: Hunderte Fundstellen müssten angefasst werden, ohne Nutzen.

Werte (aus der Leinwand, auf Kontrast geprüft, HSL für `index.css`):

| Token | Hex | HSL | Verwendung |
|---|---|---|---|
| `--primary` | `#0F6E7A` | `187 78% 27%` | Hauptaktion, Fortschritt (5,95:1 mit Weiß) |
| `--primary-dark` | `#0A4F57` | `186 79% 19%` | Text/Link in Leitfarbe |
| `--primary-soft` | `#E3F3F5` | `187 47% 93%` | Nebenaktion, aktive Pille (8,11:1 mit Dark) |
| `--foreground` | `#1B1F1D` | `150 7% 11%` | Text (16,7:1) |
| `--muted-foreground` | `#5E6661` | `142 4% 38%` | Zweittext (5,92:1) |
| `--input` | `#858C87` | `137 3% 54%` | Feldrand, Checkbox, Symbole (3,44:1) |
| `--line` | `#EEF0EE` | `120 6% 94%` | Trennlinien, Kartenrand (dekorativ) |
| `--muted` | `#F3F5F4` | `150 9% 96%` | Segmente, Tracks, Skeletons |
| `--spice` | `#DA3A1E` | `9 76% 49%` | Schrittnummern, kleine Akzente (4,56:1 mit Weiß); das Logo ist das Maskottchen |
| `--spice-foreground` | `#A8341B` | `11 72% 38%` | Tomaten-Text (6,62:1) |
| Sticker | `#FFD84D` | `47 100% 65%` | nur Sticker (12,05:1 mit Ink) |

Kategorien (Fläche → Text, jeweils ≥ 4,5:1): Frühstück `#FFF1CF` → `#7A4F00`, Warm `#FFE6DE` → `#A8341B`, Kalt `#EEF3E2` → `#3A5217`, Nachtisch `#EFE6FF` → `#5E35B8`, Snack `#E2EDFF` → `#2152AE`, Rezeptteil `#F3EBDD` → `#5C4319`, Getränk `#FCE7F0` → `#9D2A62`. Status (Fläche / Rand / Text): Erfolg `#E7F5EE` / `#9FD3B8` / `#0B5E39`, Warnung `#FFF4DB` / `#F0C766` / `#6B4600`, Fehler `#FDECEB` / `#F2B8B4` / `#A1231B`, Info `#F3F5F4` / `#D3D9D5` / Ink.

**Abweichungen von den Entwürfen (Kontrastprüfung):** Die Entwürfe zeigten Feldränder in `#D3D9D5` (1,43:1) und Tomate `#E2462A` (4,08:1 mit Weiß). Beides verfehlt WCAG AA; die Leinwand und dieses Dokument verwenden jetzt `#858C87` und `#DA3A1E`. Nutri-Score E (weiße Schrift auf `#E63E11`, 4,15:1) bleibt in den amtlichen Farben; er steht als dokumentierte axe-Ausnahme (Logo/Markenfarbe) im Seitenregister.

### D2 Seitenkopf: `PageHeader` bleibt, `HeroBand`/`TitleBand` entfallen
`PageHeader` (Listen) behält Name und Hauptprops (`title`, `description`, `count`, `actions`, `children`), verliert `icon`/`area` und rendert hell auf Weiß mit Brotkrumen. `TitleBand` wird zu `DetailHeader` (Zurück-Pille mit Zielname, H1, Kennzahlen-Slot, Aktionen); neu `FlowHeader` (Schließen-Symbol, Titel, Fortschritt) für Assistenten und Kochmodus. Dadurch wandern Admin-, Daten- und Statistik-Seiten ohne eigene Arbeit mit. **Alternative**: Prop `variant="light"` neben dem Band. Verworfen: Band und alte Token müssten weiterleben.

### D3 Eine Navigationsquelle für beide Leisten
`components/layout/nav-items.ts` definiert die vier Punkte einmal (Route, Label für Desktop/Handy, Icon, Aktiv-Regel inkl. `/material` unter Zutaten, Prefetch). `AppHeader` und `BottomNav` lesen daraus. Material wird über `AreaTabs` (geteilt mit anderen Bereichen) als Reiter in der Zutaten-Ansicht angeboten; die Route `/material` bleibt unverändert (keine Weiterleitungen nötig). Profil, Konto und Administration liegen im bestehenden `UserMenu`. In Abläufen mit Hauptaktion entfällt `BottomNav` zugunsten der Seiten-`ActionBar`.

### D4 Schriften selbst hosten, mit Ersatzschrift-Metriken
Zwei variable WOFF2-Dateien (Latin-Teilmenge reicht für Deutsch inkl. ä ö ü ß €) liegen in `frontend-food/public/fonts/` mit stabilen Namen, `@font-face` in `index.css` (`font-display: swap`), `<link rel="preload" as="font" type="font/woff2" crossorigin>` für Bricolage (Überschriften, LCP) und Figtree. Eine Ersatzschrift-`@font-face` mit `size-adjust`/`ascent-override` verhindert Layoutsprünge. nginx liefert `.woff2` bereits 1 Jahr `immutable`; stabile Namen sind unkritisch, weil die Dateien nur bei Versionswechsel ersetzt werden (Dateiname trägt die Version). Quelle und Lizenz (SIL OFL) stehen in `public/fonts/README.md`. Boot-Bildschirm in `index.html` wird weiß mit Petrol-Logo. **Alternative**: npm-Pakete `@fontsource-variable/*`. Verworfen: gehashte Dateinamen erschweren das Preload; die Dateien sind klein und ändern sich praktisch nie.

### D5 Typografie und Radien als Token, fluid statt Breakpoint-Doppelung
`tailwind.config.ts` ersetzt die Größenskala durch acht Token (`caption 12`, `body 14`, `emphasis 16`, `section 18→20`, `heading 22→26`, `title 32→44`, `display 32→56`, `metric 32`) mit `clamp()`, sodass Seiten keine `text-x md:text-y`-Paare mehr brauchen. Radien: `sm 8`, `lg 12`, `xl 20`, `full`. Alle Eingabefelder (`input`, `select`, `textarea`) nutzen `text-emphasis` (16 px) auf allen Viewports; das beseitigt das iOS-Reinzoomen. Der Viewport-Meta verliert `maximum-scale=1.0`.

Die Entwürfe der Leinwand sind auf diese acht Stufen gerundet (11→12, 13→14, 15→16, 17→16, 19→18, 21→22, 24→26, 28→26, 40→44, Timer 32); die Referenz in `reference/` ist die gerundete Fassung.

### D6 Kategorie-Darstellung zentral in `RecipeThumbnail` und `RecipeTypeTag`
Eine Zuordnung `recipe_type → {Token, Lucide-Icon}` (aus `RECIPE_TYPE_OPTIONS`) steuert Bildfläche ohne Foto, Typ-Chip, Filter-Chip und Tönung von Plan-Einträgen (Mahlzeit-Köpfe bleiben neutral; sieben Typen: Frühstück, Warm, Kalt, Nachtisch, Snack, Rezeptteil, Getränk). `RecipeThumbnail` erhält die Rezeptart als Prop und rendert ohne Foto Tönung + Symbol statt `/images/inspi_cook.png`. Wo die Art fehlt, neutral `bg-muted` mit Besteck-Symbol. Neue Icon-Namen werden in `ICONS` (`components/ui/icon.tsx`) ergänzt.

### D7 Sticker-Dosis und Quellen zentral erzwungen
`Sticker` registriert sich bei einem `StickerBoundary` (React-Kontext pro Seite); nur der erste Sticker rendert gelb und leicht gedreht, weitere fallen auf `FlatTag`. Dadurch hält der Code die Regel „höchstens ein Sticker pro Ansicht“, auch wenn Daten mehrere hergeben. Zulässige Quellen sind vorhandene Felder (z. B. „Neu“ aus `created_at`, „noch N Tage“ aus dem Planstart). `rotate-*` ist per ESLint nur in `Sticker` und `BrandMark` erlaubt.

### D8 Statushinweise über eine Komponente
`StatusNotice` (Varianten `success|warning|danger|info`) rendert Fläche, Rand und Icon nach Token und ersetzt die verstreuten Hinweisboxen und `QuantityWarningsBanner`-Varianten schrittweise. Warnung und Kategorie-Gelb sind damit durch Rand und Icon unterscheidbar.

### D9 SEO-Markup im Client, getrennt vom Rendering
`hooks/useDocumentMeta.ts` wird zu `usePageMeta` erweitert (Title-Muster, Beschreibung, OG/Twitter, `robots`, `canonical`, `jsonLd`; Aufräumen beim Verlassen). JSON-LD-Bauer liegen als reine Funktionen in `lib/seo/` (`buildRecipeJsonLd`, `buildBreadcrumbJsonLd`) mit Unit-Tests gegen Beispieldaten. `lib/seo/routeIndexing.ts` klassifiziert jede Route (`public` oder `private`); ein Test liest die Pfade aus `App.tsx` und schlägt fehl, wenn eine Route fehlt. `Pagination` rendert React-Router-`Link` (`<a href="?page=N">`). `public/robots.txt` sperrt private Pfade. Da die App eine SPA bleibt, wirkt das Markup für Crawler mit Rendering sofort; die volle Wirkung kommt mit dem Prerendering-Change. **Alternative**: Prerendering jetzt. Verworfen (Entscheidung: eigener Change).

### D10 Testaufbau im bestehenden `e2e/`-Paket
Neue Playwright-Projekte `ui-mobile` (390 × 844, `isMobile`, Skalierung 1) und `ui-desktop` (1440 × 900) in `e2e/playwright.config.ts`, Dateien `e2e/tests/*.ui.spec.ts`. Ein Seitenregister `e2e/tests/ui-pages.ts` listet die zehn Hauptseiten (Route, Mock-Satz, erwartete H1, axe-Ausnahmen) plus drei Smoke-Seiten ohne Screenshot (Admin, Datenqualität, Zutaten-Statistik) für Überlauf und axe. Mock-Daten liegen in `e2e/fixtures/ui-mocks.ts` (gleiches `page.route`-Muster wie die bestehenden `*.mocked.spec.ts`), Uhrzeit per `page.clock`, `reducedMotion: 'reduce'`, Animationen aus, keine Netzwerk-Außenzugriffe. Prüfungen: `toHaveScreenshot` (Schwelle klein, `maxDiffPixelRatio`), `@axe-core/playwright` (`wcag2a/aa/21a/21aa`, serious+critical), Tippflächen ≥ 44 px und Überlauf auf 320/390/1440 per `page.evaluate`. `e2e/food-release-check.sh` startet zusätzlich die neuen Projekte; `food-checks` bleibt derselbe Job. **Alternative**: Tests in `frontend-food/e2e/`. Verworfen: dort läuft das CI-Skript nicht.

Reproduzierbare Screenshots: Referenzen entstehen nur im gleichen Container-Image wie in der CI (gepinnte Playwright-Version, Linux, selbst gehostete Schriften) über `e2e/update-ui-baselines.sh` (Podman/Docker). Die CI-Cache-Schlüssel für Browser hängen an `e2e/package-lock.json`.

### D11 Einführung: ein langlebiger Integrationszweig, Wellen, ein Release
Alles landet auf `feature/food-sticker` (kein Merge nach `main` vor der Vollabnahme); Wellen ersetzen nacheinander Token, Gerüst, geteilte Komponenten, die zehn Hauptseiten, übrige Nutzerseiten, Admin-Tokens, SEO, Aufräumen (siehe `tasks.md`). `main` wird regelmäßig eingemischt. Eine Vorschau-Umgebung (separate Cloud-Run-Revision mit Tag, kein Produktions-Traffic) dient Abnahme und Stakeholdern. Ablauf nach dem Produktions-Rollout-Plan des Projekts: zuerst Trockenlauf, Anwenden nur mit ausdrücklicher Freigabe, Deployments ausschließlich über `main` (CI überschreibt manuelle Cloud-Run-Änderungen).

### D13 Übergangs-Aliase halten jede Welle lauffähig
Solange Seiten noch `bg-hero*`/`area-*` nutzen, werden die alten Token in Welle 1 auf helle Werte gemappt (`--hero` = Weiß, `--hero-foreground` = Ink, `--hero-muted` = gedämpfter Text, `--hero-soft` = `--muted`, `area-*` = neutrale Töne). Die App bleibt damit nach jeder Welle lesbar und testbar. In der letzten Welle werden Aliase, `HeroBand`, `TitleBand` und `skeleton-on-hero` gelöscht und die Lint-Regel gegen `hero`/`area` scharf geschaltet. Die Aliase leben nur auf dem Integrationszweig.

### D12 Druck und Bewegung bleiben
Bestehende Print-Styles (`@media print`) behalten ihre Selektoren und blenden zusätzlich Navigation, Sticker und Schatten aus. Bewegungsklassen (`animate-page-in`, `stagger`, `press`, `card-hover`) bleiben, werden aber nicht für Sticker genutzt; `prefers-reduced-motion` schaltet weiterhin alles ab. Dialog- und Sheet-Overlays wechseln von `bg-hero/60` zu `bg-foreground/40` mit leichtem Blur.

### D14 Lesefelder statt neuer Modelle
Die Plan-Liste liefert `filled_meals_count` (Annotation in `backend/planner/api/meal_plan.py`, eine Abfrage) Kosten je Person und Tag kommen je sichtbarer Karte aus dem bestehenden Endpunkt `GET /api/meal-plans/{id}/costs/` (Entscheidung: Abruf je Karte, keine Berechnung in der Liste). Das Dashboard liefert `active_meal_plan_count` und `open_shopping_list_count` (`backend/recipe/api/dashboard.py`). Pydantic und Zod entstehen gleichzeitig, mit Tests, ohne Migration und ohne Schreibweg. **Alternative**: Fortschritt im Frontend aus Mahlzeit-Details berechnen. Verworfen, weil das pro Plan eine Abfrage kostet.

### D15 Bewegung nur bei Ladeanzeigen
Wiederholte Bewegung gibt es nur im Skelett-Schimmer, im Ladebalken und im Startbildschirm. Umsetzung (Aufgabe 3.6): Die Lint-Regel verbietet dekorative Schleifen (`animate-bounce`, `animate-ping`) überall. `animate-spin` (Spinner) und `animate-pulse` (Skelett) sind die Ladeanzeigen und bleiben erlaubt. Kippwinkel sind nur für Sticker und Logo erlaubt; Pfeile dürfen sich um 90 oder 180 Grad drehen. `prefers-reduced-motion` schaltet alles ab.

### D16 Zustände als Muster
Vier Zustände: Laden (Seitenform), Leer (ein Satz, höchstens eine Aktion; Vorlagen nur aus vorhandenen Referenzplänen, sonst kein Block), Fehler (Abschnittsfehler inline, Seitenfehler 404 mit „Meintest du …“ aus der vorhandenen Suche) und Offline (nicht gebaut, Folge-Change). Bausteine: `QuerySection`, `EmptyState`, `ErrorDisplay`, `SectionBoundary`, neu `NotFoundState`.

### D17 Maskottchen als Marke
Das Logo ist das Inspi-Maskottchen (rund 38–40 px) in der Kopfzeile; Favicon und Startbildschirm nutzen es ebenfalls. Die Tomate bleibt Akzent. Quelle ist `frontend-food/public/images/favicon.png` (2048 px, 1,4 MB; Motiv bestätigt). Daraus entstehen optimierte Dateien: Logo höchstens 256 px und 60 KB, Favicon in 32, 180, 192 und 512 px. Das Maskottchen erscheint außerdem in Leer- und Fehlerzuständen, auf Rechtsseiten und auf der Tool-Landing. Rezeptkarten ohne Foto zeigen die Rezepttyp-Fläche (Entscheidung). Das Logo-Motiv ist `favicon.png` (bestätigt).

### D18 Alte Specs auf das Layout umgestellt
Per REMOVED und ADDED ersetzt: `meal-plan-list-dashboard` (Abschnitte, Hero-Karten, Ampel), `meal-plan-colorful-ui` (rote Flächen, grüne Knöpfe, Mahlzeit-Farben, Farbabdeckung, grün-basierte Leitfarbe), `ui-polish` (Akzentrand, Anlegen per Dialog), `recipe-detail-reorganized` (Bild, Meta-Zeile, Reihenfolge). Per MODIFIED angepasst: `recipe-thumbnail`, `ingredient-database` und `shared-ui-components` (RecipeCard-Fallback). `ui-polish` „Anlegen über Dialog“ war bereits im Code überholt, der Button öffnet `/meal-plans/new`.

### D19 Vorschau nur lesend
Die Vorschau nutzt Produktionsdaten. Stakeholder bewerten nur lesend (Navigation, Ansichten, Zustände). Ein Banner „Vorschau – nur ansehen“ und ein Build-Flag, das Aktionen in der Oberfläche deaktiviert, sind Aufgaben. Serverseitig bleibt der Zugriff offen; das Restrisiko ist akzeptiert. Schreibflüsse testet nur der gemockte Playwright-Lauf.

## Risks / Trade-offs

- **Bricolage ist breiter als Gabarito (Entwurf)** → Titel brechen früher um. Mitigation: `text-wrap: balance`, `overflow-wrap: anywhere`, Screenshot-Tests auf 390 und 1440; 320 px im Überlauf-Test.
- **Token-Werte ändern Größen global** (Radius 10→12 und 16→20, Eingabe 14→16 px) → dichte Admin-Tabellen und Formulare können umbrechen. Mitigation: drei Admin-Smoke-Seiten mit Überlauf-Test; dichte Zellen verwenden `Input` mit Variante `size="sm"` nur ab `md` (Schrift trotzdem 16 px auf dem Handy).
- **Kontrast der Entwurfsfarben** → bereits zwei Verstöße gefunden und korrigiert. Mitigation: Kontrast-Test über alle Token-Paare in Welle 1; axe-Ausnahme für Nutri-Score E dokumentiert.
- **Screenshot-Flakiness** (Schriften, Uhrzeit, Animationen) → deterministische Mocks, Uhr festsetzen, Container-Image für Referenzen, selbst gehostete Schriften. Ein Test läuft zweimal in der CI, um Reproduzierbarkeit zu belegen.
- **Langlebiger Branch kollidiert mit laufenden Changes** (`switchable-quantity-units`, `shopping-list-load-resilience` berühren Einkauf und Mengen) → Mitigation: wöchentliches Einmischen von `main`, kleine Teil-PRs in den Integrationszweig, Dateien dieser Changes zuletzt umbauen.
- **Mehrere Looks parallel in der Entwicklung** → nur auf dem Integrationszweig; nie gemischt in Produktion.
- **SEO ohne Prerendering** begrenzt die Wirkung auf Crawler ohne JavaScript-Rendering → bewusst entschieden, eigener Change.
- **Navigation: Material unter Zutaten** → Nutzer:innen müssen Material neu finden. Mitigation: Reiter „Material“ ist in der Zutaten-Ansicht prominent; Route bleibt gleich (alte Lesezeichen funktionieren).
- **Entwurf vs. Code-Texte** → Beschriftungen im Code bleiben; Abweichungen zwischen Leinwand und Umsetzung sind erwartet und werden im Handover als Regel genannt.

- **Vorschau mit Produktionsdaten**: Das Build-Flag sperrt Aktionen nur in der Oberfläche. Restrisiko bewusst akzeptiert (Entscheidung „nur ansehen“).
- **Lesefelder auf der Plan-Liste**: Die Annotation kostet eine zusätzliche Aggregation pro Liste. Antwortzeit der Plan-Liste vor und nach dem Umbau messen.
- **Logo-Gewicht**: Das Favicon-Original wiegt 1,4 MB und würde den Erstaufruf bremsen. Nur optimierte Dateien ausliefern.

## Migration Plan

1. Branch `feature/food-sticker` anlegen, Preview-Umgebung bereitstellen.
2. Wellen in der Reihenfolge der Tasks; jede Welle endet grün (Lint, Vitest, `tsc`, mocked E2E, neue UI-Prüfungen) und mit aktualisierten Referenzen.
3. Vollabnahme auf der Vorschau (Stakeholder prüfen Handy und Desktop gegen die Leinwand).
4. Merge nach `main`, CI baut und liefert `frontend-food` aus; Rollout nach dem Produktions-Rollout-Plan (Trockenlauf zuerst).
5. Beobachtung nach Release (Fehlerprotokoll, Kernseiten); **Rückfall**: Revert des Merge-Commits bzw. frühere Cloud-Run-Revision; es gibt keine Datenmigration und keine API-Änderung, `localStorage`-Schlüssel bleiben unverändert.

## Open Questions

- Werden die Playwright-Referenzbilder direkt im Repository oder über Git LFS gehalten? (Größe der rund 26 PNGs prüfen; Entscheidung bei der Einrichtung der Testbasis, ändert weder Specs noch Aufgaben.)
- Konkrete Messwerte für die Ersatzschrift-Anpassung (`size-adjust` u. a.) werden bei der Schrifteinbindung gemessen.
- Schrittdauern („ca. 15 Min“) und „Nächste Schritte“: eigener Change. Der Entwurf zeigt sie als Ziel.
