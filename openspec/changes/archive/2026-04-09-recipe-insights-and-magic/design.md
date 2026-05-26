## Context

Die Rezept-Detailseite (`frontend/src/pages/recipes/RecipeDetailPage.tsx`) zeigt bereits umfangreiche Nährwertdaten, Nutri-Score, 4-Dimensionen-Checks und Verbesserungsvorschläge an. Allerdings sind diese Daten rein informativ — der User kann nicht interagieren oder darauf reagieren.

**Aktueller Zustand:**
- Verbesserungsvorschläge (RecipeHints) werden als statische Liste angezeigt
- Portionen zeigen nur "X Normportionen" ohne Erklärung des Konzepts
- Nährwerte stehen isoliert ohne Referenzwert-Vergleiche
- Kein Mechanismus für persönliche Rezept-Varianten
- Recipe-Checks (fulfillment, cost, health, taste) existieren als Backend-Service (`recipe/services/recipe_checks.py`), aber die Frontend-Darstellung nutzt das Potenzial nicht

**Bestehende Infrastruktur (die wir nutzen):**
- `RecipeHint` Model mit regelbasierten Schwellwerten pro Nährwertparameter
- `NutriService` mit vollständiger Nutri-Score-Berechnung (French 2017 Algorithmus)
- `DGE_REFERENCE_VALUES` mit Referenzwerten nach Altersgruppe/Geschlecht
- `NormPersonService` mit BMR-Berechnung und Skalierungsfaktoren
- `IngredientAIService` mit Gemini-Integration für Zutaten-Autocompletion
- `recipe_checks.py` mit 4-Dimensionen-Bewertung

## Goals / Non-Goals

**Goals:**
- Rezepte werden über ein visuelles 4-Dimensionen-Apfel-Rating sofort einschätzbar
- Verbesserungsvorschläge sind interaktiv und führen zu konkreten Handlungsoptionen
- LLM-gestützte Vorschläge bieten kreative Rezeptverbesserungen
- User können Rezepte im Frontend anpassen und als persönliche Kopie speichern
- Gewichtsanzeigen sind menschenfreundlich (kg-Konvertierung)
- Normportionen werden erklärt statt nur als Zahl angezeigt

**Non-Goals:**
- Echtzeit-Collaboration an Rezepten (zu komplex, kein Bedarf)
- Automatische Rezept-Optimierung ohne User-Interaktion
- Vollständiger Rezept-Editor im Detail-View (nur Magic-Button-Anpassungen)
- Geschmacks-Scoring über Sensorik-Modelle (nur Proxy über Geschmacksträger)
- Nutri-Score-Algorithmus-Änderung (French 2017 bleibt)
- Mobile-App-spezifische Features

## Decisions

### 1. Apfel-Rating als eigenständiger Backend-Service

**Entscheidung:** Neuer Service `recipe/services/apple_rating_service.py` der die 4 Dimensionen berechnet und als 1-5-Skala (Äpfel) normalisiert.

**Begründung:** Die bestehenden `recipe_checks` liefern grob/gelb/rot-Bewertungen, aber kein feingranulares Rating. Ein dedizierter Service kann die Berechnungslogik sauber kapseln und ist unabhängig testbar.

**Alternativen:**
- `recipe_checks.py` erweitern: Abgelehnt — würde den Service überladen und die Check-Semantik (pass/fail) mit Rating-Semantik (Skala) vermischen
- Rein im Frontend berechnen: Abgelehnt — Geschäftslogik gehört ins Backend, und die Berechnung braucht Durchschnittswerte über alle Rezepte

**Dimensionen & Berechnung:**
- **Preis** (💰): `recipe.cached_price_total` vs. Durchschnittspreis aller Rezepte gleichen Typs. 5 Äpfel = unteres Quartil, 1 Apfel = oberstes Quartil
- **Gesundheit** (🍏): Direkte Abbildung von Nutri-Score-Klasse: A=5, B=4, C=3, D=2, E=1
- **Sättigung** (🔋): Energiedichte pro Portion vs. DGE-Referenz für Mahlzeitentyp. Verhältnis `actual_energy / expected_energy_for_meal_type`
- **Geschmack** (😋): Score basierend auf Geschmacksträgern — Analyse von Fett (Umami/Mundgefühl), Zucker (Süße), Gewürzen (Ingredient-Tags), Säure (Zitrusfrüchte etc.). Gewichteter Composite-Score

