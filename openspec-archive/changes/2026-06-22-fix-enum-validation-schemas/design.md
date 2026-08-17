## Context

Django Ninja / Pydantic v2 unterstützt `Literal[...]`-Typen nativ. Bei Eingabe eines ungültigen Werts gibt Ninja automatisch HTTP 422 zurück — kein manueller Check nötig. Im Frontend bietet Zod `z.enum([...])` die äquivalente Validierung.

## Goals / Non-Goals

**Goals:**
- Ungültige `visibility`/`role`/`status`-Werte werden auf Schema-Ebene abgewiesen (422)
- Backend und Frontend sind synchron

**Non-Goals:**
- Änderungen an den tatsächlichen Enum-Werten
- Validierung von anderen Feldern (z.B. `note`, `name`)

## Decisions

**D1 — `Literal` statt Enum-Klassen**
```python
# Statt str:
visibility: Literal["private", "group", "public"] | None = None
role: Literal["viewer", "editor", "admin"] = "viewer"
```
Kein neues Modell oder Enum-Objekt nötig — `Literal` reicht.

**D2 — Zod-Äquivalent**
```ts
visibility: z.enum(["private", "group", "public"]).nullable().optional()
role: z.enum(["viewer", "editor", "admin"]).default("viewer")
```

## Risks / Trade-offs

- Bestehende Daten mit ungültigen Werten in der DB werden nicht bereinigt (kein Migrationsrisiko)
- Falls ein Client bereits ungültige Strings sendet, bekommt er jetzt 422 statt silent success — gewolltes Breaking Change
