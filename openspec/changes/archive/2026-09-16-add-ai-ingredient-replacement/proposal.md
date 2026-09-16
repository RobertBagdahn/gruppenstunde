## Why

Die KI schlägt für ein vorhandenes „Salz“ derzeit zusätzlich „Jodsalz“ vor, weil generische und konkrete Zutaten nicht als fachlich verbundene Identitäten behandelt werden. Außerdem kann der Rezepteditor eine Zutat nur löschen, hinzufügen oder als Alternative ergänzen, aber nicht direkt ersetzen.

Das erzeugt doppelte Zutaten und macht die gewünschte Korrektur eines KI-Vorschlags unnötig umständlich.

## What Changes

- Generisch-konkrete Zuordnungen wie `Salz → Jodsalz`, `Milch → Kuhmilch 3,5 %` und `Nudeln → Fusilli trocken` werden als fachliche Ersatzbeziehungen ausgewertet.
- Die KI darf eine konkrete Zutat bei bereits vorhandener generischer Zutat nicht zusätzlich vorschlagen.
- Die konkrete Zutat wird stattdessen als explizite Ersetzung angeboten.
- Eine bestätigte Ersetzung tauscht das bestehende `RecipeItem` direkt aus.
- Menge, Notiz, Reihenfolge, Optionalstatus und Schritt-Zuordnungen werden soweit fachlich möglich übernommen.
- Austauschgruppen bleiben für echte Alternativen reserviert und werden nicht automatisch für eine Ersetzung verwendet.
- Ersetzungen werden serverseitig atomar und berechtigungsgeprüft durchgeführt.
- Vorschlags- und Apply-Endpoints verhindern weiterhin doppelte Rezeptitems, auch bei parallelen oder wiederholten Requests.
- Neue Draft-Zutaten werden nicht allein durch das Anzeigen eines verworfenen Vorschlags dauerhaft erzeugt.
- Pydantic- und Zod-Schemas erhalten die Ersetzungsdaten und den fachlichen Grund der Zuordnung.

## Capabilities

### New Capabilities

- `ingredient-replacement`: Direkter, atomarer Austausch einer Rezeptzutat mit Erhalt relevanter Rezeptmetadaten.
- `ingredient-equivalence-mapping`: Fachliche Beziehungen zwischen generischen und konkreten Zutaten für KI-Matching und Duplikatvermeidung.

### Modified Capabilities

- `recipe-ai-ingredients`: KI-Zutatenvorschläge müssen fachliche Ersatzbeziehungen berücksichtigen und dürfen keine äquivalenten Zutaten zusätzlich hinzufügen.
- `ingredient-matching`: Matchergebnisse müssen Ersatzbeziehungen und deren Konfidenz/API-Darstellung liefern.
- `variant-items`: Austauschgruppen bleiben von direkter Ersetzung getrennt und dürfen durch die neue Aktion nicht unbeabsichtigt verändert werden.

## Impact

- Backend-Apps `recipe`, `supply` und `content`.
- `IngredientMatcher`, generische Alias-/Termnormalisierung, KI-Zutatensuggestions und Rezeptitem-API.
- Neue oder erweiterte Rezeptitem- und Matching-Schemas sowie Food-Frontend-Hooks und Editor-Komponenten.
- Möglicherweise neue persistierte Mapping-/Auditdaten und eine Migration; bestehende Ingredient- und RecipeItem-IDs bleiben erhalten.
- Betroffene Rezeptschritt-Zuordnungen und Cache-/Nährwertinvalidierung müssen getestet werden.
