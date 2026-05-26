## Context

Die Inspi-Plattform hat eine organisch gewachsene Navigation und Homepage mit folgenden Problemen:

- **Inkonsistente Terminologie**: "Veranstaltungen" soll einheitlich "Aktionen" heißen
- **Admin-Link** steht als eigener Nav-Punkt im Header — gehört ins Profil-Dropdown
- **Homepage ist überladen**: Fake-Statistiken, nicht-funktionale Kategorie-Links, Marketing-Sections ohne Mehrwert
- **Kategorie-Links** verlinken auf `/search?q=Sport & Spiel` (Volltext-Suche) statt auf Tag-basierte Filter
- **Tool-Landing-Pages** haben eigenständige Fake-Sandbox-Simulatoren, die nicht die echte App-Funktionalität abbilden
- **"Erstellen"-Hub** fehlt die Option, Events/Aktionen zu erstellen
- **UI-Inkonsistenzen**: Unterschiedliche Hover-Effekte, fehlende Breadcrumbs, kein einheitliches Page-Layout

Betroffene Dateien:
- `frontend/src/components/Layout.tsx` — Navigation (Header, Footer, Mobile)
- `frontend/src/lib/toolColors.ts` — Tool-Konfiguration (Labels, Icons)
- `frontend/src/pages/HomePage.tsx` — Startseite
- `frontend/src/pages/CreateHubPage.tsx` — Erstellen-Hub
- `frontend/src/pages/tools/EventsLandingPage.tsx` — Events Landing
- `frontend/src/pages/tools/SessionPlannerLandingPage.tsx` — Planner Landing
- `frontend/src/pages/tools/MealEventLandingPage.tsx` — Meal Event Landing
- `frontend/src/pages/tools/PackingListLandingPage.tsx` — Packing List Landing
- `frontend/src/pages/EventsPage.tsx` — Events Listenansicht
- `frontend/src/pages/MyDashboardPage.tsx` — Dashboard
- `frontend/src/pages/PersonsPage.tsx` — Personenverwaltung
- Diverse Event-Komponenten unter `frontend/src/components/events/`

Keine Backend-Änderungen, keine API-Änderungen, keine Datenbank-Migrationen erforderlich.

## Goals / Non-Goals

**Goals:**
- Einheitliche Umbenennung "Veranstaltungen" → "Aktionen" in allen UI-Texten
- Klarere Navigation: Admin ins Profil-Dropdown, Aktionen als Top-Level-Link
- Kompakte, funktionale Homepage ohne Fake-Daten und Marketing-Ballast
- Kategorie-Links, die auf echte Tag-basierte Filter verweisen
- Event/Aktionen-Erstellung über den Erstellen-Hub ermöglichen
- Tool-Landing-Pages mit echten App-Inhalten statt Fake-Simulatoren
- 10 Best-Practice UI/UX-Verbesserungen für konsistentes Look & Feel

**Non-Goals:**
- Keine Backend-API-Änderungen
- Keine neuen Routes/Pages erstellen (nur bestehende umbauen)
- Keine Änderung der URL-Pfade (bleiben englisch: `/events`, nicht `/aktionen`)
- Keine Änderung der Code-Identifier (Variable `TOOL_EVENTS` bleibt, nur `label` ändert sich)
- Kein Redesign des gesamten Design-Systems (nur Konsistenz-Verbesserungen)
- Keine neuen npm-Dependencies

## Decisions

### 1. Umbenennung nur in UI-Texten, nicht in Code

**Entscheidung**: Nur `label`, `tagline` und hardcodierte deutsche Strings ändern. Variablen, Routen, API-Pfade bleiben auf Englisch ("event").

**Rationale**: Trennung von UI-Sprache (Deutsch) und Code-Sprache (Englisch) gemäß Projektkonventionen. Minimiert Änderungsumfang und verhindert Regressions in Imports/Routen.

**Alternative**: Auch Keys umbenennen → abgelehnt, da unnötiger Breaking-Change ohne Nutzen.

### 2. Admin ins Profil-Dropdown verschieben

**Entscheidung**: Admin-Link aus `<nav>` in Desktop-Header entfernen, stattdessen als letzten Eintrag (vor "Abmelden") im Profil-Dropdown anzeigen. Gleiches für Mobile: aus dem Header-Icon-Bereich in die Profil-Section des Hamburger-Menüs verschieben.

**Rationale**: Admin ist eine Profilbezogene Funktion (nur für Staff) und gehört nicht in die Hauptnavigation. Reduziert die Nav-Breite und ist konsistent mit dem Muster "Staff-Features im Profil".

### 3. Aktionen als eigenständiger Top-Level-Link im Header

