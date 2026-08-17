## Context

Der Meal-Plan im Food-Frontend erlaubt das Hinzufügen von Rezepten zu Mahlzeiten über den `RecipeSearchDialog`. Aktuell zeigt dieser Dialog beim Öffnen entweder eine leere Suche oder eine nach `usage_count` sortierte Liste. Es gibt keine kontextbewussten Vorschläge, die Saison, Abwechslung, Budget oder Ernährungstags berücksichtigen.

Bestehende Komponenten:
- `GET /api/meal-plans/recipes/suggestions/` — einfache Sortierung nach usage_count (recipe-suggestions spec)
- `GET /api/meal-plans/recipes/popular/` — personal/community getrennt
- `GET /api/meal-plans/recipes/recently-used/` — letzte 5 des Users
- `GET /api/meal-plans/{id}/suggestions/` — Rule-basiertes Dashboard (meal-plan-suggestions spec)

## Goals / Non-Goals

**Goals:**
- Neuer Endpunkt `GET /api/meal-plans/{plan_id}/meal/{meal_id}/suggestions` — genau 9 kategorisierte Vorschläge
- Scoring-Engine mit 5 Dimensionen: Saison, Popularität, Abwechslung, Rezenz, Budget
- Harte Filter: approved + eigene Rezepte, kein Rezept doppelt im Plan, nutritional_tags als Filter
- Kategorisierung: top_picks, variety, discovery (je 3)
- Hybrid: Algorithmus + optionales KI-Reranking
- Einfaches `reason`-Feld pro Rezept
- Saisonbestimmung aus Zutaten (neues `IngredientSeason` Modell)
- Frontend: Vorschläge als Standard-Ansicht im RecipeSearchDialog

**Non-Goals:**
- Keine Änderung an bestehenden suggestion/search/popular Endpunkten
- Kein Echtzeit-Updates (WebSockets)
- Keine Personalisierung über MealPlans hinaus (kein User-Profil-Matching)
- Keine multilingualen Saison-Daten (nur Deutschland)
- Kein Ändern von Recipe-Modellen (außer optionalem Saison-Modell in supply)

## Decisions

### Decision 1: Neuer Endpunkt statt Erweiterung bestehender

Der Endpunkt bekommt einen eigenen Pfad (`/meal/{meal_id}/suggestions`) statt die bestehenden `recipes/suggestions/` oder `{id}/suggestions/` zu erweitern. Gründe:
- Logische Trennung: der neue Endpunkt ist mahlzeit-bezogen (nicht plan- oder rezept-bezogen)
- Die bestehenden Endpunkte haben unterschiedliche Response-Schemas
- Die Kategorisierung (top_picks/variety/discovery) passt in kein bestehendes Schema
- Klare Trennung der Verantwortlichkeiten

**Alternative verworfen:** Erweiterung von `GET /api/meal-plans/recipes/suggestions/` um `plan_id` und `meal_id` Parameter — zu viele optionale Parameter, Response müsste breaking geändert werden.

### Decision 2: Hybrid-Architektur — Algorithmus + optionales KI-Reranking

Der primäre Pfad ist ein deterministisches Scoring. Optional kann ein Gemini-Call die Top 15 auf 9 reranken.

```
Algorithmus → Top 15 → [KI Rerank] → 9 kategorisiert
                ↓ (Fallback)
            Algorithmus → 9 kategorisiert (Top-3/Kategorie)
```

