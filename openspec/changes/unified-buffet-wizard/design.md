## Context

`BreakfastWizardPage` enthält weiterhin den vertrauten mehrstufigen Frühstücksablauf mit Share-Slidern, Profil-Schnellstart, Nährwert-Cockpit und Speichern als Referenz- oder direkte Mahlzeit. Er ist aber nicht mehr der normale Einstieg aus einem Frühstücks-MealSlot. Der allgemeine `BuffetBuilder` wird dagegen als einzelnes Dialog-Formular geöffnet: Vorlagenwahl und alle Rollen stehen im selben Schritt. Neue Buffet-Vorlagen haben bislang teilweise Rollen/Mengen, aber keine vollständigen vorausgewählten Produkte.

Der Nutzer möchte den alten Frühstücksassistenten aus dem MealSlot zurück und denselben Wizard-Stil für alle Buffet-Mahlzeitentypen. Die fünf Frühstücksprofile und zwei Getränkenamen sind die benannten Optionen. Eine feste Liste für Mittagessen, Abendessen und Snacks ist nicht als bestätigt überliefert; dort verwendet der Wizard vorhandene aktive Vorlagen nach `sort_order`. Die Definitionen bleiben zunächst Staff/Admin-Pflege. Die aktuelle Prod-Rollenzuordnung für Käse, Knabbereien, Dips, Nüsse und Würze wurde separat verifiziert und angewendet; neue Presets müssen diese Favoriten wiederverwenden, nicht duplizieren.

## Goals / Non-Goals

**Goals:**
- Den bestehenden Frühstückswizard mit seinen sechs Verteilungs-/Cockpit-Schritten aus dem normalen Frühstücks-MealSlot erreichbar machen und um einen vorgeschalteten Profil-Schritt mit den fünf bestätigten Frühstücksoptionen ergänzen.
- Den allgemeinen Buffet-Builder in einen mehrstufigen Wizard mit derselben Progress-, Zurück/Weiter-, Abschluss- und Mobil-Darstellung überführen.
- Als ersten Schritt pro Mahlzeitentyp vollständige, bearbeitbare Presets anbieten; „Freies Buffet“ bleibt eine zusätzliche, immer sichtbare Option.
- Standardauswahlen, Mengen, Item-Anteile, manuelle MealItems, Sichtbarkeit und Wiederherstellung konsistent behandeln.
- Globale Preset-/Rollen-Definitionen nur für Staff/Admin pflegbar lassen; normale Nutzende dürfen die aktuelle Auswahl ihrer Mahlzeit anpassen.

**Non-Goals:**
- Den Referenzmahlzeiten-Wizard abschaffen oder durch Buffet-Speicherung ersetzen. Sein bestehender Pfad und Referenzspeicher-Modus bleiben erhalten.
- In diesem Change einen eigenen React-Admin-Editor für Presets bauen; die vorhandene serverseitige Staff/Django-Admin-Pflege bleibt zunächst ausreichend.
- Neue Zutaten/Rezepte per KI erzeugen, globale Rollenzuordnungen automatisch ableiten oder Dubletten zusammenführen.
- Prod-Mapping oder Prod-Deploy dieses neuen Changes ausführen.

## Decisions

