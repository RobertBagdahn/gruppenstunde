## Context

Der Essensplan (`planner` App) hat zwei getrennte Analyse-Systeme:

1. **HealthRule** (`recipe/models/health_rule.py`): Range-basierte Ampel-Schwellenwerte (min_yellow/min_green/max_green/max_yellow) für Nährwerte. Scope: meal_event/day/meal. Evaluierung über `cockpit_service.py`, Anzeige im Cockpit-Tab.
2. **RecipeHint** (`recipe/models/hints.py`): Einzelwert-Schwellen mit min/max für Rezept-Nährwerte. Matching über `recipe_checks.py`, Anzeige auf Rezept-Detailseite.

Beide sind Admin-pflegbar, aber nicht verbunden. Es gibt keinen Budget-Check, keine Vollständigkeitsprüfung, keine Duplikaterkennung und keine Handlungsempfehlungen.

**Bestehende Dateien (Backend):**
- `backend/recipe/models/health_rule.py` — HealthRule Model
- `backend/recipe/models/hints.py` — RecipeHint Model
- `backend/recipe/schemas/cockpit.py` — HealthRuleOut, CockpitEvaluationOut, CockpitDashboardOut
- `backend/recipe/schemas/nutrition.py` — RecipeHintOut
- `backend/recipe/api/cockpit.py` — health_rule_router + cockpit_router
- `backend/recipe/api/hints.py` — recipe_hint CRUD
- `backend/recipe/services/cockpit_service.py` — evaluate_meal_plan/day/meal_cockpit()
- `backend/recipe/services/recipe_checks.py` — match_recipe_hints()
- `backend/planner/models/meal_plan.py` — MealPlan, Meal, MealItem Models

**Bestehende Dateien (Frontend):**
- `frontend-food/src/schemas/cockpit.ts` — Zod Schemas
- `frontend-food/src/api/cockpit.ts` — TanStack Query Hooks
- `frontend-food/src/api/admin.ts` — Admin CRUD Hooks für HealthRule + RecipeHint
- `frontend-food/src/components/cockpit/` — CockpitDashboard, TrafficLightIndicator, etc.
- `frontend-food/src/pages/admin/HealthRuleTab.tsx` — Admin UI
- `frontend-food/src/pages/admin/RecipeHintTab.tsx` — Admin UI
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — Cockpit-Tab Definition + CockpitView

## Goals / Non-Goals

**Goals:**
- Ein einheitliches Rule-Model das HealthRule und RecipeHint ersetzt
- Admin-pflegbare numerische Regeln (Nährwerte, Budget) mit Ampel-Logik
- Einprogrammierte System-Regeln (Vollständigkeit, Duplikate)
- Jede Regelverletzung liefert einen einfachen Vorschlag
- Budget-Feld auf MealPlan mit Prüfung gegen tatsächliche Kosten
- "Vorschläge"-Tab ersetzt Cockpit-Tab, sortiert nach Priorität, mit Badge
- Bei fehlender Mahlzeit: 3 passende Rezepte vorschlagen + "Mehr suchen"

**Non-Goals:**
- Abwechslungs-Erkennung (basierend auf recipe_type/Hauptzutat) — spätere Phase
- AI-generierte Vorschläge oder Plan-Generierung — spätere Phase
- Saisonale Vorschläge
- Persistente/speicherbare Vorschläge — live-berechnet
- Rezept-Tausch mit 1-Click (nur Vorschlag + Link)

## Decisions

### 1. HealthRule + RecipeHint → Rule (ein Model)

**Entscheidung**: Ein einziges `Rule` Model mit `rule_type` Feld ersetzt beide bestehenden Models.

**Begründung**: Beide machen dasselbe — einen numerischen Parameter gegen Schwellenwerte prüfen. HealthRule hat Range (4 Werte), RecipeHint hat Einzelwert + min/max. Das Range-Modell ist mächtiger und kann den Einzelwert-Fall abbilden (min_yellow=0, min_green=0, max_green=threshold, max_yellow=threshold bei "max"-Regel).

**Alternativen verworfen:**
- Beide Models behalten und per Service zusammenführen → Doppelte Admin-UI, doppelte Logik
- Neues drittes Model → Noch mehr Komplexität

