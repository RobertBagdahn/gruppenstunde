## Why

Der Abgleich vom 27.09.2026 zeigt zwei offene Blöcke aus den Audit-Entscheidungen (`audit-report-food-2026-09-25.md`, Abschnitt 6).

**Essensplan-Integrität:**
- Referenzmahlzeiten können ein Datum tragen und erscheinen dann als eigener Tag („Donnerstag, 1. Januar“).
- Mahlzeiten können außerhalb des Planzeitraums liegen.
- Zutaten-Einträge ohne Menge ergeben still 0 kcal und 0 €.
- Das Cockpit zeigt ein fest verdrahtetes „Ziel: 2.000“ neben dem Spec-Wert 2335 kcal.
- „Vollständig“ (alle Mahlzeiten angelegt) steht neben „Essen reicht nicht“ (zu wenig Energie).
- Der Plan-Check meldet weder Wraps zum Frühstück noch fehlende Mengen.
- Snacks um 15:00 erscheinen nach dem Abendessen um 18:00.

**Zahlenformat:**
- Es gibt drei Formatierungswege: fertige Backend-Texte wie „ca. 64.7 TL“, `formatWeight` und 141 lokale `toFixed()`-Aufrufe.
- Dadurch stehen „70g“, „70 g“, „0.47 €/P.“, „15.0 Personen“ und „270 Rezept“ nebeneinander.
- Front- und Backend runden unterschiedlich (Bankers-Rounding im Backend), und definierte Portionsgewichte („à 125 g“) werden verfälscht („à 130 g“).

**Einkauf und Design (Entscheidungen vom 27.09.2026):**
- Keine der 638 genutzten Zutaten hat eine Packung. Das vorhandene Aufrunden greift deshalb nie, und Flüssigkeiten erscheinen in kg.
- Primär-, Danger- und Warning-Farben verfehlen WCAG AA (3,35:1, 3,78:1, 2,04:1).
- Die von `food-design-system` geforderten Status-Tokens fehlen; es gibt 714 Palettenfarben, 349 freie Schriftgrößen und 7 Radien.
- 60 Dateien nutzen Material Symbols (auch für Aktionen); beim Laden erscheinen Wörter statt Icons.

## What Changes

**Essensplan-Integrität**
- DB-CheckConstraint: Referenzmahlzeiten haben kein Datum. Datenmigration setzt Datum und Uhrzeit bestehender Referenzmahlzeiten auf `NULL`.
- DB-UniqueConstraint: je Plan, Tag und Mahlzeitentyp höchstens eine reguläre Mahlzeit (außer Snack), ergänzend zur bestehenden `clean()`-Prüfung.
- Bereichsprüfung: Neue oder umdatierte reguläre Mahlzeiten müssen im Planzeitraum liegen (HTTP 400). Bestehende Mahlzeiten außerhalb bleiben bearbeitbar und werden gemeldet.
- **BREAKING** Zutaten-Einträge (`MealItem` mit `ingredient_id`) erfordern `quantity > 0` (API 422). Altdaten bleiben erhalten und werden im Plan-Check gemeldet.
- Die Plan-API liefert Referenzmahlzeiten getrennt von den Tagesmahlzeiten (`meals` enthält nur reguläre Mahlzeiten).
- Das kcal-Ziel im Cockpit kommt aus der Norm-Person (2335), die fest verdrahtete 2.000 entfällt.
- Neue Labels:
  - Tagesplanung: „Alle Mahlzeiten geplant“, „Teilweise geplant (x %)“, „Überplant (x %)“.
  - Energie je Mahlzeit: „Energie ok“ / „Zu wenig Energie (x %)“.
- Plan-Check-Regeln: Rezepttyp passt nicht zur Mahlzeit, Menge fehlt oder 0 kcal, Mahlzeit außerhalb des Zeitraums, Tag ohne Mahlzeiten.
- Mahlzeiten eines Tages werden nach Uhrzeit sortiert (Gleichstand: Typ-Reihenfolge).

