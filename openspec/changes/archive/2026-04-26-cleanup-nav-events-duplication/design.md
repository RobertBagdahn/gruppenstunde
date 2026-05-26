## Context

Die Navigation in `frontend/src/components/Layout.tsx` nutzt mehrere parallele Menü-Strukturen (Desktop-Header-Dropdowns, Mobile-More-Menü, Mobile-Bottom-Nav, Footer). Der Menüeintrag "Events/Aktionen" wurde historisch in mehreren dieser Strukturen gleichzeitig hinzugefügt, weil das Feature zunächst als Tool eingeführt und später zur Top-Level-Funktion befördert wurde, ohne die Doppelung im Tools-Dropdown zu bereinigen.

## Goals / Non-Goals

**Goals:**
- Eindeutige Navigations-Position für den Events-Menüeintrag
- Dokumentierte Policy in `frontend/AGENTS.md`, die künftige Dopplungen verhindert
- Keine Regression: alle existierenden Einstiegs-Pfade zu `/events` bleiben erhalten (Desktop-Top-Link, Mobile-Bottom-Nav, Footer)

**Non-Goals:**
- Keine Überarbeitung des Tools-Dropdowns selbst (Struktur, Styling, Gruppierung)
- Keine Änderung an Session-Planner-, Meal-Plan- oder Packing-Lists-Einträgen
- Keine Änderung an URLs oder Routen

## Decisions

### Entscheidung: Events bleibt Top-Level, nicht in Tools
Events ist für Gruppenführer eine Kern-Aktivität mit eigener Unter-Hierarchie (Event-Dashboard, Teilnehmer, Registrierungen). Es ist kein einfaches Werkzeug wie Packing-Lists. Konsequenz: Entfernung aus Tools-Dropdown (Desktop) und Tools-Section (Mobile More-Menu). Alternative "Events bleibt nur im Tools-Dropdown" wurde verworfen — es ist in der Mobile-Bottom-Nav bereits prominent positioniert, das muss auch Desktop spiegeln.

### Entscheidung: Policy als Kommentar im Code + Text in AGENTS.md
Statt eines technischen Enforcements (z.B. Lint-Regel) reicht eine schriftliche Policy, da das Nav-Array eine kleine, zentrale Datenstruktur ist und Reviewer die Regel prüfen können. Aufwand für automatisierte Prüfung wäre unverhältnismäßig.

## Risks / Trade-offs

- **Risk**: User, die Events bisher über das Tools-Dropdown aufgerufen haben, finden es dort nicht mehr. → **Mitigation**: Events ist an drei anderen prominenten Stellen (Top-Level, Mobile-Bottom, Footer) sichtbar. Kein Suchproblem zu erwarten.
- **Risk**: Policy wird bei zukünftigem Tool-Hinzufügen ignoriert. → **Mitigation**: Dokumentation in `frontend/AGENTS.md` mit expliziter Regel und Verweis auf dieses Change.
