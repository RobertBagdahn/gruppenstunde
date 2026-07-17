## ADDED Requirements

### Requirement: Management-Command zur Portion-/Mengen-Bereinigung
Das System MUSS einen Management-Command bereitstellen, der bestehende Inkonsistenzen zwischen Portionen und RecipeItems in fester Reihenfolge bereinigt: (1) Dedupe doppelter `rank=1`-Portionen, (2) Rebind von RecipeItems auf gelöschte Portionen, (3) AI-gestützte Plausibilitätsprüfung aller Rezeptmengen, (4) vollständige Cache-Neuberechnung betroffener Rezepte.

#### Scenario: Vollständiger Reparatur-Lauf
- **WHEN** der Command ohne Einschränkungen ausgeführt wird
- **THEN** MÜSSEN zuerst alle Zutaten mit mehreren aktiven `rank=1`-Portionen bereinigt werden
- **THEN** MÜSSEN danach alle RecipeItems mit toter Portion-Referenz umgehängt werden
- **THEN** MUSS danach die AI-Plausibilitätsprüfung über alle Rezepte laufen
- **THEN** MUSS abschließend für jedes veränderte Rezept `recalculate_recipe_cache()` aufgerufen werden

#### Scenario: Reihenfolge ist zwingend
- **WHEN** der Command ausgeführt wird
- **THEN** DARF die AI-Plausibilitätsprüfung (Schritt 3) erst nach Abschluss von Dedupe (Schritt 1) und Rebind (Schritt 2) beginnen

### Requirement: Dedupe doppelter rank=1-Portionen
Für jede Zutat mit mehr als einer aktiven `rank=1`-Portion MUSS das System automatisch genau eine Portion als `rank=1` behalten: bevorzugt diejenige, auf die bereits mindestens ein `RecipeItem` zeigt; andernfalls diejenige mit dem plausibelsten `weight_g` (basierend auf Zutat-Kategorie-Heuristik). Alle anderen Kandidaten MÜSSEN auf einen freien, nicht mit `rank=1` kollidierenden Rang zurückgestuft werden.

#### Scenario: Referenzierte Portion gewinnt
- **WHEN** eine Zutat zwei aktive `rank=1`-Portionen hat und mindestens ein RecipeItem auf eine davon zeigt
- **THEN** MUSS die referenzierte Portion `rank=1` behalten
- **THEN** MUSS die andere Portion auf einen freien Rang zurückgestuft werden

#### Scenario: Keine der Portionen ist referenziert
- **WHEN** eine Zutat zwei aktive `rank=1`-Portionen hat und keine davon von einem RecipeItem referenziert wird
- **THEN** MUSS die Portion mit dem plausibelsten `weight_g` `rank=1` behalten

### Requirement: AI-Plausibilitätsprüfung für Rezeptmengen
Das System MUSS eine Funktion bereitstellen, die für jedes Rezept die Gesamtmenge (Gramm) pro Portion mittels Gemini auf Plausibilität prüft und bei unrealistischen Werten (z. B. mehrere Kilogramm oder wenige Gramm pro Person für ein Hauptgericht) automatisch neue, realistische Mengen für alle betroffenen `RecipeItem`s vorschlägt und speichert — ohne manuelle Freigabe.

#### Scenario: Unplausibles Rezept wird korrigiert
- **WHEN** ein Rezept mit `portions=1` ein Gesamtgewicht von mehreren Kilogramm aufweist
- **THEN** MUSS die Prüfung neue, realistische Mengen für die Zutaten dieses Rezepts berechnen
- **THEN** MÜSSEN diese Mengen automatisch gespeichert werden, ohne dass ein Nutzer sie bestätigen muss

#### Scenario: Plausibles Rezept bleibt unverändert
- **WHEN** ein Rezept ein realistisches Gesamtgewicht pro Portion aufweist
- **THEN** DÜRFEN dessen `RecipeItem`-Mengen nicht verändert werden

### Requirement: Vollständige Cache-Neuberechnung nach Reparatur
Nach jeder automatisierten Mengen- oder Portion-Änderung durch den Reparatur-Command MUSS für das betroffene Rezept eine vollständige Neuberechnung aller Cache-Felder (kcal, Preis, Nährwerte, Nutri-Score, Gesamtgewicht) erfolgen.

#### Scenario: Cache wird nach Mengenänderung aktualisiert
- **WHEN** die AI-Plausibilitätsprüfung die Mengen eines Rezepts ändert
- **THEN** MUSS `recalculate_recipe_cache()` für dieses Rezept aufgerufen werden, bevor der Command-Lauf als abgeschlossen gilt
