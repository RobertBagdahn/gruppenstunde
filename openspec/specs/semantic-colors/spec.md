# semantic-colors Specification

## Purpose
Status-Farb-Token für konsistente success/warning/danger/info-Visuals im gesamten Food Frontend, dokumentiert im Styleguide.
## Requirements
### Requirement: Semantische CSS-Token
Das Food Frontend SHALL vier semantische HSL-Farb-Token in `frontend-food/src/index.css` definieren: `--success` (grün), `--warning` (bernstein, als Text ≈ `#B45309`, als Fläche ≈ `#FFFBEB`), `--danger` (rot), `--info` (blau). Diese Token MUST in `frontend-food/tailwind.config.ts` als Tailwind-Farb-Utilities (`bg-success`, `text-danger`, `border-warning`, etc.) registriert werden. `--warning` SHALL kein dunkles Braun sein; die Lichtstärke des Warning-Textes MUST ≥ 30 % betragen und die Warning-Fläche MUST hell sein.

#### Scenario: Token im Styleguide sichtbar
- **WHEN** ein Nutzer die Styleguide-Page unter `/styleguide` öffnet
- **THEN** sieht er die vier semantischen Token `--success`, `--warning`, `--danger`, `--info` mit ihren aktuellen Werten und Beispiel-Komponenten

#### Scenario: Token in Komponente nutzbar
- **WHEN** eine Komponente `bg-success` oder `text-danger` setzt
- **THEN** verwendet sie den korrespondierenden HSL-Wert aus `--success` bzw. `--danger`

#### Scenario: Warnhinweis
- **WHEN** eine Warnung (z. B. „Nährwerte fehlen“) angezeigt wird
- **THEN** erscheint sie als helle Bernsteinfläche mit bernsteinfarbenem Text, nicht als dunkelbraune Fläche

### Requirement: Status-Farben für Nutri-Score
Der Nutri-Score SHALL ausschließlich in den offiziellen Farben von Santé publique France dargestellt werden: A `#038141`, B `#85BB2F`, C `#FECB02`, D `#EE8100`, E `#E63E11`; Schrift auf A und E weiß, auf B, C und D dunkel. Die Darstellung MUST ausschließlich über die Komponente `NutriScoreBadge` (`components/shared/NutriScoreBadge.tsx`) in den Größen `sm` (Listen), `md` (Karten, Kopfbereiche) und `scale` (vollständige Skala A–E mit hervorgehobener Klasse) erfolgen. Status-Token (`--success`, `--warning`, `--danger`) SHALL NOT für den Nutri-Score verwendet werden, und die Nutri-Score-Farben SHALL NOT für andere Bedeutungen verwendet werden. Diagramme mit Nutri-Score-Klassen MUST die Farben aus derselben Quelle beziehen. Ein Vitest MUST sicherstellen, dass `nutri-*`-Klassen, `NUTRI_SCORE_COLORS` und die Nutri-Hexwerte nur in `NutriScoreBadge` und `schemas/supply.ts` vorkommen.

#### Scenario: Nutri-Score A zeigt grün
- **WHEN** ein Rezept mit Nutri-Score A in der Rezeptliste erscheint
- **THEN** zeigt `NutriScoreBadge size="sm"` ein „A“ in Weiß auf `#038141`

#### Scenario: Nutri-Score D in der Statistik
- **WHEN** die Seite `/data-distributions` die Nutri-Score-Verteilung zeigt
- **THEN** ist der Balken für D `#EE8100`

#### Scenario: Zentrale Definition
- **WHEN** eine Komponente außer `NutriScoreBadge` eine `nutri-*`-Klasse oder einen Nutri-Hexwert enthält
- **THEN** schlägt der Test fehl

### Requirement: Bestehende hartcodierte Farben ersetzen
Alle bestehenden hartcodierten Status-Farben in RecipeDetailPage, RecipeMetaCard, PortionScaler, RecipeRulesBox, HealthIndicator, NutrientCard, PriceRow, AnalysisSection SHALL durch die semantischen Token oder bestehende Chart-Token ersetzt werden. Status-Token als Button-Fläche für normale Aktionen (z. B. `bg-warning` bei „Kochen starten“) SHALL durch `--primary` bzw. `--primary-soft` ersetzt werden.

#### Scenario: HealthIndicator verwendet semantische Token
- **WHEN** `HealthIndicator` den Status 'good' anzeigt
- **THEN** verwendet es `bg-success-soft border-success-border text-success`

#### Scenario: PortionScaler verwendet Warning-Token
- **WHEN** `PortionScaler` gerendert wird
- **THEN** verwendet es `bg-warning-soft border-warning-border` statt `bg-amber-50 border-amber-200`

#### Scenario: RecipeRulesBox verwendet Status-Token
- **WHEN** eine rote Regel angezeigt wird
- **THEN** verwendet sie `bg-danger-soft border-danger-border text-danger` statt `bg-rose-50 border-rose-200 text-rose-600`

#### Scenario: Aktions-Buttons ohne Statusfläche
- **WHEN** im Code nach `bg-warning ` (Vollfläche) gesucht wird
- **THEN** gibt es keinen Treffer an einem Button
