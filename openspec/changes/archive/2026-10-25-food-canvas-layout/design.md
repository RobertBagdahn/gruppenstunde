# Design

## Ausgangslage

Die Entwürfe `Main`, `rezepte`, `rezept-detail`, `plaene`, `einkauf` und `zutaten` (Ablage `essensplan-design/project/`) wurden gegen die Seiten im Code gelesen. Ergebnis je Seite:

| Seite | Entwurf | App-Stand |
| --- | --- | --- |
| Startseite | Hero, vier Bereichskacheln, „Weiter planen“, „So funktioniert’s“, „Beliebt“ | Vorhanden (`HomePage.tsx`). Kacheln sind bereits neutral mit Petrol-Icon. Tagesübersicht fehlt. |
| Rezepte | Suchzeile mit „Neues Rezept“, Typ-Chips mit Zählern, Seitenspalte mit aktiven Filtern, Kartenraster | Suche, Neu-Button, Seitenspalte und Raster vorhanden. **Typ-Chips weichen von der Chip-Regel ab (umgesetzt).** Zähler je Typ fehlen. |
| Rezeptdetail | Kopf mit Tags, 440-px-Bild, fünf Kennzahlen, Zutaten, Zubereitung, Seitenspalte mit „Kochen starten“, Steckbrief, „In Essenspläne“ | Vorhanden (`RecipeKeyFigures`, `RecipeSidebar`, `RecipeMetaCard`, `RecipeUsageInMealPlans`). Keine Änderung nötig. |
| Essenspläne | Kennzahlenzeile, Anstehend/Vergangen, Monatsgruppen, Plankarten mit Tages-Balken | Tabs, Monatsgruppen und Norm-Portion-Simulator vorhanden. Kennzahlenzeile und Tages-Balken fehlen (siehe unten). |
| Einkaufsliste | Fortschritt je Abteilung, Kosten mit Budget, Abteilungsblöcke, Einkaufsmodus | `ShoppingListProgress`, Abteilungen (`groupBySection`) und Einkaufsmodus vorhanden. Budgetkarte fehlt. |
| Zutaten | Tabelle mit Spalten Score, kcal, Preis, Seitenspalte mit Nährwertbalken | Kartenraster (`IngredientCard`) und Detailseite mit Nährwertbalken, Saison und Portionen vorhanden. Tabellenansicht und Seitenspalte fehlen. |

## Token-Zuordnung

Die Entwürfe verwenden Hex-Werte. Sie werden nicht übernommen. Jede Farbe wird auf das nächste vorhandene Token in `frontend-food/src/index.css` abgebildet. **Es werden keine Token ergänzt.**

| Entwurf (Hex, Zweck) | Token | Anmerkung |
| --- | --- | --- |
| `#FFFFFF` Seitengrund, Karten | `--background`, `--card` | unverändert |
| `#0F6E7A` Hauptaktion, Balken | `--primary` (Petrol) | nächstes Token |
| `#0A4E57` Überschrift in Petrol, Icon | `--primary-dark` | nächstes Token |
| `#E7F4F5`, `#EAF4F5`, `#F2F9FA` helle Flächen | `--primary-soft` | Sekundäraktion, Panel |
| `#D7EBEE`, `#CFE5E8` Rand | `--primary-soft-border` | |
| `#1A1D1C` Text | `--foreground` | |
| `#4B5552`, `#3F4E50`, `#6A7572` Zweittext | `--muted-foreground` | |
| `#EEF2F1`, `#E3EAD3` Linien | `--line` | nur dekorativ |
| `#FFD54D`, `#FECB02` Sticker | `--sticker` | höchstens ein Sticker je Karte |
| `#DC3A1F`, `#A73A1B` Schrittnummern, Akzent | `--spice`, `--spice-foreground` | nur kleine Akzente |
| Rezepttyp-Tönungen (`#FFE6DD`, `#EEF3E2`, `#F0E6FF`, `#E0ECFF`, `#FCE7F0`, `#FFF1D1`) | `--category-*` | nur für Rezepttypen |
| Nutri-Score `#038141`, `#85BB2F`, `#FECB02`, `#EE8100`, `#E63E11` | `NutriScoreBadge` / `--nutri-*` | nur über die Komponente |
| Warnung `#7A4F00`, Fehler `#9D2A62` | `--warning-*`, `--danger-*` | nur Hinweise, keine Flächen |

## Konflikte mit der Spezifikation

