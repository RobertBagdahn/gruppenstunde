# best-practices Specification

## Purpose

Querschnittsspezifikation fuer UI-Patterns, Code-Konventionen, Formular-Handling, State Management, Bildverarbeitung, Accessibility und Testing-Standards der Inspi-Plattform. Definiert verbindliche Regeln fuer konsistente Implementierung ueber alle Module hinweg.

## Context

- **Backend**: Django Ninja, Pydantic v2, Python 3.13
- **Frontend**: React 18, TypeScript (strict), TanStack Query v5, Zustand v5, shadcn/ui
- **Querschnittsthema**: Gilt fuer alle Spec-Domaenen

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
- THEN werden Client-seitige Validierungsregeln (Zod) geprueft
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

Das Frontend MUST kontextabhaengige Loading-States anzeigen.

#### Scenario: Initiales Laden von Listen und Seiten

- GIVEN eine Seite wird zum ersten Mal geladen
- WHEN Daten per TanStack Query abgerufen werden
- THEN werden Skeleton-Loader in der Form des erwarteten Inhalts angezeigt
- AND Skeletons muessen die tatsaechliche Inhaltsstruktur widerspiegeln (Cards, Text-Zeilen, etc.)
- AND es wird KEIN leeres Layout ohne Feedback angezeigt

#### Scenario: Aktionen (Speichern, Loeschen, etc.)

- GIVEN ein Benutzer fuehrt eine Mutation aus (Erstellen, Bearbeiten, Loeschen)
- WHEN die API-Anfrage laeuft
- THEN wird ein Spinner im ausloeenden Button angezeigt
- AND der Button ist waehrend der Anfrage deaktiviert
- AND andere Interaktionen auf der Seite bleiben moeglich

#### Scenario: Nachladen (Mehr laden)

- GIVEN eine paginierte Liste mit "Mehr laden"-Button
- WHEN der Benutzer "Mehr laden" klickt
- THEN wird ein Spinner im Button angezeigt
- AND die bestehenden Eintraege bleiben sichtbar
- AND neue Eintraege werden unterhalb angehaengt

### Requirement: Empty States

Das Frontend MUST leere Zustaende mit Illustration, Text und Handlungsaufforderung anzeigen.

#### Scenario: Leere Liste (keine Daten vorhanden)

- GIVEN eine Listen-Seite ohne Eintraege (z.B. keine Ideas, keine Events)
- WHEN die API eine leere Liste zurueckgibt
- THEN wird ein Empty-State angezeigt mit:
  - Passendem Icon oder Illustration
  - Erklaerungstext auf Deutsch (z.B. "Noch keine Ideen vorhanden")
  - CTA-Button zum Erstellen (z.B. "Erste Idee erstellen")
- AND der CTA-Button ist nur sichtbar, wenn der Benutzer die Berechtigung hat

#### Scenario: Leere Suchergebnisse

- GIVEN eine Suche, die keine Ergebnisse liefert
- WHEN die API `{ items: [], total: 0 }` zurueckgibt
- THEN wird angezeigt: "Keine Ergebnisse fuer '{suchbegriff}'"
- AND Vorschlaege werden angezeigt: "Versuche einen anderen Suchbegriff oder weniger Filter"
- AND die aktiven Filter werden als Chips angezeigt mit Moeglichkeit, sie zu entfernen

### Requirement: Pagination

Alle Listen MUST Pagination mit "Mehr laden"-Pattern verwenden.

#### Scenario: Standard-Pagination

- GIVEN eine Listen-Ansicht mit mehr als 20 Eintraegen
- THEN werden initial 20 Items geladen (Standard page_size)
- AND ein "Mehr laden"-Button wird am Ende der Liste angezeigt
- AND der Button zeigt die verbleibende Anzahl: "Mehr laden (noch 15)"
- AND nach Klick werden die naechsten 20 Items angehaengt

#### Scenario: Pagination konfigurieren

- GIVEN ein Benutzer moechte die Seitengroesse aendern
- THEN stehen die Optionen 10, 20 oder 50 Items zur Verfuegung
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
  - `<nav>` fuer Navigation
  - `<main>` fuer Hauptinhalt
  - `<article>` fuer eigenstaendige Inhalte (Ideas, Events)
  - `<section>` fuer thematische Gruppierungen
  - `<button>` fuer klickbare Aktionen (nicht `<div onClick>`)
  - `<a>` fuer Links zu anderen Seiten

#### Scenario: Keyboard-Navigation

- GIVEN ein Benutzer navigiert per Tastatur
- THEN sind alle interaktiven Elemente per Tab erreichbar
- AND die Fokus-Reihenfolge ist logisch (top-to-bottom, left-to-right)
- AND fokussierte Elemente haben einen sichtbaren Fokus-Ring
- AND Dialoge koennen per Escape geschlossen werden
- AND Dropdown-Menues koennen per Pfeiltasten navigiert werden

#### Scenario: Kontraste und Farben

