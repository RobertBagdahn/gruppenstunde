## 1. Wiederholung bei Überlastung

- [x] 1.1 `frontend-food/src/lib/queryRetry.ts`: `shouldRetryQuery` (429, 5xx, Netzfehler; höchstens zwei Wiederholungen) und `queryRetryDelay` (Retry-After bis 30 s, sonst 1 s bis 8 s)
- [x] 1.2 Globaler Standard in `src/main.tsx` auf diese Funktionen umgestellt; Mutationen bleiben ohne Wiederholung
- [x] 1.3 Unit-Tests `src/lib/queryRetry.test.ts` (Klassifizierung, Grenzen, Wartezeiten)

## 2. Anmeldeprüfung ohne falsche Abmeldung

- [x] 2.1 `useCurrentUser` in `src/api/auth.ts` nutzt dieselbe Wiederholungsregel statt `retry: false`
- [x] 2.2 Einkaufsseite zeigt „Anmeldung gerade nicht prüfbar“ mit „Erneut versuchen“ statt der Anmeldeaufforderung; Gäste bleiben auf der Liste
- [x] 2.3 Seitentests: Überlastung zeigt Wiederholung, Anonyme bekommen weiter die Anmeldeaufforderung, Gast bleibt
- [x] 2.4 E2E `e2e/shopping-list-search.spec.ts` („session check under load“): kurze Überlastung meldet nicht ab, dauerhafte Überlastung zeigt Wiederholung

## 3. Schriftgrößen

- [x] 3.1 `src/lib/utils.ts`: `extendTailwindMerge` mit den sieben Tokens aus `tailwind.config.ts`
- [x] 3.2 Unit-Tests `src/lib/utils.test.ts`
- [ ] 3.3 Visuelle Prüfung der Rezept- und Einkaufsseiten, weil dort Größen wieder erscheinen (Entscheidung für den Rollout)

## 4. Kopfband

- [x] 4.1 Kopfzeile der Einkaufsliste mit `flex-wrap`, Titel mit `break-words`
- [x] 4.2 Screenshots bei 320, 390 und 1280 px geprüft
- [ ] 4.3 Entscheiden, ob die übrigen Detailseiten dieselbe Regel bekommen (siehe Open Questions in `design.md`)

## 5. Spec-Abgleich

- [x] 5.1 Deltas in `food-api-contracts`, `auth-session`, `food-design-system` und `shopping-list-views` (dieser Change)
- [x] 5.2 `openspec validate food-overload-and-typography --strict` ohne Fehler
