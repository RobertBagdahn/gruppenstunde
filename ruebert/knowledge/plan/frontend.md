---
type: plan
title: "Frontend"
description: "Seiten, Routen, Komponenten und Design-System des React/TypeScript-Frontends, übernommen aus dem Food-Frontend und angepasst an Flower-Demand."
tags: [plan, frontend, react, typescript, design-system]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [food-frontend]
---

# Frontend

## Kurzfassung

Das Frontend wird nach dem Vorbild von `gruppenstunde/frontend-food` gebaut: React 18, TypeScript
strict, Vite, Tailwind mit HSL-Design-Tokens, shadcn/ui, TanStack Query, Zod und React Router. Layout,
Komponenten und Regeln (Skeletons statt Spinner, `ErrorDisplay`, `notify`, `ConfirmDialog`,
`QuerySection`, URL-Zustand) werden übernommen. Neu für Flower-Demand sind Ampel-Tabellen,
Prognosediagramme mit Bändern, Wasserfall-Erklärungen und die Fall-Inbox. Das Erscheinungsbild ist
**Layout D „Triage Nacht“** (Robert, 12.10.2026): dunkel, Sidebar mit Navigation, Filtern und
Einstellungen, Kopfzeile mit Datenfluss. Vorgabe: `frontend/Design.md`.

## Inhalt

