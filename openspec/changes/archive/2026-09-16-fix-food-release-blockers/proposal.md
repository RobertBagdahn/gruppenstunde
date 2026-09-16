## Why

Der aktuelle Food-Stand ist für ein Staging-Deployment weitgehend stabil, enthält aber drei produktionsrelevante Vertragsbrüche: Replacement-Kandidaten werden nach dem Matching wieder herausgefiltert, der alte Data-Quality-Batch-Apply kann den neuen Preis-Approval-Workflow umgehen, und Meal-Plan-Kosten liefern keine vollständige Preisabdeckung. Diese Pfade müssen vor einem produktiven Go-Live konsolidiert werden, damit Nutzer keine Duplikate erzeugen, KI-Preise nicht unbestätigt global speichern und unvollständige Kosten nicht als vollständig erscheinen.

## What Changes

- Replacement-Kandidaten aus der KI-Zutatensuche bleiben in der API-Response erhalten und werden nicht als normale Add-Kandidaten behandelt.
- Die Ersetzungslogik validiert weiterhin Zielportion, Berechtigung, Idempotenz, Variantengruppen und Cache-Neuberechnung atomar.
- Der bisherige Data-Quality-Preis-Batch-Workflow wird auf den `IngredientPriceProposal`- und expliziten Approval-Prozess umgestellt; direkte globale Preisupdates aus KI-Ergebnissen werden entfernt oder auf manuelle, klar getrennte Preisänderungen begrenzt.
- Batch-Preisvorschläge bleiben einzeln prüfbar, nachvollziehbar und dürfen positive bestehende Preise nicht still überschreiben.
- Meal-Plan-Kosten liefern `total_ingredients`, `priced_ingredients`, `missing_ingredients` und eine konsistente Coverage-Angabe für aktive Rezept- und Direktzutaten.
- Food-Zod-Schemas und Kostenansichten zeigen unvollständige Preisabdeckung eindeutig und synchron mit den Pydantic-Schemas.
- Cross-Consumer-Tests decken Replacement, Price Approval, Meal-Plan-Kosten, Cache-Invalidierung und den alten Batch-Endpoint ab.
- Die noch offene Piece-Portion-Änderung wird nicht Bestandteil dieses Changes; sie bleibt ein separater Release-Blocker, bis sie implementiert oder explizit aus dem Produktionsscope genommen wurde.

## Capabilities

### New Capabilities
- `food-release-integrity`: Release-relevante Integritätsregeln für Replacement-, Preis-Approval- und Preisabdeckungs-Workflows.

### Modified Capabilities
- `recipe-ai-ingredients`: Replacement-Kandidaten werden trotz bereits vorhandener Quellzutat ausgeliefert und ausschließlich über den direkten Replacement-Endpoint angewendet.
- `ai-price-approval`: Jeder KI-generierte globale Preis läuft über Proposal, Review und explizite Bestätigung, auch im Data-Quality-Batch-Workflow.
- `data-quality-dashboard`: Preisbewertung und Batch-Aktionen zeigen und verwenden den Approval-Status statt eines direkten Preis-Apply-Pfads.
- `meal-plan`: Kostenantworten liefern vollständige Preisabdeckung einschließlich fehlender Preise.

## Impact

- Backend-Apps `recipe`, `supply`, `content` und `planner`.
- APIs `recipe/api/items.py`, `content/api/data_quality.py` und `planner/api/meal_plan.py`.
- Pydantic-Schemas für AI-Zutatensuggestions, Preis-Analyse und Meal-Plan-Kosten sowie die synchronen Food-Zod-Schemas.
- Food-Frontend: Inline-Replacement-Dialog, Data-Quality-Preisansicht, Ingredient-Approval-UI und Meal-Plan-Kostenansichten.
- Bestehende Datenbankmodelle für `IngredientPriceProposal` und RecipeItem-Idempotenz werden wiederverwendet; voraussichtlich keine neue Migration, sofern keine zusätzlichen Audit- oder Coverage-Felder nötig werden.
- Verifikation mit gezielten Backend- und Food-Frontend-Tests sowie einem vollständigen Backend-Testlauf vor dem Deployment.