**Zahlenformat**
- Neues Modul `frontend-food/src/lib/format.ts` (Intl `de-DE`): `formatNumber`, `formatEuro`, `formatWeight`, `formatExactWeight`, `formatCount`, `plural`. Alle UI-Zahlen laufen darüber; ESLint verbietet `toFixed` in `.tsx`.
- **BREAKING** Das Backend liefert für Einkaufs- und Portionsanzeigen strukturierte Zahlen statt fertiger Texte (`display_quantity`, `natural_portions`, `portion_display`, Portions-Optionen `display`); das Frontend formatiert.
- Rundungsstufen werden in der Spec an den Code angeglichen (1–49 g: 1 g, 50–99 g: 5 g, 100–999 g: 10 g, ab 1 kg eine Nachkommastelle). Das Backend rundet kaufmännisch statt mit Bankers-Rounding. Front- und Backend schreiben einheitlich mit Leerzeichen („70 g“).
- Definierte Portionsgewichte („à 125 g“) werden nie gerundet.
- Stück-Äquivalente mit deutschem Komma („≈ 2,5 Stück“).
- Zähler mit korrektem Plural („270 Rezepte“, „1 Plan“, „17 Pläne“).

**Einkauf: kaufbare Packungen**
- Einkaufszeilen zeigen „Gramm zuerst, Packung dahinter“ („1.020 g · 2 × 500-g-Packung“), Überschuss als „+ … g Reserve“.
- Rundung: aufrunden, außer der Überhang beträgt höchstens 5 % einer Packung.
- Quelle ist die Standardpackung (`Package`, Rang 1). Die Spec wird vom bisherigen Portions-Ableiten mit 10 %-Schwelle auf diese Regel umgestellt.
- Packungen, Viskosität und Dichte für die 638 genutzten Zutaten kommen per KI-Batch (vorhandener Cockpit-Mechanismus, ~43 Aufrufe) mit Freigabe durch Staff; manuelle Werte werden nie überschrieben.
- Flüssigkeiten erscheinen in ml/l über die Dichte. Neuer Viskositätswert `liquid` (Öl, Essig, Sahne) neben `beverage`.

**Design-Tokens**
- Kontraste auf WCAG AA: Primär, Danger und Warning-Text bei gleichem Farbton abdunkeln; automatischer Kontrast-Test.
- Semantische Status-Tokens `success`, `warning`, `info`, `danger` mit `-soft`/`-border`/`-foreground` (von der Spec bereits gefordert, im Code fehlend); `chart-*` nur noch für Diagramme; Nutri-Score-Tokens bleiben.
- Fünf Schriftgrößen (12/14/16/20/28 px), nichts unter 12 px.
- Drei Radien (8 px Bedienelemente, 12 px Karten/Dialoge, rund für Pills/Avatare).
- Vollständige Migration (714 Palettenfarben, 349 freie Schriftgrößen, abweichende Radien) und ESLint-Regeln als Fehler.
- Kein Dark Mode, aber Tokens dafür vorbereitet.

**Icons**
- Ausnahmslos Lucide: 80 Material-Symbols-Namen in 60 Dateien werden ersetzt, die Icon-Schrift entfällt aus `index.html`.
- Größen 16/20/24/48 px, Strichstärke 2; Lint verbietet Icon-Schrift und freie Größen; Spec und `frontend-food/AGENTS.md` auf „nur Lucide“.

## Capabilities

### New Capabilities
- `meal-integrity`: DB-Regeln für Referenz- und reguläre Mahlzeiten, Bereichsprüfung, Pflichtmenge für Zutaten-Einträge, getrennte Auslieferung von Referenzmahlzeiten, Sortierung nach Uhrzeit.
- `number-formatting`: zentrales Formatierungsmodul, Pluralisierung, strukturierte Zahlen statt Backend-Texten, Lint-Regel.
- `ingredient-package-suggestions`: KI-Vorschläge für Standardpackung, Viskosität und Dichte genutzter Zutaten mit Freigabe im Cockpit.

