## 1. Globale Umbenennung: Veranstaltungen -> Aktionen

- [x] 1.1 `toolColors.ts`: TOOL_EVENTS `label` von "Veranstaltungen" zu "Aktionen" ändern, `tagline` aktualisieren
- [x] 1.2 `EventsPage.tsx`: Seitenüberschrift "Veranstaltungen" zu "Aktionen" ändern
- [x] 1.3 `MyDashboardPage.tsx`: "Eingeladene Veranstaltungen" und "Angemeldete Veranstaltungen" zu "Eingeladene Aktionen" / "Angemeldete Aktionen" ändern
- [x] 1.4 `PersonsPage.tsx`: Alle "Veranstaltung"-Texte durch "Aktion" ersetzen (aber "Veranstaltungsort" als zusammengesetztes Wort behalten)
- [x] 1.5 `EventsLandingPage.tsx`: Alle "Veranstaltung"-Texte in Beschreibungen, Features, FAQ durch "Aktion" ersetzen
- [x] 1.6 Restliche Event-Komponenten durchsuchen und "Veranstaltung"-Texte aktualisieren (StepDateLocation, OverviewTab, PackingListTab, LocationDetailDialog)

## 2. Navigation Restructure: Layout.tsx

- [x] 2.1 Desktop-Header: "Aktionen"-NavLink als Top-Level-Link zwischen "Suchen" und "Inhalte"-Dropdown einfügen (Icon: `celebration`, Route: `/events`)
- [x] 2.2 Desktop-Header: Admin-NavLink aus der `<nav>`-Hauptnavigation entfernen
- [x] 2.3 Desktop-Profil-Dropdown: Admin-Eintrag hinzufügen (nur für `user?.is_staff`, vor "Abmelden")
- [x] 2.4 Mobile-Header: Admin-Icon-Button entfernen
- [x] 2.5 Mobile-Hamburger: Admin-Eintrag in die Profil-Section verschieben (nur für Staff)
- [x] 2.6 Mobile-Bottom-Nav: Label "Tools" zu "Aktionen" ändern, Route auf `/events` belassen
- [x] 2.7 `toolsMenuItems`: "Veranstaltungen" zu "Aktionen" in Label umbenennen (wird automatisch durch toolColors abgedeckt, verifizieren)
- [x] 2.8 Footer: Links aktualisieren — alle Module und Tools verlinken, "Aktionen" aufnehmen

## 3. CreateHubPage: Aktionen-Option hinzufügen

- [x] 3.1 `CreateHubPage.tsx`: Neue Karte "Aktion" mit Icon `celebration`, Route `/events/app/new`, passende Beschreibung

## 4. Homepage Redesign

- [x] 4.1 "So funktioniert's"-Section (Zeilen 548-607) komplett entfernen
- [x] 4.2 "Fun Facts"-Section (Zeilen 331-349) entfernen
- [x] 4.3 "KI-Features"-Section (Zeilen 351-379) entfernen
- [x] 4.4 "Community & Groups"-Section (Zeilen 381-442) zu kompakten Links innerhalb "Schnell loslegen" kürzen
- [x] 4.5 "Create CTA"-Section (Zeilen 509-545) und "Quick Links"-Section (Zeilen 700-731) zu einem "Schnell loslegen"-Block zusammenführen, inklusive "Aktion erstellen"
- [x] 4.6 "Rezepte & Zutatendatenbank"-Section (Zeilen 609-698) drastisch kürzen oder in Module Overview integrieren
- [x] 4.7 Kategorien-Section: CATEGORIES-Array um `tagSlug` erweitern, Links auf `/search?tags=<slug>` ändern (Fallback auf `?q=` wenn kein Tag existiert)
- [x] 4.8 Planungs-Tools Section: Sicherstellen dass "Aktionen" als erstes Item gelistet wird
- [x] 4.9 Hero-Section kürzen: Weniger Marketing-Text, kompakter
- [x] 4.10 Module-Overview: Alle Labels auf aktuelle Bezeichnungen prüfen

## 5. Tool-Landing-Pages: Fake-Sandboxes ersetzen

- [x] 5.1 `EventsLandingPage.tsx`: EventSandbox-Komponente (Zeilen ~139-437) entfernen, durch kompakte Vorschau mit CTA "Jetzt starten" (`/events/app`) ersetzen
- [x] 5.2 `SessionPlannerLandingPage.tsx`: Kalender-Sandbox entfernen, durch CTA "Jetzt starten" (`/session-planner/app`) ersetzen
- [x] 5.3 `MealEventLandingPage.tsx`: Mahlzeiten-Sandbox entfernen, durch CTA "Jetzt starten" (`/meal-events/app`) ersetzen
- [x] 5.4 `PackingListLandingPage.tsx`: Packlisten-Sandbox entfernen, durch CTA "Jetzt starten" (`/packing-lists/app`) ersetzen
- [x] 5.5 Alle Landing-Pages auf einheitliche Struktur prüfen: Hero → Features → CTA (max 300 Zeilen)

## 6. UI/UX Best Practices

- [x] 6.1 Sticky Header mit Scroll-Shadow: `useEffect` für scroll-Event in Layout.tsx, `shadow-sm` bei `scrollY > 0`
- [x] 6.2 Aktive Route-Hervorhebung: Konsistente `isActive`-Logik in Desktop-Nav, Mobile-Bottom-Nav und Hamburger-Menü prüfen und vereinheitlichen
- [x] 6.3 Karten-Hover-Effekte: Alle klickbaren Karten auf einheitliches `hover:-translate-y-1 transition-all duration-200` prüfen (HomePage, Landing-Pages, CreateHubPage, SearchPage)
- [x] 6.4 Breadcrumb-Komponente erstellen: Wiederverwendbare `Breadcrumb`-Komponente mit `[{ label, href }]`-Array
- [x] 6.5 Breadcrumbs in Detail-/Erstellen-Seiten einbauen: SessionDetailPage, RecipeDetailPage, BlogDetailPage, GameDetailPage, EventDashboardPage, Create-Seiten
- [x] 6.6 Einheitliche Seitenüberschriften: Page-Header-Pattern (Icon + h1 + Subtitle) auf SessionListPage, BlogListPage, GameListPage, EventsPage prüfen
- [x] 6.7 Footer-Links vervollständigen: Alle Content-Module und Tools im Footer verlinken
- [x] 6.8 Zurück-Navigation: Konsistenten "Zurück"-Link auf Detail- und Erstellen-Seiten einbauen
- [x] 6.9 Loading-States: Skeleton statt Spinner auf Seiten prüfen, die noch Spinner verwenden
- [x] 6.10 Empty-States: Einheitliches Empty-State-Pattern (Icon + Titel + CTA) auf allen Listen-Seiten

## 7. Verifizierung

- [x] 7.1 TypeScript Build prüfen: `npm run build` ohne Fehler
- [x] 7.2 Alle "Veranstaltung"-Texte im Frontend durchsuchen — keine verbleibenden Vorkommen (außer "Veranstaltungsort")
- [x] 7.3 Mobile-Layout testen: 320px, 375px, 768px Breakpoints
- [x] 7.4 Desktop-Layout testen: Alle Dropdowns, Nav-Links, Footer-Links
- [x] 7.5 Keine console.log Statements in geänderten Dateien
