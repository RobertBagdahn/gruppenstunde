## Context

Der `SplitConfigDialog` wird geöffnet, nachdem ein Rezept mit optionalen Zutaten oder Austausch-Gruppen zu einem MealItem hinzugefügt wurde. Er lädt die `recipeItems` via `useRecipeItems(recipeId)` und zeigt dem Benutzer eine Oberfläche, um Portionen auf die Varianten zu verteilen.

**Aktuelles Problem**: Eine Race Condition zwischen React Render und `useEffect` führt dazu, dass der Dialog sofort schließt, sobald die `recipeItems`-Daten eintreffen. Der `hasBuiltOnce`-Ref wird im useEffect fälschlich auf `true` gesetzt, während `recipeItems` noch leer ist. Beim nächsten Render mit tatsächlichen Daten sieht der Render `groups=[]` + `hasBuiltOnce=true` und schließt den Dialog — bevor der useEffect die Gruppen neu aufbauen kann.

## Goals / Non-Goals

**Goals:**
- Der Dialog bleibt geöffnet, wenn das Rezept optionale Zutaten oder Austausch-Gruppen hat
- Der Dialog schließt sich selbstständig, wenn keine konfigurierbaren Varianten existieren
- Kein sichtbares Flackern beim Öffnen

**Non-Goals:**
- Keine Änderungen an der Benutzeroberfläche (Layout, Styling, Texte)
- Keine Änderungen am Backend oder an API-Schemas
- Keine neue Funktionalität

## Decisions

### Entscheidung: Synchrones `useMemo` statt asynchronem `useEffect` + `hasBuiltOnce`-Ref

**Option A** (Minimal): Guard gegen `hasBuiltOnce` während des Ladens — verhindert das vorzeitige Setzen, behält aber das Race-Condition-Muster bei.

**Option B** (Guard on close check): `&& recipeItems.length > 0` zur Close-Condition hinzufügen — verhindert Schließen während Props noch leer sind, hat aber immer noch eine asynchrone Kopplung.

**Option C** (Gewählt): Berechnung der Gruppen via `useMemo` im Render, nicht via `useEffect`.

```
┌──────────────────────────────────────────────────┐
│  Vorher (useEffect + hasBuiltOnce ref)           │
│                                                  │
│  Props ──► useEffect (asynchron) ──► setGroups   │
│            └─ hasBuiltOnce = true  ──► close?    │
│                                                  │
│  Problem: hasBuiltOnce wird true, BEVOR die      │
│  tatsächlichen Props verarbeitet werden.          │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  Nachher (useMemo + sync decision)               │
│                                                  │
│  Props ──► useMemo (synchron) ──► computedGroups │
│            └─ close decision basiert auf          │
│               computedGroups + dataLoaded         │
│                                                  │
│  Vorteil: close decision ist IMMER sync mit den   │
│  aktuellen Props, kein useEffect-Lag möglich.     │
└──────────────────────────────────────────────────┘
```

**Begründung**: Die Schließ-Entscheidung basiert auf den aktuellen Props (`recipeItems`, `isLoading`, `isFetching`). Diese Information ist synchron beim Render verfügbar. Es gibt keinen Grund, sie asynchron in einem useEffect zu behandeln. Die `buildGroups`-Funktion wird als reine, module-level Funktion extrahiert und in `useMemo` verwendet.

### Datenfluss

```
Props ──┬─► buildGroups(recipeItems, effectivePortions) ── useMemo ──► computedGroups
         │
         ├─► dataLoaded = !isLoading && !isFetching
         │
         ├─► Close decision:  dataLoaded && computedGroups.length === 0
         │                    └─ onClose() sofort im Render
         │
         ├─► Loading check:   !dataLoaded
         │                    └─ Lade-Spinner anzeigen
         │
         └─► Editable state:  useEffect sync von computedGroups
                              └─ displayGroups = groups.length > 0 ? groups : computedGroups
                                 (kein Flash: useMemo-Wert dient als Fallback)
```

### Entfernte Abhängigkeiten

- `useRef` wird nicht mehr benötigt (kein `hasBuiltOnce`)
- `useEffect` wird nur noch für State-Sync verwendet (keine Logik)
- Die Render-Guards basieren auf synchronen Werten

## Risks / Trade-offs

- **[Gering] Background-Refetch von React Query**: Wenn `recipeItems` durch einen Hintergrund-Refetch ein neues Array-Objekt (gleicher Inhalt) erhält, wird `computedGroups` neu berechnet und der State-Sync useEffect feuert erneut. Führt zu einer einmaligen `setGroups(computedGroups)` mit identischen Daten — visuell kein Unterschied, minimale Neuberechnung.
- **[Kein] Verlust von Benutzer-Editierungen**: Der Benutzer kann nicht interagieren, bevor der State-Sync useEffect gelaufen ist (erste Render nach Daten-Ankunft zeigt den Dialog, useEffect läuft vor dem nächsten Paint, Gruppen sind synchron).
