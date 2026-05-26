# Design — recipe-cooking-print-modes

## Context

Die Rezept-Detailseite nach Changes #1–#4 ist inhaltsreich: Verbesserungen, Health-Insights, Sidebar mit Metadaten, Kommentare. Diese Informationstiefe ist wertvoll für Planung und Auswahl, aber störend in zwei Situationen:

1. **Kochen**: Smartphone liegt auf der Arbeitsfläche, Hände sind nass/klebrig, Bildschirm darf nicht einschlafen, Augen sind mehrere Meter entfernt.
2. **Drucken**: Papier im Ferienlager ohne Netz, Aushang in Küche, Delegation an Küchenhilfe.

Beide Use-Cases brauchen radikal reduzierte Views mit großen Schriften bzw. A4-Layout.

## Goals

- Cooking Mode: Vollbild, große Schrift, Step-Navigation, Wake Lock
- Print View: A4-optimiert, schwarzweiß, keine interaktiven Elemente
- Beide erreichbar ohne neue Route (URL-Param auf bestehender Detail-Route)
- Zero Backend-Impact

## Non-Goals

- Voice-Control für Cooking Mode („Alexa, nächster Schritt")
- PDF-Export-Endpoint (Print via Browser reicht)
- Persistente Einstellungen (z.B. Default-Modus pro User)

## Decisions

### Decision 1: URL-Param statt eigener Route

**Decision**: `?mode=cooking` und `?mode=print` auf der bestehenden `/recipes/:slug` Route.

**Rationale**: Kein Router-Refactor, Direct-Links funktionieren automatisch, Back-Button verlässt Modus natürlich. Zustand liegt in URL, nicht im State-Store.

**Alternatives considered**:
- Eigene Routes `/recipes/:slug/cooking` → mehr Boilerplate, kein funktionaler Vorteil
- Modal statt Vollbild → Keyboard/Wake-Lock-Interaktion umständlicher

### Decision 2: Cooking Mode als separate Page-Komponente

**Decision**: `RecipeCookingMode.tsx` ist eine **eigenständige** Komponente, die von `RecipeDetailPage` bei `mode=cooking` geladen wird (früh, vor den schweren Blöcken).

**Rationale**: Cooking Mode teilt kaum UI mit der Detail-Seite; ein monolithisches Conditional-Render würde unnötigen DOM aufbauen und CSS-Overrides erzwingen.

### Decision 3: Schritt-Parsing deterministisch

**Decision**: Markdown-`description` wird mit simpler Heuristik in Schritte geteilt:
1. Wenn `## ` oder `### ` Überschriften vorhanden → splitten an denen
2. Sonst wenn nummerierte Liste (`1. `, `2. `, …) → jedes Listenelement = Schritt
3. Sonst gesamter Block = 1 Schritt

Heuristik lebt in `frontend/src/lib/parseRecipeSteps.ts`, unit-testbar.

**Alternatives considered**:
- Eigenes Feld `steps` am Recipe-Model → Breaking Change am Backend, doppelte Content-Pflege
- LLM-basiertes Parsing → nicht deterministisch, Latenz, Kosten

### Decision 4: Wake Lock mit Graceful Fallback

**Decision**: `useWakeLock()` Hook, der beim Mount des Cooking Mode einen `screen`-Wake-Lock anfordert und beim Unmount released. Browser ohne Support: Hook tut nichts, keine UI-Auswirkung.

**Reference**: `navigator.wakeLock.request('screen')` — gibt `Promise<WakeLockSentinel>` zurück.

**Risks**: Browser kann Lock automatisch releasen (Tab-Switch, Lock-Screen). Hook re-requested beim `visibilitychange`-Event zurück zu `visible`.

### Decision 5: Print via native `window.print()`

**Decision**: Button ruft `window.print()`. Kein eigener PDF-Renderer, keine serverseitige Generierung.

**CSS-Strategie**: Tailwind `print:`-Utilities + ein zentraler `@media print`-Block in `frontend/src/index.css` (oder bestehendem globalen Stylesheet) für Seiten-Margins und Page-Break-Regeln.

**Vorteile**: Browser-nativ, respekiert User-Einstellungen (Papier, Farbe, Randbreiten), kein Extra-Code.

### Decision 6: Print-Preview via URL-Param

**Decision**: `?mode=print` rendert die Print-CSS-Sicht auch am Bildschirm (ohne tatsächlichen Dialog). Nützlich zum Design und Debug.

**Implementierung**: Komponente erkennt `mode === 'print'` und setzt einen `data-mode="print"` am Root, an den CSS-Regeln angedockt sind (zusätzlich zu `@media print`).

### Decision 7: Cooking Mode Step-Navigation via URL

**Decision**: Aktueller Schritt in URL als `step` Param. `?mode=cooking&step=3`.

**Rationale**: Teilbar, Refresh-stabil, Back-Button navigiert Schritt für Schritt.

**Trade-off**: Jeder Schritt triggert History-Push → kann Browser-History aufblähen. Mitigiert durch `replace: true` bei `navigate`.

### Decision 8: Exit-Strategie Cooking Mode

**Decision**: Exit-Button (X oben rechts) entfernt `mode` und `step` aus URL. Zusätzlich: `Escape`-Taste löst Exit aus.

**Rationale**: Ein-Hand-Bedienung am Smartphone erfordert klar sichtbaren Exit. Keyboard-Shortcut für Desktop-Power-User.

## Risks / Trade-offs

- **Markdown-Parsing-Robustheit**: Bei ungewöhnlichen Markdown-Strukturen landet der ganze Content in einem Schritt. Akzeptabel (User kann Vorgaben-Tipp erhalten), nicht blockierend.
- **Wake-Lock-Browser-Support**: Nicht universell. Fallback verhalten sich „wie vorher" — keine Degradation.
- **Print-CSS-Testen**: Browser-unterschiedlich (Chrome/Safari/Firefox). Manuelles Verifizieren in mindestens Chrome und Safari; Firefox-only-Fehler akzeptiert.
- **Cooking Mode erreicht Sidebar/Bottom-Bar aus Change #3 überschreibt**: Cooking Mode rendert außerhalb des normalen Layouts (`fixed inset-0`), nicht innerhalb der Grid-Struktur. Keine CSS-Konflikte.
