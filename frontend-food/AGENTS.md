# Food-Frontend-Agent-Regeln

Für projektweite Regeln siehe `../AGENTS.md`. Fachliche Anforderungen gehören in OpenSpec; diese Datei beschreibt die Implementierung des Food-Frontends.

## Architektur

- React, TypeScript im Strict-Modus, shadcn/ui, TanStack Query und Zod verwenden.
- Server-State gehört in TanStack Query; Client-State nur minimal in Zustand.
- Zod-Schemas müssen mit den Backend-Pydantic-Schemas synchron sein.
- Mobile-first ab 320px entwickeln und testen.
- Für neue UI-Komponenten zuerst den `/styleguide` prüfen.

## Design-System

- Farben und Flächen über HSL-CSS-Variablen und semantische Theme-Tokens steuern; keine hartcodierten Tailwind-Palettenfarben. Status nur über `success`, `warning`, `danger`, `info` (mit `-soft`, `-border`, `-foreground`, `-bright`); `chart-*` nur in Diagrammen.
- Look „Feldküche“: salbeigrüner Grund (`bg-background`), weiße Karten mit `shadow-card` statt grauem Rahmen, keine Box-in-Box, ein kiefergrünes Kopfband und Tomatenrot als kleiner Akzent. Primär-Buttons `bg-primary`, Nebenaktionen `bg-primary-soft text-primary`. Keine Verläufe.
- Kopfband: Navigation und Seitenkopf bilden zusammen ein `bg-hero`-Band (`HeroBand`). Seitenköpfe immer über `PageHeader` (Listen) oder `HeroBand` (Detailseiten); Text darauf `text-hero-foreground`, Zweittext `text-hero-muted`, Chips und Icon-Buttons `bg-hero-soft`, helle Aktion `bg-hero-foreground text-foreground`. `bg-hero` ist die einzige dunkle Fläche und nur für dieses Band, aktive Tabs und Overlays erlaubt. Kennzahlen dürfen die Unterkante des Bands überlappen (`overlap`, `HeroOverlap`).
- Akzent `spice` (Tomate): Kosten, Logo-Kachel und kleine Hervorhebungen, `bg-spice-soft`/`text-spice-foreground` für Chips. Nie als große Fläche oder als Status.
- Bereichsfarben (`area-recipes`, `area-ingredients`, `area-planner`, `area-shopping`) nur als Tönung in Icon-Kacheln, Navigation und kleinen Akzenten.
- Statusfarben nie als Fläche normaler Aktionen. `bg-warning` ist verboten: Hinweise `bg-warning-soft`, Balken/Punkte `bg-warning-bright`.
- Nutri-Score ausschließlich über `NutriScoreBadge` (Originalfarben); Diagramme über `nutriScoreFill()`. Ein Test erzwingt das.
- Genau sieben Schriftgrößen: `text-caption` (12 px), `text-body` (14), `text-emphasis` (16), `text-section` (20), `text-title` (28), `text-metric` (32, nur Kennzahlen) und `text-display` (fluid 36–64 px, nur Seitentitel im Kopfband); keine freien Werte (`text-[…]`).
- Genau drei Radien: `rounded-lg` (10 px, Bedienelemente), `rounded-xl` (16 px, Karten und Dialoge), `rounded-full` (Pills, Badges, Avatare, Stepper).
- Überschriften und Zahlen in Kennzahlen mit `Bricolage Grotesque` (`font-display`), Fließtext mit `Figtree`. Zahlen sind tabellarisch (`tabular-nums` ist global gesetzt).
- Icons: nur Lucide, über `Icon` aus `@/components/ui/icon` oder Lucide-Komponenten, Größen 16/20/24/48 px, Strichstärke 2 (16 im Fließtext und in kleinen Buttons, 20 in Buttons und Navigation, 24 in Kopfzeilen, 48 nur in Leerzuständen). Keine Material Symbols und keine Icon-Schrift. Neue Namen für `Icon name="…"` in `ICONS` ergänzen.
- Tabellenzeilen als `CardTable`/`DataCardRow` umsetzen und auf kleinen Viewports stapeln.
- Rezeptbilder ausschließlich mit `RecipeThumbnail` und dem Backend-Feld `image_url` darstellen.

## Bewegung und Übergänge

- Seitenwechsel: `FoodLayout` spielt pro Seite `animate-page-in` ab und scrollt nach oben; Filter-, Tab- und Pagination-Änderungen (Query-String) behalten die Seite.
- Listen, Kartenraster und Abschnittsstapel bekommen `stagger` (Kinder blenden nacheinander ein, `animate-rise`); nie auf Listen mit mehr als ca. 12 sichtbaren Kindern pro Seite ohne Paginierung.
- Geänderte Kennzahlen (Portionen, Summen) bekommen `animate-pop` mit `key` auf den Wert. Tippbare Elemente: `press` (kleines Eindrücken). Karten: `card-hover`. Auf-/Zuklappen: `animate-in fade-in-0 slide-in-from-top-1 duration-300`.
- Dauer 100–420 ms, Easing `ease-out`; keine Endlos-Animationen außer Lade-Indikatoren. Jede Animation muss unter `prefers-reduced-motion` abschalten (`index.css` deckt `animate-*`, `stagger`, `press`, `card-hover` ab; neue Klassen dort ergänzen).
- Dialoge und Sheets blenden mit abgedunkeltem, leicht unscharfem `bg-hero/60`-Overlay ein; Mobile-Aktionsleisten fahren mit `animate-sheet-up` ein.

## UI und Fehler

- Markdown statt HTML rendern; kein `dangerouslySetInnerHTML`.
- Laden: inhaltsförmige Skeletons aus `components/ui/skeleton.tsx` (Lichtschimmer statt Pulsieren; `onHero` auf dem Kopfband), keine ganzseitigen Spinner oder „Laden…“-Texte. `PageSkeleton` zeichnet Kopfband, Kennzahlen und Inhalt in der Form der echten Seite, damit nichts springt. Vor dem Start zeigt `index.html` einen grünen Boot-Bildschirm mit Logo, bis React gemountet ist. Unabhängige Abschnitte über `QuerySection` (Skeleton → Fehler inline → Leer → Inhalt). Paginierte Listen mit `keepPreviousData`.
- Fehler: Texte immer über `getApiErrorMessage`/`ErrorDisplay` (deutsch, nie `error.message` roh). Leerzustand (`EmptyState`) und Fehler getrennt. Formularfehler mit `applyApiFieldErrors` am Feld. Große Abschnitte in `SectionBoundary`.
- Feedback: Toasts nur über `notify` aus `@/lib/notify` (nie direkt `sonner`): „<Objekt> gespeichert/angelegt/gelöscht“, Fehler „<Objekt> konnte nicht … werden“. Kein Toast bei Mikro-Aktionen (Abhaken, Sortieren). Rückgängig mit `UNDO_DURATION_MS`, lange Aktionen mit `notify.promise`. Kein `window.confirm`, sondern `ConfirmDialog`.
- Einfach zuerst: Detailseiten mit Zusammenfassung oben und `CollapsibleSection` darunter; leere Werte ausblenden (`MissingValuesHint`); Filter mit `FilterParts` (höchstens drei Gruppen sichtbar, Rest in `MoreFilters`).
- Permissions ausschließlich aus `can_edit` und `can_delete` der API verwenden.
- Keine TypeScript-`any`, `console.log` oder manuellen Rezeptbild-Fallbacks.