Gründe:
- **Algorithmus allein** ist schnell (<50ms), erklärbar und immer verfügbar
- **KI-Reranking** kann semantische Nuancen erfassen („dieses Rezept passt besser zum sommerlichen Grillabend")
- **Fallback** ist wichtig — bei KI-Fehlern (Rate-Limit, Timeout) liefert der Algorithmus immer 9 Ergebnisse
- Der User kann per `ai_enhance=true` Query-Parameter steuern, ob KI verwendet wird

### Decision 3: Scoring-Formel

```python
# Rohwerte
season_score = recipe_season_match(recipe, month) * 30    # 0–30
popularity_score = pct_rank(usage_count, all_recipes) * 25 # 0–25
variety_score = ingredient_overlap_penalty(recipe, already_planned) * 20 # 0–20
recency_score = recency_bonus(recipe, user) * 15           # 0–15
budget_score = budget_fit(recipe, plan) * 10               # 0–10

total = min(season_score + popularity_score + variety_score + recency_score + budget_score, 100)
```

- **season_score**: Anteil der Zutaten des Rezepts die im aktuellen Monat Saison haben (0.0–1.0) × 30
- **popularity_score**: Percentil-Rang des usage_count (0.0–1.0) × 25
- **variety_score**: Keine gemeinsamen Hauptzutaten mit bereits geplanten Rezepten (1.0) vs. viele Überlappungen (0.0) × 20
- **recency_score**: 1.0 wenn nie verwendet / >30 Tage her, 0.0 wenn gestern verwendet × 15
- **budget_score**: 1.0 wenn unter Budget, linear fallend bis 0.0 bei >150% des Budgets × 10

### Decision 4: Saisonalität via IngredientSeason-Modell

```python
class IngredientSeason(models.Model):
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="seasons")
    month = models.IntegerField(choices=[(m, m) for m in range(1, 13)])
    is_high_season = models.BooleanField(default=True)  # True=Haupternte, False=Nebenzeit
```

Seed-Daten für ~100 häufige Zutaten (Kartoffeln, Tomaten, Gurken, etc.) aus öffentlichen Saisonkalendern. Die Daten werden einmalig via Management-Command importiert.

Recipe season score = `count(in_season_ingredients) / count(all_ingredients)`

**Alternative verworfen:** Saison-Tags an Recipes — zu grobkörnig, erfordert manuelle Pflege.
**Alternative verworfen:** Nutzungsstatistik nach Monat — keine ausreichende Datenbasis (zu wenig historical data).

### Decision 5: Kategorisierungs-Logik

Nach dem Scoring/Ranking:

1. **top_picks** (3): Die 3 höchstbewerteten Rezepte, die von mindestens 2 verschiedenen recipe_types stammen
2. **variety** (3): Die 3 höchstbewerteten Rezepte mit minimaler Zutaten-Überschneidung zu top_picks und zueinander
3. **discovery** (3): Die 3 höchstbewerteten Rezepte die weder in top_picks noch in variety sind, mit Bonus für niedrigen usage_count

Falls nicht genug Rezepte für eine Kategorie (z.B. nur 4 bestehen harte Filter), wird weniger zurückgegeben — keine künstliche Auffüllung.

### Decision 6: Bereits Gegessenes — harter Ausschluss auf Plan-Ebene

Rezepte, die bereits in irgendeiner Mahlzeit des Plans vorkommen, werden komplett ausgeschlossen. Dies gilt planweit, nicht nur für den gleichen meal_type — ein Rezept soll nicht zweimal im selben Plan erscheinen, auch nicht in verschiedenen Mahlzeit-Typen.

Implementierung: `MealItem.objects.filter(meal__meal_plan=plan).values_list('recipe_id', flat=True)` als exclude-Liste.

## Risks / Trade-offs

- **[Saisondaten-Pflege]** Der IngredientSeason-Saisonkalender muss initial befüllt werden und ist nie vollständig. → MVP mit Top-100-Zutaten; Community kann später ergänzen
- **[KI-Latenz]** Gemini-Call kann 2-5s dauern. → KI nur mit `ai_enhance=true` und 5s Timeout; Algorithmus in <50ms
- **[KI-Kosten]** Jeder KI-Call kostet Geld. → Default ist Algorithmus pur; KI ist Opt-in pro Request
- **[Nicht genug Kandidaten]** Nach harten Filtern sind <9 Rezepte übrig. → Liefern was da ist; keine künstliche Auffüllung
- **[Scoring-Gewichte]** Die Gewichtung (30/25/20/15/10) ist willkürlich und muss evtl. angepasst werden. → Als Konfiguration im Code, einfach änderbar
- **[Saison-Bestimmung]** Nicht alle Zutaten haben Saisondaten → Diese Zutaten werden ignoriert (weder Plus noch Minus)
