## Why

Nach dem Stakeholder-Gespräch vom 23.06.2026 wurden 30 Bugs und unfertige Features im Food-Frontend identifiziert. Diese blockieren die Nutzbarkeit der App im Praxiseinsatz — insbesondere falsche Nährwertanzeigen, kaputte KI-Imports, fehlende Druckfunktionen und inkonsistente Datenqualität.

## What Changes

- **BUG-001** Stück-zu-Gramm-Anzeige korrigiert: `0,5 × 40g = 20g` (war: `=` statt `×`)
- **BUG-002** AI-Rezeptimport: Prompt verbietet „und" in Zutaten; Salz/Pfeffer/Wasser aus Datenbank entfernen, spezifische Ersätze anlegen
- **BUG-003** Energie-Label im Zutat-Formular: War „kJ", muss „kcal" sein — Daten sichten und bereinigen (spec `energy-unit-display` erweitern)
- **BUG-004** Kalorienberechnung Anreisetag: Tages-Soll aus `day_part_factor`-Summe berechnen, nicht als fixer Tageswert
- **BUG-006** AI-Zutaten-Prompt: Zustandsform (frisch, TK, getrocknet) immer erzwingen
- **BUG-007 + BUG-008** Duplikat-Erkennung: API-Fehler beheben, Ähnlichkeitsschwelle für Zutaten erhöhen, kein Auto-Merge
- **BUG-009 + BUG-027** Ähnliche Rezepte: Embedding existiert — UI-Ansicht und Zusammenlegen-Button ergänzen
- **BUG-010 / BUG-019** (identisch) Vegan/Vegetarisch-Filter in Rezeptsuche beim Hinzufügen zu Mahlzeit ergänzen
- **BUG-011** Referenzmahlzeit-Sync: „Für alle übernehmen"-Button hat keinen Effekt — Frontend-Bug beheben (vermutlich Cache-Invalidierung)
- **BUG-012 + BUG-013** Portionsrang: Drag&Drop bzw. ▲/▼-Buttons für `rank` + Stückzahl-Äquivalente in Einkaufsliste (`rank=1` Portion)
- **BUG-014** Ampel-Richtung: Ballaststoffe haben kein Maximum, Zucker kein Minimum, Protein kein Maximum — Seed-Daten korrigieren
- **BUG-015 + BUG-031** Druckansicht: `/print`-Route für Rezept (alle Sektionen ausgeklappt) und Essensplan (gleiche Technologie)
- **BUG-016** Kochplan: Chronologische Zubereitungsübersicht rückwärts von Servierzeit
- **BUG-017** Halal/Allergie-Filter: Prüflogik im Suggestion-Service implementieren (Tags auf Zutaten vorhanden, AI setzt initial)
- **BUG-018** Preis-Label: Eindeutig „Preis pro kg" neben dem Preisfeld
- **BUG-020** Essensplan-Liste: Drei Tabs — „Meine Pläne" / „Geteilt mit mir" / „Referenz-Vorlagen" (Sharing-Modell existiert, Admin markiert Referenzpläne)
- **BUG-021** Nährwert-Analyse: Nur pro 100g in Rezeptdetails, keine absoluten Werte — Berechnungen prüfen
- **BUG-022** URL-Import auf Production: Fehlerursache untersuchen und beheben
- **BUG-023** Synonyme: Generische Oberbegriffe in Suche deprioritisieren (nach BUG-006)
- **BUG-024** Singular/Plural-Normalisierung: Über Synonymtabelle (z.B. „Zwiebeln" → Synonym von „Zwiebel")
- **BUG-025** Nährwertvergleich-Balken: Ausreißer außerhalb Bereich korrekt darstellen, kein „0 Euro"-Maximum
- **BUG-026** Plausibilitätsprüfung: Zutaten mit >900 kcal/100g in Datenqualitäts-Ansicht prominent anzeigen
- **BUG-028** Edit-Modus Skalierung: Im Bearbeitungsmodus ×N Werte anzeigen, Portionszahl während Edit gesperrt, Speichern ÷N
- **BUG-029** Reserve-Transparenz: Aufschlüsselung Nettomenge + Reserve in Einkaufsliste (pro Essensplan konfigurierbar)