- GIVEN Text und interaktive Elemente
- THEN hat normaler Text ein Kontrastverhaltnis von mindestens 4.5:1
- AND grosser Text (>= 18px bold oder >= 24px) hat mindestens 3:1
- AND Farbe allein wird NICHT als einziges Unterscheidungsmerkmal verwendet
  (z.B. Fehler: rote Farbe UND Icon/Text, nicht nur rot)

#### Scenario: ARIA-Labels

- GIVEN interaktive Elemente ohne sichtbaren Text (z.B. Icon-Buttons)
- THEN haben sie ein `aria-label` mit deutscher Beschreibung
- AND Formulare haben zugeordnete `<label>`-Elemente oder `aria-label`
- AND Bilder haben aussagekraeftige `alt`-Texte auf Deutsch (oder `alt=""` fuer dekorative Bilder)

#### Scenario: Screen-Reader-Unterstuetzung

- GIVEN dynamische Inhaltsaenderungen (Toast, Ladevorgang abgeschlossen)
- THEN werden `aria-live="polite"` Regionen fuer Status-Updates verwendet
- AND Toasts sind als `role="alert"` markiert
- AND Ladezustaende werden mit `aria-busy="true"` kommuniziert

### Requirement: Bildverarbeitung

Bilder MUST serverseitig optimiert und im Frontend lazy geladen werden.

#### Scenario: Bild-Upload

- GIVEN ein Benutzer laedt ein Bild hoch
- WHEN die Datei groesser als 500KB ist
- THEN wird der Upload abgelehnt mit Fehlermeldung: "Bild zu gross. Maximum: 500KB."
- AND die erlaubten Formate sind: JPEG, PNG, WebP, GIF

#### Scenario: Serverseitige Bildoptimierung

- GIVEN ein Bild wird erfolgreich hochgeladen
- THEN wird es serverseitig zu WebP konvertiert
- AND mehrere Groessen werden generiert:
  - Thumbnail: 150x150px (Vorschau, Listen)
  - Medium: 600px Breite (Detail-Ansicht Mobile)
  - Large: 1200px Breite (Detail-Ansicht Desktop)
- AND die Original-Datei wird NICHT gespeichert (nur optimierte Versionen)

#### Scenario: Frontend Bild-Darstellung

- GIVEN ein Bild wird im Frontend angezeigt
- THEN wird `loading="lazy"` gesetzt (ausser Hero-Bilder above-the-fold)
- AND `width` und `height` Attribute werden gesetzt (Layout-Shift vermeiden)
- AND das `srcset`-Attribut referenziert die verschiedenen Groessen

### Requirement: State Management

Die Anwendung MUST eine klare Trennung zwischen Server-State und Client-State haben.

#### Scenario: Server-State (API-Daten)

- GIVEN Daten, die vom Server kommen (Ideas, Events, User-Profile)
- THEN wird TanStack Query v5 fuer Caching, Fetching und Synchronisation verwendet
- AND Daten werden NICHT zusaetzlich in Zustand oder Context dupliziert
- AND `staleTime` und `gcTime` werden pro Query-Typ sinnvoll konfiguriert

#### Scenario: Client-State (UI-Zustand)

- GIVEN reiner UI-Zustand (Auth-Status, Theme, Sidebar-State, Modals)
- THEN wird Zustand v5 verwendet
- AND Stores werden klein und fokussiert gehalten (ein Store pro Domaene)
- AND React Context wird NICHT fuer State-Management verwendet

#### Scenario: URL-State

- GIVEN filterbarer, teilbarer Zustand (Suchbegriff, Filter, Paginierung, Ansichtsmodus)
- THEN wird der Zustand ueber URL Query-Parameter abgebildet
- AND Seiten sind bookmarkbar und teilbar
- AND der Browser-Back-Button funktioniert korrekt
- AND URL-Parameter verwenden kebab-case: `?idea-type=recipe&scout-level=woelfling&page-size=20`

### Requirement: Inhaltsformat (Markdown statt HTML)

Alle Freitext-/Rich-Text-Felder MUST Markdown als Inhaltsformat verwenden. HTML-Editoren (z.B. Tiptap) und `dangerouslySetInnerHTML` sind verboten.

#### Scenario: Rich-Text-Eingabe

- GIVEN ein Formularfeld fuer formatierten Text (z.B. Beschreibung, Zusammenfassung)
- THEN wird die `MarkdownEditor`-Komponente (`src/components/MarkdownEditor.tsx`) verwendet
- AND der Editor basiert auf `@uiw/react-md-editor`
- AND es wird KEIN HTML-basierter Editor (Tiptap, Quill, CKEditor, etc.) verwendet
- AND der Editor unterstuetzt GitHub Flavored Markdown (GFM)

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
- AND die API gibt den Markdown-Text direkt zurueck (kein serverseitiges Rendering zu HTML)
- AND serverseitige Konvertierung (z.B. fuer E-Mails) verwendet `markdown2` oder aehnliche Bibliotheken

#### Scenario: Verbotene Patterns

