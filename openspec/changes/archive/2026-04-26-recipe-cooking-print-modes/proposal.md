## Why

Wenn Gruppenführer ein Rezept tatsächlich kochen, ist die normale Rezept-Detailseite nicht optimal: Sie enthält viele kontextuelle Zusatzblöcke (Bewertungen, Improvements, Kommentare), die beim Kochen ablenken, und die Zubereitungsschritte stehen in kleiner Markdown-Schrift.

Analog gilt: Wenn ein Gruppenführer das Rezept ausdrucken möchte (Ferienlager ohne Internet, Küchenhilfe, Aushang), ist die Standard-Seite druck-unfreundlich — Sidebar, Kommentare und Aktionen werden mitgedruckt.

Ziel: Zwei neue Ansichtsmodi über URL-Parameter erreichbar:
1. **Cooking Mode** (`?mode=cooking`): Großformatiger Vollbild-Fokus auf Zutaten + Zubereitungsschritte, Wake-Lock gegen Bildschirm-Sperre, Step-by-Step-Navigation
2. **Print View** (`?mode=print` oder automatisch bei `window.print()`): Reduzierte, schwarzweiß-optimierte Layout-Variante für A4

## What Changes

### Cooking Mode
- URL-Parameter `mode=cooking` aktiviert eine Vollbild-Variante (kein Header, keine Sidebar, keine Bottom-Bar aus Change #3)
- Layout: Links Zutaten (mit PortionScaler oben), rechts Zubereitungsschritte
- Schriftgrößen größer (`text-lg`/`text-xl` Basis), höhere Zeilenabstände
- Schritte werden automatisch aus Markdown-`description` geparst (Splitting an Überschriften oder nummerierten Listen; Fallback: ganzer Block als ein Schritt)
- Aktuell aktiver Schritt hervorgehoben, mit „Zurück" / „Weiter"-Buttons am Bildschirmrand
- Screen Wake Lock API aktivieren, damit Bildschirm nicht schläft
- Exit-Button oben rechts führt zurück zum normalen Detail-Modus (Route ohne `mode`-Param)
- Button „Kochen starten" wird in der Sidebar (Desktop) und Bottom-Bar (Mobile) aus Change #3 ergänzt

### Print View
- `@media print` CSS-Regeln in globalem Stylesheet oder Komponenten-Ebene
- Versteckt: Header, Sidebar, Bottom-Bar, Kommentare, Improvements, Aktions-Buttons
- Zeigt: Titel, Metadaten (kompakt), Zutatenliste (für aktuelle Portionenzahl), Zubereitungsschritte, Nutri-Score (schwarzweiß-Variante)
- Layout: Einspaltig, A4-Seitenrand-Margins (`@page { margin: 2cm }`), Pagebreaks vermeiden innerhalb von Listen
- URL-Parameter `mode=print` zeigt die Druck-Vorschau auch am Bildschirm (nützlich für Gestaltung und Debug)
- Button „Drucken" in Sidebar triggert `window.print()` direkt im aktuellen Modus

### State und Routing
- `mode`-Parameter via URL-State (keine Zustand-Dopplung), auslesbar mit `useSearchParams`
- Beim Verlassen des Cooking Modes: Wake Lock wird explizit released
- Cooking-Mode-State (aktueller Schritt-Index) als weiterer URL-Parameter `step=N` — erlaubt direkten Link auf einen bestimmten Schritt

## Capabilities

### Modified Capabilities
- `recipe`: Neue Requirements für Cooking Mode und Print View. Kein Impact auf Backend oder bestehende Datenmodelle.

## Impact

### Abhängigkeiten
- **Blockiert durch**: Change #3 (Sidebar-Layout). Die neuen Actions „Kochen starten" und „Drucken" werden in die dort definierten Sidebar- und Bottom-Bar-Strukturen integriert.

### Betroffene Frontend-Dateien
- `frontend/src/pages/recipes/RecipeCookingMode.tsx` — **neu**, eigenständige Vollbild-Komponente
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — conditional Render je nach `mode`-Param; Print-CSS via Tailwind `print:`-Utilities
- `frontend/src/components/recipe/RecipeSidebar.tsx` — neue Action-Buttons „Kochen" und „Drucken"
- `frontend/src/components/recipe/RecipeMobileActionBar.tsx` — ggf. Overflow-Menu für „Kochen" und „Drucken", da Bottom-Bar nur 2 Primär-Slots hat
- `frontend/src/hooks/useWakeLock.ts` — **neu**, Wake-Lock-Hook mit Release-Cleanup
- `frontend/src/lib/parseRecipeSteps.ts` — **neu**, parst Markdown in Schritt-Array

### Keine Backend-Änderungen
- Kein API-Impact, keine Schemas, keine Migrations.

### Browser-Kompatibilität
- Wake Lock API: Chrome/Edge/Safari ≥16.4, Firefox ≥126. Fallback: Ohne Wake Lock läuft Cooking Mode trotzdem, nur Bildschirm kann einschlafen. Keine Fehler-UI nötig.
- `@media print`: universell supported.

### User-Abnahme
- Mit realen Rezepten auf Smartphone testen (Küchen-Simulation)
- Druckvorschau in Chrome und Safari prüfen
