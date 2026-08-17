# food-design-system Specification

## MODIFIED Requirements

### Requirement: Zentrales Design-Token-System (MODIFIED)
Das Food Frontend SHALL alle Farben, Schatten, Radien und Schrift-Familien ausschließlich über zentrale Design-Token in `frontend-food/src/index.css` (CSS-Variablen) und `frontend-food/tailwind.config.ts` definieren. Zusätzlich zu den bestehenden Token SHALL vier semantische Status-Token definiert sein: `--success` (grün), `--warning` (gelb/bernstein), `--danger` (rot), `--info` (blau). Komponenten MUST diese Token über Tailwind-Utilities referenzieren (z.B. `bg-card`, `border-border`, `text-foreground`, `text-primary`, `bg-success`, `text-danger`) und SHALL NOT hartcodierte Farb-Utilities (z.B. `emerald-500`, `blue-600`, `gray-100`, `amber-50`, `red-50`) für semantische Flächen, Texte oder Borders verwenden. Der `NUTRI_SCORE_COLORS`-Mapping SHALL zentral in `@/schemas/supply` definiert sein und die Token `--success`, `--warning`, `--danger` verwenden.

#### Scenario: Status-Komponente nutzt semantische Token
- **WHEN** eine Komponente einen Status (Erfolg/Warnung/Fehler/Info) farblich darstellt
- **THEN** verwendet sie `bg-success`, `bg-warning`, `bg-danger` oder `bg-info` anstelle von `bg-emerald-50`, `bg-amber-50`, `bg-red-50`, `bg-blue-50`

#### Scenario: Nutri-Score nutzt zentrale Quelle
- **WHEN** eine Komponente Nutri-Score-Farben benötigt
- **THEN** importiert sie `NUTRI_SCORE_COLORS` aus `@/schemas/supply` ohne lokale Neudefinition

#### Scenario: Keine hartcodierten Status-Farben im Codebase
- **WHEN** der Codebase auf hartcodierte Status-Farben (z.B. `bg-amber-50`, `text-green-700`) durchsucht wird
- **THEN** existieren solche Klassen nur noch in Ausnahmen (z.B. Print-Styles, Drittanbieter-Komponenten)
