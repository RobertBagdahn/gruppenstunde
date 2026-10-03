## 1. Hotfix und Builder-Zustände

- [x] 1.1 `frontend-food`-Builder in echte Lade-, Fehler-, Leer- und Bereit-Zustände aufteilen; Vorlagen- und Katalogfehler mit deutscher Meldung und Retry anzeigen.
- [x] 1.2 Vorlagenwahl bei fehlender Mahlzeitvorlage auf `free` zurückfallen lassen; wenn keine Vorlage existiert, verständlichen Leerzustand statt permanentem Ladetext zeigen.
- [x] 1.3 Buffet-Aktion in `MealSlot`/`MealActionsMenu` für Mahlzeitentypen mit passender oder universeller Vorlage einschließlich `drinks` verfügbar machen.
- [x] 1.4 Frühstück als eigenen häufigen Modus mit vorhandener Vorlage `breakfast` und höchster Vorauswahl im Frühstücks-Slot erhalten; den separaten Referenzmahlzeiten-Frühstücks-Wizard unverändert lassen.
- [x] 1.5 Tests für leere Vorlagenliste, fehlgeschlagene Requests, Frühstückspriorität, unveränderten Referenzmahlzeiten-Wizard und Snack-/Drinks-Fallback ergänzen.

## 2. Backend: Suche und freie Auswahl

- [x] 2.1 Such-Querysets und Alias-Suche aus vorhandenen Meal-Plan-/Rezept-Suchdiensten wiederverwenden; `meal_type`-abhängiges Rezept-Ranking (Frühstück → `breakfast`, `cold_meal`; Snack → `snack`, `dessert`, `cold_meal`; Mittag → `cold_meal`, `warm_meal`; Abend → `warm_meal`, `cold_meal`; Getränke → `drink`), Prefix-Ranking und stabiles Tiebreaking implementieren.
- [x] 2.2 Typisierte Pydantic-Request-/Response-Schemas und `GET /api/supply/buffet-catalog/search/` mit erforderlichem `role`/`meal_type`, Filtern für Item-Art/Rezepttyp/Backzutaten/Alkohol, leerer Antwort unter zwei Zeichen, anonymer Lesbarkeit und Food-Access-Sichtbarkeitsprüfung implementieren.
- [x] 2.3 `validate_selections` auf Vorlagenrolle, Eindeutigkeit und Sichtbarkeit begrenzen; Tag-Pflicht entfernen und Tests für sichtbare freie Items sowie private fremde Items ergänzen.
- [x] 2.4 Warnungen für fehlende kcal-, Preis- und Rezeptgewichtsdaten durch Preview-/Save-Antworten reichen, ohne Speichern allein deshalb abzulehnen; unbekannte Einzelwerte und davon unvollständige Summen als `null` statt als 0 ausgeben.
- [x] 2.5 Buffet-State-Antwort um Name, Art und Kalkulationsfelder gespeicherter Selektionen erweitern; `MealItem.buffet_role` als Gruppierungsquelle für freie Items bewahren.
- [x] 2.6 Backend-Tests für Suchranking je MealType (insbesondere Frühstück), Alias/Prefix, Ergebnislimit, `kind`-/`recipe_type`-Filter, Nicht-Standalone-/Alkoholfilter, Nicht-Favorisierung alkoholischer Treffer, Draft-/Private-Sichtbarkeit, anonyme Abfrage und Wiederherstellung ergänzen.

## 3. Backend: Rollen und Vorlagen

- [x] 3.1 Idempotente Migration für zehn neue Buffet-Rollen mit deutschen Namen, Gruppe, Eltern-Tag und gültigen Icons implementieren; öffentliche Namen/Slugs und Rollenreihenfolge aktualisieren.
- [x] 3.2 Mehrere Buffet-Rollen pro Ingredient/Recipe zulassen, ohne die Staff-only-Pflege bestehender Rollen-Tags zu lockern.
- [x] 3.3 Idempotenten Template-Seed exakt nach `buffet-templates`-Spec ergänzen; jede Vorlage mit Getränke-Rolle, Rollenreihenfolge, Mengen und `enabled_by_default`/Einklappzustand ausstatten.
- [x] 3.4 `free` für alle Mahlzeittypen sowie `drinks-bar` für `drinks` und `snack` bereitstellen; alte Seeds und Staff-Anpassungen unverändert lassen.
- [x] 3.5 Tests für Migration/Seed-Idempotenz, bestehende Staff-Werte, Rollen pro Template und Getränke-Rolle in jeder Vorlage ergänzen.

