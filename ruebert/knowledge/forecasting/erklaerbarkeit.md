---
type: concept
title: "Erklärbarkeit"
description: "Wie Flower-Demand jede Prognose und Bestellmenge so erklärt, dass Daniel ihr vertrauen oder begründet widersprechen kann."
tags: [prognose, erklaerbarkeit, vertrauen, transparenz]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Erklärbarkeit

## Kurzfassung

Robert hat es am Anfang so formuliert: Daniel wird den Prognosen „nur vertrauen, wenn sie genau
erklären, wie sie auf den Wert kommen“. Im Mai 2026 war genau das die Lücke: Bei DGW054 verstand
Daniel, warum das Tool mehr wollte (starkes Jahr), bei DGW042 nicht (über 7.000 statt 2.000 Tüten).
Deshalb bekommt jede Zahl eine Zerlegung in nachvollziehbare Schritte, einen Vergleich mit Vorjahr
und Excel-Methode und einen Weg zurück bis zu den Daten. Erklärungen werden beim Prognoselauf
gespeichert, nicht nachträglich erfunden.

## Inhalt

- [Warum-diese-Zahl-Zerlegung](#warum-diese-zahl-zerlegung)
- [Bestandteile der Artikelerklärung](#bestandteile-der-artikelerklärung)
- [Abnahmetests](#abnahmetests)
- [Sprache](#sprache)

## Warum-diese-Zahl-Zerlegung

Jede Saisonprognose eines Artikels wird als Wasserfall gezeigt:

```text
Vorjahr (bereinigte Nachfrage gleicher Zeitraum)        6.200
+ Korrektur Ausverkauf Vorjahr (3 Wochen zensiert)      + 900
× Trend Kategorie Gemüsesamen (+12 %, gedämpft)         + 850
+ Anteilsverschiebung im Sortiment                      − 300
+ Ereignisse (Bundles seit 2026)                        + 400
− Plausibilitätsgrenze (Cap gegen Vorjahr × 1,5)          0
= Prognose P50                                          8.050   (P10 6.100 · P90 10.400)
```

Die Zahlen sind ein Beispiel. Jeder Schritt verlinkt auf seine Datenbasis. Für ML-Modelle wird die
Zerlegung über Beiträge der Merkmale (SHAP) auf dieselben Kategorien abgebildet.

## Bestandteile der Artikelerklärung

| Baustein | Frage, die er beantwortet |
|---|---|
| Wasserfall | Wie setzt sich die Zahl zusammen? |
| Vergleich Vorjahr / Excel-Methode / Modelle | Warum weicht das Tool von meiner Rechnung ab? |
| Datenqualität | Welche Wochen sind zensiert, ausgeschlossen, auffällig? |
| Ereignisse | Welche Ereignisse wirken auf diesen Artikel? |
| Treffsicherheit | Wie gut lag die Prognose für diesen Artikel in der Vergangenheit? |
| Unsicherheit | Wie breit ist das Band und warum (wenig Historie, Strukturbruch)? |
| Korrekturen | Hat Daniel etwas angepasst, wann, warum? |
| Herkunft | Klick bis zur einzelnen Buchung ([Rückverfolgbarkeit](../data/datenklassifikation-und-herkunft.md#rückverfolgbarkeit-in-der-oberfläche)) |

Zusätzlich gibt es eine Erklärseite für alle Kennzahlen und Ampelfarben, wie in v1
(v1-Specs `kpi-explanation-page`, `ampel-explanation`).

## Abnahmetests

| Fall | Erwartung | Quelle |
|---|---|---|
| DGW054 | Erklärung nennt das starke Jahr als Hauptgrund für 13.000 statt 6.000 | Chat 20.05.2026 |
| DGW042 | Erklärung zeigt nachvollziehbar, woher > 7.000 statt 2.000 kommen – oder die Prognose sinkt nach Datenbereinigung | Chat 20.05.2026, [Q-057](../open-questions/q-057-fall-dgw042.md) |
| DGW097 | Bedarf 18.000 → Vorschlag 15.000 oder 20.000 mit Begründung, nie 6.000 | Chat 19.05.2026 |
| Bedarf 20.207 | Bei Schwelle 80 % → 20.000 mit Hinweis „207 Tüten = 4 % des Schritts“ | Chat 22.05.2026 |

## Sprache

- Deutsch, ohne Fachjargon in der ersten Ebene; Fachbegriffe verlinkt aufs Glossar.
- Zahlen ganzzahlig mit deutschem Tausendertrennzeichen.
- Unsicherheit in Worten: „mit 80 % Wahrscheinlichkeit zwischen 6.100 und 10.400“.
- Keine Erklärung ohne Daten: Wenn ein Grund nicht belegt ist, steht dort „unbekannt“.

## Offene Fragen

- [Q-057: Was war bei DGW042 los?](../open-questions/q-057-fall-dgw042.md)
- [Q-077: Wie soll Unsicherheit aussehen?](../open-questions/q-077-unsicherheit-darstellung.md)
- [Q-078: Willst du Prognosen korrigieren?](../open-questions/q-078-prognose-korrektur.md)
- [Q-079: Welche Erklärung brauchst du?](../open-questions/q-079-erklaer-tiefe.md)

## Verwandte Seiten

- [Anforderungen Oberfläche und Analyse](../requirements/fa-oberflaeche-und-analyse.md)
- [Modellstrategie](modellstrategie.md)
- [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md)
- [Datenklassifikation und Herkunft](../data/datenklassifikation-und-herkunft.md)
- [Prognose](index.md)
