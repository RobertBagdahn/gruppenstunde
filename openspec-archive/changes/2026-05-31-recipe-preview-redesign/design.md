## Context

Die Rezept-Erstellung im Food-Frontend nutzt einen 3-Schritt-Wizard (`ContentStepper`). Schritt 3 zeigt eine Vorschau vor dem Speichern. Aktuell ist diese Vorschau eine kompakte Card mit Gradient-Header, Badges und Chips — visuell stark abweichend von der Rezept-Detailseite (`RecipeDetailPage`).

Betroffene Dateien:
- `frontend-food/src/components/content/ContentStepper.tsx` (Zeilen 691–766): Generische Preview-Sektion
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx` (`renderPreviewExtras`): Rezept-spezifische Vorschau-Erweiterungen

## Goals / Non-Goals

**Goals:**
- Vorschau soll ähnliches Layout wie die Detailseite haben (Sektionen, Zutaten-Liste, KPI-Grid)
- Nutzer bekommt realistischen Eindruck vom fertigen Rezept
- Rezept-spezifische Vorschau-Logik in `renderPreviewExtras` erweitern

**Non-Goals:**
- Keine 1:1-Kopie der Detailseite (kein Sidebar, keine Interaktivität)
- Keine Nährwert-/Nutri-Score-Berechnung (erst nach Speichern verfügbar)
- Keine Preis-Analyse
- Kein Refactoring der Detailseite selbst
- Keine Änderung am generischen ContentStepper-Preview für andere Content-Typen (Blog, Game, Session)

## Decisions

1. **Eigenständige Vorschau-Komponente, kein Reuse der DetailPage**
   Die `RecipeDetailPage` ist stark an API-Daten (useQuery, Recipe-ID) gekoppelt. Statt sie zu refactoren, bauen wir die Vorschau eigenständig um. Ähnliches Layout, aber eigener Code.

2. **Layout-Struktur der neuen Vorschau:**
   ```
   ┌─────────────────────────────────────────┐
   │  Gradient-Header (Titel + Zusammenfassung)│
   ├─────────────────────────────────────────┤
   │  Rezepttyp + Portionen (Badges)          │
   ├─────────────────────────────────────────┤
   │  KPI-Grid 2×2                            │
   │  (Schwierigkeit, Kochzeit, Kosten, Vorb.)│
   ├─────────────────────────────────────────┤
   │  § Zutaten                               │
   │  • Menge Einheit Name                    │
   │  • Menge Einheit Name                    │
   ├─────────────────────────────────────────┤
   │  § Zubereitung                           │
   │  (Markdown-gerendert)                    │
   ├─────────────────────────────────────────┤
   │  § Tags + Pfadfinderstufen               │
   └─────────────────────────────────────────┘
   ```

3. **Generischer ContentStepper bleibt unverändert für Header/Navigation**
   Die Änderung betrifft primär `renderPreviewExtras`. Der Gradient-Header und die Stepper-Navigation bleiben wie sie sind.

4. **Zutaten als vertikale Liste statt Chips**
   Jede Zutat auf eigener Zeile mit Menge, Einheit und Name — wie in der Detailseite.

5. **KPI-Grid als 2×2 Raster**
   Statt horizontaler Pill-Reihe werden die KPIs (Schwierigkeit, Kochzeit, Kosten, Vorbereitungszeit) in einem Grid mit Icons und Labels dargestellt.

## Risks / Trade-offs

- **Drift über Zeit**: Die Vorschau ist nicht automatisch an Detailseite-Änderungen gekoppelt. Akzeptabel für jetzige Projektphase.
- **ContentStepper-Generik**: Die generische Preview im ContentStepper (KPI-Badges, Tags, Beschreibung) wird teilweise durch `renderPreviewExtras` überlagert. Mögliche Verwirrung bei Weiterentwicklung anderer Content-Typen. Lösung: Rezept-Vorschau überschreibt die KPI-Sektion komplett via `renderPreviewExtras`.