**Rule Model:**
```python
class Rule(models.Model):
    name: str
    description: str
    parameter: str  # choices aus HintParameterChoices (energy_kj, protein_g, etc.)
    scope: str      # "meal_event" | "day" | "meal" | "recipe"
    rule_type: str  # "nutrition" (erweiterbar für zukünftige Typen)
    
    # Range-basierte Ampel (von HealthRule übernommen)
    min_yellow: Decimal
    min_green: Decimal
    max_green: Decimal
    max_yellow: Decimal
    unit: str
    
    # Vorschlags-Text (von RecipeHint übernommen)
    hint_level: str  # "info" | "warn" | "error"
    tip_text: str
    improvement_text: str
    
    is_active: bool
    sort_order: int
```

### 2. System-Regeln als Python-Code, nicht als DB-Einträge

**Entscheidung**: Vollständigkeit und Duplikate werden als feste Funktionen im Service implementiert, nicht als konfigurierbare Rules in der DB.

**Begründung**: "Tag 1 hat kein Mittagessen" ist keine numerische Schwellwert-Prüfung. Das in ein generisches Rule-Model zu pressen wäre overengineered. Diese Logik ist stabil und braucht keine Admin-Konfiguration.

### 3. Budget pro MealPlan pflegbar, nicht als globale Admin-Rule

**Entscheidung**: `budget_per_person_per_day` als Decimal-Feld auf MealPlan. Die Budget-Prüfung ist eine **System-Regel** (einprogrammiert), die direkt gegen dieses Feld prüft. Keine globale Admin-Rule für Budget nötig, weil jeder Plan ein individuelles Budget hat.

**Ampel-Logik** (hardcoded):
- Grün: Kosten ≤ Budget
- Gelb: Kosten ≤ Budget × 1.2 (bis 20% drüber)
- Rot: Kosten > Budget × 1.2

**Begründung**: Budget ist immer plan-spezifisch. Eine globale Admin-Rule mit festen Schwellwerten ergibt keinen Sinn — ein Stammeslager hat 8€/Person/Tag, eine Sippenfahrt 5€. Der User setzt sein Budget pro Plan in den Einstellungen.

**Alternative verworfen:** Budget als Admin-Rule → Jeder Plan braucht andere Schwellwerte, globale Regel passt nicht

### 4. Vorschläge sind einfach und deterministisch

**Entscheidung**: Vorschläge basieren auf einfachen DB-Queries, kein AI.

- Fehlende Mahlzeit → Query: Rezepte mit passendem `recipe_type`, `status=approved`, sortiert nach `like_score`, Top 3
- Budget-Überschreitung → Teuerstes Rezept im Plan identifizieren, Text "X ist das teuerste Rezept"
- Nährwert-Verletzung → `tip_text` aus der Rule anzeigen

**Begründung**: Einfach, schnell, zuverlässig. AI-Vorschläge sind Phase 2.

### 5. Einheitliche Suggestion Response

**Entscheidung**: Ein API-Endpunkt `GET /api/meal-plans/{id}/suggestions/` liefert alle Vorschläge.

```python
class SuggestionOut(Schema):
    category: str      # "completeness" | "duplicate" | "nutrition" | "budget"
    scope: str         # "event" | "day" | "meal"
    scope_label: str   # "Tag 1 Mittagessen"
    status: str        # "green" | "yellow" | "red"
    priority: int      # 1=completeness, 2=budget, 3=nutrition, 4=duplicate
    message: str       # "Kein Rezept zugewiesen"
    current_value: Optional[float]  # 12.50 (aktueller Wert)
    target_range: Optional[str]     # "max 8€/Person/Tag"
    tip: Optional[str]              # "Ersetze Lachs durch günstigere Alternative"
    recipe_suggestions: list[RecipeSuggestionOut]  # Bei completeness: 3 Rezepte

class RecipeSuggestionOut(Schema):
    id: int
    title: str
    slug: str
    image_url: Optional[str]
    recipe_type: str

class SuggestionDashboardOut(Schema):
    suggestions: list[SuggestionOut]
    summary_status: str        # Schlimmste Farbe
    red_count: int
    yellow_count: int
    green_count: int
    total_count: int
```

### 6. Cockpit-Endpunkte entfernen

