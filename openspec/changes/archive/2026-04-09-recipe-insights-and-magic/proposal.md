## Why

Rezepte sind der inhaltsreichste Content-Typ in Inspi, aber die aktuelle Detailseite nutzt das Potenzial der vorhandenen Nährwert- und Preisdaten kaum interaktiv. Verbesserungsvorschläge (Hints) werden nur als statischer Text angezeigt, Portionen sind auf Normportionen fixiert ohne Erklärung, und es gibt keine Möglichkeit, ein Rezept interaktiv anzupassen und als persönliche Variante zu speichern. User sollen Rezepte verstehen, bewerten und verbessern können — mit „magischen" One-Click-Aktionen und tiefgehenden Einblicken.

## What Changes

### Rezept-Insights & Bewertungssystem
- **Apfel-Bewertungssystem** (1-5 Äpfel) als visuelles Rating-System oben auf der Rezeptseite mit vier Dimensionen: Preis (Vergleich zum Durchschnitt), Gesundheit (Nutri-Score), Sättigung (Normperson-Kalorien), Geschmack (Geschmacksträger-Analyse: gesättigte Fettsäuren, Zucker, Gewürze etc.)
- **Nutri-Score-Verbesserungsvorschläge**: Unter Gesundheit 3 konkrete Vorschläge anzeigen, welche Änderungen nötig sind, um eine Nutri-Score-Klasse besser zu werden
- **Referenzwert-Vergleiche**: Alle Nährwerte im Kontext von DGE-Referenzwerten anzeigen (bereits vorhanden in `supply/data/dge_reference.py`)

### Interaktive Verbesserungsvorschläge (Magic Buttons)
- **Klickbare Hints**: Verbesserungsvorschläge anklickbar machen, die eine Detailanalyse öffnen
- **Konkrete Zutatentipps**: Pro Hint anzeigen, welche Zutat erhöht/reduziert werden muss
- **LLM-Vorschläge**: Per Gemini 3 passende Zutaten-Ideen generieren (z.B. „Mehr Ballaststoffe? Probiere Leinsamen, Haferflocken oder Chiasamen")
- **Portions-Normalisierung**: Wenn Portion zu groß, automatisch auf Normportion skalieren und alle Mengen gleichmäßig reduzieren
- **Frontend-Only-Änderungen**: Magic-Button-Anpassungen ändern das Rezept nur im Frontend-State, nicht in der Datenbank

### Persönliche Rezepte
- **User-Rezepte speichern**: Angepasste Rezepte als persönliche Kopie speichern (nur für den User sichtbar)
- **Freigabe-System**: Persönliche Rezepte können freigegeben (für bestimmte Gruppen) oder öffentlich gesetzt werden
- **Rezept-Kategorisierung**: Unterscheidung zwischen „Verified by Inspi"-Rezepten (status=approved) und öffentlichen User-Rezepten (status=user_content)

### Portionen-Darstellung
- **Normportionen-Hinweis**: Erklärenden Hinweis anzeigen, was Normportionen bedeuten (Referenz: 15-jähriger Pfadfinder, PAL 1.5)
- **Portionen-Anzeige entfernen**: Die reine Portionen-Zahl nicht mehr prominent anzeigen, stattdessen den Kontext erklären

### Gewichtsanzeige
- **Gramm-zu-Kilogramm-Konvertierung**: Große Grammzahlen (≥1000g) automatisch in Kilogramm umwandeln und sinnvoll runden

## Capabilities

### New Capabilities
- `recipe-apple-rating`: Visuelles 4-Dimensionen-Apfel-Bewertungssystem (Preis, Gesundheit, Sättigung, Geschmack) mit Referenzwert-Vergleichen
- `recipe-magic-buttons`: Interaktive Rezept-Anpassungen (klickbare Hints, LLM-Vorschläge, automatische Portions-Normalisierung) — Änderungen nur im Frontend-State
- `personal-recipes`: Persönliche Rezept-Kopien mit Freigabe-System (privat, Gruppen-Freigabe, öffentlich) und Unterscheidung zu Inspi-verifizierten Rezepten

### Modified Capabilities
- `recipe`: Portionen-Darstellung ändern (Normportionen-Hinweis statt reine Zahl), Gewichtsanzeige mit kg-Konvertierung, Hint-Detail-Ansicht
- `recipe-portion-scaling`: Integration mit Magic Buttons für automatische Portions-Normalisierung

## Impact

### Backend (Django)
- **`recipe` App**: Neues `PersonalRecipe`-Modell (oder erweitertes Recipe mit `owner`-FK und `visibility`-Feld), neue API-Endpunkte für persönliche Rezepte, LLM-Endpunkt für Zutatentipps
- **`recipe/api/nutrition.py`**: Erweiterung der Hint-Response um konkrete Zutatentipps, neuer Endpunkt für Nutri-Score-Verbesserungsvorschläge
- **`recipe/services/`**: Neuer Service für Apfel-Rating-Berechnung, Erweiterung `recipe_checks.py` für Geschmacksträger-Analyse
- **Pydantic-Schemas**: `RecipeHintMatchOut` erweitern (Zutatentipps), neues `AppleRatingOut`-Schema, `PersonalRecipeOut`-Schema, `LlmSuggestionOut`-Schema
- **Migrationen**: Ja — neues PersonalRecipe-Modell, ggf. neue Felder auf Recipe

### Frontend (React)
- **`schemas/recipe.ts`**: Neue Zod-Schemas für Apple-Rating, LLM-Vorschläge, Personal Recipes
- **`api/recipes.ts`**: Neue Query-/Mutation-Hooks für Personal Recipes, LLM-Vorschläge, Apple-Rating
- **`pages/recipes/RecipeDetailPage.tsx`**: Umfangreiche Erweiterung — Apfel-Rating oben, klickbare Hints mit Modals, Magic Buttons, Frontend-State für Rezeptänderungen, Speichern-als-persönlich-Button
- **`components/recipe/`**: Neue Komponenten für AppleRating, HintDetailModal, MagicButtons, PersonalRecipeSaveDialog
- **Neue Page**: `PersonalRecipesPage.tsx` für persönliche Rezept-Übersicht
