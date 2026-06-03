## Context

Inspi hat bereits ein vereinheitlichtes `Rule`-Modell mit den Scopes `recipe`, `meal`, `day` und `meal_event`. Rezeptregeln werden aktuell über `GET /api/recipes/{recipe_id}/rules/` ausgewertet und im Food Frontend auf der Rezeptdetailseite angezeigt. Planer-Vorschläge werden über `GET /api/meal-plans/{id}/suggestions/` erzeugt und verwenden aggregierte Mahlzeit-, Tages- und Planwerte.

Die fachliche Lücke: Regeln wie Eiweiß, Zucker, Gewicht, Preis oder Nutri-Score sind auf Rezeptebene nur für vollständige Kalte und Warme Mahlzeiten sinnvoll. Für Frühstück, Snack, Dessert, Getränk, Beilage oder einfache Mahlzeiten ist die Rezeptregel isoliert irreführend; im Planer soll dieselbe Logik aber auf die gesamte Mahlzeit und darüber auf Tag und Gesamtplan wirken.

Betroffene Dateien:
- `backend/recipe/models/recipe.py`
- `backend/recipe/services/recipe_checks.py`
- `backend/recipe/services/nutrition_aggregation.py`
- `backend/recipe/services/suggestion_service.py`
- `backend/recipe/management/commands/seed_rules.py`
- `backend/recipe/api/nutrition.py`
- `backend/recipe/schemas/nutrition.py`
- `frontend-food/src/components/recipe/RecipeRulesBox.tsx`
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`
- `frontend-food/src/components/suggestions/SuggestionDashboard.tsx`
- `frontend-food/src/components/suggestions/SuggestionCard.tsx`
- `frontend-food/src/pages/admin/RuleTab.tsx`
- `frontend-food/src/components/admin/RuleEditDialog.tsx`
- `frontend-food/src/schemas/recipe.ts`
- `frontend-food/src/schemas/suggestions.ts`

API-Endpunkte bleiben stabil:
- `GET /api/recipes/{recipe_id}/rules/`: keine Request-Änderung; Response kann um optionale Felder für Anwendbarkeit/Hinweis erweitert werden.
- `GET /api/meal-plans/{id}/suggestions/`: keine Request-Änderung; Response nutzt zusätzliche Vorschläge aus neuen Rule-Parametern.
- Rule-Admin-Endpunkte bleiben stabil; sie müssen die neuen Parameterwerte akzeptieren und anzeigen.

## Goals / Non-Goals

**Goals:**
- Rezeptregeln auf `recipe`-Scope nur für `warm_meal` und `cold_meal` anwenden.
- Für andere Rezepttypen einen deutschen Hinweis anzeigen, dass keine Rezeptregeln sinnvoll sind und die Regeln im Planer auf Mahlzeiten angewandt werden.
- Preis-, Gewicht-, Nutri-Score- und zusätzliche Nährstoffparameter konsistent über Rezept, Mahlzeit, Tag und Gesamtplan verfügbar machen.
- Planer-Regeln für alle Mahlzeittypen auswerten, nicht nur warme und kalte Mahlzeiten.
- Standardregeln über `seed_rules` idempotent erweitern.
- Pydantic- und Zod-Schemas synchron halten, falls Response-Felder erweitert werden.

**Non-Goals:**
- Keine neue Rule-Engine oder neues Regelmodell.
- Keine Rückwärtskompatibilität für alte HealthRule- oder RecipeHint-Modelle.
- Keine personalisierten DGE-Regeln nach Alter/Geschlecht in diesem Change.
- Keine neue UI für eigene Regelprofile pro MealPlan.

## Decisions

### 1. Rezept-Anwendbarkeit wird im Backend bestimmt

`evaluate_recipe_rules(recipe)` entscheidet anhand von `recipe.recipe_type`, ob `scope=recipe`-Regeln ausgewertet werden. Zulässig sind nur `warm_meal` und `cold_meal`.

Alternative: Nur im Frontend ausblenden. Das wurde verworfen, weil API-Clients sonst weiterhin fachlich falsche Bewertungen erhalten könnten.

### 2. Nicht anwendbare Rezepttypen bekommen eine semantische Response statt Fehler

Der Endpunkt soll für Frühstück, Snack, Dessert usw. weiterhin `200` liefern, aber `items=[]` und optional `is_applicable=false` sowie einen Hinweistext zurückgeben.

Alternative: `204` oder `400`. Das wurde verworfen, weil der Zustand fachlich erwartbar ist und kein Client-Fehler.

### 3. Planer-Auswertung bleibt scope-basiert und gilt für alle MealTypes

Mahlzeit-, Tages- und Planregeln verwenden weiterhin `scope=meal`, `scope=day` und `scope=meal_event`. Dort wird nicht nach `meal_type` gefiltert. Dadurch wirken Regeln für Frühstück, Snack, Dessert und Getränke auf die Gesamtbilanz.

Alternative: Scope plus MealType-Filter im Rule-Modell. Das wäre flexibler, aber derzeit unnötig und erhöht Admin-Komplexität.

### 4. Gewicht wird als aggregierbarer Parameter ergänzt

`weight_g` wird in Rezeptauswertung und Planer-Aggregationen verfügbar gemacht. Für Performance kann `Recipe.cached_weight_g` ergänzt werden. Die Migration ist klein und passt zum bestehenden Cache-Konzept für Preis und Nährwerte.

Alternative: Gewicht immer live aus RecipeItems berechnen. Das wäre einfacher im Datenmodell, aber teurer in Planer-Listen und Vorschlägen.

### 5. Preis wird als vorhandener Cache-Wert genutzt

`cached_price_total` existiert bereits und wird für `price_total`-Regeln verwendet. Für Rezeptregeln wird zusätzlich ein Pro-Portion-Wert angezeigt, analog zu Nährwerten.

Alternative: Separater Parameter `price_per_serving`. Das erhöht die Parameterliste und ist vermeidbar, solange die Anzeige sauber pro Portion umrechnet.

### 6. Nutri-Score bleibt `nutri_class` mit numerischer Semantik

`nutri_class` wird weiterhin als 1=A bis 5=E bewertet. Für Anzeige liefert das Backend oder Frontend Buchstaben.

Alternative: Stringwerte `A` bis `E` in Rules. Das passt nicht zur bestehenden Schwellenwert-Engine.

### 7. Standardregeln werden als idempotente Seed-Daten erweitert

`seed_rules` bleibt die Quelle für Standardregeln. Regeln werden per Name/Scope/Parameter aktualisiert oder erstellt, ohne Duplikate.

Vorgeschlagene Rule-Gruppen:
- Rezept: Preis pro Portion, Gewicht pro Portion, Nutri-Klasse, Protein, Zucker, Ballaststoffe, gesättigte Fettsäuren, Natrium/Salz, Fettbereich, Energiebereich.
- Mahlzeit: Preis, Gewicht, Nutri-Klasse, Energie, Protein, Zucker, Ballaststoffe, Salz/Natrium, Fettbereich.
- Tag: Tagesbudget, Tagesgewicht, Durchschnitts-Nutri-Klasse, Energie, Protein, Ballaststoffe, Zucker, Salz/Natrium, Fett, gesättigte Fettsäuren.
- Gesamtplan: Durchschnittlicher Preis pro Person/Tag, Durchschnitts-Nutri-Klasse, Energie pro Tag, Protein pro Tag, Zucker pro Tag, Ballaststoffe pro Tag, Salz/Natrium pro Tag.

## Risks / Trade-offs

- Schwellenwerte können fachlich diskutabel sein → Standardwerte klar als Ausgangspunkt behandeln und über Food-Admin editierbar lassen.
- Pro-100g- und Pro-Portion-Semantik kann verwechselt werden → Response-Felder und UI-Texte konsequent als Pro-Portion, Pro-Mahlzeit, Pro-Tag oder Durchschnitt/Tag beschriften.
- `cached_weight_g` kann bei alten Rezepten leer sein → Migration/Backfill oder fallback live berechnen.
- Preisbewertungen können bei fehlenden Ingredient-Preisen zu optimistisch sein → bestehende Preisabdeckungs-Hinweise in Planer-Vorschlägen beibehalten oder erweitern.
- Mehr Regeln erzeugen mehr Vorschläge → UI muss weiterhin nach Rot/Gelb filtern und priorisieren, damit Nutzer nicht überflutet werden.

## Migration Plan

1. Optionales Feld `Recipe.cached_weight_g` hinzufügen und Migration erzeugen.
2. Cache-Neuberechnung so erweitern, dass `cached_weight_g` gesetzt wird.
3. Bestehende Rezepte per Management Command oder Migration neu berechnen lassen.
4. `evaluate_recipe_rules` fachlich einschränken und ggf. Response-Schema erweitern.
5. Aggregationen für Mahlzeit, Tag und Plan um `weight_g`, `price_total` und `nutri_class` sauber angleichen.
6. Seed-Regeln erweitern und idempotent halten.
7. Frontend-Hinweis für nicht anwendbare Rezepttypen ergänzen.
8. Tests für Rezeptregeln, Aggregation, Suggestions und Admin/Schema-Sync ergänzen.

Rollback: Die Migration kann zurückgerollt werden, solange keine produktive Abhängigkeit auf `cached_weight_g` besteht. Die fachliche Änderung an der Regelanwendung ist codebasiert reversibel.

## Open Questions

- Soll `price_total` bei Rezepten als Gesamtpreis oder Pro-Portion-Schwelle gespeichert werden? Empfehlung: Schwellenwerte fachlich als Pro-Portion kommunizieren, intern aber analog zu bestehenden Werten über `value_per_serving` anzeigen.
- Soll `simple_meal` später wie `warm_meal`/`cold_meal` behandelt werden? Aktuell nein, weil der Nutzer explizit nur Kalte und Warme Mahlzeit genannt hat.
