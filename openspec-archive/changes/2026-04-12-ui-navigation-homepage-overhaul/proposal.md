## Why

Die Navigation, Homepage und Tool-Landing-Pages sind organisch gewachsen und haben inkonsistente Bezeichnungen, kaputte Links und aufgeblähte Sandbox-Simulatoren, die nicht die echte Funktionalität abbilden. "Veranstaltungen" soll einheitlich "Aktionen" heißen, Admin gehört ins Profil-Dropdown statt als eigener Nav-Punkt, und die Homepage-Kategorien verlinken auf `/search?q=...` statt auf Tags. Die Landing-Pages verwenden eigenständige Fake-Demos statt echte Komponenten. Ein kompakter, konsistenter Auftritt ist überfällig.

## What Changes

### Navigation / Menü
- **BREAKING**: "Veranstaltungen" wird überall in der UI zu "Aktionen" umbenannt (Label, Tagline, Texte)
- "Aktionen" als eigener Top-Level-Link im Desktop-Header (statt nur im Tools-Dropdown)
- Admin-Link aus der Hauptnavigation entfernen und ins Profil-Dropdown verschieben (Desktop + Mobile)
- "Aktionen erstellen" als neue Option auf der `/create`-Seite (CreateHubPage)
- Mobile Bottom-Nav: "Tools"-Label zu "Aktionen" ändern (verlinkt auf `/events`)

### Homepage
- Kategorien-Section: Links auf Tag-basierte Filter ändern (`/search?tags=...` oder `/sessions?tag_slugs=...`) statt `/search?q=...`
- "So funktioniert's"-Section komplett entfernen
- "Fun Facts" mit Fake-Zahlen entfernen oder durch echte Daten ersetzen
- Alle Sections kürzer und kompakter machen — weniger Marketing-Text, mehr direkte Links
- KI-Features-Section entfernen (zeigt Features, die teils nicht existieren)
- Community & Groups Section straffen
- Create-CTA-Section und Quick-Links zusammenführen
- Rezepte & Zutatendatenbank-Section kürzen

### Tool-Landing-Pages
- Alle Fake-Sandbox-Simulatoren entfernen (EventsLandingPage, SessionPlannerLandingPage, MealEventLandingPage, PackingListLandingPage)
- Ersetzen durch eingebettete echte Komponenten oder direkte "Jetzt starten"-Links zur App
- NormPortionSimulatorPage: Evaluieren, ob die echte App eingebettet werden kann

### 10 Best-Practice UI/UX Verbesserungen
1. Konsistente Hover-Effekte auf allen Karten (einheitlich `hover:-translate-y-1`)
2. Breadcrumb-Navigation auf allen Unterseiten
3. Sticky Header mit Scroll-Schatten
4. Aktive Route visuell hervorheben in allen Nav-Varianten (Desktop, Mobile, Hamburger)
5. Einheitliche Seitenüberschriften-Struktur (Icon + Titel + Untertitel)
6. Footer-Links aktualisieren (Aktionen statt fehlender Links, alle Module verlinkt)
7. "Zurück"-Button auf allen Detail-/Erstellseiten
8. Konsistente Loading-States (Skeleton statt Spinner) auf allen Seiten
9. Leere-Zustand-Darstellungen (Empty States) vereinheitlichen
10. Mobile Hamburger-Menü: Aktionen prominent platzieren

## Capabilities

### New Capabilities
- `ui-navigation-restructure`: Umstrukturierung der Navigation (Header, Mobile-Nav, Profil-Dropdown, Admin-Verlagerung, Aktionen-Link)
- `homepage-redesign`: Kompakte Homepage mit funktionierenden Tag-Links, ohne Fake-Sections
- `landing-page-real-sandbox`: Tool-Landing-Pages mit echten Komponenten statt Fake-Simulatoren
- `ui-ux-polish`: 10 Best-Practice UI/UX-Verbesserungen für konsistentes Look & Feel

### Modified Capabilities
- `event-landing-page`: Sandbox wird durch echte Komponenten ersetzt, "Veranstaltungen" -> "Aktionen"

## Impact

### Betroffene Frontend-Dateien
- `frontend/src/components/Layout.tsx` — Navigation, Header, Footer, Mobile-Nav
- `frontend/src/lib/toolColors.ts` — TOOL_EVENTS Label/Tagline
- `frontend/src/pages/HomePage.tsx` — Kompletter Umbau
- `frontend/src/pages/CreateHubPage.tsx` — Aktionen-Option hinzufügen
- `frontend/src/pages/tools/EventsLandingPage.tsx` — Sandbox ersetzen
- `frontend/src/pages/tools/SessionPlannerLandingPage.tsx` — Sandbox ersetzen
- `frontend/src/pages/tools/MealEventLandingPage.tsx` — Sandbox ersetzen
- `frontend/src/pages/tools/PackingListLandingPage.tsx` — Sandbox ersetzen
- `frontend/src/pages/EventsPage.tsx` — "Veranstaltungen" -> "Aktionen"
- `frontend/src/pages/MyDashboardPage.tsx` — "Veranstaltungen" -> "Aktionen"
- `frontend/src/pages/PersonsPage.tsx` — "Veranstaltungen" -> "Aktionen"
- Diverse Event-Komponenten — "Veranstaltung" Texte aktualisieren

### Betroffene Django-Apps
- Keine Backend-Änderungen nötig (rein frontend-seitige UI-Änderungen)

### Schemas
- Keine Pydantic/Zod Schema-Änderungen (nur UI-Texte und Komponentenstruktur)

### Migrationen
- Keine Datenbank-Migrationen erforderlich
