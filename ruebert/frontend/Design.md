# Design.md – Rübert Layout D („Triage Nacht“)

Verbindliche Design-Vorgabe für das Frontend von Version 2. Gewählt von Robert am 12.10.2026 aus sechs
Entwürfen (A–F) im Claude-Design-Canvas „Rübert Startseite – 3 Richtungen“ (Seite „Rübert · Seiten
(Layout D)“). Daniel hatte zuvor die Triage-Richtung (B) vor dem Kontrollraum (C) bevorzugt; D vereint
beide. Code-Stand: [`src/styles/tokens.css`](src/styles/tokens.css),
[`tailwind.preset.ts`](tailwind.preset.ts), [`src/components/layout/`](src/components/layout/).

## Grundsatz

- **Ausnahmen zuerst.** Rübert erledigt Routine; die Oberfläche zeigt Entscheidungen, nicht Datenberge.
- **Desktop zuerst, dunkel, dicht.** Daniel arbeitet am Desktop. Ab 320 px bleibt alles nutzbar
  (Sidebar rutscht über den Inhalt, Tabellen scrollen in ihrer Box) – UI-14.
- **Navigation, Filter und Einstellungen stehen in der Sidebar.** Der Inhaltsbereich enthält keine
  Filterleisten; höchstens eine Zeile mit aktiven Filter-Chips und eine Sortierung.
- **Datenstand ist immer sichtbar.** Die Kopfzeile zeigt den Datenfluss Vario → Import → Forecast →
  Ampel mit Uhrzeit und Status (MON-11). Fehler, die Entscheidungen beeinflussen, werden dort gelb oder rot.

## App-Shell

```
┌──────────────┬───────────────────────────────────────────────────────────┐
│ Sidebar 240  │ Kopfzeile 52: Bereich › Seite · Datenfluss · Status · Datum │
│              ├───────────────────────────────────────────────────────────┤
│ Marke + KW   │                                                           │
│ Navigation   │   Seiteninhalt (Muster siehe unten)                       │
│ Filter       │                                                           │
│ Ansicht      │                                                           │
│ Nutzer       │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
```

| Teil | Regel |
|---|---|
| Sidebar | 240 px, `bg-shell`, rechte Kante `border-border`. Nicht sticky, kein `100vh`-Zwang; bei schmaler Breite bricht sie über den Inhalt um (`flex-wrap`). |
| Marke | Logo, „RÜBERT“ (Versalien, Sperrung 0,04 em), rechts die aktuelle KW. Link zur Startseite. |
| Navigation | Drei Gruppen: **Arbeiten** (Entscheidungen, Artikel, Bestellplaner, Fremdmarke), **Analyse** (Prognosegüte, Sets & Bundles), **Daten** (Fall-Inbox, OOS-Monitor, Daten & Läufe, Ereignisse). Zähler rechts; gelber Zähler nur für offene Entscheidungen. Aktiver Eintrag: `bg-row-active` und 2 px Akzentkante links. |
| Filter | Je Seite eigener Abschnitt mit „Zurücksetzen“. Bausteine: Liste (Queue-Typ, Bereiche), Segment (2–3 Optionen), Checkliste mit Ampelpunkt und Zähler, Auswahl, Tasten (Drehklasse). Filterzustand steht in der URL (UI-12). |
| Ansicht | Seitenbezogene Schalter und Kennwerte (z. B. Servicegrad, Tastenkürzel). Fachliche Einstellungen selbst liegen auf `/settings`. |
| Nutzer | Avatar, Name, Rolle, Link zu Einstellungen. |
| Kopfzeile | 52 px, `bg-shell`. Links Brotkrumen (Bereich › Seite), rechts Datenfluss-Pills, Link „Statusansicht“, Datum in Mono-Versalien. |

## Seitenmuster

| Muster | Einsatz | Aufbau |
|---|---|---|
| **Triage** | Start (Entscheidungen), Fall-Inbox, Fremdmarke | Ampel-Kennzahlen als Streifen; darunter Liste links (≥ 320 px, `bg-sunken`) und Detail rechts. Detail: Kopf → Vorschlag von Rübert → Diagramm → Fakten → Herleitung. Tastatur `J/K` wechseln, `↵` übernehmen, `Z`/`S` zurückstellen. |
| **Liste** | Artikel, Sets, Läufe | Seitenkopf mit Suche und Aktionen, Chips der aktiven Filter, Segment für Sortierung, Grid-Tabelle in `panel`, Fußzeile mit Paginierung. |
| **Detail** | Artikel-Detail | Zurück-Link, Tags, Titel, Aktionen; Vorschlag; Fakten; großes Diagramm; Herkunft des Bedarfs (Direkt/Sets/Kanäle); Herleitung; Modellvergleich; Ereignisse und Korrekturen. |
| **Planung** | Bestellplaner | Kennzahlen, Hinweis, Positionstabelle mit Mengen-Stepper (nur zulässige Raster), Abweichung zum Vorschlag, Risiko, Rest. Keine Szenario-Rechnung (Daniel). |
| **Zeitachse** | OOS-Monitor, Ereignisse | Wochen- oder Monatsraster mit Spuren; Klick wählt, Detail darunter. |
| **Formular** | Einstellungen | Bereiche in der Sidebar, Zeilen „Bezeichnung + Hilfe · Feld · Status (bestätigt / offen Q-xxx)“, Speichern ins Journal. |

## Tokens

