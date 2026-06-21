# semantic-colors Specification

## Purpose
Status-Farb-Token für konsistente success/warning/danger/info-Visuals im gesamten Food Frontend, dokumentiert im Styleguide.

## ADDED Requirements

### Requirement: Semantische CSS-Token
Das Food Frontend SHALL vier semantische HSL-Farb-Token in `frontend-food/src/index.css` definieren: `--success` (grün), `--warning` (gelb/bernstein), `--danger` (rot), `--info` (blau). Diese Token MUST in `frontend-food/tailwind.config.ts` als Tailwind-Farb-Utilities (`bg-success`, `text-danger`, `border-warning`, etc.) registriert werden.

#### Scenario: Token im Styleguide sichtbar
- **WHEN** ein Nutzer die Styleguide-Page unter `/styleguide` öffnet
- **THEN** sieht er die vier semantischen Token `--success`, `--warning`, `--danger`, `--info` mit ihren aktuellen HSL-Werten und Beispiel-Komponenten

#### Scenario: Token in Komponente nutzbar
- **WHEN** eine Komponente `bg-success` oder `text-danger` setzt
- **THEN** verwendet sie den korrespondierenden HSL-Wert aus `--success` bzw. `--danger`

### Requirement: Status-Farben für Nutri-Score
Das Nutri-Score-Badge SHALL die semantischen Token wie folgt mappen: Score A → `--success`, B → `--warning`, C/D/E → `--danger`. Die Farb-Definition MUST zentral in `@/schemas/supply` (`NUTRI_SCORE_COLORS`) definiert sein und von allen Komponenten importiert werden.

#### Scenario: Nutri-Score A zeigt grün
- **WHEN** ein Rezept Nutri-Score A hat
- **THEN** zeigt das Badge `bg-success` und `text-success-foreground`

#### Scenario: Zentrale Definition
- **WHEN** eine Komponente Nutri-Score-Farben benötigt
- **THEN** importiert sie `NUTRI_SCORE_COLORS` aus `@/schemas/supply` und definiert sie nicht lokal

### Requirement: Bestehende hartcodierte Farben ersetzen
Alle bestehenden hartcodierten Status-Farben in RecipeDetailPage, RecipeMetaCard, PortionScaler, RecipeRulesBox, HealthIndicator, NutrientCard, PriceRow, AnalysisSection SHALL durch die neuen semantischen Token oder bestehende Chart-Token ersetzt werden.

#### Scenario: HealthIndicator verwendet semantische Token
- **WHEN** `HealthIndicator` den Status 'good' anzeigt
- **THEN** verwendet es `bg-success/10 border-success/20 text-success`

#### Scenario: PortionScaler verwendet Warning-Token
- **WHEN** `PortionScaler` gerendert wird
- **THEN** verwendet es `bg-warning/10 border-warning/20` statt `bg-amber-50 border-amber-200`

#### Scenario: RecipeRulesBox verwendet Status-Token
- **WHEN** eine rote Regel angezeigt wird
- **THEN** verwendet sie `bg-danger/10 border-danger/20 text-danger` statt `bg-rose-50 border-rose-200 text-rose-600`