**API-Endpunkt:**
- `GET /api/recipes/{recipe_id}/apple-rating/` → `AppleRatingOut`

### 2. Magic Buttons — Frontend-State mit Backend-Suggestion-API

**Entscheidung:** Die Rezept-Anpassungen (Magic Buttons) werden komplett im Frontend-State gehalten (Zustand Store). Das Backend liefert nur Vorschläge, ändert aber kein bestehendes Rezept.

**Begründung:** Der User soll experimentieren können, ohne dass Daten sofort persistiert werden. Erst ein expliziter „Als persönliches Rezept speichern"-Klick persistiert die Änderungen.

**Alternativen:**
- Backend-Draft-System: Abgelehnt — zu viel Infrastruktur für temporäre Änderungen
- LocalStorage-Persistenz: Teilweise übernommen — Zustand-Store mit `persist`-Middleware für Session-Überlebung

**State-Modell:**
```typescript
interface RecipeModification {
  recipeId: number;
  originalItems: RecipeItem[];     // Originaldaten vom Server
  modifiedItems: RecipeItem[];     // Aktuell angezeigte (modifizierte) Items
  modifications: Modification[];   // Log aller Änderungen
  isDirty: boolean;                // Hat Änderungen gegenüber Original
}
```

### 3. Persönliche Rezepte als Recipe-Fork (nicht separates Modell)

**Entscheidung:** Persönliche Rezepte nutzen das bestehende `Recipe`-Modell mit einem neuen `owner`-ForeignKey und einem erweiterten `visibility`-Feld.

**Begründung:** Ein separates `PersonalRecipe`-Modell würde zu massiver Code-Duplikation führen — alle Nährwert-Berechnungen, Hint-Matching, Nutri-Score etc. müssten dupliziert werden. Stattdessen wird Recipe erweitert.

**Alternativen:**
- Separates PersonalRecipe-Modell: Abgelehnt — Code-Duplikation, doppelte Migrations, doppelte API
- Recipe mit `forked_from` FK: **Gewählt** — saubere Herkunftsverfolgung, alle Services funktionieren automatisch

**Neue Felder auf Recipe:**
- `owner`: FK zu User (nullable, null = System-Rezept / Inspi-verifiziert)
- `forked_from`: FK zu Recipe (nullable, self-referential — Original-Rezept)
- `visibility`: CharField mit Choices `private` / `group` / `public` (default: `private`). Nur relevant wenn `owner` gesetzt.

**Kategorisierung:**
- `owner=null, status=approved` → "Verified by Inspi" (grüner Badge)
- `owner=User, visibility=public, status=approved` → "Community-Rezept" (blauer Badge)
- `owner=User, visibility=private` → "Mein Rezept" (nur für Owner sichtbar)
- `owner=User, visibility=group` → für Gruppenfreigabe

### 4. LLM-Vorschläge über bestehenden Gemini-Service

**Entscheidung:** Neuer API-Endpunkt `POST /api/recipes/{recipe_id}/suggestions/` der den bestehenden Gemini Flash-Lite nutzt, um 3 konkrete Zutatentipps zu generieren.

**Begründung:** Der `IngredientAIService` nutzt bereits Gemini für Zutaten-Autovervollständigung. Die Infrastruktur (API-Keys, Error-Handling, Rate-Limiting) ist bereits vorhanden.

**Prompt-Strategie:**
- Input: Aktueller Rezept-Kontext (Zutaten, Nährwerte, Ziel-Dimension wie "mehr Ballaststoffe")
- Output: 3 strukturierte Vorschläge mit Zutat, Menge, Begründung und erwarteter Nährwert-Änderung
- Caching: Response wird für 24h gecached (gleicher Rezept-Hash + Ziel = gleiche Vorschläge)

### 5. Nutri-Score-Verbesserung als deterministische Berechnung