- [Was aus dem Food-Frontend übernommen wird](#was-aus-dem-food-frontend-übernommen-wird)
- [Seiten und Routen](#seiten-und-routen)
- [Neue Komponenten](#neue-komponenten)
- [Design-Tokens](#design-tokens)
- [Prototyp-Stand (Rübert-Demo)](#prototyp-stand-rübert-demo)
- [Struktur und Regeln](#struktur-und-regeln)

## Was aus dem Food-Frontend übernommen wird

| Bereich | Übernahme |
|---|---|
| Layout | `AppLayout` nach Layout D statt `FoodLayout`: Sidebar mit Navigation, Seitenfiltern und Ansicht; Kopfzeile mit Brotkrumen und Datenfluss; Prefetch bei Hover, `RouteBoundary` je Seite, `lazyPage` |
| Seitenkopf | `PageHeader` mit Bereich, Titel, Untertitel, Aktionen |
| Daten laden | TanStack-Query-Hooks in `src/api/`, `QuerySection` (Skeleton → Fehler → Leer → Inhalt), `keepPreviousData` |
| Fehler | `getApiErrorMessage`, `ErrorDisplay`, `SectionBoundary`, `applyApiFieldErrors` |
| Feedback | `notify` statt `sonner` direkt; `ConfirmDialog` statt `window.confirm` |
| Listen | `CardTable`/`DataCardRow`, `FilterParts` (max. drei Gruppen sichtbar), `Pagination`, URL-Zustand |
| Detailseiten | Zusammenfassung oben, `CollapsibleSection` darunter, `MissingValuesHint` |
| Styleguide | Route `/styleguide` mit allen Komponenten |
| Tests | Vitest + Testing Library, Playwright, `designRules.test.ts`, ESLint-Regeln für Tokens |

## Seiten und Routen

| Route | Seite | Anforderungen |
|---|---|---|
| `/` | Start: Live-Ampel, Änderungen, offene Fälle, Vorschläge zur Freigabe | MON-01 … MON-14 |
| `/products/:sku` | Artikel: Historie, Prognose, Erklärung, Bestand, Fälle | UI-02, PRG-10 |
| `/order-plans` · `/order-plans/:id` | Bestellplaner Eigenmarke, Szenarien, Vergleich, Freigabe | BEM-01 … BEM-21 |
| `/supplier-orders` | Bestellvorschläge Fremdmarke je Lieferant | BFM-01 … BFM-10 |
| `/forecast-quality` | Prognosegüte, Backtests, Läufe | UI-03, PRG-17 |
| `/overview` | Jahresschätzung, Trends, Kategorien | UI-10 |
| `/sets` | Sets & Bundles: welche Sets binden die meisten Komponenten | Ansichten-Entscheidung 5 |
| `/data/cases` | Fall-Inbox | DAT-07, UI-11 |
| `/data/stockouts` | OOS-Monitor: erkannte Ausverkaufsphasen mit Korrektur | MON-15, UI-18 |
| `/data/quality` | „Daten & Läufe“: Datenfluss, Hinweise, Datenqualität, Importe, Läufe, Rebuild-Status | DAT-24 … DAT-28 |
| `/data/events` | Ereigniskalender | DAT-13 |
| `/simulator` | Bestellsimulator | UI-15 |
| `/help` | Erklärungen zu Kennzahlen und Methoden | UI-08 |
| `/settings` | Servicegrad, Schwellen, Rundung, Scope | DAT-29 |

## Neue Komponenten

| Komponente | Zweck |
|---|---|
| `TrafficLightBadge` | einzige Darstellung der Ampelfarbe (wie `NutriScoreBadge` im Food-Frontend, per Test erzwungen) |
| `ProductLabel` | „Name (SKU)“ mit Link, überall gleich |
| `ForecastChart` | Historie, Nachfrage, P10–P90-Band, Markierungen (Jahreswechsel, Ostern, 20.03.), gekappte Werte |
| `ExplanationWaterfall` | Zerlegung einer Prognose in Schritte |
| `QuantityStepper` | Bestellmenge nur in zulässigen Rasterschritten |
| `RiskTable` | Nachbarmengen mit Ausverkaufsrisiko und Rest |
| `CaseCard` | Fallkarte der Fall-Inbox mit Tastenkürzeln |
| `LineageDrawer` | Rückverfolgung einer Zahl bis zur Buchung |
| `NumberFormat` | `fmtInt`, `fmtPct` deutsch, ganzzahlig |

## Design-Tokens

Layout D ersetzt den Look „Frisch & offen“ (ändert UI-09). Die Struktur bleibt: HSL-Tokens, fünf
Schriftgrößen (`caption` 12, `body` 14, `emphasis` 16, `section` 20, `title` 24), drei Radien (4, 6,
10 px), Lucide-Icons, keine hart codierten Farben. Schriften: `Geist` und `Geist Mono` für Zahlen.
Code: `frontend/src/styles/tokens.css` und `frontend/tailwind.preset.ts`.

| Token | Bedeutung |
|---|---|
| `background`, `shell`, `panel`, `sunken` | Seitengrund, Sidebar und Kopfzeile, Karten, Listenspalte |
| `accent` mit `-soft`, `-border`, `-text` | Primäraktion, aktive Navigation, „Vorschlag von Rübert“ |
| `warning-soft`, `warning-border` | Hinweise und gelbe Datenfluss-Stufe |
| `traffic-red/-yellow/-green/-blue` | nur Ampelpunkt, `TrafficLightBadge` und Diagramme |
| `chart-band`, `chart-oos`, `chart-grid` | P10–P90-Band, „ohne Bestellung ausverkauft“, Gitter |

Bereichsfarben (`area-*`) entfallen; die Sidebar gruppiert stattdessen in Arbeiten, Analyse und Daten.

## Prototyp-Stand (Rübert-Demo)

Stand 20.10.2026, Change [`ruebert-demo-prototype`](../../openspec/changes/ruebert-demo-prototype/tasks.md).
Der Prototyp ist die Keimzelle von Version 2 und dient dem Workshop mit Daniel und Elena.

| Route | Stand im Prototyp |
|---|---|
| `/` | Entscheidungen: Ampel-Zähler, Warteschlange, Vorschlag mit Herleitung, Tastatur J/K/↵/Z |
| `/products`, `/products/:sku` | Artikelliste mit Filtern in der URL; Detail mit Prognose, Herkunft, Herleitung, Modellen, Journal |
| `/order-plans` | Bestellplaner Eigenmarke: Zieltermin, Stufe, Mengen-Stepper im 5.000er-Raster, Freigabe mit Rückfrage |
| `/supplier-orders`, `/supplier-orders/:id` | Fremdmarke auf Beispieldaten, Aufstocken auf 100 € |
| `/forecast-quality`, `/sets`, `/sets/:sku` | Modellgüte, Sets nach gebundenen Einheiten |
| `/data/cases`, `/data/stockouts`, `/data/quality`, `/data/events` | Fall-Inbox, OOS-Monitor, Daten & Läufe, Ereignisse |
| `/settings` | Geschäftsparameter mit Status „bestätigt“ oder „offen Q-…“, Änderungen ins Journal |
| `/wiki`, `/wiki/*` | Lesende Wissensansicht über `knowledge/`, `?frage=Q-…` öffnet eine Frage |

Nicht gebaut im Prototyp: `/order-plans/:id` (Szenarien), `/overview`, `/simulator`, `/help`.

Zusätzlich gebaut: Rückmeldungs-Knopf auf jeder Seite (Frage, Bug, Feature-Wunsch, Issue im privaten
Repository, sonst pending im Journal), Präsentationsmodus mit Fragen-Pins (`QuestionPin`, Register
`frontend/src/lib/questionPins.ts`) und die Markdown-Ansicht `MarkdownView`. Die Zod-Schemas
für den Wiki-Baum sind von Hand geschrieben, weil der Generator rekursive Modelle falsch abbildet.

Abweichungen von der Tabelle oben: Die Routen sind ohne Mandanten- und Sitzungslogik; der Prototyp hat
keine Anmeldung, der Nutzer heißt „Demo-Nutzer“ (Einstellung `journal_author`).

## Struktur und Regeln

- `src/api/` (Hooks), `src/schemas/` (generierte Zod-Schemas + Erweiterungen), `src/components/ui`,
  `src/components/shared`, `src/pages/<bereich>/`, `src/lib/`, `src/hooks/`.
- Server-Zustand nur in TanStack Query; Client-Zustand minimal in Zustand (z. B. Szenario-Entwurf).
- Kein `any`, kein `console.log`, kein `dangerouslySetInnerHTML`.
- Frontend-Regeln stehen in `frontend/AGENTS.md`, Design-Entscheidungen in `frontend/Design.md` (wie Food).

## Offene Fragen

- [Q-020: Wie sieht dein idealer Montag aus?](../open-questions/q-020-idealer-montag.md)
- [Q-077: Wie soll Unsicherheit aussehen?](../open-questions/q-077-unsicherheit-darstellung.md)
- [Q-079: Welche Erklärung brauchst du?](../open-questions/q-079-erklaer-tiefe.md)

## Verwandte Seiten

- [Anforderungen Oberfläche und Analyse](../requirements/fa-oberflaeche-und-analyse.md)
- [Quelle: Food-Frontend](../sources/food-frontend.md)
- [Ansichten – Entscheidungen](ansichten-entscheidungen.md)
- [Arbeitsentscheidungen, ADR-09](../sources/arbeitsentscheidungen.md#adr-09-layout-d-triage-nacht)
- [Erklärbarkeit](../forecasting/erklaerbarkeit.md)
- [Zielarchitektur](zielarchitektur.md)
- [Plan für Version 2](index.md)
