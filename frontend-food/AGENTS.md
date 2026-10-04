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
- Look „Frisch & offen“: helle Flächen, Karten mit `shadow-card` statt grauem Rahmen, keine Box-in-Box. Primär-Buttons `bg-primary`, Nebenaktionen `bg-primary-soft text-primary`. Keine dunklen Banner oder Verläufe; Seitenköpfe über `PageHeader`.
- Bereichsfarben (`area-recipes`, `area-ingredients`, `area-planner`, `area-shopping`) nur als Tönung in Icon-Kacheln, Navigation und kleinen Akzenten.
- Statusfarben nie als Fläche normaler Aktionen. `bg-warning` (dunkel) ist verboten: Hinweise `bg-warning-soft`, Balken/Punkte `bg-warning-bright`.
- Nutri-Score ausschließlich über `NutriScoreBadge` (Originalfarben); Diagramme über `nutriScoreFill()`. Ein Test erzwingt das.
- Genau fünf Schriftgrößen: `text-caption` (12 px), `text-body` (14), `text-emphasis` (16), `text-section` (20), `text-title` (28); keine freien Werte (`text-[…]`).
- Genau drei Radien: `rounded-lg` (8 px, Bedienelemente), `rounded-xl` (12 px, Karten und Dialoge), `rounded-full` (Pills, Badges, Avatare).
- Überschriften mit `Plus Jakarta Sans`, Fließtext mit `Inter`.
- Icons: nur Lucide, über `Icon` aus `@/components/ui/icon` oder Lucide-Komponenten, Größen 16/20/24/48 px, Strichstärke 2 (16 im Fließtext und in kleinen Buttons, 20 in Buttons und Navigation, 24 in Kopfzeilen, 48 nur in Leerzuständen). Keine Material Symbols und keine Icon-Schrift. Neue Namen für `Icon name="…"` in `ICONS` ergänzen.
- Tabellenzeilen als `CardTable`/`DataCardRow` umsetzen und auf kleinen Viewports stapeln.
- Rezeptbilder ausschließlich mit `RecipeThumbnail` und dem Backend-Feld `image_url` darstellen.

## UI und Fehler

- Markdown statt HTML rendern; kein `dangerouslySetInnerHTML`.
- Laden: inhaltsförmige Skeletons aus `components/ui/skeleton.tsx`, keine ganzseitigen Spinner oder „Laden…“-Texte. Unabhängige Abschnitte über `QuerySection` (Skeleton → Fehler inline → Leer → Inhalt). Paginierte Listen mit `keepPreviousData`.
- Fehler: Texte immer über `getApiErrorMessage`/`ErrorDisplay` (deutsch, nie `error.message` roh). Leerzustand (`EmptyState`) und Fehler getrennt. Formularfehler mit `applyApiFieldErrors` am Feld. Große Abschnitte in `SectionBoundary`.
- Feedback: Toasts nur über `notify` aus `@/lib/notify` (nie direkt `sonner`): „<Objekt> gespeichert/angelegt/gelöscht“, Fehler „<Objekt> konnte nicht … werden“. Kein Toast bei Mikro-Aktionen (Abhaken, Sortieren). Rückgängig mit `UNDO_DURATION_MS`, lange Aktionen mit `notify.promise`. Kein `window.confirm`, sondern `ConfirmDialog`.
- Einfach zuerst: Detailseiten mit Zusammenfassung oben und `CollapsibleSection` darunter; leere Werte ausblenden (`MissingValuesHint`); Filter mit `FilterParts` (höchstens drei Gruppen sichtbar, Rest in `MoreFilters`).
- Permissions ausschließlich aus `can_edit` und `can_delete` der API verwenden.
- Keine TypeScript-`any`, `console.log` oder manuellen Rezeptbild-Fallbacks.