**Entscheidung:** Die 3 Vorschläge zur Nutri-Score-Verbesserung werden deterministisch berechnet (kein LLM), basierend auf dem Nutri-Score-Algorithmus.

**Begründung:** Der Nutri-Score ist ein mathematischer Algorithmus. Wir können exakt berechnen, welche Parameter-Änderungen (weniger Zucker, mehr Ballaststoffe etc.) den Score verbessern, und dann die Zutaten identifizieren, die am meisten zu dem negativen Parameter beitragen.

**Algorithmus:**
1. Aktuelle Nutri-Score-Punkte berechnen (negative und positive)
2. Für jeden Parameter simulieren: „Was passiert wenn dieser Wert um 10% besser wird?"
3. Die 3 wirksamsten Parameteränderungen auswählen
4. Pro Parameteränderung die Zutat(en) identifizieren, die am meisten beitragen

### 6. Gewichtsformatierung als Frontend-Utility

**Entscheidung:** Reine Frontend-Lösung mit einer `formatWeight(grams: number): string` Utility-Funktion.

**Regel:** `≥ 1000g → X,X kg` (gerundet auf 1 Dezimalstelle), `< 1000g → Xg` (ganzzahlig gerundet)

## Risks / Trade-offs

**[LLM-Kosten bei vielen Suggestions-Requests]** → 24h-Caching pro Rezept+Ziel-Kombination. Rate-Limiting: max 10 Suggestions pro User pro Stunde. Nur für authentifizierte User.

**[Frontend-State-Komplexität bei Magic Buttons]** → Zustand Store mit klarer Modification-History. Undo-Funktion über Modification-Log. Reset-Button zum Zurücksetzen auf Original.

**[Performance bei Apfel-Rating (Durchschnittswert-Berechnung)]** → Durchschnittswerte werden als aggregierte Werte gecached und stündlich aktualisiert (Management Command oder Celery Task). Fallback: Wenn kein Cache vorhanden, Berechnung on-the-fly mit DB-Aggregation.

**[Datenmigration — neue Felder auf Recipe]** → Alle neuen Felder sind nullable. Keine Datenmigration nötig. Bestehende Rezepte behalten `owner=null, forked_from=null, visibility=null`.

**[Recipe-Query-Komplexität mit Visibility-Filter]** → Default-QuerySet filtert: `(owner=null & status=approved) OR (owner=current_user) OR (visibility=public & status=approved)`. Index auf `(owner, visibility, status)` hinzufügen.

## Migration Plan

1. **Phase 1 — Backend-Erweiterungen** (keine Breaking Changes)
   - Recipe-Modell erweitern (`owner`, `forked_from`, `visibility`)
   - Migration erstellen und anwenden
   - Neue Services: `apple_rating_service.py`, `nutri_improvement_service.py`
   - Neue API-Endpunkte hinzufügen (additive, keine bestehenden ändern)

2. **Phase 2 — Frontend-Grundlagen**
   - Zustand Store für Recipe-Modifications
   - `formatWeight()` Utility
   - Apfel-Rating-Komponente
   - Normportionen-Hinweis

3. **Phase 3 — Interaktive Features**
   - Klickbare Hints mit Detail-Modal
   - Magic Buttons
   - LLM-Suggestions-Integration
   - Nutri-Score-Verbesserungsvorschläge

4. **Phase 4 — Persönliche Rezepte**
   - Fork-as-Personal-Recipe API
   - Personal Recipes Page
   - Visibility/Freigabe-UI

**Rollback:** Alle Änderungen sind additiv. Neue Felder können einfach ignoriert werden. Frontend-Features sind hinter Feature-Flags möglich, aber bei aktiver Entwicklung nicht nötig.

## Open Questions

- Soll die Geschmacksträger-Analyse auf den bestehenden `NutritionalTag`s basieren oder brauchen wir ein neues Tagging-System für Geschmacksprofile?
- Soll das 24h-Caching der LLM-Suggestions im Django-Cache (Redis) oder in einem DB-Modell gespeichert werden?
- Brauchen wir eine Moderation für öffentlich gesetzte User-Rezepte, oder reicht der bestehende `status`-Workflow (submitted → approved)?