**Entscheidung**: `/api/meal-plans/{id}/cockpit/`, `/api/meal-plans/{id}/days/{date}/cockpit/` und `/api/meals/{id}/cockpit/` werden entfernt. Alles läuft über den neuen `/api/meal-plans/{id}/suggestions/` Endpunkt.

**Begründung**: Keine Rückwärtskompatibilität nötig (aktive Entwicklung).

### 7. Tab-Badge live berechnet

**Entscheidung**: Badge zeigt `{schlimmste_farbe} {anzahl_nicht_grün}`. Wird beim Laden der MealPlan-Seite mit-gefetcht (eigener leichtgewichtiger Endpunkt oder als Teil der Suggestions-Response mit staleTime).

**API:** `GET /api/meal-plans/{id}/suggestions/summary/` → `{ status: "red", count: 5 }`

Oder einfach den vollen Suggestions-Endpunkt mit TanStack Query cachen (staleTime: 30s) und Badge aus gecachten Daten berechnen.

**Entscheidung**: Voller Endpunkt + TanStack Query Cache. Ein separater Summary-Endpunkt lohnt sich nicht bei der erwarteten Response-Größe.

## Risks / Trade-offs

**[Migration HealthRule → Rule]** → Bestehende HealthRule-Daten müssen migriert werden. Mitigation: Data-Migration schreiben die alle HealthRules als Rules mit `rule_type="nutrition"` übernimmt. RecipeHints werden als Rules mit `scope="recipe"` migriert.

**[Preis-Abdeckung bei Budget-Check]** → Nicht alle Zutaten haben `price_per_kg`. Budget-Checks können unzuverlässig sein. Mitigation: Coverage-Prozentsatz in der Suggestion anzeigen ("Basierend auf 73% der Zutaten mit Preisdaten").

**[Performance bei großen Plänen]** → Suggestion-Berechnung iteriert alle Meals + MealItems + Rules. Bei 7-Tage-Plan mit 4 Mahlzeiten/Tag und 20 Rules: ~560 Evaluierungen. Mitigation: Das ist vernachlässigbar (<50ms). TanStack Query Cache mit staleTime: 30s verhindert unnötige Requests.

**[RecipeHint auf Rezept-Detailseite]** → Die Rezept-Detailseite nutzt RecipeHints für den Improvements-Bereich. Nach dem Merge müssen die Improvements dort weiterhin funktionieren. Mitigation: `match_recipe_hints()` wird zu `match_rules(scope="recipe")` — gleiche Logik, neues Model.

## Migration Plan

1. Neues `Rule` Model erstellen (neben HealthRule + RecipeHint)
2. Data-Migration: HealthRule → Rule, RecipeHint → Rule
3. Altes HealthRule + RecipeHint Model entfernen
4. `budget_per_person_per_day` auf MealPlan hinzufügen
5. Backend-Service + API deployen
6. Frontend umbauen (Schemas, Hooks, Komponenten)
7. Rollback: Nicht nötig (keine Rückwärtskompatibilität)

### 8. Umfangreiche Seed-Regeln basierend auf DGE-Referenzwerten

**Entscheidung**: Ein Management-Command `seed_rules` erstellt ein umfassendes Set an Standard-Regeln. Die Werte orientieren sich an DGE-Referenzwerten für Jugendliche 13-18 (Hauptzielgruppe Pfadfinder), gemittelt über Geschlechter. Regeln werden für alle relevanten Scopes erstellt (Tag, Mahlzeit, Rezept).

**Standard-Regeln (Seed-Daten):**

Tages-Ebene (scope="day"):
| Parameter | Min Gelb | Min Grün | Max Grün | Max Gelb | Einheit | Tipp |
|-----------|----------|----------|----------|----------|---------|------|
| energy_kj | 6000 | 8000 | 11000 | 13000 | kJ | "Passe die Portionsgrößen an oder ergänze Snacks" |
| protein_g | 30 | 45 | 80 | 100 | g | "Füge eiweißreiche Zutaten hinzu (Joghurt, Hülsenfrüchte, Ei)" |
| fat_g | 40 | 60 | 95 | 120 | g | "Achte auf die Fettmenge in Soßen und Beilagen" |
| carbohydrate_g | 180 | 250 | 350 | 420 | g | "Passe Beilagen wie Nudeln, Reis oder Brot an" |
| fibre_g | 15 | 25 | — | — | g | "Mehr Vollkornprodukte, Gemüse oder Hülsenfrüchte verwenden" |
| sugar_g | — | — | 60 | 90 | g | "Weniger süße Getränke und Desserts einplanen" |
| fat_sat_g | — | — | 25 | 35 | g | "Weniger Butter, Sahne und fettes Fleisch" |
| sodium_mg | — | — | 2000 | 3000 | mg | "Weniger Fertigprodukte und Salz verwenden" |

