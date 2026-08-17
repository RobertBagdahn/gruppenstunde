## Why

Die Action-Buttons (Drucken/Bearbeiten/Löschen) auf der Rezept-Detailseite nutzten `material-symbols-outlined`-Ligaturen als Icons. Lädt der Icon-Font nicht rechtzeitig, erscheint das Ligatur-Schlüsselwort (`print`, `edit`, `delete`) zusätzlich als sichtbarer Text neben dem deutschen Label — die Buttons wirken doppelt beschriftet. Zusätzlich ist die Meta-Card in der Seitenleiste (Gesamtkosten, Nutri-Score, Kochzeit, Vorbereitung, Schwierigkeit, Altersgruppe, Aufrufe, Likes, Erstellt am) visuell veraltet: kleine Schrift, inkonsistentes Grid-Alignment, keine klare Hierarchie zwischen Preis/Nutri-Score und den übrigen Fakten.

## What Changes

- Action-Buttons (Drucken/Bearbeiten/Löschen) verwenden ausschließlich `lucide-react`-Icons statt schriftbasierter Material-Ligaturen, damit nie Icon-Text und Label gleichzeitig sichtbar sind.
- Action-Buttons werden als kompakte quadratische Icon-Buttons neben dem Titel (rechtsbündig, gleiche Zeile) statt als volle Pill-Buttons in einer eigenen Zeile dargestellt.
- `RecipeMetaCard` erhält ein größeres, moderneres Layout: größere Preis-Typografie, Preis-pro-Portion als Zweitzeile, rundes Nutri-Score-Badge, visuelle Trennung zwischen Statistik-Feldern (Aufrufe/Likes) und Rezept-Fakten (Kochzeit, Vorbereitung, Schwierigkeit, Altersgruppe), gedimmte Darstellung von "Erstellt am", konsistente Icon-Container-Farbe an Primary-Akzent angelehnt.
- `RecipeMetaCard` wird bei Scroll in der Seitenleiste sticky positioniert und zeigt einen Skeleton-Zustand, solange Preis/Nutri-Score noch berechnet werden.
- Nutri-Score-Badge erhält ein Tooltip mit Kurzerklärung der Bewertung.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `recipe-detail-page`: Darstellung der Action-Buttons (Icon-only statt Text+Icon-Ligatur, rechtsbündig neben Titel) und der Seitenleisten-Metadaten (`RecipeMetaCard`: Layout, Hierarchie, Sticky-Verhalten, Skeleton-State) ändert sich.

## Impact

- Frontend: `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`, `frontend-food/src/components/recipe/RecipeMetaCard.tsx`
- Keine Backend-Änderungen, keine Pydantic-/Zod-Schema-Änderungen, keine Migrationen.
- Betrifft nur `frontend-food` (Essensplan-App), nicht `frontend` (Hauptplattform).
