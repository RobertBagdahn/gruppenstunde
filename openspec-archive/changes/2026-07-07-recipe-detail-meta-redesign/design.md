## Context

Die Rezept-Detailseite (`RecipeDetailPage.tsx`) rendert eine Action-Button-Zeile (Drucken/Bearbeiten/Löschen) mit Material-Symbols-Ligaturen (`<span className="material-symbols-outlined">print</span>`). Lädt der Font nicht (z.B. langsame Verbindung, Extraction-Tools, Print-Kontext), zeigt der Browser das Ligatur-Schlüsselwort als Klartext an — sichtbar neben dem deutschen Label. Die Seitenleisten-Komponente `RecipeMetaCard.tsx` zeigt Gesamtkosten, Nutri-Score und 6-7 Fakten in einem engen 2-Spalten-Grid mit kleiner Typografie.

Dies ist eine reine Presentational-Änderung an zwei bestehenden React-Komponenten, ohne API-, Schema- oder Datenbank-Auswirkungen.

## Goals / Non-Goals

**Goals:**
- Icon-Font-Ligaturen in den drei Action-Buttons durch `lucide-react`-Komponenten ersetzen (konsistent mit dem Rest der App, z.B. bereits in `RecipeMetaCard`).
- Action-Buttons kompakter und rechtsbündig neben dem Titel darstellen statt als eigene volle Button-Zeile.
- `RecipeMetaCard` visuell aufwerten: größere Preis-Typografie, rundes Nutri-Score-Badge, klare Gruppierung, konsistente Icon-Container.
- Sticky-Verhalten und Skeleton-Loading-State für die Meta-Card ergänzen.

**Non-Goals:**
- Keine Änderung an Datenstruktur, API-Response oder Berechnung von Preis/Nutri-Score.
- Kein Redesign der übrigen Detailseite (Zutaten, Zubereitung, Analyse-Tabs) — nur Titel-Actions-Zeile und Sidebar-Meta-Card.
- Kein Wechsel des Icon-Systems in anderen Seiten (Scope bleibt auf die zwei betroffenen Dateien beschränkt).

## Decisions

- **Icons: `lucide-react` statt `material-symbols-outlined`.** Grund: `lucide-react` ist bereits Standard-Icon-Bibliothek im Projekt (siehe `RecipeMetaCard`, viele andere Components) und rendert als SVG-Component ohne Font-Abhängigkeit — kein Risiko von sichtbarem Ligatur-Text. Alternative (Font-Preload erzwingen) wurde verworfen, da sie das Grundproblem (Text-Fallback) nicht behebt.
- **Action-Buttons als quadratische Icon-Buttons (`w-9 h-9`) statt Text+Icon-Pills.** Grund: kompakter, passt neben den Titel in dieselbe Zeile, `title`-Attribut und `aria-label` erhalten die Zugänglichkeit ohne sichtbaren Text.
- **Titel + Buttons in einer Flex-Row (`justify-between`).** Grund: reduziert vertikalen Platzverbrauch, rückt die Buttons sichtbar "nach rechts" (Nutzeranforderung).
- **`RecipeMetaCard`: größere Preis-Zeile (`text-3xl`) + rundes Nutri-Score-Badge.** Grund: Preis und Nutri-Score sind die wichtigsten Kennzahlen und sollen visuell dominieren; rundes Badge ist ein gängiges Score-Pattern (z.B. Ampel/Score-Kreise in anderen Teilen der App).
- **Sticky-Positionierung nur auf Desktop (`lg:sticky lg:top-20`).** Grund: auf Mobile ist die Sidebar ohnehin unter dem Content gestapelt (siehe bestehendes Mobile-Layout-Requirement), Sticky würde dort keinen Mehrwert bieten und Platz verschwenden.

## Risks / Trade-offs

- [Risk] Entfernen der sichtbaren Text-Labels (nur noch Icons) reduziert Erkennbarkeit für neue Nutzer → Mitigation: `title`-Tooltip und `aria-label` bleiben erhalten; Icons (Printer/Pencil/Trash2) sind allgemein verständliche Symbole.
- [Risk] Sticky-Sidebar kann bei sehr langem Content zu Überlappungen mit Footer führen → Mitigation: `sticky` mit `top-20` und impliziertem Ende durch Grid-Höhe der übergeordneten `<article>`; visuell in Review prüfen.
- [Risk] Größeres Meta-Card-Layout benötigt mehr vertikalen Platz in der Sidebar → Mitigation: bereits vorhandenes Grid bleibt 2-spaltig, nur Innenabstände/Typografie wachsen moderat.

## Migration Plan

Kein Migrationsbedarf (reine Frontend-Presentational-Änderung, kein Feature-Flag nötig). Deployment über normalen Frontend-Build/Release-Zyklus.