**Entscheidung**: "Aktionen" als direkten NavLink in die Desktop-Hauptnavigation aufnehmen (zwischen "Suchen" und "Inhalte"). Nicht als Dropdown, sondern als einzelner Link zu `/events`.

**Rationale**: Events/Aktionen sind eine Kernfunktion, die prominenter sein soll als im Tools-Dropdown versteckt. Gleichzeitig bleibt der Eintrag im Tools-Dropdown bestehen für Kontext.

### 4. Kategorien verlinken auf Tags via Unified Search

**Entscheidung**: Die Homepage-Kategorien (Sport & Spiel, Musik & Kreativ, etc.) verlinken auf `/search?tags=<tag-slug>` statt auf `/search?q=<name>`. Dafür müssen die CATEGORIES-Konstanten um `tagSlug`-Felder erweitert werden.

**Rationale**: Volltext-Suche nach Kategorienamen liefert ungenaue Ergebnisse. Tag-basierte Filter geben exakte Treffer. Das setzt voraus, dass passende Tags in der DB existieren — andernfalls auf `/sessions?tag_slugs=<slug>` oder ähnliche Content-Listenrouten verlinken.

**Fallback**: Falls kein passender Tag existiert, auf `/search?q=<name>` verlinken und dies als TODO markieren.

### 5. Fake-Sandboxes durch echte Previews ersetzen

**Entscheidung**: Die eigenständigen Sandbox-Komponenten (EventSandbox, SessionPlannerSandbox, MealPlanSandbox) in den Landing-Pages entfernen und durch folgendes ersetzen:
- Screenshot/Vorschau-Bild der echten App
- Direkter CTA-Button "Jetzt starten" zur App-Route
- Optional: Eingebettete echte Listenansicht der letzten Items (via TanStack Query)

**Rationale**: Die Sandboxes sind hunderte Zeilen hardcodierter Fake-Daten, die nie mit der echten App synchron sind. Eine echte Preview (oder ein Screenshot) ist wartbarer und ehrlicher.

**Alternative**: Echte Komponenten einbetten mit Mock-Provider → zu komplex, da die Komponenten stark von Auth/API abhängen.

### 6. Homepage-Sections radikal kürzen

**Entscheidung**: Folgende Sections entfernen oder zusammenführen:
- **Entfernen**: "So funktioniert's", "Fun Facts", "KI-Features"
- **Zusammenführen**: "Create CTA" + "Quick Links" → ein kompakter "Schnell loslegen"-Block
- **Kürzen**: "Community & Groups" → ein Einzeiler mit Links, "Rezepte & Zutatendatenbank" → kompakter
- **Behalten**: Hero (kürzer), Module Overview, Categories (mit Tag-Links), Newest Content

### 7. UI/UX Best Practices als inkrementelle Verbesserungen

**Entscheidung**: 10 gezielte Verbesserungen, die ohne neue Dependencies umgesetzt werden:
1. Einheitliche Karten-Hover (`hover:-translate-y-1 transition-all duration-200`)
2. Breadcrumb-Komponente für Unterseiten
3. Sticky Header mit Scroll-Shadow (`shadow-sm` bei scroll > 0)
4. Aktive Route-Hervorhebung konsistent in Desktop/Mobile/Hamburger
5. Page-Header-Pattern: Icon + Titel + Subtitle als wiederverwendbares Layout
6. Footer-Links vervollständigen (alle Module, Aktionen)
7. Konsistente "Zurück"-Navigation
8. Skeleton-Loading statt Spinner vereinheitlichen
9. Empty-State-Pattern vereinheitlichen
10. Mobile Hamburger: Aktionen als ersten Tool-Eintrag

## Risks / Trade-offs

**[Tag-Slugs müssen existieren]** → Die Kategorie-Links funktionieren nur, wenn passende Tags in der DB existieren. Mitigation: Beim Implementieren prüfen, welche Tags existieren, und bei Bedarf Seed-Data anlegen oder auf Fallback-Suche verlinken.

**[Sandbox-Entfernung reduziert Marketing-Wirkung]** → Landing-Pages ohne interaktive Demo könnten weniger überzeugend wirken. Mitigation: Durch echte Content-Previews und gute Screenshots kompensieren. Authentizität > Fake-Demos.

**[Umfangreicher Änderungs-Scope]** → Viele Dateien betroffen, Risiko von Regressions. Mitigation: Schrittweise Implementierung (erst Naming, dann Nav, dann Homepage, dann Landing-Pages, zuletzt Polish).

**[Breadcrumb-Komponente]** → Muss für alle Seiten generisch genug sein. Mitigation: Einfaches Array-basiertes Pattern `[{ label, href }]`, kein Router-basierter Auto-Breadcrumb.