- GIVEN Code-Review oder neue Implementierung
- THEN sind folgende Patterns verboten:
  - `dangerouslySetInnerHTML` (XSS-Risiko)
  - Tiptap oder andere HTML-basierte Editoren
  - HTML-Tags in Datenbank-Feldern (ausser Legacy-Daten vor Migration)
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
| Dateinamen (Frontend) | PascalCase fuer Komponenten, camelCase fuer Utils | `IdeaCard.tsx`, `formatDate.ts` |
| Dateinamen (Backend) | snake_case | `search_service.py`, `ai_service.py` |

#### Scenario: Commit Messages

- GIVEN ein neuer Git Commit
- THEN wird Conventional Commits verwendet:
  - `feat: add meal plan creation flow`
  - `fix: correct pagination offset in search`
  - `refactor: extract idea card into shared component`
  - `docs: update API endpoint documentation`
  - `chore: update dependencies`
  - `test: add pytest cases for event booking`
- AND die Sprache ist Englisch
- AND der Betreff ist im Imperativ ("add", nicht "added" oder "adds")
- AND maximal 72 Zeichen im Betreff

#### Scenario: CSS/Styling

- GIVEN ein UI-Element wird gestyled
- THEN werden ausschliesslich Tailwind CSS Klassen verwendet
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
- THEN erklaeren sie das "Warum", nie das "Was"
- AND offensichtlicher Code wird nicht kommentiert
- AND TODO-Kommentare enthalten ein Ticket/Issue: `// TODO(#123): implement rate limiting`
- AND Sprache: Englisch

### Requirement: Testing-Standards

Die Anwendung MUST die definierten Testing-Standards einhalten.

#### Scenario: Backend-Tests (pytest)

- GIVEN ein neuer API-Endpunkt oder Model
- THEN werden pytest-Tests geschrieben fuer:
  - Alle CRUD-Operationen
  - Authentifizierungs- und Berechtigungspruefungen
  - Validierungsfehler (ungueltige Eingaben)
  - Edge Cases (leere Listen, nicht gefundene Ressourcen)
- AND Tests verwenden Fixtures fuer Test-Daten
- AND Tests sind isoliert (kein State zwischen Tests)
- AND Tests laufen mit `uv run pytest`

#### Scenario: Frontend-Tests (Vitest)

- GIVEN neue Hooks oder Utility-Funktionen
- THEN werden Vitest-Tests geschrieben fuer:
  - Custom Hooks (mit `renderHook`)
  - Utility-Funktionen (Formatierung, Validierung, Berechnung)
  - Zod-Schema-Validierung
- AND Komponenten werden NICHT unit-getestet (manuelles Testing)
- AND API-Mocking verwendet MSW (Mock Service Worker) oder Vitest Mocks

### Requirement: Datum und Zeit

Alle Datums- und Zeitangaben MUST konsistent behandelt werden.

#### Scenario: Backend Datum-Handling

- GIVEN ein Datum/Zeit-Feld in der Datenbank oder API
- THEN wird es als UTC gespeichert und uebertragen
- AND das Format in der API ist ISO 8601: `2026-04-03T14:30:00Z`

#### Scenario: Frontend Datum-Anzeige

- GIVEN ein Datum/Zeit-Wert wird dem Benutzer angezeigt
- THEN wird es in der lokalen Zeitzone des Browsers dargestellt
- AND die Bibliothek `date-fns` wird fuer Formatierung und Berechnung verwendet
- AND deutsche Locale wird verwendet: `format(date, 'dd. MMMM yyyy', { locale: de })`
- AND relative Zeitangaben wo sinnvoll: "vor 2 Stunden", "gestern"

## Betroffene Dateien

### Frontend (uebergreifend)

| Datei/Bereich | Relevanz |
|---------------|----------|
| `frontend/src/components/ui/` | shadcn/ui Basis-Komponenten (Button, Dialog, Toast, Skeleton) |
| `frontend/src/components/` | Geteilte Komponenten (EmptyState, LoadingState, ConfirmDialog) |
| `frontend/src/lib/utils.ts` | cn() Helper, Formatierungs-Utilities |
| `frontend/src/schemas/*.ts` | Zod-Schemas (synchron mit Pydantic) |
| `frontend/src/api/*.ts` | TanStack Query Hooks |
| `frontend/src/store/*.ts` | Zustand Stores |

### Backend (uebergreifend)

| Datei/Bereich | Relevanz |
|---------------|----------|
| `backend/*/schemas.py` | Pydantic-Schemas (synchron mit Zod) |
| `backend/*/api.py` | API-Endpunkte, Fehlerbehandlung |
| `backend/core/middleware.py` | Request-Logging, Error-Handling |
| `backend/core/pagination.py` | Paginierungs-Logik |
| `backend/inspi/settings/` | Logging-Konfiguration, Sentry-Setup |

## Planned Features

- **Storybook**: Komponentenbibliothek fuer geteilte UI-Komponenten (spaeter)
- **Lighthouse CI**: Automatische Performance- und Accessibility-Checks in Cloud Build
- **Bundle-Analyse**: Automatische Bundle-Size-Checks bei PRs