## 4. Backend: Kandidatenbericht und sichere Bereinigung

- [x] 4.1 Vollständigen Kandidaten-/Dubletten-/Vollständigkeitsreport für `retail_section`, `is_standalone_food`, `recipe_type`, Nährwerte, Status, alte `breakfast-*`-Träger und normalisierte Namensähnlichkeit implementieren; Kandidaten paginieren statt stillschweigend abzuschneiden.
- [x] 4.2 Alle plausiblen Kandidaten aus den Buffet-Datenqualitäts-Specs sowie dynamische Berichtsergebnisse für Einzelprüfung bereitstellen; alkoholische Einträge als ungeprüfte `untag`-Kandidaten aufführen; Kandidaten gegen die Zielumgebung erneut verifizieren.
- [x] 4.3 Cocktailtomaten-Ziel 6934 mit Quellen 6626/36/7058 sowie alle weiteren plausiblen Dublettengruppen aus `buffet-data-quality-proposals` und dem aktuellen Bericht als unfreigegebene Vorschläge abbilden; Merges ausschließlich nach expliziter Staff-Auswahl und Preview über bestehende Merge-Services ermöglichen.
- [x] 4.4 `migrate_buffet_roles` standardmäßig schreibfrei machen; Änderungen nur mit explizitem `--apply` zulassen und `--dry-run`/`--apply` gegenseitig ausschließen; Planausgabe, Name-Abweichungen und Merge-Aktionen testen.
- [x] 4.5 Fehlende Lebensmittel-/Rezeptkandidaten aus `buffet-data-quality-proposals` nur nach Review aufnehmen; Zutaten-Status, Nährwerte, Retail-Section und Portionsdaten durch Staff-Review absichern, KI-Anreicherung nur als Vorschlag nutzen.
- [x] 4.6 Dry-Run auf der vorgesehenen Zielumgebung ausführen, Output (Merges, fehlende/abweichende IDs, alte Tags, Qualitätswarnungen) fachlich prüfen und dokumentieren; Prod-Apply bleibt separat und benötigt explizite Freigabe nach `docs/prod-runbook.md`.

## 5. Backend: Datenqualitäts-Vorschläge und Mapping-Test

- [x] 5.1 Persistiertes, auditierbares Vorschlagsmodell mit Migration für Rollen-Zuordnungen, Merges sowie neue Zutaten-/Rezeptvorschläge anlegen.
- [x] 5.2 Staff-only Pydantic-API für paginierte Kandidaten, Vorschlagsanlage/-bearbeitung, Prüfung, Freigabe/Ablehnung und Mapping-Export implementieren; statische Kandidaten-/Export-Routen vor parametrisierten Proposal-Routen registrieren.
- [x] 5.3 KI-Vorschläge für neue Zutaten und Rezepte als editierbare Vorschlagsdaten integrieren; AI-Ausgabe darf vor Review keine aktiven Items, Tags oder Statusdaten anlegen.
- [x] 5.4 Manuelle Vorschlagserfassung für Zutaten/Rezeptdaten ergänzen und Pflichtfelder, Name/ID-Abweichungen sowie bestehende Item-Kollisionen validieren.
- [x] 5.5 Schreibfreien Mapping-Test über denselben Preview-/Merge-Service wie `migrate_buffet_roles --dry-run` implementieren; Tests für veraltete Vorschauen, Name mismatch, fehlende Daten, betroffene Referenzen und echte Schreibfreiheit ergänzen.
- [x] 5.6 Backend-Tests für Staff-Berechtigungen, Vorschlagsstatus/Audit, Pagination, manuelle und KI-generierte Daten sowie Export freigegebener Mappings ergänzen.

## 6. Food-Frontend: Datenqualitäts-Vorschlagsmaske

