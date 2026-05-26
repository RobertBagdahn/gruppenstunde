## Context

Die aktuelle Rezept-Detailseite (`frontend/src/pages/recipes/RecipeDetailPage.tsx`, 1852 Zeilen) ist durch iterative Feature-Ergänzungen mit mehreren Parallel-Systemen für Rezept-Bewertung überfrachtet:

1. **Zwei konkurrierende Rating-Systeme** mit identischen Dimensionen: `InspiScore` (Preis/Gesundheit/Sättigung/Geschmack als Inspi-Kopf-Symbole) und `Recipe Checks` (4 farbige Ring-Badges mit identischer Semantik).
2. **Nutri-Score wird dreimal prominent angezeigt**: in den Info-Boxen (teilweise), als eigener Section-Block, und detailliert innerhalb der Gesundheitsanalyse.
3. **Zubereitungsanalyse** ist ein reines Metadaten-Duplikat (Kochzeit, Vorbereitung, Schwierigkeit, Portionen, Zutaten, Gesamtgewicht) aller Werte, die bereits in den KPI- und Info-Boxen stehen.
4. **Normportion-Info-Box** zeigt auf Topposition "Normportionen (15 J., männl., PAL 1.5)" — eine technische Referenz, die den durchschnittlichen Nutzer irritiert statt informiert.
5. **"Kosten pro Person"** ist eine Bewertungsachse, die gemeinsam mit dem InspiScore-Preis-Rating als nicht sinnvoll verworfen wurde.
6. **"pro Portion"** wird inkonsistent verwendet: in der Gesundheitsanalyse/Gewichtsanalyse/Preis-Analyse ohne Mehrwert, nur im Makro-Breakdown aussagekräftig.

Dieser Cleanup-Change ist Voraussetzung für drei Folge-Changes (`recipe-improvement-merge`, `recipe-detail-sidebar-layout`, `recipe-health-insights`). Er räumt ausschließlich auf und führt keine neuen Features ein — das reduziert das Review-Risiko und schafft eine saubere Basis.