## Capabilities

### New Capabilities

- `meal-plan-print`: Druckansicht (`/print`-Route) für Essensplan mit ausgeklappten Sektionen
- `recipe-print-route`: Dedizierte `/print`-Route für Rezepte (alle Sektionen ausgeklappt, kein simples `@media print`)
- `meal-plan-cooking-schedule`: Chronologischer Kochplan rückwärts von Servierzeit
- `meal-plan-list-tabs`: Drei-Tab-Ansicht der Essensplan-Liste (Meine / Geteilt / Referenz)
- `shopping-list-piece-equivalents`: Stückzahl-Äquivalente in Einkaufsliste aus `rank=1`-Portion
- `shopping-list-reserve-transparency`: Reserve-Aufschlüsselung in Einkaufsliste, pro Plan konfigurierbar

### Modified Capabilities

- `energy-unit-display`: Energie-Label im Zutat-Anlegen-Formular war „kJ" — muss „kcal" sein; Datensichtung erforderlich
- `extended-nutrition-rules`: Ampel-Richtungen für Ballaststoffe (nur Min), Zucker (nur Max), Protein (nur Min) korrigieren
- `portion-ranking`: ▲/▼-Buttons für Portionsrang bereits specced — Drag&Drop-Bug beheben und Stückzahl-Anzeige ergänzen
- `recipe-portion-scaling-edit`: Edit-Modus zeigt ×N Werte, Portionszahl während Edit gesperrt
- `meal-plan-suggestions`: Halal/Allergie-Prüflogik gegen Zutaten-Tags implementieren
- `ingredient-similar-endpoint`: Ähnlichkeitsschwelle erhöhen, API-Fehler beheben, UI für Rezepte ergänzen
- `ingredient-name-suggestion`: AI-Prompt: Zustandsform erzwingen, „und" in Zutatenname verbieten
- `recipe-ai-ingredient-suggestions`: Bereits enthaltene Zutaten aus Vorschlägen ausschließen, Singular/Plural per Synonymtabelle
- `meal-planner-recipe-search`: Vegan/Vegetarisch-Filter ergänzen
- `ref-meal`: „Für alle übernehmen"-Button — Cache-Invalidierung beheben
- `meal-plan-export`: Druck-Route für Essensplan (ergänzend zu vorhandenem PDF-Export)
- `data-quality-dashboard`: Ausreißer-Balken korrigieren, Plausibilitäts-Schwelle >900 kcal/100g prominent
- `recipe-url-import`: Production-Fehler untersuchen und beheben

## Impact

**Backend (Django):**
- `supply` App: Portionsrank-Endpoints, Synonym-Eintrag für Singular/Plural, Preis-Label keine Code-Änderung
- `recipe` App: Seed-Daten für Ampel-Richtungen, URL-Import-Debugging, Nährwert-Berechnung pro 100g
- `planner` App: Kochplan-Endpunkt (neu), Tag-Filterlogik in Suggestions, day_part_factor-Aggregation
- AI-Prompts: Zustandsform erzwingen, „und" verbieten, bereits enthaltene Zutaten ausschließen

**Frontend (food-frontend):**
- Neue Routen: `/recipes/:slug/print`, `/meal-plans/:id/print`, `/meal-plans/:id/cooking-schedule`
- Komponenten: MealPlanList (Tabs), ShoppingList (Stückzahl + Reserve), PortionRanking (▲/▼ Fix), RecipeSearch (Filter), NutritionCharts (nur pro 100g, Ausreißer-Fix)
- TanStack Query: Cache-Invalidierung nach Ref-Meal-Sync

**Keine Datenmigration:** Daten werden gesichtet, keine automatische Migration
