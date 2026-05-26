# best-practices Specification

## Purpose

Querschnittsspezifikation für UI-Patterns, Code-Konventionen, Formular-Handling, State Management, Bildverarbeitung, Accessibility und Testing-Standards der Inspi-Plattform. Definiert verbindliche Regeln für konsistente Implementierung über alle Module hinweg.

## Context

- **Backend**: Django Ninja, Pydantic v2, Python 3.13
- **Frontend**: React 18, TypeScript (strict), TanStack Query v5, Zustand v5, shadcn/ui
- **Querschnittsthema**: Gilt für alle Spec-Domänen

## Requirements

### Requirement: Formular-Handling

Alle Formulare MUST react-hook-form mit Zod-Resolver verwenden.

#### Scenario: Formular-Setup

- GIVEN ein neues Formular wird implementiert
- THEN wird `react-hook-form` mit `@hookform/resolvers/zod` verwendet
- AND das Zod-Schema definiert alle Validierungsregeln
- AND das Zod-Schema ist 1:1 synchron mit dem Pydantic-Schema im Backend
- AND Fehler werden inline am jeweiligen Feld angezeigt (nicht als Toast)

#### Scenario: Validierungsstrategie

- GIVEN ein Formular mit Eingabefeldern
- WHEN der Benutzer ein Feld verliert (onBlur) oder das Formular absendet
- THEN werden Client-seitige Validierungsregeln (Zod) geprüft
- AND bei Server-Antwort werden Server-Fehler ebenfalls inline am Feld angezeigt
- AND die gleichen Validierungsregeln gelten in Pydantic (Backend) als Sicherheitsnetz

#### Scenario: Formular-Submit

- GIVEN ein Benutzer sendet ein Formular ab
- WHEN die Validierung erfolgreich ist
- THEN wird der Submit-Button deaktiviert und zeigt einen Spinner
- AND bei Erfolg: Toast-Benachrichtigung + Redirect zur Detail-Seite
- AND bei Fehler: Toast mit Fehlermeldung, Formular bleibt mit Daten erhalten
- AND der Submit-Button wird wieder aktiviert

### Requirement: Loading States

Das Frontend MUST kontextabhaengige Loading-States mit strukturierten Skeleton-Loadern anzeigen, die die finale Inhaltsstruktur widerspiegeln.

#### Scenario: Initiales Laden von Listen und Seiten

- **WHEN** eine Seite zum ersten Mal geladen wird
- **THEN** werden Skeleton-Loader in der Form des erwarteten Inhalts angezeigt
- **THEN** Skeletons muessen die tatsaechliche Inhaltsstruktur widerspiegeln (Cards, Text-Zeilen, etc.)
- **THEN** jeder Skeleton MUST mindestens 3 unterscheidbare Platzhalter-Bereiche haben
- **THEN** einzelne undifferenzierte `animate-pulse` Bloecke sind VERBOTEN
- **THEN** es wird KEIN leeres Layout ohne Feedback angezeigt

#### Scenario: Aktionen (Speichern, Loeschen, etc.)

- **WHEN** ein Benutzer eine Mutation ausfuehrt (Erstellen, Bearbeiten, Loeschen)
- **THEN** wird ein Spinner im ausloesenden Button angezeigt
- **THEN** der Button ist waehrend der Anfrage deaktiviert
- **THEN** andere Interaktionen auf der Seite bleiben moeglich

#### Scenario: Nachladen (Mehr laden)

- **WHEN** eine paginierte Liste einen "Mehr laden"-Button hat
- **THEN** wird ein Spinner im Button angezeigt beim Laden
- **THEN** die bestehenden Eintraege bleiben sichtbar
- **THEN** neue Eintraege werden unterhalb angehaengt

### Requirement: Empty States

Das Frontend MUST leere Zustaende mit der shared `<EmptyState>` Komponente anzeigen. Alle Seiten MUST die gleiche Komponente verwenden fuer konsistente Darstellung.

