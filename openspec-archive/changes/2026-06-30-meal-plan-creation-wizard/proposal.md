## Why

Der aktuelle Create-Dialog für Essenspläne in `MealEventListPage.tsx` sammelt nur 5 von ~12 möglichen Settings (Name, Datum, Portionen, Ernährungstags, optionale Kopie). Reservefaktor, Budget, Tagesanteil-Faktoren, Essenszeiten, Beschreibung und Sichtbarkeit müssen nach der Erstellung im SettingsPanel nachgereicht werden. Es fehlt eine KI-gestützte Befüllung und ein geführter Wizard, der alle Einstellungen an einem Ort bündelt.

## What Changes

- **Neue Route** `/meal-plans/new` mit einem Full-Page Wizard zur Essensplan-Erstellung
- **Einfach/Erweitert-Toggle**: Standard-Ansicht mit 4 Kernfeldern (Name, Personen, Datum, Ernährung), aufklappbar zu allen Settings (Budget, Reserve, Faktoren, Zeiten, Sichtbarkeit)
- **Drei Befüllungs-Strategien**: Leeres Gerüst, Referenz-Kopie (komplett), KI-Generierung
- **KI-Befüllung**: Freitext-Prompt → Gemini → Vorschläge aus existierenden Rezepten → Annehmen/Verwerfen
- **Cockpit-Zusammenfassung**: Letzter Schritt zeigt alle Settings + Strategie-Ergebnis vor dem Erstellen
- **localStorage-Persistenz**: Wizard-Zustand bleibt bei Browser-Refresh erhalten
- **Neuer Backend-Endpoint**: `POST /api/ai/generate-meal-plan/` für KI-Vorschläge

## Capabilities

### New Capabilities
- `meal-plan-creation-wizard`: Geführter Mehrschritt-Wizard zur Essensplan-Erstellung mit Einfach/Erweitert-Toggle, drei Befüllungs-Strategien (leer, Referenz, KI), Cockpit-Zusammenfassung und localStorage-Persistenz
- `ai-meal-plan-generation`: KI-gestützte Generierung von Essensplan-Vorschlägen via Gemini unter Verwendung existierender Rezepte aus der Datenbank, gesteuert durch Freitext-Prompt und Ernährungstags

### Modified Capabilities

- (keine — der bestehende Create-Dialog wird durch den Wizard ersetzt, aber keine bestehenden Spec-Requirements ändern sich)

## Impact

- **Backend (planner)**: `MealPlanCreateIn` Schema bleibt unverändert. Neuer Endpoint `POST /api/ai/generate-meal-plan/` in `planner/api/meal_plan.py` oder `content/api/ai.py`
- **Backend (content/ai)**: Neuer AI-Service `generate_meal_plan()` in `content/services/ai_service.py` oder eigenem Service
- **Backend (recipe)**: Recipe-Suche wird für KI-Vorschläge benötigt (existiert bereits via `GET /api/meal-plans/recipes/search/`)
- **Frontend (frontend-food)**: Neue Page `WizardPage.tsx` + Custom Hook `useMealPlanWizardState` + Steps als Subkomponenten
- **Frontend (frontend-food)**: Neue Route `/meal-plans/new`, neuer Link in `MealEventListPage.tsx`
- **Keine Migrations** erforderlich (keine neuen Model-Felder)
- **Keine Breaking Changes** — bestehende API-Endpoints bleiben unverändert
