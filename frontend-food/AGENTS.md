# Food-Frontend-Agent-Regeln

Für projektweite Regeln siehe `../AGENTS.md`. Fachliche Anforderungen gehören in OpenSpec; diese Datei beschreibt die Implementierung des Food-Frontends. Den verbindlichen Look zeigt `/styleguide` (Quelle: OpenSpec `food-sticker-redesign`, Referenz unter `openspec/changes/food-sticker-redesign/reference/`).

## Architektur

- React, TypeScript im Strict-Modus, shadcn/ui, TanStack Query und Zod verwenden.
- Server-State gehört in TanStack Query; Client-State nur minimal in Zustand.
- Zod-Schemas müssen mit den Backend-Pydantic-Schemas synchron sein.
- Mobile-first ab 320px entwickeln und testen; Ziel sind 390 px (Phone) und 1440 px (Desktop).
- Für neue UI-Komponenten zuerst den `/styleguide` prüfen.

## Design-System (Sticker-Look)

- Farben und Flächen nur über HSL-CSS-Variablen und semantische Tokens; keine hartcodierten Tailwind-Palettenfarben. Grund ist weiß (`bg-background`), Karten sind weiß mit `shadow-card`, keine grauen Rahmen und keine Box-in-Box.
- Hauptfarbe ist Petrol (`bg-primary`, `text-primary-dark`). Primär-Buttons `bg-primary`, Nebenaktionen `bg-primary-soft text-primary-dark`. Keine Verläufe.
- Tomate (`spice`) nur als kleiner Akzent (Kosten, Hervorhebungen, Chips mit `bg-spice-soft`/`text-spice-foreground`), nie als große Fläche oder als Status.
- Sticker-Gelb (`sticker`) nur für die Sticker-Marken an Rezeptkarten und Rezeptköpfen, pro Ansicht höchstens ein Sticker je Karte; Regel in `lib/stickers.ts` (Beliebt > Neu > Ohne Kochen > Zubereitungsart).
- Rezepttypen über die Tönungsfläche und das Icon aus `lib/recipeTypeStyle.ts` (`RecipeThumbnail`, `RecipeTypeTag`); die Tönungsklassen stehen als vollständige Literale in der Datei.
- Statusfarben (`success`, `warning`, `danger`, `info`) nur über `-soft`, `-border`, `-foreground` (Hinweise) bzw. `-bright` (Balken, Punkte). `bg-warning` ist verboten. `chart-*` nur in Diagrammen.
- Nutri-Score ausschließlich über `NutriScoreBadge` (Originalfarben); Diagramme über `nutriScoreFill()`. Ein Test erzwingt das.
- Acht Schriftstufen: `text-caption` (12 px), `text-body` (14), `text-emphasis` (16), `text-section` (20), `text-heading`, `text-title` (fluid), `text-display` (fluid, nur Seitentitel im Kopfbereich), `text-metric` (32, nur Kennzahlen). Keine freien Werte (`text-[…]`).
- Schriften: Bricolage Grotesque (`font-display`) für Überschriften und Kennzahlen, Figtree für Fließtext. Beide sind selbst gehostet (`public/fonts`, Lizenz in `public/fonts/licenses`). Zahlen sind tabellarisch (global gesetzt).
- Radien: `rounded-sm` (8 px, kleine Bedienelemente), `rounded-lg` (12 px, Bedienelemente), `rounded-xl` (20 px, Karten und Dialoge), `rounded-full` (Pills, Badges, Avatare, Stepper). Schatten: `shadow-card` (Karten), `shadow-soft` (leichte Erhebung), `shadow-raised` (Dialoge und Bildkarten).
- Icons: nur Lucide, über `Icon` aus `@/components/ui/icon` oder Lucide-Komponenten; Größen 16/20/24/48 px, Strichstärke 2. Keine Material Symbols und keine Icon-Schrift. Neue Namen für `Icon name="…"` in `ICONS` ergänzen.
- Maskottchen `inspi-logo` ist Logo und Favicon; die Startseite und Leerzustände nutzen die Maskottchen-Bilder aus `public/images`.
- Tabellenzeilen als `CardTable`/`DataCardRow` umsetzen und auf kleinen Viewports stapeln.
- Rezeptbilder ausschließlich mit `RecipeThumbnail` und dem Backend-Feld `image_url` darstellen.

## Kopfzeilen und Navigation

- Jede Seite hat genau eine H1. Seitenköpfe: `PageHeader` (Listen, mit Brotkrumen, Anzahl und Aktionen), `DetailHeader` (Detailseiten mit Zurück-Pille), `FlowHeader` (Wizards und Kochmodus mit Schließen, Titel und Fortschritt). Brotkrumen über `Breadcrumbs`.
- Der Seitenkopf liegt auf weißem Grund; die früheren farbigen Kopfflächen und ihre Tokens sind entfernt (Git-Historie).
- Die Navigation besteht aus vier Bereichen (`components/layout/nav-items.ts`): Rezepte, Pläne, Einkauf, Zutaten. Material steht unter Zutaten, Profil und Administration im Profilmenü.
- Eine Aktionsleiste pro Seite (`ActionBar`): unter 768 px fixiert unten, darüber im Fluss.

## Zustände