#### Scenario: Leere Liste (keine Daten vorhanden)

- **WHEN** eine Listen-Seite keine Eintraege hat (z.B. keine Sessions, keine Events)
- **THEN** wird die shared `<EmptyState>` Komponente gerendert mit:
  - Maskottchen-Bild (bevorzugt) ODER Material Symbols Icon
  - Titel als Heading auf Deutsch (z.B. "Noch keine Gruppenstunden vorhanden")
  - Beschreibungstext auf Deutsch
  - CTA-Button zum Erstellen (z.B. "Erste Gruppenstunde erstellen"), nur sichtbar wenn der Benutzer die Berechtigung hat
- **THEN** die Komponente SHALL zentriert dargestellt werden mit angemessenem Abstand

#### Scenario: Leere Suchergebnisse

- **WHEN** eine Suche keine Ergebnisse liefert
- **THEN** wird die shared `<EmptyState>` Komponente gerendert mit:
  - Maskottchen-Bild
  - Text: "Keine Ergebnisse fuer '{suchbegriff}'"
  - Beschreibung: "Versuche einen anderen Suchbegriff oder weniger Filter"
- **THEN** die aktiven Filter werden als Chips angezeigt mit Moeglichkeit, sie zu entfernen

### Requirement: Pagination

Alle Listen MUST Pagination mit "Mehr laden"-Pattern verwenden.

### Requirement: Container width standard

Die best-practices SHALL drei standardisierte Container-Breiten-Tiers definieren, die alle Seiten verwenden MUESSEN.

#### Scenario: Container-Tier Zuordnung

- **WHEN** eine neue Seite implementiert wird
- **THEN** MUST sie einen der drei Container-Tiers verwenden:
  - `max-w-7xl` fuer Grid-Listenseiten (Sessions, Games, Blogs, Recipes, Search)
  - `max-w-5xl` fuer Dashboard/Management-Seiten (Events, Ingredients, MealEvents)
  - `max-w-3xl` fuer Detail/Formular-Seiten (Create, Edit, GroupDetail)
- **THEN** der Container MUST `mx-auto px-4 sm:px-6 lg:px-8` fuer konsistentes Padding verwenden

#### Scenario: Standard-Pagination

- GIVEN eine Listen-Ansicht mit mehr als 20 Einträgen
- THEN werden initial 20 Items geladen (Standard page_size)
- AND ein "Mehr laden"-Button wird am Ende der Liste angezeigt
- AND der Button zeigt die verbleibende Anzahl: "Mehr laden (noch 15)"
- AND nach Klick werden die nächsten 20 Items angehängt

#### Scenario: Pagination konfigurieren

- GIVEN ein Benutzer möchte die Seitengröße ändern
- THEN stehen die Optionen 10, 20 oder 50 Items zur Verfügung
- AND die Auswahl wird als URL Query-Parameter gespeichert: `?page-size=50`
- AND die Einstellung bleibt beim Neuladen der Seite erhalten

#### Scenario: Pagination-Response-Format

