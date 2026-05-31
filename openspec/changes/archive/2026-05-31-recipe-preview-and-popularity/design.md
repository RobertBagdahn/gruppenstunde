## Context

Der RecipeSearchDialog (`frontend-food/src/pages/planning/RecipeSearchDialog.tsx`) wird über den "+"-Button in der MealEventDetailPage geöffnet. Aktuell zeigt er eine Suchleiste + Filterliste und fügt ein Rezept sofort bei Klick hinzu — ohne Vorschau. Es gibt kein Popularity-Tracking.

Das Recipe-Model hat bereits denormalisierte Cache-Felder (`cached_energy_kj`, `cached_price_total`, etc.). MealItem verknüpft Rezepte mit Meals über einen FK.

## Goals / Non-Goals

**Goals:**
- Nutzer können ein Rezept vor dem Hinzufügen in einer Vorschau inspizieren (Bild, Nährwerte, Preis, Zutaten, Tags)
- Beliebteste Rezepte (persönlich + Community) werden als Schnellzugriff angezeigt
- usage_count wird denormalisiert am Recipe gespeichert für performante Queries
- Toast-Feedback nach erfolgreichem Hinzufügen

**Non-Goals:**
- Kein vollständiges Rezept-Detail (keine Zubereitungsschritte im Preview)
- Keine Recommendation-Engine / ML-basierte Vorschläge
- Kein Caching in Redis — Django-DB-Feld reicht (usage_count ist denormalisiert)

## Decisions

### 1. Denormalisiertes `usage_count` statt Live-Aggregation

**Entscheidung:** `usage_count = IntegerField(default=0, db_index=True)` am Recipe-Model.

**Begründung:** `COUNT(*)` über MealItem bei jedem Request ist teuer bei wachsender Datenmenge. Ein denormalisiertes Feld ermöglicht `ORDER BY usage_count DESC` ohne Join/Aggregation.

**Aktualisierung:** Django Signal auf `MealItem.post_save` und `post_delete` — atomisches `F('usage_count') + 1` bzw. Neuberechnung. Management Command für initialen Backfill.

### 2. Zwei Rankings: Personal + Community

**Entscheidung:** API liefert beide Listen getrennt.

- **Community:** `Recipe.objects.order_by('-usage_count')[:limit]` — trivial dank denormalisiertem Feld
- **Personal:** `MealItem.objects.filter(meal__meal_plan__created_by=user).values('recipe').annotate(count=Count('id')).order_by('-count')[:limit]` — Live-Aggregation ist OK weil pro-User-Daten klein sind

### 3. Preview-Dialog als separater Dialog (Variante A)

**Entscheidung:** Klick auf Rezept öffnet einen zweiten Dialog über dem Such-Dialog. Such-Dialog bleibt im Hintergrund offen.

**Begründung:** Mobile-First-tauglich, klare Trennung, einfaches State-Management. "Abbrechen" geht zurück zur Suche, "Hinzufügen" schließt alles.

### 4. Search-Response erweitern statt Extra-Fetch

**Entscheidung:** Die bestehende Recipe-Search-Response wird um Preview-Felder erweitert (image, servings, cached_energy_kj, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_price_total, cached_nutri_class, nutritional_tags, ingredients_preview).

**Begründung:** Kein Extra-Roundtrip beim Klick. Die zusätzlichen Felder sind cached/klein, der Overhead pro Ergebnis ist minimal (~200 Bytes).

### 5. ingredients_preview als String-Array

**Entscheidung:** Backend liefert `ingredients_preview: list[str]` — die Namen der ersten 8 Zutaten des Rezepts.

**Begründung:** Für den Preview reichen die Namen. Vollständige RecipeItems mit Mengen wären Overkill.

### 6. Toast nach Hinzufügen

**Entscheidung:** Nach "Hinzufügen" werden beide Dialoge geschlossen und ein Toast "✓ {Rezeptname} hinzugefügt" erscheint in der Meal-Ansicht.

## Risks / Trade-offs

| Risiko | Mitigation |
|--------|-----------|
| usage_count wird bei Bulk-Deletes inkonsistent | Management Command zum Rekalkulieren; Signals decken Normalfall ab |
| Personal-Ranking ist Live-Aggregation | Pro-User-Daten sind klein (<1000 MealItems typisch), kein Performance-Problem |
| Search-Response wird größer | Nur ~200 Bytes pro Ergebnis mehr, bei limit=20 vernachlässigbar |
| Zwei Dialoge übereinander auf kleinem Screen | Preview-Dialog ist max-w-sm, volle Breite auf Mobile |
