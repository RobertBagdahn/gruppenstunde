## Why

Der Essensplan hat aktuell zwei getrennte Systeme: **HealthRules** (Ampel-Cockpit für Nährwerte auf Plan/Tag/Meal-Ebene) und **RecipeHints** (Verbesserungsvorschläge auf Rezept-Ebene). Diese Systeme sind nicht verbunden, bieten keine Handlungsempfehlungen und decken wichtige Kategorien wie Budget, Vollständigkeit und Duplikate nicht ab. Der Stakeholder wünscht sich einen "Berater"-Tab, mit dem man sich durch die Planung durchhangeln kann — von leerem Plan bis zur fertigen Optimierung.

## What Changes

- **HealthRule → Rule umbenennen**: Das Model `HealthRule` wird zu `Rule` verallgemeinert. Neues Feld `rule_type` unterscheidet zwischen `nutrition` und `budget` Regeln. Admin-pflegbar über die bestehende Admin-UI (Tab wird von "Gesundheitsregeln" zu "Regeln" umbenannt).
- **RecipeHint in Rule mergen**: `RecipeHint` wird als `Rule` mit `scope=recipe` abgebildet. Ein einheitliches Regel-Model für alle Ebenen.
- **Budget-Feld auf MealPlan**: Neues Feld `budget_per_person_per_day` (Decimal, nullable) auf dem MealPlan-Model.
- **System-Regeln einprogrammieren**: Nicht-konfigurierbare Regeln für Vollständigkeit (Mahlzeit fehlt), Duplikate (gleiches Rezept mehrfach) und Budget-Prüfung (Kosten vs. budget_per_person_per_day). Keine Abwechslungs-Erkennung in Phase 1.
- **Vorschlags-Engine**: Jede Regelverletzung liefert einen einfachen Vorschlag — bei fehlender Mahlzeit 3 passende Rezepte aus der DB, bei Budget-Überschreitung das teuerste Rezept benennen, bei Nährwert-Verletzung einen Tipp-Text.
- **"Vorschläge"-Tab ersetzt Cockpit-Tab**: Der Cockpit-Tab wird zum "Vorschläge"-Tab. Ampel-Darstellung bleibt erhalten. Sortierung nach Priorität (rot vor gelb vor grün). Badge am Tab zeigt schlimmste Farbe + Anzahl nicht-grüner Regeln.
- **Umfangreiche Seed-Regeln**: Management-Command `seed_rules` erstellt ~20 Standard-Regeln basierend auf DGE-Referenzwerten für Jugendliche (13-18). Regeln für alle Scopes (Event, Tag, Mahlzeit, Rezept) mit deutschen Tipp-Texten.
- **Visuelle Admin-Pflegemaske**: Regel-Editor mit Live-Ampel-Vorschau, Parameter-Dropdown mit deutschen Labels, Scope-Badges, gruppierten Tabellen und Quick-Toggle für Aktiv-Status.
- **"Alles gut"-State**: Wenn alle Regeln grün sind, wird eine positive Bestätigung angezeigt.

## Capabilities

### New Capabilities
- `meal-plan-suggestions`: Vereinheitlichtes Regel- und Vorschlagssystem für Essenspläne. Umfasst: Rule-Model (Merge aus HealthRule + RecipeHint), System-Regeln (Vollständigkeit, Duplikate), Budget-Prüfung, Vorschlags-Generierung, "Vorschläge"-Tab UI mit Ampeln und Handlungsempfehlungen.

### Modified Capabilities
- `meal-cockpit`: Wird durch `meal-plan-suggestions` ersetzt. Cockpit-Tab wird zum Vorschläge-Tab, HealthRule wird zu Rule.
- `recipe-hint-admin`: RecipeHint wird in das neue Rule-Model gemergt. Admin-UI wird konsolidiert.
- `meal-plan`: Budget-Feld `budget_per_person_per_day` wird zum MealPlan-Model hinzugefügt.

## Impact

### Backend
- **Django Apps**: `recipe` (Rule-Model, Suggestion-Service), `planner` (Budget-Feld auf MealPlan)
- **Models**: `HealthRule` → `Rule` (rename + erweitern), `RecipeHint` entfernen, `MealPlan` + `budget_per_person_per_day`
- **Pydantic Schemas**: `HealthRuleOut/In` → `RuleOut/In`, neues `SuggestionOut` Schema, `MealPlanOut` erweitern
- **API**: `/api/health-rules/` → `/api/rules/`, neuer Endpunkt `/api/meal-plans/{id}/suggestions/`, Cockpit-Endpunkte entfernen oder redirecten
- **Services**: `cockpit_service.py` → `suggestion_service.py` (erweitert um System-Regeln + Vorschläge)
- **Migrations**: Rename HealthRule → Rule, Drop RecipeHint, Add budget_per_person_per_day

### Frontend (frontend-food)
- **Zod Schemas**: `cockpit.ts` → `suggestions.ts`, `RecipeHintSchema` entfernen
- **API Hooks**: `useMealPlanCockpit` → `useMealPlanSuggestions`, Admin-Hooks anpassen
- **Komponenten**: `CockpitDashboard` → `SuggestionDashboard`, neue `SuggestionCard` Komponente mit Vorschlags-Buttons
- **Pages**: `MealEventDetailPage.tsx` — Cockpit-Tab → Vorschläge-Tab mit Badge
- **Admin**: Zwei Tabs ("Rezept-Hinweise" + "Gesundheitsregeln") → ein Tab "Regeln"