Alle Farben als HSL-Variablen in `tokens.css`; Tailwind liest sie über `tailwind.preset.ts`. Keine
hart codierten Farben in Komponenten.

| Token | Wert | Verwendung |
|---|---|---|
| `background` | `#0a0f17` | Seitengrund |
| `shell` | `#0d131d` | Sidebar, Kopfzeile, Kennzahlen-Streifen |
| `panel` | `#111827` | Karten, Tabellen, Eingaben |
| `sunken` | `#0b111b` | Listenspalte im Triage-Muster |
| `row-hover` / `row-active` | `#0f1622` / `#16202f` | Zeilenzustände |
| `border` / `border-row` / `border-strong` | `#1f2937` / `#182030` / `#374151` | Linien |
| `foreground` / `foreground-strong` | `#e5e7eb` / `#f9fafb` | Text / Titel und Zahlen |
| `foreground-2` / `muted-foreground` | `#cbd5e1` / `#9ca3af` | Sekundärtext / Beschriftung |
| `accent` / `accent-foreground` | `#4ade80` / `#06210f` | Primäraktion, aktive Navigation |
| `accent-soft` / `accent-border` / `accent-text` | `#0f1d16` / `#2f6b47` / `#86efac` | „Vorschlag von Rübert“ |
| `link` | `#93c5fd` | Links |
| `warning-soft` / `warning-border` | `#1c1608` / `#5b3b0c` | Hinweise, gelbe Pipeline-Stufe |
| `traffic-red/-yellow/-green/-blue` | `#f87171` / `#fbbf24` / `#4ade80` / `#60a5fa` | **nur** Ampelpunkt, `TrafficLightBadge`, Diagramme |
| `chart-band` / `chart-oos` / `chart-grid` | `#1d3a2a` / `#3a1c1f` / `#1a2333` | P10–P90-Band, „ohne Bestellung ausverkauft“, Gitter |

**Typografie:** `Geist` für Text, `Geist Mono` (tabellarische Ziffern) für alle Zahlen, SKUs, KW und
Uhrzeiten. Fünf Größen: `caption` 12, `body` 14, `emphasis` 16, `section` 20, `title` 24. Dazu zwei
Varianten: `label` 11 Versalien (Sperrung 0,08 em) für Abschnittstitel, `dense` 13 für Tabellenzeilen.

**Radien:** `sm` 4 px (Tags), `md` 6 px (Bedienelemente), `lg` 10 px (Panels), `full` (Punkte, Chips).

**Icons:** Lucide, Strichstärke 2, 16 px in Navigation und Buttons, 14 px in Feldern.

## Komponenten

| Baustein | Regel |
|---|---|
| `AppLayout` | Shell aus Sidebar und Kopfzeile; jede Seite rendert sich darin und übergibt `filters` und `settings` für die Sidebar. |
| `Sidebar`, `SidebarSection` | Navigation ist fest im Code ([`navigation.ts`](src/components/layout/navigation.ts)); Seiten liefern nur Filter und Ansicht. |
| `Topbar`, `DataPipeline` | Bereich und Seite als Brotkrumen; Pipeline-Stufen mit Status `ok`, `warn`, `error`. |
| `KpiStrip` | Ampel-Kennzahlen mit Wochenverlauf (12 Wochen) und Änderung zur Vorwoche. |
| `QueueItem` | Ampelpunkt, Titel, Termin; zweite Zeile Typ-Tag (`Bestellen`, `Freigeben`, `Fall`) und Kontext. |
| `RecommendationPanel` | „Vorschlag von Rübert“: Titel = Handlung („Bis KW 44 bestellen · 15.000 Tüten“), Unterzeile = Begründung oder Alternative, Aktionen mit Tastenkürzel. |
| `ForecastChart` | Absatz durchgezogen, P50 gestrichelt im Akzent, Band P10–P90, rote Fläche ab „ohne Bestellung ausverkauft“, Markierungen Heute, Jahreswechsel, Ostern, Saisonstart 20.03. (UI-04). |
| `ExplanationWaterfall` | Horizontale Balken je Schritt; positive Beiträge Akzent, Abzüge Gelb, Endwert im Raster. |
| `QuantityStepper` | Nur zulässige Mengen (Eigenmarke 5.000er-Raster, Fremdmarke Packeinheit). Keine freie Eingabe, keine stille Rundung. |
| `TrafficLightBadge` | Einzige Darstellung der Ampelfarbe – immer mit Text oder `aria-label`. |
| `DataTable` | CSS-Grid-Zeilen (`--cols`), Kopf in `label`-Schrift, Zahlen rechtsbündig in Mono, horizontales Scrollen in der Box. |

## Regeln und Fallen

- Ampelfarben nie für Dekoration oder Aktionen verwenden; die Primäraktion ist Akzent-Grün, Ampel-Grün
  erscheint nur als Punkt mit Text.
- Unsicherheit nur hervorheben, wenn sie die Entscheidung ändert (Daniel, 7B).
- Zahlen deutsch formatieren, ganzzahlig, Tausenderpunkt (UI-07). Artikel immer „Name“ plus SKU, verlinkt (UI-06).
- Kontrast: Text ≥ 4,5:1 auf `panel` und `shell`; `muted-foreground` nicht unter 12 px.
- Interaktive Elemente sind echte `button`/`a`/`input`; Zeilen, die navigieren, sind Links.
- Nur dunkles Theme in Version 2.0. Ein helles Theme entsteht später ausschließlich durch neue Werte in
  `tokens.css`, nicht durch Änderungen in Komponenten.