**Nicht betroffen:** `PortionScaler`, Normportion-Banner, `useRecipeModificationStore`, Einkaufslisten-Export, `NutriImprovementCards` (Refactor in Change #2), `Recipe Hints` (Merge in Change #2), Preis-Analyse-Section (Breakdown bleibt als Fakt).

## Goals / Non-Goals

**Goals:**
- Entfernen aller Duplikat-Bewertungssysteme (`InspiScore` + `Recipe Checks`) inkl. Backend-Services und API-Endpoints
- Reduzieren der Nutri-Score-Darstellung auf zwei Positionen: kompaktes Badge in Info-Boxen + Detail in Gesundheitsanalyse
- Ersetzen der wenig hilfreichen Normportion-Info-Box durch ein prominentes Nutri-Score-Badge
- Ersetzen der Bewertungs-KPI "Kosten pro Person" durch den neutralen Fakt "Gesamtkosten"
- Zubereitungs-Section einklappbar machen (Default: offen Desktop, zu Mobile)
- Zeilen-Anzahl `RecipeDetailPage.tsx` um ~400–500 Zeilen reduzieren
- Schema-Sync Backend ↔ Frontend wahren

**Non-Goals:**
- Keine neue Sidebar (Change #3)
- Keine Änderung am `NutriImprovementCards` außer Platzierung (Change #2 merged)
- Keine Änderung am `Recipe Hints`-Rendering (Change #2 merged)
- Keine neuen Badges/Positive-Labels (Change #4)
- Keine Datenbank-Migrationen
- Kein Print-Mode, kein Cooking-Mode (Change #5)

## Decisions

### Decision 1: `InspiScore` und `Recipe Checks` komplett entfernen (nicht nur verstecken)

**Wahl:** Beide Komponenten, API-Hooks, Services, Schemas, Endpoints und Tests werden ersatzlos gelöscht.

**Alternativen erwogen:**
- *Feature-Flag / konditionales Rendering:* Code bleibt, wird nur versteckt. Abgelehnt — Kontext "keine Rückwärtskompatibilität nötig" (siehe AGENTS.md) erlaubt harten Cut und vermeidet toten Code.
- *Nur Frontend entfernen, Backend behalten:* Abgelehnt — zombie-Endpoints würden Wartungslast verursachen.

**Begründung:** Hart löschen reduziert die Komplexität sofort und eindeutig. Wiederherstellung ist via Git möglich, falls notwendig.

### Decision 2: `get_recipe_nutritional_values` in `recipe_checks.py` bleibt bestehen

**Wahl:** Nur die Check-Aggregator-Funktionen werden entfernt. Die Nutrition-Helper-Funktion `get_recipe_nutritional_values` wird weiter von `nutri_improvement_service.py` (und ggf. anderen Stellen) genutzt und bleibt erhalten.

**Alternativen erwogen:**
- *Helper verschieben:* Nach `backend/recipe/services/nutrition_service.py` umziehen. Abgelehnt — das ist ein eigenständiges Refactoring, gehört nicht in diesen Cleanup-Change. Die Datei `recipe_checks.py` darf als Helper-Modul weiterexistieren, wird ggf. später umbenannt.

**Begründung:** Kleinere Diff-Fläche, Change bleibt fokussiert.

### Decision 3: Nutri-Score Badge in Info-Box statt Normportion

**Wahl:** Die mittlere Info-Box im 4er-Grid zeigt künftig das Nutri-Score-Badge (A–E) mit den bekannten Farben (`NUTRI_SCORE_COLORS`). Wenn kein Nutri-Score vorhanden ist (fehlende Nährwerte), wird die Box ausgeblendet und das Grid auf 3 Spalten reduziert.

**Alternativen erwogen:**
- *Anzahl Zutaten:* Weniger aussagekräftig für den User.
- *Gesamtgewicht:* Existiert bereits in Analyse-Sections, wäre Duplikat.
- *Kalorien:* Doppelt mit Nährwerte-Panel.

**Begründung:** Nutri-Score ist das prägnanteste, bereits etablierte Gesundheitssignal. Prominente Platzierung oben erspart Scrollen zur Gesundheitsanalyse.

### Decision 4: KPI-Box "Gesamtkosten" statt "Kosten pro Person"

**Wahl:** Die Box zeigt `total_price_eur` formatiert als `{value.toFixed(2)} EUR` mit Label "Gesamtkosten". Wenn keine Preis-Daten vorliegen (`total_price_eur === null`), wird sie ausgeblendet und das Grid auf 3 Spalten reduziert.

**Alternativen erwogen:**
- *Box entfernen, Grid auf 3 reduzieren:* Konsistenter Entfall einer Bewertungs-Achse. Abgelehnt — Preis als neutraler Fakt ist nützlich.
- *"Preis pro kg":* Weniger intuitiv für Rezepte.

**Begründung:** Neutraler Fakt ohne Bewertungsdimension. Der User kann selbst einschätzen, ob das Rezept ins Budget passt.

### Decision 5: Zubereitung als `AnalysisSection` mit Responsive-Default

**Wahl:** Das `description`-Feld wird in die bestehende `AnalysisSection`-Komponente eingepackt. Der `defaultOpen`-State hängt von `window.matchMedia('(min-width: 1024px)').matches` zur Initialisierung ab. Nach erstem Render ändert sich der State nicht mehr durch Resize — User-Interaktion hat Vorrang.

**Alternativen erwogen:**
- *Kein Responsive-Default, immer zu:* Zwingt Desktop-User zu Extra-Klick. Abgelehnt — Desktop hat genug Platz.
- *Kein Responsive-Default, immer offen:* Verliert Platzersparnis auf Mobile. Abgelehnt.
- *State in localStorage persistieren:* Features für Change #5 / späteren Change. Hier nicht.

**Begründung:** Bester Kompromiss zwischen Mobile-Platz und Desktop-Sichtbarkeit. Kein zusätzlicher State-Overhead.

### Decision 6: `InlineEditor`-Wrapper um Zubereitung bleibt erhalten

**Wahl:** Die `AnalysisSection` wird innerhalb des `InlineEditor` gerendert, nicht andersherum. Der Edit-Button muss weiter erreichbar sein, auch wenn die Section eingeklappt ist.

**Alternativen erwogen:**
- *Edit-Button nur im aufgeklappten Zustand:* Abgelehnt — User würde nicht wissen, dass editierbar.

**Begründung:** Edit-Discoverability bleibt erhalten.

### Decision 7: "pro Portion"-Text nur im Makro-Breakdown behalten

**Wahl:** Entfernt aus Preis-Analyse-Überschrift ("pro Portion"-Box bleibt aber als Wert, nur das redundante Text-Suffix geht), aus Gewichtsanalyse-Subtext, und aus Gesundheitsindikator-Label. Bleibt in der "Nährwerte pro Portion"-Überschrift der Inhaltsstoffanalyse, weil dort die Werte echt pro Portion ausgewiesen werden und der Bezug fachlich zwingend ist.

**Begründung:** "pro Portion" dort nötig, wo sich der Wert sonst nicht interpretieren lässt. Redundant, wo aus dem Kontext klar.

## Risks / Trade-offs

**[Risk] Nutri-Score Badge in Info-Box ist `null` für Rezepte ohne Nährwerte**
→ Mitigation: Box wird konditional gerendert (`{nutriScore && <Box>}`). Grid passt sich an (3 statt 4 Spalten). Getestet mit `test_factories.py`-Rezept ohne Ingredients.

**[Risk] Nutzer haben sich an `InspiScore` / `Recipe Checks` gewöhnt**
→ Mitigation: AGENTS.md erlaubt breaking changes. Nutri-Score und Gesundheitsanalyse liefern semantisch äquivalente Information. Kein User-Migration-Pfad nötig.

**[Risk] Andere Features nutzen `useInspiScore` oder `useRecipeChecks`**
→ Mitigation: Grep-Scan vor Entfernung (siehe `tasks.md`). Aktuell keine weiteren Nutzer bekannt (`inspi-data-import` Spec betrifft Datenimport, nicht das Score-Feature).

**[Risk] `recipe_checks.py` enthält weitere Helper, deren Funktionsweise unklar ist**
→ Mitigation: `get_recipe_nutritional_values` wird nachweislich von `nutri_improvement_service.py` genutzt — dort bleibt der Import intakt. Nur die Check-Aggregator-Funktionen werden gelöscht. Bei Unsicherheit: Grep über gesamtes Backend.

**[Risk] Responsive-Default für Zubereitung-Collapse funktioniert nicht bei SSR / initial Hydration**
→ Mitigation: Das Projekt ist eine SPA mit Vite (kein SSR). `window.matchMedia` im `useState`-Initializer ist sicher.

**[Trade-off] Entfernen von `RecipeChecks`-Endpoint bricht mögliche externe API-Nutzer**
→ Akzeptiert: Keine externen API-Konsumenten; API ist intern.

**[Trade-off] Schrumpfung des 4er-Grids auf 3er bei fehlenden Daten**
→ Akzeptiert: Besser als leere Box-Placeholder.
