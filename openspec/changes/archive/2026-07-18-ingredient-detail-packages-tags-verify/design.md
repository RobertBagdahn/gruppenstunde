## Context

Die Zutatendetailseite in `essensplan.app/ingredients/{slug}` ist die zentrale Ansicht für Zutaten. Sie zeigt derzeit Nährwerte, Portionen (Drag&Drop), Aliase und verwendende Rezepte. Drei Features fehlen:

1. **Packages** — Model, Schema, API-Endpunkte und Frontend-Hooks sind vollständig implementiert, aber nicht im UI eingebunden
2. **Tags (content.Tag)** — Schreiben funktioniert (`update_ingredient` akzeptiert `tag_ids`), aber Lesen nicht (`tags` fehlt in `IngredientDetailOut`)
3. **Verify** — Status wird geliefert, aber nur für non-verified als Badge angezeigt. Kein Toggle für Staff

## Goals / Non-Goals

**Goals:**
- Packages: Anzeigen, Erstellen, Bearbeiten, Löschen, Drag&Drop-Sortierung — analog zur bestehenden Portionen-Sektion
- Tags: In API-Response ausliefern (Backend), als Badges anzeigen (Frontend), Hinzufügen/Entfernen via Tag-Picker
- Verify: "Inspi Verified"-Badge anzeigen wenn status=verified; Button zum Verifizieren für Staff

**Non-Goals:**
- Keine neuen Datenbank-Migrationen
- Keine neuen API-Endpunkte (nur bestehende erweitern)
- Keine Änderung am Tag-Modell oder der Tag-API
- Kein Editieren von Tag-Details (nur zuweisen/entfernen)

## Decisions

### Decision 1: `tags` als flache Liste im `IngredientDetailOut`

**Gewählt:** `tags: list[TagOut]` aus `content.schemas.base` importieren, mit Resolver der `obj.tags.all()` returned. Keine Verschachtelung (kein `children`), da Zutaten-Tags nicht hierarchisch dargestellt werden.

**Alternative:** `TagAdminSchema` aus dem Frontend — hat `is_approved`, aber wir wollen nur approved Tags anzeigen. `TagOut` reicht.

**Begründung:** `TagOut` existiert bereits, ist 1:1 synchron mit `TagSchema` im Frontend (`content.ts`), und `resolve_*`-Pattern ist etabliert (vgl. `resolve_nutritional_tags`).

### Decision 2: Tag-Picker als Autocomplete-Komponente

**Gewählt:** Ein Dropdown/Autocomplete das die bestehende `GET /api/tags/`-API nutzt. Tags werden als Badges/Chips angezeigt mit X zum Entfernen. Hinzufügen per Suchfeld + Enter/Klick.

**Alternative:** Modales Dialog-Fenster mit Tag-Baum. Overengineered für diesen Use Case.

### Decision 3: Verify-Button als `update_ingredient({ status: "verified" })`-Call

**Gewählt:** Ein Button "Von Inspi verifizieren" (nur für `user.is_staff`). Sendet PATCH mit `{ status: "verified" }`. Backend validiert bereits, dass nur Staff auf "verified" setzen darf.

**Begründung:** `update_ingredient` akzeptiert `status` bereits. Keine Backend-Änderung nötig. Button ist einfacher als ein Status-Dropdown.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Tag-API könnte tausende Tags liefern | `GET /api/tags/` ist paginiert. Autocomplete filtert client-seitig oder per `?search=` |
| Package-Umstellung könnte bestehende Portionen-Sektion beeinflussen | Packages sind ein separates Model mit eigenen Hooks. Keine Überschneidung mit Portionen |
| `groups`-Prefetch fehlt in `get_ingredient` → N+1 Queries | Wird im selben Zug behoben (kleiner Fix) |
