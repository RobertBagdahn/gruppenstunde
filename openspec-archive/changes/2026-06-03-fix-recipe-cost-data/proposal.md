## Why

Die Kostenberechnung im Essensplan zeigt fehlerhafte Daten: Kartoffelsuppe kostet angeblich 305,79 € für 18 Personen (~17 €/Person für eine Suppe). Die meisten anderen Rezepte zeigen "–" weil keine Zutatenpreise hinterlegt sind. Die UX kommuniziert fehlende Preise schlecht.

Drei Probleme:
1. **Falsche Rezeptdaten**: Rezepte mit `servings=1` und unrealistischen Mengen (4680g Öl für 1 Person) aus Legacy-Import
2. **Fehlende Preise**: Die meisten Zutaten haben kein `price_per_kg`, daher "–" statt Kosten
3. **Schlechte UX**: "–" und "0,00 €" kommunizieren nicht, dass Preise fehlen

## What Changes

- Management Command zum Identifizieren und Fixen fehlerhafter Rezeptdaten (unrealistische Mengen, falsche `servings`)
- Automatische Preisschätzung für Zutaten ohne `price_per_kg` erweitern/ausführen
- **Frontend**: "–" durch aussagekräftige Darstellung ersetzen ("Preise fehlen", Coverage-Anzeige)
- Fixes auf lokaler DB und Prod-DB anwenden

## Capabilities

### New Capabilities

- `recipe-data-validation`: Management Command zur Erkennung und Korrektur unrealistischer Rezeptmengen und fehlender Servings-Werte

### Modified Capabilities

- `meal-plan-cost-dashboard`: UX-Verbesserung der Kostenanzeige bei fehlenden Preisen (statt "–" klare Kommunikation)
- `ingredient-database`: Sicherstellen, dass alle aktiv genutzten Zutaten einen `price_per_kg`-Wert haben

## Impact

- **Backend**: `recipe` App (Daten-Fix), `supply` App (Preise), neuer Management Command
- **Frontend-Food**: `CostDashboard.tsx` (UX-Verbesserung)
- **Datenbank**: Lokal + Prod — Rezeptdaten korrigieren, Preise ergänzen
- **Keine Schema-Änderungen**: Bestehende API-Response enthält bereits `priced_ingredients`/`total_ingredients`
- **Keine Migrations nötig**: Nur Daten-Updates, keine Model-Änderungen
