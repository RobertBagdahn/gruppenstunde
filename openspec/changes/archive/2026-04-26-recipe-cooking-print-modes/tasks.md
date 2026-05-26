# Implementation Tasks — recipe-cooking-print-modes

## 1. Step-Parser

- [x] 1.1 `frontend/src/lib/parseRecipeSteps.ts` neu anlegen
- [x] 1.2 Funktion `parseRecipeSteps(markdown: string): string[]` mit drei Strategien (Überschriften → nummerierte Liste → Fallback)
- [x] 1.3 Unit-Tests `parseRecipeSteps.test.ts`: Überschriften-Split, nummerierte Liste, Fallback, leerer String, sehr kurzer Text
- [x] 1.4 Keine externe Markdown-Library nötig — simple Regex-basierte Heuristik

## 2. Wake Lock Hook

- [x] 2.1 `frontend/src/hooks/useWakeLock.ts` neu anlegen
- [x] 2.2 Hook erkennt Support via `'wakeLock' in navigator`
- [x] 2.3 Request beim Mount, Release beim Unmount
- [x] 2.4 Re-Request bei `visibilitychange` → `document.visibilityState === 'visible'`
- [x] 2.5 Rückgabewert: `{ isActive: boolean, isSupported: boolean }`
- [x] 2.6 Keine UI-Fehler bei fehlendem Support

## 3. Cooking Mode Komponente

- [x] 3.1 `frontend/src/pages/recipes/RecipeCookingMode.tsx` neu anlegen
- [x] 3.2 Props: `recipe`, initial von RecipeDetailPage übergeben
- [x] 3.3 URL-State über `useSearchParams`: liest `step` als Nummer, Default 0
- [x] 3.4 Ruft `parseRecipeSteps(recipe.description)` und cached via `useMemo`
- [x] 3.5 Clamped `currentStep = Math.min(step, steps.length - 1)`
- [x] 3.6 Layout: `fixed inset-0 bg-background z-50 flex flex-col lg:flex-row`
- [x] 3.7 Links Zutatenliste mit PortionScaler (reuse Komponente), rechts aktueller Schritt-Block
- [x] 3.8 Schritt-Block: große Schrift (`text-xl lg:text-2xl`), Padding großzügig, Markdown via `MarkdownRenderer`
- [x] 3.9 „Zurück"- und „Weiter"-Buttons (shadcn/ui Button, `size="lg"`) am unteren bzw. rechten Rand, deaktiviert an Grenzen
- [x] 3.10 Schritt-Indikator: „Schritt {n} / {total}" sichtbar
- [x] 3.11 Exit-Button oben rechts: `Button` mit X-Icon, entfernt `mode` und `step` aus URL
- [x] 3.12 `useWakeLock()` aufrufen
- [x] 3.13 Keyboard: `Escape` triggert Exit, `ArrowLeft` / `ArrowRight` navigieren Schritte

## 4. Routing-Integration in RecipeDetailPage

- [x] 4.1 `useSearchParams` in `RecipeDetailPage` ergänzen
- [x] 4.2 Wenn `mode === 'cooking'`: `<RecipeCookingMode recipe={recipe} />` rendern, alles andere überspringen
- [x] 4.3 Wenn `mode === 'print'`: Standard-Inhalt rendern, aber Root-Element `data-mode="print"` setzen, zusätzlich „Drucken"/„Zurück"-Leiste oben einblenden
- [x] 4.4 Standard-Modus unverändert

## 5. Print-CSS

- [x] 5.1 In `frontend/src/index.css` (oder bestehendem globalen Stylesheet) `@media print`-Block ergänzen
- [x] 5.2 `@page { margin: 2cm; }`
- [x] 5.3 Universal `body { background: white; color: black; }`
- [x] 5.4 `[data-print-hide], .no-print { display: none !important }` — diese Selektoren an Header, Sidebar, Bottom-Bar, Kommentare, Improvements, Aktions-Buttons, Hero-Bild setzen (Tailwind `print:hidden` nutzen, wenn möglich)
- [x] 5.5 `.recipe-ingredients, .recipe-step { break-inside: avoid }` (Klassen an entsprechenden Elementen ergänzen)
- [x] 5.6 Äquivalente Regeln als `[data-mode="print"] ...` duplizieren für die Bildschirm-Vorschau
- [x] 5.7 Schriftart/Größen für Druck: `font-size: 11pt; line-height: 1.4`

## 6. Sidebar- und Bottom-Bar-Integration

- [x] 6.1 In `RecipeSidebar`: zwei neue Buttons „Kochen starten" und „Drucken"
- [x] 6.2 „Kochen starten" navigiert zu `?mode=cooking&step=0`
- [x] 6.3 „Drucken" ruft `window.print()` direkt auf
- [x] 6.4 In `RecipeMobileActionBar`: Da Haupt-Slots bereits vergeben (Einkaufsliste, Portionen), ein Overflow-Menu (shadcn/ui DropdownMenu) mit Kebab-Icon hinzufügen, das „Kochen starten", „Drucken" und „Teilen" enthält

## 7. Print-Vorschau-Controls

- [x] 7.1 Bei `mode === 'print'` oben auf der Seite ein Print-Toolbar rendern: links „← Zurück" Button, rechts „Drucken"-Button
- [x] 7.2 Toolbar mit Klasse `.no-print` markieren, damit sie selbst nicht gedruckt wird
- [x] 7.3 Zutatenliste und Zubereitungsschritte nutzen aktuellen Scaling-State aus `useRecipeModificationStore`

## 8. Verifikation Cooking Mode

- [x] 8.1 Smartphone-Test (iOS Safari, Android Chrome): `mode=cooking`, Wake Lock aktiv, Bildschirm bleibt an
- [x] 8.2 Step-Navigation funktioniert, Direct-Link zu `?mode=cooking&step=2` öffnet korrekten Schritt
- [x] 8.3 Escape-Taste beendet Mode (Desktop)
- [x] 8.4 Parser produziert sinnvolle Schritte für mehrere reale Rezepte
- [x] 8.5 Tab-Wechsel und Rückkehr: Wake Lock wird reaktiviert

## 9. Verifikation Print View

- [x] 9.1 Chrome-Druckvorschau: Keine Sidebar, keine Kommentare, keine Buttons
- [x] 9.2 Safari-Druckvorschau: Layout wie Chrome
- [x] 9.3 A4-Seite: Margins korrekt, Inhalt nicht abgeschnitten
- [x] 9.4 Page-Breaks: keine Zutaten-Zeile mitten im Seitenumbruch
- [x] 9.5 `?mode=print` Bildschirm-Vorschau entspricht visuell der Druckvorschau
- [x] 9.6 Skalierte Portionen werden korrekt gedruckt (z.B. 8 Portionen statt 1)

## 10. Qualität

- [x] 10.1 `pnpm tsc --noEmit` grün
- [x] 10.2 `pnpm lint` grün
- [x] 10.3 `pnpm test` für neue Unit-Tests (parseRecipeSteps) grün
- [x] 10.4 Keine neuen console.log oder debug-Statements

## 11. OpenSpec Archive

- [x] 11.1 `openspec validate recipe-cooking-print-modes --strict` erfolgreich
- [x] 11.2 Via `openspec archive recipe-cooking-print-modes` archivieren