- Leerzustände: `EmptyBlock` mit Vorlagen (`to` oder `onSelect`) bzw. `EmptyState`; Fehler getrennt über `SectionError`; nicht gefundene Ressourcen über `NotFoundState`.
- Laden: `LoadingPageSkeleton` (Alias `PageSkeleton`) zeichnet Kopf, Kennzahlen und Inhalt in der Form der echten Seite, damit nichts springt. Skeletons zeigen Lichtschimmer statt Pulsieren. Keine ganzseitigen Spinner und keine „Laden…“-Texte.
- Unabhängige Abschnitte über `QuerySection` (Skeleton → Fehler inline → Leer → Inhalt). Paginierte Listen mit `keepPreviousData`.
- Vor dem Start zeigt `index.html` einen weißen Boot-Bildschirm mit Logo, bis React gemountet ist.

## Bewegung und Übergänge

- Seitenwechsel: `FoodLayout` spielt pro Seite `animate-page-in` ab und scrollt nach oben; Filter-, Tab- und Pagination-Änderungen (Query-String) behalten die Seite.
- Listen und Kartenraster bekommen `stagger` (Kinder blenden nacheinander ein, `animate-rise`); nie auf Listen mit mehr als ca. 12 sichtbaren Kindern ohne Paginierung.
- Geänderte Kennzahlen (Portionen, Summen) bekommen `animate-pop` mit `key` auf den Wert. Tippbare Elemente: `press`. Karten: `card-hover`. Auf-/Zuklappen: `animate-in fade-in-0 slide-in-from-top-1 duration-300`.
- Dauer 100–420 ms, Easing `ease-out`. Dauerschleifen nur bei Ladeanzeigen (`GlobalFetchingBar`). Jede Animation muss unter `prefers-reduced-motion` abschalten; neue Klassen in `index.css` dort ergänzen.
- Dialoge und Sheets blenden mit `bg-foreground/40` und leichtem Weichzeichner ein; Mobile-Aktionsleisten fahren mit `animate-sheet-up` ein.

## UI und Fehler

- Markdown statt HTML rendern; kein `dangerouslySetInnerHTML`.
- Fehler: Texte immer über `getApiErrorMessage`/`ErrorDisplay` (deutsch, nie `error.message` roh). Formularfehler mit `applyApiFieldErrors` am Feld. Große Abschnitte in `SectionBoundary`.
- Feedback: Toasts nur über `notify` aus `@/lib/notify` (nie direkt `sonner`). Kein Toast bei Mikro-Aktionen. Kein `window.confirm`, sondern `ConfirmDialog`.
- Einfach zuerst: Detailseiten mit Zusammenfassung oben und `CollapsibleSection` darunter; leere Werte ausblenden (`MissingValuesHint`); Filter mit `FilterParts` (höchstens drei Gruppen sichtbar, Rest in `MoreFilters`). Filterzustand, Suche und Pagination stehen in der URL.
- Permissions ausschließlich aus `can_edit` und `can_delete` der API verwenden.
- Keine TypeScript-`any`, `console.log` oder manuellen Rezeptbild-Fallbacks.

## Suchmaschinen und Metadaten (`food-seo-markup`)

- Titel, Beschreibung, robots und Canonical kommen aus `lib/seo/routeIndexing.ts` (eine Regeltabelle für alle Routen). Neue Routen MÜSSEN dort eingetragen werden; `routeIndexing.test.ts` liest `App.tsx` und schlägt sonst fehl.
- Seiten mit eigenen Daten überschreiben Titel und JSON-LD über `usePageMeta` (`hooks/usePageMeta.tsx`); `lib/seo/applyPageMeta.ts` schreibt den Kopf.
- JSON-LD nur aus sichtbaren Daten: `lib/seo/buildRecipeJsonLd.ts`, `buildBreadcrumbJsonLd.ts`. Fehlende Werte werden weggelassen, nie erfunden.
- Private und zeitgebundene Seiten sind `noindex,nofollow`; gefilterte Listen `noindex,follow` mit Canonical ohne Filter. `public/robots.txt` sperrt die privaten Pfade.

## Druck

- Druckansicht für Rezepte und Einkaufslisten: Navigation, Fußzeile, Aktionsleisten und Sticker sind mit `data-print-hide` markiert und werden ausgeblendet; Schatten entfallen (`index.css`, `@media print`). Neue Chrome-Elemente bekommen `data-print-hide`.

## Tests und Qualitätstore

- Vitest: `npm test` (aus diesem Verzeichnis). Design-Regeln in `src/__tests__/designRules.test.ts`, Kontraste in `src/lib/contrast.test.ts`, Lint-Regel `food/design-tokens` in `eslint-rules/`.
- Playwright (`../e2e`): Projekte `ui-mobile` (390 px) und `ui-desktop` (1440 px) prüfen je Seite genau eine H1, axe (WCAG 2 A/AA, keine schweren Fehler), Tippflächen ≥ 44 px auf dem Phone, horizontales Scrollen bei 320/390/1440 px und Screenshots. Die Seiten stehen in `e2e/tests/ui-pages.ts`.
- Baselines entstehen nur im gepinnten Container: `sh ../e2e/update-ui-baselines.sh` (Podman, Playwright 1.61.1). Lokale Läufe erzeugen keine Referenzen, die in den Commit gehören.