### Modified Capabilities
- `quantity-display-formatting`: Rundungsstufen an den Code angeglichen, Leerzeichen zwischen Zahl und Einheit, kaufmännisches Runden im Backend, definierte Portionsgewichte ungerundet.
- `shopping-list-piece-equivalents`: Stückzahl als Zahl in der API und deutsch formatiert in der UI.
- `meal-plan-soll-ist-band`: neue Tages-Labels; das Cockpit-Ziel kommt aus der Norm-Person.
- `meal-planner-actionable-alerts`: vier neue Plan-Check-Regeln.
- `shopping-list-package-display`: Standardpackung statt Portions-Ableitung, 5 %-Toleranz, strukturierte Felder, Flüssigkeiten in Litern.
- `food-design-system`: AA-Kontrast, Status-Tokens mit Varianten, Schrift- und Radius-Skala, nur Lucide mit fester Größen-Norm, Durchsetzung per ESLint.

## Impact

- **Backend:**
  - `planner/models/meal_plan.py` (Constraints, `clean()`), neue Migration (Datenbereinigung Referenzmahlzeiten + Constraints)
  - `planner/api/meal_plan.py` (Bereichsprüfung, Pflichtmenge, Plan-Check, getrennte Referenzmahlzeiten), `planner/api/ref_meal.py`
  - `supply/services/shopping_service.py`, `supply/utils.py` (`format_weight`), `shopping/api.py`
  - `planner/services/pdf_export.py` (nutzt die Backend-Formatierung weiter)
- **Pydantic:**
  - `planner/schemas/meal_plan.py`: `MealItemCreateIn`/`RefMealItemIn` Validator, `MealPlanDetailOut.ref_meals`, `PlanCheckAlertOut`-Typen, strukturierte Anzeigefelder
  - `shopping/schemas.py`: `display_quantity`/`natural_portions` → strukturierte Felder
- **Zod:** `frontend-food/src/schemas/mealPlan.ts`, `frontend-food/src/schemas/shoppingList.ts`, Portions-Options-Schema in `frontend-food/src/schemas/supply.ts`.
- **Frontend (nur `frontend-food`):**
  - neues `src/lib/format.ts`
  - `components/planning/MealPlanBudgetCockpit.tsx`, `components/planning/PlanCheckFlyout.tsx`, `components/shared/ListPageHero.tsx`
  - `pages/planning/MealSlot.tsx`, `DayPlanView.tsx`, `ShoppingView.tsx`, `TableView.tsx`
  - `pages/shopping/ShoppingListDetailPage.tsx`, `pages/recipes/RecipeDetailPage.tsx`
  - alle Dateien mit `toFixed` (141 Stellen), ESLint-Konfiguration
- **Migration:** eine Planner-Migration: `RunPython` (Referenzmahlzeiten ohne Datum), danach `AddConstraint` ×2. Vorab-Prüfung auf doppelte reguläre Mahlzeiten (lokal 0).
- **Prod:** Die Migration ist Teil des gesammelten Prod-Runbooks. Die Mahlzeit außerhalb des Zeitraums (lokal #168) wird nur gemeldet, nicht verändert.
- **Backend zusätzlich:** `supply/choices.py` (Viskosität `liquid`), `supply/utils.py` (`get_shopping_portion`/Packungsrechnung), `supply/services/data_offensive*.py` (Packungsvorschläge), Model für Vorschläge + Migration, Cockpit-API.
- **Frontend zusätzlich:** `src/index.css`, `tailwind.config.ts`, `index.html` (Icon-Schrift entfernen), `eslint.config.js`, Styleguide-Seite, Cockpit-Tab „Packungen“, alle Komponenten mit Palettenfarben/freien Größen/Material Symbols (~120 Dateien).
- **Nicht enthalten:** Dark Mode, Tabellenlayout der Listen, Neuordnung der Rezeptdetailseite.
