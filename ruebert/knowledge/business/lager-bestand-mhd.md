---
type: concept
title: "Lager, Bestand und MHD"
description: "Puffer-Regel, Bestandsbegriffe, Haltbarkeit und warum der Bestand die Grundlage für Ausverkaufserkennung und Ampel ist."
tags: [lager, bestand, puffer, mhd]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, export-warenbewegungen]
---

# Lager, Bestand und MHD

## Kurzfassung

Für jeden Eigenmarken-Artikel hält DeineGartenwelt einen Puffer von 30 Tüten für Nachlieferungen
zurück: Ist der verfügbare Bestand ≤ 30, gilt der Artikel auf den Marktplätzen als ausverkauft
(Chat 17.05.2026). Der Bestand ist damit die Grundlage für Ampel, Reichweite und das Erkennen
vergangener Ausverkäufe. Die Spalte „Bestand danach“ im Export ist allerdings kein laufender Saldo.
Saatgut hält vier Jahre; beim Kunden muss mindestens ein Jahr Restlaufzeit bleiben.

## Inhalt

- [Puffer](#puffer)
- [Bestandsbegriffe](#bestandsbegriffe)
- [Haltbarkeit (MHD)](#haltbarkeit-mhd)
- [Was v1 mit dem Bestand gemacht hat](#was-v1-mit-dem-bestand-gemacht-hat)

## Puffer

> „Wir haben bei unserer Eigenmarke zudem einen Puffer von 30 eingestellt. Bedeutet also, wenn
> verfügbarer Bestand <= 30, ist der Artikel auf den Marktplätzen Ausverkauft.“ – Daniel, 17.05.2026

Folgen:

- **Reichweite** wird bis zum Puffer gerechnet, nicht bis null.
- **Ausverkauf in der Vergangenheit:** Wochen mit verfügbarem Bestand ≤ 30 sind zensiert – der
  Absatz zeigt nicht die volle Nachfrage. In den Hauptsaisons 2023–2026 betrifft das 29 bis 50
  Artikel-Wochen pro Jahr (Datenscan 10.10.2026).
- Offen: Seit wann gilt der Puffer, und gilt er auch für den eigenen Shop
  ([Q-036](../open-questions/q-036-puffer-historie.md))?

## Bestandsbegriffe

| Begriff | Bedeutung | Quelle in den Daten |
|---|---|---|
| Physischer Bestand | Tüten im Lager | Summe aller Bewegungen (nicht verlässlich, siehe unten) |
| Verfügbarer Bestand | physisch minus Reservierungen für offene Aufträge | vermutlich „Bestand danach“ ([Befund](../data/befund-bestand-danach.md)) |
| Verkaufbarer Bestand | verfügbar minus Puffer 30 | abgeleitet |
| Zulauf | bestellt, noch nicht eingetroffen | neues ERP, offen ([Q-055](../open-questions/q-055-zulauf.md)) |

Der Datenscan zeigt: Bei 61 % der Versandbuchungen 2025 ändert sich „Bestand danach“ nicht, teils
steigt er ohne Wareneingang. Die Semantik muss geklärt werden
([Q-101](../open-questions/q-101-bestand-danach-semantik.md)). Ob es mehrere Lagerorte gibt, ist
offen ([Q-031](../open-questions/q-031-lagerorte.md)).

## Haltbarkeit (MHD)

| Größe | Wert | Quelle |
|---|---|---|
| MHD ab Produktion | 4 Jahre | v1 `Project.md` |
| Mindest-Restlaufzeit beim Kunden | 1 Jahr | v1 `Project.md` |
| Effektiv verkaufbar | 3 Jahre | abgeleitet |

Daniel zum MHD-Monitoring: „Viel bringt die Info nicht, weil ich die Sales nicht in dem Maße
profitabel beeinflussen kann. Ich brauche eher eine zuverlässigere Prognose für den Bedarf.“
(v1 `Project.md`). MHD ist deshalb nachrangig und wird über die Überbestandsgrenze (2,5 Jahre
Reichweite) angenähert. Gleichzeitig ist „palettenweise Zeug wegwerfen“ ein echtes Problem
(Chat 19.05.2026) – MHD bleibt also als Kostenfaktor relevant
([Zielkonflikt](zielkonflikt-ausverkauf-ueberbestand.md)).

## Was v1 mit dem Bestand gemacht hat

- Aktueller Bestand = „Bestand danach“ der letzten Buchung je Artikel (v1-Spec `table-link-navigation`).
- Kumulative Reichweite: Bestand wochenweise gegen die Prognose abbauen bis ≤ 0.
- Ampel: Rot < 13 Wochen, Gelb 13–25, Grün bis 100, Blau > 100 Wochen.
- Manuelle Bestandsbuchungen im Tool wurden entfernt; das ERP ist führend.

In v2 bleibt das ERP das Stammsystem für den Bestand; Flower-Demand speichert keinen eigenen
Bestand, nur abgeleitete Historien ([Zielarchitektur](../plan/zielarchitektur.md)).

## Offene Fragen

- [Q-031: Welche Lagerorte gibt es?](../open-questions/q-031-lagerorte.md)
- [Q-036: Seit wann gilt der Puffer von 30?](../open-questions/q-036-puffer-historie.md)
- [Q-053: Wie wird das MHD gepflegt?](../open-questions/q-053-mhd-chargen.md)
- [Q-101: Was bedeutet „Bestand danach“?](../open-questions/q-101-bestand-danach-semantik.md)
- [Q-104: Warum gibt es negativen Bestand?](../open-questions/q-104-negativer-bestand.md)

## Verwandte Seiten

- [Befund: Bestand danach ist kein Saldo](../data/befund-bestand-danach.md)
- [Nachfrage statt Absatz](../forecasting/nachfrage-vs-absatz.md)
- [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md)
- [Einkauf Eigenmarke](einkauf-eigenmarke.md)
- [Geschäftsmodell](index.md)