- [x] 6.1 Neue Staff-only Unterkategorie „Buffet-Vorschläge“ in `DataQualityIngredientsPage` integrieren; Kandidatenliste, KI-/Manuell-Formular, Vorschlagsreview und Mapping-Test zugänglich machen.
- [x] 6.2 Pydantic-/Zod-Schemas, `api/dataQuality.ts`, `schemas/dataQuality.ts` und URL-State-Typen synchronisieren; Filter und Pagination erhalten.
- [ ] 6.3 Frontend-Tests für Staff-Zugriff, Vorschlagsanlage, KI-/Manuell-Bearbeitung, fehlende Pflichtfelder, stale Preview und Mapping-Export ergänzen.
- [x] 6.4 Sicherstellen, dass der Buffet-Vorschlagsbereich mit dem bestehenden Datenqualitäts-Cockpit und dem Change `food-data-offensive` koexistiert und den Referenzmahlzeiten-Frühstücks-Wizard nicht ersetzt.

## 7. Food-Frontend: Buffet-Suche und Builder

- [x] 7.1 Suchendpunkt in `frontend-food/src/api/buffet.ts` anbinden und Pydantic-/Zod-Schemas in `frontend-food/src/schemas/buffet.ts` synchron halten.
- [x] 7.2 In jeder Buffet-Rolle die immer sichtbare debounced Suche, Ergebnisliste, Typ-/Rezepttyp-Filter, Backzutaten- und Alkoholfilter (beide standardmäßig aus), Item-Art, kcal/Preis und Leerzustand integrieren.
- [x] 7.3 Suchtreffer als ausgewählte Chips einfügen und Nicht-Favoriten/eigene Items sichtbar markieren; freie Items beim Wiederöffnen aus State-Response beschriften.
- [x] 7.4 Rollenreihenfolge/-namen in `lib/buffetRoles.ts` ergänzen und Vorlagenauswahl mit Frühstücksmodus, passenden Vorlagen zuerst und weiteren Vorlagen aus anderen Mahlzeittypen darunter umsetzen.
- [ ] 7.5 `MealSlot` und `MealActionsMenu` für `drinks` sowie universelle Vorlage aktualisieren; UI bei 320 px prüfen.
- [x] 7.6 Frontend-Tests für Suche, Filter, Auswahl, Wiederherstellung, Error/Retry, Frühstücksmodus, Vorlagenwechsel und mobile Ergebnisliste ergänzen.

## 8. Integration und Abnahme

- [x] 8.1 Backend-Regressionstests und Migration-Check mit `uv run` ausführen; geänderte API-Verträge gegen Food-Frontend-Types prüfen.
- [ ] 8.2 Food-Frontend-Test-Suite, TypeScript-Prüfung und Lint ausführen.
- [ ] 8.3 Integrierten Ablauf für jeden Mahlzeittyp einschließlich `breakfast`, `snack` und `drinks`, freie Suche, Filter, Vorschlagsprüfung, Vorschau, Speichern und erneutes Öffnen testen.
- [ ] 8.4 Vor Prod-Apply finalen Dry-Run und explizite Freigabe gemäß Runbook einholen; keine Datenänderung auf Prod ohne dokumentierte Freigabe ausführen.

## Offene Abnahmehinweise

- 4.6 ist nach einem Prod-Preflight in einer Rollback-Transaktion abgeschlossen. Der Mapping-Dry-Run plante 0 Änderungen, übersprang 8 veraltete Zeilen und meldete drei verbleibende Alt-Tag-Träger; Details stehen in `docs/prod-runbook.md`. Es wurde nichts persistiert.
- Die Mengen in `free` und `drinks-bar` wurden vom Nutzer bestätigt. Der Template-Preflight ergab 18 geplante Vorlagen, 3 vorhandene und 0 fehlende Abhängigkeiten.
- 8.4 bleibt offen, bis der freigegebene Code gemergt und deployt ist; der separate Mapping-Apply ist nicht freigegeben oder erforderlich für diesen Deploy.
- 6.3 ist noch nicht vollständig: Frontend-Tests decken Kandidatenvorschlag und Formularzugriff ab; UI-AI-Ablauf, vollständiges manuelles Speichern und Export sind noch nicht umfassend getestet.
- 7.5 wurde implementiert, aber der 320-px-Layoutcheck wurde nicht manuell ausgeführt. 8.3 bleibt offen, weil kein vollständiger integrierter End-to-End-Ablauf ausgeführt wurde.
- Die vollständigen Backend-Tests bestehen (3384 passed, 9 skipped); Food-Frontend-Tests und Build bestehen (752 Tests). `npm run lint` meldet 67 bestehende Verstöße in nicht geänderten Frontend-Dateien; ESLint auf den geänderten Food-Frontend-Dateien ist sauber.