1. **Ein MealSlot-Einstieg, bestehende Frühstückslogik bleibt erhalten.** Für `breakfast` öffnet die bestehende `BreakfastWizardPage` im `directMeal`-Modus; der normale Slot erhält dafür wieder einen klaren Einstieg. Die Referenzmahlzeiten-Routen verwenden dieselbe Seite weiterhin im `refMeal`-Modus. Andere Mahlzeitentypen öffnen den generischen Buffet-Wizard. Beide verwenden gemeinsame Stepper-/Progress-/Navigation-Komponenten und dieselben Layout-Tokens.
2. **Preset-first.** Der erste Schritt ist immer eine komplette Variante. Frühstück verwendet die fünf benannten Profile „Nur Müsli“, „Brot und Müsli“, „Brot pflanzlich“, „Brot vegetarisch“ und „Brot mit Fleisch“. Für Mittagessen, Abendessen und Snacks werden vorhandene aktive Vorlagen nach ihrer konfigurierten `sort_order` gezeigt; höchstens sechs davon sind hervorgehoben, weitere bleiben unter „Weitere Vorlagen“ erreichbar. Für Getränke werden „Hausfahrt mit Säften“ und „Lager mit Zitronentee“ zuerst hervorgehoben.
3. **Freies Buffet ist keine der kuratierten Plätze.** Es erscheint zusätzlich zu den bis zu sechs typisierten Varianten als feste Kachel für alle MealTypes. So wird es nicht durch eine Rang-/Sortieränderung verdrängt.
4. **Vollständig vorausgewählte, aber editierbare Inhalte.** Jeder Preset-Einstieg setzt seine Rollen, Mengen und eine änderbare Startauswahl. Frühstück initialisiert die vorhandene `WizardState`-Verteilung; generische Vorlagen nutzen `BuffetTemplateRole.default_ingredients/default_recipes`. Die neu ergänzten Default-Item-Listen für Mittagessen, Abendessen und Snacks sind Startvorschläge aus vorhandenen System-Katalogeinträgen, keine neu angelegten Produkte und keine bestätigte feste Auswahl. Für bestehende Vorlagen kann ein expliziter Seed-Dry-Run leere Default-Auswahlen ergänzen, überschreibt aber keine nicht-leeren Staff-Auswahlen. Wenn eine aktive Rolle keine expliziten Defaults hat, startet sie mit dem ersten sichtbaren Favoriten. Der Katalog zeigt sichtbare Vorlagen-Defaults auch dann, wenn ein Item keinen globalen Rollen-Favoriten-Tag trägt; unsichtbare Items werden weiterhin über `food_access` ausgefiltert.
5. **Per-Rolle und per-Item Share-Slider.** Die Rollenmenge bleibt die Gesamtmenge pro Person. Ausgewählte Items innerhalb einer Rolle bekommen `share_percent`; ihre Summe beträgt 100 %. Der alte `rebalanceShares`-Mechanismus rebalanced nicht gesperrte Items. Pro-Item-Menge ist `role_amount × share_percent / 100`. Der neue `MealItem.buffet_share_percent` persistiert die Aufteilung und erlaubt exakte Wiederherstellung; bestehende Buffet-Zeilen ohne den Wert werden beim Lesen gleichmäßig verteilt. Ein Item darf in verschiedenen Rollen vorkommen, innerhalb derselben Rolle bleibt es eindeutig.
6. **Save-Policy ist eine bewusste Nutzerauswahl.** Vor dem Schreiben wählt die Person, ob erkannte manuelle MealItems erhalten bleiben (`preserve`) oder alle bestehenden Einträge ersetzt werden (`replace`). Für alte API-Clients bleibt `replace` als bisheriges Verhalten Standard; die neuen Wizards senden die Auswahl explizit. Neue Frühstücksassistent-Einträge erhalten `MealItem.is_breakfast_assistant`; beim Wiederherstellen werden zusätzlich alte Frühstücks-Tags berücksichtigt. Manuell hinzugefügte, lediglich global Buffet-getaggte Einträge werden nicht allein aufgrund ihres Tags als Assistenten-Einträge gelöscht.
7. **Admin-Grenze.** Nutzende ändern nur die konkrete Mahlzeit: Items suchen/auswählen/entfernen und Share-/Mengenwerte einstellen. Die Rollen einer Vorlage, Preset-Verfügbarkeit und globale Default-Auswahlen bleiben Staff/Admin-Konfiguration; gewöhnliche Nutzende können keine Rollenstruktur veröffentlichen oder ändern.
8. **Seed und Migration sind additiv und dry-run-fähig.** Share-Spalte und Frühstücksprofil werden über additive Planner-Migrationen angelegt. Neue Templates werden über den standardmäßig schreibfreien `seed_buffet_templates --dry-run` geprüft und erst nach `--apply` erzeugt. Das optionale `--fill-missing-defaults` füllt nur leere Default-Auswahlen bestehender Seed-Vorlagen und wird separat vorgeprüft; nicht-leere Staff-Auswahlen werden nie überschrieben.
9. **Drinks-Defaults verwenden vorhandene Daten.** „Hausfahrt mit Säften“ startet mit vorhandenen Apfel-, Multi- und Orangensäften. „Lager mit Zitronentee“ verwendet das bestehende Rezept „Ingwertee mit Zitronen“ als verfügbare Zitronentee-Auswahl; der Change legt kein neues Getränkerezept an.