1. **Farbige Kachelflächen außerhalb der Rezepttypen** (Startseite-Kacheln, Plan-Kennzahlen, Einkaufs-Abteilungen, Zutaten-Kennzahlen, Plan-Typen „Lager“, „Fahrt“, „Gruppenstunde“). Die Regel `food-category-colour-usage` verbietet Tönungen außerhalb der Rezepttypen. **Umgang:** neutral (weiße Fläche, Petrol-Icon oder Petrol-Schrift). Nicht umgesetzt, weil bereits so vorhanden oder nicht geplant.
2. **Farbige Schatten** (`rgba(15,110,122,…)`, `rgba(167,58,27,…)` usw.). Die Entwürfe verwenden sie; die Regel erlaubt nur neutrale Tokens. **Umgang:** nur `shadow-card`, `shadow-soft`, `shadow-raised`. Nicht umgesetzt.
3. **Gefüllter aktiver Rezepttyp-Chip** (`#A73A1B`, Entwurf „Warme Mahlzeit“ aktiv). Die Chip-Regel verlangt Petrol-Rand und Petrol-Schrift ohne gefüllte Fläche. **Umgang:** Regel gilt. Umgesetzt.
4. **Mehrere Sticker- und Typfarben auf einer Karte** (Entwurf „Beliebt“ mit Sticker plus Buchstabenmarke plus Typtönung). **Umgang:** eine Typmarke über `RecipeTypeTag`, ein Sticker, Nutri-Score nur über `NutriScoreBadge`. Bereits so umgesetzt.
5. **Ausgeblendete Nutri-Buchstaben** (Entwurf mit `opacity`). Die Nutri-Score-Regel verlangt die Originalfarben über `NutriScoreBadge`. **Umgang:** nicht übernommen.
6. **Platzhalterbilder** (graue Fläche mit Symbol „Rezeptbild“). **Umgang:** `RecipeThumbnail` mit echtem `image_url`. Nicht übernommen.

## Nicht umgesetzt

Diese Elemente stehen im Entwurf, haben aber keine Datenquelle in der App oder wären eine neue Funktion. Nach der Vorgabe werden sie nicht gebaut.

- Zählerangaben je Rezepttyp auf den Chips (Entwurf: „Frühstück 38“). Die Seite lädt keine Zähler je Typ; eine neue Abfrage wäre nötig (nicht gegen die API geprüft).
- „12 neu“ und „Warm 84 / Kalt 61 / Nachtisch 29“ auf der Startseite: Die Zähler der Bereichskacheln bleiben wie in der App.
- Tagesübersicht „Weiter planen“ (Fr, Sa, So mit Mahlzeiten und „Mittag offen“). Die Startseite lädt nur den nächsten Plan; Tageszeilen wären eine neue Datenabfrage.
- Plan-Kennzahlenzeile (Anstehend, Geplante Tage, Ø pro Person und Tag, Offene Einkäufe). Summen über alle Pläne sind in der Seite nicht vorgesehen und würden neue Daten brauchen.
- Tages-Balken je Plan und Legende „Frühstück / Kalt / Warm / Offen“.
- Budgetkarte der Einkaufsliste („35,42 € · Budget 70 €“). In der Detailseite gibt es keine Budgetangabe.
- Tabellenansicht der Zutaten (Spalten Score, kcal/100 g, Preis/kg) und Zutaten-Seitenspalte. Umbau von Raster zu Tabelle ist eine Strukturänderung und wird als eigene Aufgabe geführt.
- Opacity-Nutri-Balken auf der Rezeptdetailseite.
- Mascot-Platzhalter auf der Einkaufsliste („Tipp“-Karte).

## Umsetzung

- `RecipeListPage.tsx`: Die Rezepttyp-Chips werden auf die Chip-Regel umgestellt. Der Farbpunkt kommt aus `recipeTint(value)` und `RECIPE_DOT_CLASSES` in `lib/recipeTypeStyle.ts`. Der aktive Chip nutzt `border-primary text-primary-dark font-semibold` auf `bg-card`. Höhe `h-11 md:h-9`. Keine Logik- oder URL-Änderung: `handleFilterChange('recipe_type', …)` bleibt gleich.
- Test: ein Vitest-Test prüft, dass aktive Chips `aria-pressed="true"` und Petrol-Rand tragen, und dass jeder Typ-Chip einen Farbpunkt hat.
- Playwright: Die Baseline `rezeptuebersicht` wird im Container neu erzeugt. Andere Baselines bleiben unverändert.
