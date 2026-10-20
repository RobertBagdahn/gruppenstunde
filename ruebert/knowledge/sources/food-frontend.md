---
type: source
title: "Quelle: Food-Frontend"
description: "Das React/TypeScript-Frontend aus dem Projekt gruppenstunde als Vorlage für Layout, Design-System und Agent-Regeln von Flower-Demand."
tags: [quelle, frontend, vorlage, design-system]
status: historical
retrieved: 2026-10-10
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Quelle: Food-Frontend

## Kurzfassung

Robert hat vorgegeben, Layout und Best Practices des Food-Frontends zu übernehmen. Gemeint ist
`~/code/gruppenstunde/frontend-food` mit `AGENTS.md`, `Design.md`, Tailwind-Tokens und Komponenten,
dazu `backend/AGENTS.md` und die Root-`AGENTS.md` des Projekts. Gesichtet am 10.10.2026.

## Inhalt

- [Was daraus übernommen wurde](#was-daraus-übernommen-wurde)
- [Geltungsgrenze](#geltungsgrenze)

## Was daraus übernommen wurde

- Stack: React 18, TypeScript strict, Vite, Tailwind 3, shadcn/ui (Radix), TanStack Query, Zod,
  React Router 6, Recharts, react-hook-form, Zustand, Vitest, Playwright.
- Design-System „Frisch & offen“: HSL-Tokens, Status-Tokens mit `-soft/-border/-bright`, fünf
  Schriftgrößen, drei Radien, Plus Jakarta Sans + Inter, Lucide-Icons, Bereichsfarben nur als Tönung.
- Muster: `FoodLayout` mit Prefetch, `PageHeader`, `QuerySection`, `SectionBoundary`, `ErrorDisplay`,
  `notify`, `ConfirmDialog`, `CardTable`, `FilterParts`, `CollapsibleSection`, Styleguide-Seite,
  Design-Regeln als Tests und ESLint-Regeln.
- Regeln: Server-Zustand nur in TanStack Query, URL-Zustand für Filter, keine `any`, kein `console.log`,
  Rechte nur aus der API, Listenformat `{ items, total, page, page_size, total_pages }`.
- Gedächtnisdatei `Design.md` für Design-Entscheidungen und Fallen.

Verwendet in [Frontend](../plan/frontend.md), [Backend](../plan/backend.md) und
[Anforderungen Oberfläche](../requirements/fa-oberflaeche-und-analyse.md).

## Geltungsgrenze

- Das Food-Backend ist Django Ninja, nicht FastAPI; übernommen werden nur Konventionen.
- Food synchronisiert Zod-Schemas von Hand; Flower-Demand generiert sie aus OpenAPI (ADR-05).
- Fachliche Komponenten (Rezepte, Nutri-Score) sind nicht übertragbar.

## Offene Fragen

Keine offenen Fragen.

## Verwandte Seiten

- [Frontend](../plan/frontend.md)
- [Arbeitsentscheidungen](arbeitsentscheidungen.md)
- [Quelle: Knowledge-Scout](knowledge-scout.md)
- [Quellen](index.md)
