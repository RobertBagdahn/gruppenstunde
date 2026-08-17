## Context

Aktuell existieren 15+ unterschiedliche Implementierungen von "Zurück"-Buttons über beide Frontends verteilt. Es gibt kein einheitliches Pattern – jede Seite baut ihren eigenen Button mit verschiedenen Icons, Labels und Layouts.

## Goals / Non-Goals

**Goals:**
- Eine einzige `<BackButton />` Komponente als Single Source of Truth
- Konsistentes visuelles Erscheinungsbild auf allen Detail-Seiten
- Breadcrumb-artiges Layout: BackButton und Titel in einer Zeile (Desktop), gestapelt auf Mobile
- Einfache API: minimale Props, sinnvolle Defaults

**Non-Goals:**
- Kein vollständiges Breadcrumb-System (nur ein Level zurück)
- Keine Änderung der Navigationslogik/Routing-Struktur
- Keine Änderung an ErrorDisplay (behält eigenen Back-Button mit `onBack` Prop)

## Decisions

### 1. Icon: Lucide `ChevronLeft`

Kompakter als Material Symbols `arrow_back`, wirkt Breadcrumb-artiger. Lucide ist bereits über shadcn/ui verfügbar.

### 2. API-Design

```tsx
interface BackButtonProps {
  to?: string;           // Explizite Route → rendert als <Link>
  onClick?: () => void;  // Custom handler → rendert als <button>
  className?: string;    // Escape hatch für Spacing
}
// Kein `to` und kein `onClick` → navigate(-1)
// Label ist immer "Zurück" (nicht konfigurierbar)
```

### 3. Styling

```
text-sm text-muted-foreground hover:text-foreground transition-colors
inline-flex items-center gap-0.5
```

Icon: `ChevronLeft` mit `w-4 h-4`.

### 4. Page-Header Layout Pattern

```tsx
// Desktop: eine Zeile
<div className="flex items-center gap-3">
  <BackButton to="/recipes" />
  <div className="border-l pl-3">
    <h1 className="text-xl sm:text-2xl font-bold">Titel</h1>
    <div className="meta...">...</div>
  </div>
</div>
```

Auf Mobile (< sm) bleibt alles in einer Zeile, da der BackButton kompakt genug ist. Bei sehr langen Titeln bricht der Titel natürlich um, aber der Button bleibt links aligned.

### 5. Datei-Location

- `frontend/src/components/shared/BackButton.tsx`
- `frontend-food/src/components/shared/BackButton.tsx` (identische Kopie)

## Risks / Trade-offs

- **Konsistenz vs. Kontext**: Ein einheitliches "Zurück" ohne Ziel-Angabe ("Zurück zur Übersicht") ist weniger informativ, aber konsistenter und wartbarer.
- **Zwei Kopien**: Die Komponente existiert in beiden Frontends als Kopie. Bei einem zukünftigen Shared-Package könnte das konsolidiert werden.
- **Border-Separator**: Der `border-l` zwischen BackButton und Titel ist ein visuelles Detail, das auf manchen Seiten (z.B. mit wenig Header-Inhalt) übertrieben wirken könnte. Kann per Seite weggelassen werden.