Mahlzeit-Ebene (scope="meal"):
| Parameter | Min Gelb | Min Grün | Max Grün | Max Gelb | Einheit | Tipp |
|-----------|----------|----------|----------|----------|---------|------|
| energy_kj | 1500 | 2000 | 4000 | 5000 | kJ | "Mahlzeit hat zu wenig/viel Energie" |
| sugar_g | — | — | 20 | 35 | g | "Zu viel Zucker in dieser Mahlzeit" |

Rezept-Ebene (scope="recipe") — migriert aus bestehenden RecipeHints:
| Parameter | Min Gelb | Min Grün | Max Grün | Max Gelb | Einheit | Tipp |
|-----------|----------|----------|----------|----------|---------|------|
| protein_g | 10 | 30 | — | — | g | "Mehr Eiweiß hinzufügen" |
| sugar_g | — | — | 20 | 40 | g | "Weniger Zucker verwenden" |
| fat_sat_g | — | — | 20 | 40 | g | "Gesättigte Fettsäuren reduzieren" |
| sodium_mg | — | — | 500 | 1000 | mg | "Salzgehalt reduzieren" |
| fibre_g | 10 | 30 | — | — | g | "Mehr Ballaststoffe hinzufügen" |

Event-Ebene (scope="meal_event") — Durchschnittswerte über alle Tage:
| Parameter | Min Gelb | Min Grün | Max Grün | Max Gelb | Einheit | Tipp |
|-----------|----------|----------|----------|----------|---------|------|
| energy_kj | 7000 | 8500 | 11000 | 12500 | kJ/Tag | "Gesamtplan energetisch anpassen" |
| protein_g | 35 | 45 | 80 | 100 | g/Tag | "Mehr eiweißreiche Rezepte einplanen" |

### 9. Admin-Pflegemaske mit visueller Ampel-Vorschau

**Entscheidung**: Die Admin-UI für Regeln bekommt eine visuelle Ampel-Vorschau, die beim Editieren der Schwellenwerte live aktualisiert wird. Statt 4 nackter Zahlenfelder zeigt ein Balken-Diagramm die Zonen:

```
  Rot     │  Gelb   │    Grün     │  Gelb   │  Rot
──────────┼─────────┼─────────────┼─────────┼──────────
  < 30g   │ 30-45g  │   45-80g    │ 80-100g │  > 100g
          ▲         ▲             ▲         ▲
       min_yellow  min_green   max_green  max_yellow
```

**UI-Elemente der Pflegemaske:**
- **Parameter-Dropdown** statt Freitext (mit deutschen Labels: "Eiweiß (g)", "Zucker (g)", etc.)
- **Scope-Dropdown** mit Icons (📅 Tag, 🍽️ Mahlzeit, 📋 Rezept, 📊 Essensplan)
- **Ampel-Range-Visualisierung**: Farbiger Balken der live die Zonen zeigt während man die 4 Schwellenwerte eingibt
- **Tipp-Text** als Textarea mit Platzhalter-Vorschlag
- **Vorschau-Karte**: Zeigt wie die Regel im Vorschläge-Tab aussehen würde (mit Beispielwert)
- **Nur-Min oder Nur-Max Modus**: Wenn nur Minimum relevant ist (z.B. Ballaststoffe), können max_green/max_yellow leer bleiben (null) und umgekehrt

**Tabellen-Ansicht Verbesserungen:**
- Farbige Scope-Badges statt Text
- Inline Ampel-Preview (kompakter farbiger Balken pro Zeile)
- Gruppierung nach Scope (aufklappbare Sektionen)
- Schnell-Toggle für is_active direkt in der Tabelle

## Open Questions

- Soll der Vorschläge-Tab auch auf der Tages-Ebene im Tagesplan-Tab inline Hinweise zeigen (wie die bestehenden DayCockpitDots)?
