## Why

Der Menüpunkt "Events" / "Aktionen" erscheint aktuell mehrfach in derselben Ebene der Navigation: als eigenständiger Top-Level-Link im Desktop-Header **und** zusätzlich im "Tools"-Dropdown (Desktop) bzw. in der "Tools"-Section des Mobile-More-Menüs. Diese Dopplung ist irritierend, erhöht die kognitive Last und lässt die Tools-Gruppierung unklar wirken, da Events dort nur noch redundant auftaucht.

Eine allgemeine Regel "Jedes Tool darf nur an einer Stelle in der primären Navigation erscheinen" wird noch nicht geführt — diese Change etabliert sie für Events und hält die Policy im AGENTS-Dokument fest, sodass künftige Tool-Erweiterungen nicht denselben Fehler machen.

## What Changes

- Entfernung von Events aus dem Desktop-Tools-Dropdown (`toolsMenuItems` in `Layout.tsx`)
- Entfernung von Events aus der Tools-Section des Mobile-More-Menüs
- Events bleibt erhalten an den Stellen, wo es semantisch korrekt ist: Top-Level-Link im Desktop-Header, Mobile Bottom-Nav ("Aktionen"-Tab), Footer-Link
- Dokumentation einer allgemeinen Navigations-Policy in `frontend/AGENTS.md`: Jedes Tool erscheint nur an einer Stelle in der primären Navigation

## Capabilities

### New Capabilities
(keine)

### Modified Capabilities
- `shared-ui-components`: Die Layout-/Navigations-Komponente erhält eine verbindliche Anti-Duplikations-Regel für Tool-Menüeinträge

## Impact

- **Frontend**: `frontend/src/components/Layout.tsx` (Definition von `toolsMenuItems`, Mobile-More-Menü-Rendering)
- **Dokumentation**: `frontend/AGENTS.md` (neue Navigations-Policy)
- **Keine Backend-Änderungen**
- **Keine Schema-Änderungen** (weder Pydantic noch Zod)
- **Keine Migrations**
- **Keine Breaking Changes** für API-Clients — reine UI-Restrukturierung