Alternativen: bestehende Buffet-Dialogansicht beibehalten (wirkt anders als Frühstückswizard); sämtliche Favoriten eines Tags als Vorauswahl laden (ergibt schnell übervolle Buffets); Share-Aufteilung nur im Frontend halten (verliert Zustand beim Speichern/Wiederöffnen); eigene neue Produktdatensätze für Getränkepresets erstellen (unnötig, vorhandene Katalogeinträge reichen).

## Risks / Trade-offs

- [Alte, bereits gespeicherte MealItems haben keinen Item-Share] → Migration lässt den Wert nullable; beim Lesen werden Legacy-Auswahlen gleichmäßig verteilt.
- [Ein Standard-Item ist für eine Person nicht sichtbar] → Defaults werden wie Suchtreffer mit den bestehenden `food_access`-Services gefiltert; unsichtbare Defaults werden nicht ausgegeben oder gespeichert.
- [Dieselbe Zutat steht in mehreren Rollen] → Eindeutigkeit wird pro Rolle geprüft; `buffet_role` bleibt Gruppierungs- und Mengenquelle.
- [Ein globales Preset enthält falsche Mengen/Produkte] → Nur Staff ändert die Vorlagen; Dry-Run vor Seed; Nutzer sehen vor dem Speichern Vorschau und können Auswahl/Mengen anpassen.
- [Referenzmahlzeiten-Workflow wird versehentlich ersetzt] → Bestehende Referenz-Route und `refMeal`-Speicherpfad behalten eigene Regressionstests.
- [Zu viele Varianten überfordern] → Höchstens sechs hervorgehobene Presets pro Mahlzeitentyp, weitere aktive Vorlagen in „Weitere Vorlagen“, „Freies Buffet“ bleibt separat.

## Migration Plan

1. Pydantic-/Zod-Vertrag um Item-Share und Save-Policy erweitern; Migration für nullable `MealItem.buffet_share_percent` hinzufügen.
2. `BreakfastWizardPage`-Einstieg aus dem Frühstücks-MealSlot wiederherstellen, Profil-Schritt mit fünf bestätigten Varianten an den Anfang setzen und Referenzmodus unverändert absichern.
3. Generischen Buffet-Builder mit gemeinsamer Stepper-Navigation und Preset-/Konfigurations-/Prüfschritten ausstatten; Drinks-Templates seedbar ergänzen und Default-Items sichtbar wiederherstellen.
4. Backend-Berechnung, gespeicherten Zustand und Save-Policy für Item-Shares sowie Mehrfachrollen testen.
5. `seed_buffet_templates --dry-run --fill-missing-defaults` auf einer Zielumgebung ausführen, fehlende Abhängigkeiten prüfen und erst nach separater Freigabe dieselbe Option mit `--apply` ausführen. Kein Prod-Apply dieses Changes ohne eigenen Prod-Auftrag.
6. Rollback: Code zurückrollen; die zusätzliche nullable Share-Spalte kann nach Entfernen der Nutzung über eine neue, geprüfte Migration rückgängig gemacht werden. Bereits angelegte Template-Datensätze nicht automatisch löschen.

## Noch zu bestätigende Produktannahme

- Die generischen Item-Slider verwenden analog zum bestehenden Frühstücksassistenten Prozentanteile, die je Rolle zusammen 100 % ergeben; die Rollenmenge bleibt der absolute g/ml-Wert pro Person. Diese Annahme ist im Branch umgesetzt und sollte vor Merge bestätigt werden. Falls mit „Menge je Item“ unabhängige absolute g/ml-Werte gemeint sind, müssen Berechnung, API und Persistenz angepasst werden.
- Generische Buffet-Vorlagen werden über vorhandene Django-Admin/Seed-Daten gepflegt. Die fünf spezialisierten Frühstücksprofile sind in dieser Implementierung noch clientseitig definiert und nicht einzeln im Django-Admin editierbar; vor Merge ist zu entscheiden, ob diese Admin-Pflege bereits in diesen Change gehört oder als Folgephase umgesetzt wird.
