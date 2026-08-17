## Context

Die Codebase hat über Jahre organisch gewachsene Link-Muster. Manche Komponenten verlinken, andere nicht. Teilweise verwenden sie `<Link>` von React Router direkt, teilweise `<a href>`, teilweise gar kein Element. `target="_blank"` wird an wenigen Stellen verwendet, aber ohne Systematik.

Der Anwendungsfall ist klar: Ein User, der eine Liste durchstöbert (z.B. Rezepte), möchte ein Rezept öffnen, ohne die Liste zu verlieren. Aus einem Detail heraus (z.B. Rezept-Detail → Zutat), will der User durchnavigieren und zurück, also selber Tab.

## Goals / Non-Goals

**Goals:**
- Eine einzige Komponente deckt alle Entity-Typen ab
- URL-Resolution ist zentral, nicht verstreut (ein `getEntityUrl(type, idOrSlug)` Helper)
- NewTab-Verhalten konsistent über die App
- Accessibility: korrekte `rel="noopener"`-Attribute bei NewTab, Keyboard-Navigation
- Ad-hoc-Links schrittweise migrieren — keine Big-Bang-Umstellung erforderlich

**Non-Goals:**
- Keine Änderung der URL-Struktur der Routen selbst
- Kein server-seitiges Rendering von Links (SPA bleibt SPA)
- Kein generisches Content-Rendering (Cards, Previews) — das ist separat
- Keine Tooltip-Previews beim Hover (Future-Work, könnte später ergänzt werden)

## Decisions

### Entscheidung: Props-Shape
```tsx
<EntityLink
  type="recipe" | "ingredient" | "material" | "event"
      | "location" | "session" | "game" | "blog"
      | "user" | "group" | "tag"
  id={string | number}             // exclusive with slug
  slug={string}                    // exclusive with id
  name={string}                    // displayed text (required)
  newTab={boolean}                 // optional, default via context
  variant="default" | "muted" | "chip"   // visual style
  className={string}               // escape hatch
  children={ReactNode}             // override displayed content (icons etc.)
/>
```

Validierung: pro Typ ist entweder `id` oder `slug` Pflicht (Typescript-Discriminated-Union).

### Entscheidung: URL-Resolution als pure Funktion
```ts
// frontend/src/lib/entityUrls.ts
export function getEntityUrl(type, { id, slug }): string
```

| type | preferred identifier | URL pattern |
|------|---------------------|-------------|
| recipe | slug | `/recipes/:slug` |
| ingredient | slug | `/ingredients/:slug` |
| material | slug | `/materials/:slug` |
| event | slug | `/events/:slug` |
| location | id | `/events/locations/:id` |
| session | slug | `/sessions/:slug` |
| game | slug | `/games/:slug` |
| blog | slug | `/blogs/:slug` |
| user | id | `/profiles/:id` |
| group | id | `/groups/:id` |
| tag | slug | `/search?tag_slugs=:slug` |

(Die exakten Routen werden beim Aufschreiben verifiziert; `getEntityUrl` ist eine pure Funktion, komplett testbar.)

### Entscheidung: NewTab-Default via Context statt harter Prop
Alternativen:
- **(a)** NewTab als erforderliche Prop pro Call-Site
- **(b)** Context `<EntityLinkContext value="list" | "detail">` wraps Listen/Detail-Pages; EntityLink liest daraus Default
- **(c)** Heuristik (keine — zu unzuverlässig)

Gewählt: **(b)**. Gründe:
- Listen-Page wraps einmal (`<EntityLinkContext value="list">`) und alle EntityLinks darin bekommen `newTab=true` automatisch
- Detail-Pages wraps als `"detail"` → alle Kind-Links bleiben im selben Tab
- Explizites `newTab`-Prop überschreibt den Context (z.B. für Breadcrumbs in einer Listen-Ansicht)
- Default ohne Context = `false` (selber Tab), konservativ

### Entscheidung: Kein automatisches Fetching
EntityLink rendert nur den Link. Es fetcht nichts, prefetched nichts, zeigt keine Preview. Future-Work könnte Preview-Karten auf Hover via TanStack-Prefetch ergänzen — außerhalb dieses Scopes.

### Entscheidung: Migration schrittweise, nicht Big-Bang
Die Tasks-Liste migriert **definierte High-Impact-Stellen** (Rezept-Detail, Event-Detail, Search-Ergebnisse, Tag-Chips). Weitere Stellen können in Folge-Changes ergänzt werden. Die Komponente und Policy stehen damit als Fundament zur Verfügung.

## Risks / Trade-offs

- **Risk**: Context-Ansatz wird vergessen auf neuen Seiten → Links verhalten sich inkonsistent (Default kein neuer Tab). → **Mitigation**: Layout-Wrapper für Listen-Pages könnte den Context automatisch setzen; AGENTS.md-Regel für neue Pages.
- **Risk**: NewTab öffnet bei Pop-up-Blockern nicht zuverlässig. → **Mitigation**: `target="_blank"` + `rel="noopener noreferrer"` folgt Standard-Web-Verhalten.
- **Risk**: Tag-Link zum `/search?tag_slugs=` funktioniert nur, wenn der Search diesen Filter kennt. Check: aktuell hat der globale Search `tag_slugs` nicht als Parameter (laut Exploration). → **Mitigation**: Tag-Link geht bis auf Weiteres auf die jeweils typ-spezifische Liste (`/recipes?tag_slugs=` o.ä.). Dies wird in Task explizit adressiert.
- **Trade-off**: `slug` vs. `id` — einige Models haben keinen Slug (z.B. Location). Die Resolution-Tabelle dokumentiert pro Typ den bevorzugten Identifier.

## Open Questions

- Soll EntityLink optional ein kleines Icon vor dem Namen anzeigen (z.B. 🍲 für Rezept)? → Outside scope, per `children`-Prop lösbar.
- Tag-Links: globale Search (alle Typen) oder typ-spezifische Liste? → Im Kontext einer Rezept-Seite zu `/recipes?tag_slugs=`, im Kontext einer Session-Seite zu `/sessions?tag_slugs=`, sonst global. Via Context auch lösbar.