- GIVEN ein paginierter API-Endpunkt
- THEN antwortet er im Format:

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 20,
  "total_pages": 8
}
```

### Requirement: Accessibility (WCAG 2.1 AA)

Das Frontend MUST WCAG 2.1 Level AA einhalten.

#### Scenario: Semantisches HTML

- GIVEN jede UI-Komponente
- THEN wird semantisches HTML verwendet:
  - `<nav>` für Navigation
  - `<main>` für Hauptinhalt
  - `<article>` für eigenständige Inhalte (Ideas, Events)
  - `<section>` für thematische Gruppierungen
  - `<button>` für klickbare Aktionen (nicht `<div onClick>`)
  - `<a>` für Links zu anderen Seiten

#### Scenario: Keyboard-Navigation

- GIVEN ein Benutzer navigiert per Tastatur
- THEN sind alle interaktiven Elemente per Tab erreichbar
- AND die Fokus-Reihenfolge ist logisch (top-to-bottom, left-to-right)
- AND fokussierte Elemente haben einen sichtbaren Fokus-Ring
- AND Dialoge können per Escape geschlossen werden
- AND Dropdown-Menüs können per Pfeiltasten navigiert werden

#### Scenario: Kontraste und Farben

- GIVEN Text und interaktive Elemente
- THEN hat normaler Text ein Kontrastverhältnis von mindestens 4.5:1
- AND großer Text (>= 18px bold oder >= 24px) hat mindestens 3:1
- AND Farbe allein wird NICHT als einziges Unterscheidungsmerkmal verwendet
  (z.B. Fehler: rote Farbe UND Icon/Text, nicht nur rot)

#### Scenario: ARIA-Labels

- GIVEN interaktive Elemente ohne sichtbaren Text (z.B. Icon-Buttons)
- THEN haben sie ein `aria-label` mit deutscher Beschreibung
- AND Formulare haben zugeordnete `<label>`-Elemente oder `aria-label`
- AND Bilder haben aussagekräftige `alt`-Texte auf Deutsch (oder `alt=""` für dekorative Bilder)

#### Scenario: Screen-Reader-Unterstützung

- GIVEN dynamische Inhaltsänderungen (Toast, Ladevorgang abgeschlossen)
- THEN werden `aria-live="polite"` Regionen für Status-Updates verwendet
- AND Toasts sind als `role="alert"` markiert
- AND Ladezustände werden mit `aria-busy="true"` kommuniziert

### Requirement: Bildverarbeitung

Bilder MUST serverseitig optimiert und im Frontend lazy geladen werden.

#### Scenario: Bild-Upload

- GIVEN ein Benutzer lädt ein Bild hoch
- WHEN die Datei größer als 500KB ist
- THEN wird der Upload abgelehnt mit Fehlermeldung: "Bild zu groß. Maximum: 500KB."
- AND die erlaubten Formate sind: JPEG, PNG, WebP, GIF

#### Scenario: Serverseitige Bildoptimierung

- GIVEN ein Bild wird erfolgreich hochgeladen
- THEN wird es serverseitig zu WebP konvertiert
- AND mehrere Größen werden generiert:
  - Thumbnail: 150x150px (Vorschau, Listen)
  - Medium: 600px Breite (Detail-Ansicht Mobile)
  - Large: 1200px Breite (Detail-Ansicht Desktop)
- AND die Original-Datei wird NICHT gespeichert (nur optimierte Versionen)

#### Scenario: Frontend Bild-Darstellung

- GIVEN ein Bild wird im Frontend angezeigt
- THEN wird `loading="lazy"` gesetzt (außer Hero-Bilder above-the-fold)
- AND `width` und `height` Attribute werden gesetzt (Layout-Shift vermeiden)
- AND das `srcset`-Attribut referenziert die verschiedenen Größen

### Requirement: State Management

Die Anwendung MUST eine klare Trennung zwischen Server-State und Client-State haben.

#### Scenario: Server-State (API-Daten)

- GIVEN Daten, die vom Server kommen (Ideas, Events, User-Profile)
- THEN wird TanStack Query v5 für Caching, Fetching und Synchronisation verwendet
- AND Daten werden NICHT zusätzlich in Zustand oder Context dupliziert
- AND `staleTime` und `gcTime` werden pro Query-Typ sinnvoll konfiguriert

#### Scenario: Client-State (UI-Zustand)

- GIVEN reiner UI-Zustand (Auth-Status, Theme, Sidebar-State, Modals)
- THEN wird Zustand v5 verwendet
- AND Stores werden klein und fokussiert gehalten (ein Store pro Domäne)
- AND React Context wird NICHT für State-Management verwendet

#### Scenario: URL-State

- GIVEN filterbarer, teilbarer Zustand (Suchbegriff, Filter, Paginierung, Ansichtsmodus)
- THEN wird der Zustand über URL Query-Parameter abgebildet
- AND Seiten sind bookmarkbar und teilbar
- AND der Browser-Back-Button funktioniert korrekt
- AND URL-Parameter verwenden kebab-case: `?type=session&scout-level=woelfling&page-size=20`

### Requirement: Inhaltsformat (Markdown statt HTML)

Alle Freitext-/Rich-Text-Felder MUST Markdown als Inhaltsformat verwenden. HTML-Editoren (z.B. Tiptap) und `dangerouslySetInnerHTML` sind verboten.

#### Scenario: Rich-Text-Eingabe

- GIVEN ein Formularfeld für formatierten Text (z.B. Beschreibung, Zusammenfassung)
- THEN wird die `MarkdownEditor`-Komponente (`src/components/MarkdownEditor.tsx`) verwendet
- AND der Editor basiert auf `@uiw/react-md-editor`
- AND es wird KEIN HTML-basierter Editor (Tiptap, Quill, CKEditor, etc.) verwendet
- AND der Editor unterstützt GitHub Flavored Markdown (GFM)

#### Scenario: Rich-Text-Darstellung

- GIVEN formatierter Text soll im Frontend angezeigt werden
- THEN wird die `MarkdownRenderer`-Komponente (`src/components/MarkdownRenderer.tsx`) verwendet
- AND der Renderer basiert auf `react-markdown` mit `remark-gfm` Plugin
- AND HTML-Inhalte werden via `rehype-sanitize` bereinigt
- AND `dangerouslySetInnerHTML` wird NIEMALS verwendet (XSS-Risiko)
- AND die Darstellung verwendet Tailwind Typography (`prose`-Klassen)

#### Scenario: Backend-Speicherung

- GIVEN ein Freitext-Feld in einem Django-Model
- THEN wird der Inhalt als Markdown-Plaintext in einem `TextField` gespeichert
- AND die API gibt den Markdown-Text direkt zurück (kein serverseitiges Rendering zu HTML)
- AND serverseitige Konvertierung (z.B. für E-Mails) verwendet `markdown2` oder ähnliche Bibliotheken

#### Scenario: Verbotene Patterns

- GIVEN Code-Review oder neue Implementierung
- THEN sind folgende Patterns verboten:
  - `dangerouslySetInnerHTML` (XSS-Risiko)
  - Tiptap oder andere HTML-basierte Editoren
  - HTML-Tags in Datenbank-Feldern (außer Legacy-Daten vor Migration)
  - Direkte HTML-String-Interpolation in React-Komponenten

### Requirement: Code-Konventionen

Alle Entwickler MUST die folgenden Code-Konventionen einhalten.

#### Scenario: Namenskonventionen

- GIVEN neuer Code wird geschrieben
- THEN gelten folgende Namensregeln:

| Bereich | Konvention | Beispiel |
|---------|------------|---------|
| TypeScript Variablen | camelCase | `ideaCount`, `isLoading` |
| React Komponenten | PascalCase | `IdeaCard`, `SearchPage` |
| React Hooks | camelCase mit "use"-Prefix | `useIdeas`, `useCreateIdea` |
| TypeScript Interfaces/Types | PascalCase | `IdeaResponse`, `CreateIdeaInput` |
| Zod Schemas | PascalCase + "Schema" Suffix | `IdeaSchema`, `CreateIdeaSchema` |
| Python Variablen/Funktionen | snake_case | `idea_count`, `get_ideas` |
| Python Klassen | PascalCase | `IdeaService`, `SearchFilter` |
| Pydantic Schemas | PascalCase + "Schema"/"Out" | `IdeaSchema`, `IdeaOut` |
| Django Models | PascalCase Singular | `Idea`, `Tag`, `MaterialItem` |
| API-Endpunkte | kebab-case | `/api/ideas/by-slug/{slug}` |
| URL-Routen | kebab-case | `/packing-lists/:id` |
| URL Query-Parameter | kebab-case | `?page-size=20` |
| Dateinamen (Frontend) | PascalCase für Komponenten, camelCase für Utils | `IdeaCard.tsx`, `formatDate.ts` |
| Dateinamen (Backend) | snake_case | `search_service.py`, `ai_service.py` |

#### Scenario: Commit Messages

- GIVEN ein neuer Git Commit
- THEN wird Conventional Commits verwendet:
  - `feat: add meal plan creation flow`
  - `fix: correct pagination offset in search`
  - `refactor: extract content card into shared component`
  - `docs: update API endpoint documentation`
  - `chore: update dependencies`
  - `test: add pytest cases for event booking`
- AND die Sprache ist Englisch
- AND der Betreff ist im Imperativ ("add", nicht "added" oder "adds")
- AND maximal 72 Zeichen im Betreff

#### Scenario: CSS/Styling

- GIVEN ein UI-Element wird gestyled
- THEN werden ausschließlich Tailwind CSS Klassen verwendet
- AND kein Inline-CSS (`style={...}`) wird verwendet
- AND kein CSS-Modules oder styled-components
- AND bedingte Klassen verwenden den `cn()` Helper:

```tsx
<div className={cn(
  "rounded-lg border p-4",
  isActive && "border-primary bg-primary/5",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

#### Scenario: Kommentare

- GIVEN Code-Kommentare werden geschrieben
- THEN erklären sie das "Warum", nie das "Was"
- AND offensichtlicher Code wird nicht kommentiert
- AND TODO-Kommentare enthalten ein Ticket/Issue: `// TODO(#123): implement rate limiting`
- AND Sprache: Englisch

### Requirement: Testing-Standards

Die Anwendung MUST die definierten Testing-Standards einhalten.

#### Scenario: Backend-Tests (pytest)

- GIVEN ein neuer API-Endpunkt oder Model
- THEN werden pytest-Tests geschrieben für:
  - Alle CRUD-Operationen
  - Authentifizierungs- und Berechtigungsprüfungen
  - Validierungsfehler (ungültige Eingaben)
  - Edge Cases (leere Listen, nicht gefundene Ressourcen)
- AND Tests verwenden Fixtures für Test-Daten
- AND Tests sind isoliert (kein State zwischen Tests)
- AND Tests laufen mit `uv run pytest`

#### Scenario: Frontend-Tests (Vitest)

- GIVEN neue Hooks oder Utility-Funktionen
- THEN werden Vitest-Tests geschrieben für:
  - Custom Hooks (mit `renderHook`)
  - Utility-Funktionen (Formatierung, Validierung, Berechnung)
  - Zod-Schema-Validierung
- AND Komponenten werden NICHT unit-getestet (manuelles Testing)
- AND API-Mocking verwendet MSW (Mock Service Worker) oder Vitest Mocks

### Requirement: Datum und Zeit

Alle Datums- und Zeitangaben MUST konsistent behandelt werden.

#### Scenario: Backend Datum-Handling

- GIVEN ein Datum/Zeit-Feld in der Datenbank oder API
- THEN wird es als UTC gespeichert und übertragen
- AND das Format in der API ist ISO 8601: `2026-04-03T14:30:00Z`

#### Scenario: Frontend Datum-Anzeige

- GIVEN ein Datum/Zeit-Wert wird dem Benutzer angezeigt
- THEN wird es in der lokalen Zeitzone des Browsers dargestellt
- AND die Bibliothek `date-fns` wird für Formatierung und Berechnung verwendet
- AND deutsche Locale wird verwendet: `format(date, 'dd. MMMM yyyy', { locale: de })`
- AND relative Zeitangaben wo sinnvoll: "vor 2 Stunden", "gestern"

## Betroffene Dateien

### Frontend (übergreifend)

| Datei/Bereich | Relevanz |
|---------------|----------|
| `frontend/src/components/ui/` | shadcn/ui Basis-Komponenten (Button, Dialog, Toast, Skeleton) |
| `frontend/src/components/` | Geteilte Komponenten (EmptyState, LoadingState, ConfirmDialog) |
| `frontend/src/lib/utils.ts` | cn() Helper, Formatierungs-Utilities |
| `frontend/src/schemas/*.ts` | Zod-Schemas (synchron mit Pydantic) |
| `frontend/src/api/*.ts` | TanStack Query Hooks |
| `frontend/src/store/*.ts` | Zustand Stores |

### Backend (übergreifend)

| Datei/Bereich | Relevanz |
|---------------|----------|
| `backend/*/schemas.py` | Pydantic-Schemas (synchron mit Zod) |
| `backend/*/api.py` | API-Endpunkte, Fehlerbehandlung |
| `backend/core/middleware.py` | Request-Logging, Error-Handling |
| `backend/core/pagination.py` | Paginierungs-Logik |
| `backend/inspi/settings/` | Logging-Konfiguration, Sentry-Setup |

## Planned Features

- **Storybook**: Komponentenbibliothek für geteilte UI-Komponenten (später)
- **Lighthouse CI**: Automatische Performance- und Accessibility-Checks in Cloud Build
- **Bundle-Analyse**: Automatische Bundle-Size-Checks bei PRs


---

# Umlaut Correction

## MODIFIED Requirements

### Requirement: Konsistente Umlaut-Verwendung

Alle deutschen Texte in der Codebase MÜSSEN korrekte Umlaute verwenden.

#### Scenario: UI-Labels und Fehlermeldungen
- **WHEN** ein deutscher Text in einem UI-Label, Button, Tooltip oder einer Fehlermeldung angezeigt wird
- **THEN** MUSS er korrekte Umlaute verwenden: ä (nicht ae), ö (nicht oe), ü (nicht ue), ß (nicht ss, wo grammatikalisch korrekt)

#### Scenario: Seed-Daten
- **WHEN** deutsche Texte in Seed-Daten (Rezeptnamen, Zutatennamen, Beschreibungen) verwendet werden
- **THEN** MÜSSEN sie korrekte Umlaute verwenden

#### Scenario: Backend-Strings
- **WHEN** deutsche Texte in Python-Strings (Fehlermeldungen, Labels, Descriptions) verwendet werden
- **THEN** MÜSSEN sie korrekte Umlaute verwenden
- **THEN** DÜRFEN englische Variablennamen, Funktionsnamen und Kommentare NICHT geändert werden


---

# TypeScript Config

## Requirements

### Requirement: All frontend config files MUST use TypeScript

The frontend project SHALL NOT contain any `.js` source or config files. All configuration files (Vite, PostCSS, etc.) MUST use `.ts` extensions with proper type annotations.

#### Scenario: No .js files in frontend root
- **WHEN** listing files in `frontend/` (excluding `node_modules/`, `dist/`)
- **THEN** no files with `.js` extension SHALL exist

#### Scenario: PostCSS config is TypeScript
- **WHEN** Vite resolves the PostCSS configuration
- **THEN** it MUST load `postcss.config.ts` (not a `.js` variant)

#### Scenario: Vite config is TypeScript only
- **WHEN** Vite resolves its configuration file
- **THEN** it MUST load `vite.config.ts` with no duplicate `.js` or `.d.ts` variants present

### Requirement: Build and dev server MUST work after conversion

The frontend build pipeline SHALL continue to function correctly after removing `.js` config files.

#### Scenario: Development server starts successfully
- **WHEN** running `npm run dev` in the frontend directory
- **THEN** Vite dev server MUST start without config resolution errors

#### Scenario: Production build completes successfully
- **WHEN** running `npm run build` in the frontend directory
- **THEN** the build MUST complete without errors related to config resolution
