# Tasks: food-audit-followup

## 1. Backend: Zutatensuche und Pläne
- [ ] 1.1 Untersuchen, warum die Essensplan-Suche nur 32 Zutaten findet; Suchquelle und Filter so anpassen, dass alle geeigneten aktiven Zutaten gefunden werden.
- [ ] 1.2 Entwürfe und gelöschte Zutaten aus Suchresultaten ausschließen; Relevanzsortierung und stabilen Tie-Breaker über die gesamte Ergebnisliste erhalten.
- [ ] 1.3 Einzelzutaten-Mengen für Planportionen definieren und sicherstellen, dass gewählte Portion und Personenzahl genau einmal in die Berechnung eingehen.
- [ ] 1.4 „Meine Pläne“ serverseitig auf den angemeldeten Besitzer beschränken; Owner-, Staff- und Collaborator-Fälle testen.
- [ ] 1.5 Einkaufslisten-Zuordnung von Freitext zu Zutaten und Einheiten im Backend untersuchen; keine widersprüchlichen Display-Mengen ausgeben.
- [ ] 1.6 Rezeptschritte-Quelle für API-Detailantworten untersuchen und Datenmigration nur bei nachgewiesenem Bedarf planen.

## 2. Frontend: Suche, Formulare und Anzeige
- [ ] 2.1 Pydantic- und Zod-Schemas sowie Query-Hooks synchronisieren, falls Such- oder Listenparameter/-antworten geändert werden.
- [ ] 2.2 Suchdialog auf Touch-Geräten ohne Hover bedienbar machen; Vorschau und Übernehmen-/Hinzufügen-Aktion müssen ab 320 px sichtbar und erreichbar sein.
- [ ] 2.3 Rezept-Wizard: Titel und Typ nicht erneut abfragen; Validierungsfehler am jeweiligen Feld anzeigen.
- [ ] 2.4 Einkaufslistenmenge mit nachvollziehbarer Menge, Einheit und Portion formatieren; erkannte Zutaten nicht als uneindeutigen Freitext darstellen.
- [ ] 2.5 Rezeptschritte in Detail- und Bearbeitungsansicht aus derselben maßgeblichen Datenquelle anzeigen.

## 3. Standardmaße und Qualitätssicherung
- [ ] 3.1 Fachliche Umrechnungsregeln für Tasse/EL/TL und Zutaten-spezifische Portionen festlegen, einschließlich erwarteter Grammwerte und Rundung.
- [ ] 3.2 Doppelte beziehungsweise konkurrierende Maßoptionen mit unvereinbaren Gewichten verhindern oder eindeutig beschriften.
- [ ] 3.3 Backend-Tests für Statusfilter, Suchabdeckung, Sortierstabilität, Zugriff auf eigene Pläne, Portionen und Einkaufslisten ergänzen.
- [ ] 3.4 Frontend-Tests für Touch-Bedienung, 320-px-Layout, Wizard-Validierung und konsistente Rezeptschritte ergänzen.
- [ ] 3.5 Betroffene Django- und Food-Frontend-Prüfungen ausführen; prüfen, ob Migrationen erforderlich sind.
