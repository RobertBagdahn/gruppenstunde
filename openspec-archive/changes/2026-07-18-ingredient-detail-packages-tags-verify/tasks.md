## 1. Backend — Tags in API-Response

- [x] 1.1 `tags: list[TagOut]` zu `IngredientDetailOut` in `backend/supply/schemas/ingredients.py` hinzufügen (Import von `content.schemas.base`)
- [x] 1.2 `resolve_tags`-Resolver in `IngredientDetailOut` — flache Liste aus `obj.tags.all()`
- [x] 1.3 `"tags"` zu `prefetch_related` in `get_ingredient` (`backend/supply/api/ingredients.py`) hinzufügen

## 2. Backend — groups Prefetch fixen (N+1 Bug)

- [x] 2.1 `"groups"` zu `prefetch_related` in `get_ingredient` hinzufügen

## 3. Frontend — Tags im Zod-Schema

- [x] 3.1 `tags: z.array(TagSchema).default([])` zu `IngredientDetailSchema` in `frontend-food/src/schemas/supply.ts` hinzufügen (Import von `@/schemas/content`)

## 4. Frontend — Packages-Sektion

- [x] 4.1 Package-Hooks in `IngredientDetailPage.tsx` importieren (`useIngredientPackages`, `useCreatePackage`, `useUpdatePackage`, `useDeletePackage`, `useReorderPackages`)
- [x] 4.2 Package-Daten aus `useIngredient`-Response extrahieren
- [x] 4.3 Packages-Sektion bauen: Liste mit Name, Gewicht, Rang + Add/Edit/Delete-Controls + Drag&Drop (analog zur Portionen-Sektion)
- [x] 4.4 Leerzustand: "Keine Packungen definiert" wenn `packages.length === 0`
- [x] 4.5 Controls nur anzeigen wenn `can_edit === true`

## 5. Frontend — Tags-Sektion

- [x] 5.1 Tag-Daten aus `useIngredient`-Response extrahieren
- [x] 5.2 Tags-Sektion im Header-/Content-Bereich bauen: Badges mit Tag-Icon + Name, X-Button zum Entfernen
- [x] 5.3 Tag-Picker/Autocomplete fürs Hinzufügen (nutzt `GET /api/tags/` oder lokale Tag-Liste)
- [x] 5.4 `useUpdateIngredient` für Tag-Änderungen nutzen (`tag_ids` mitschicken)
- [x] 5.5 Controls nur anzeigen wenn `can_edit === true`

## 6. Frontend — Verify-Sektion

- [x] 6.1 "Inspi Verified"-Badge anzeigen wenn `status === "verified"` (z.B. grüner Badge mit Check-Icon)
- [x] 6.2 "Verifizieren"-Button für Staff (`user.is_staff`) anzeigen wenn Status nicht verified
- [x] 6.3 `useUpdateIngredient` für Verify-Action nutzen (`{ status: "verified" }`)

## 7. Verifikation

- [x] 7.1 Backend: `uv run pytest supply/tests/ -x` — Schemas und API
- [x] 7.2 Frontend: `npm run build` in `frontend-food/` — TypeScript-Check
- [x] 7.3 Manueller Test: `essensplan.app/ingredients/fusilli-nudeln-trocken` — Packages, Tags, Verify-Badge prüfen
