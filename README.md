<div align="center">

# 🪲 Inspi – Inspirator für Gruppenstunden

**Finde, teile und bewerte Ideen für Pfadfinder-Gruppenstunden.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.13+](https://img.shields.io/badge/Python-3.13+-blue.svg)](https://www.python.org/downloads/)
[![Django 5.x](https://img.shields.io/badge/Django-5.x-green.svg)](https://www.djangoproject.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Live-Demo](https://gruppenstunde.de/) · [Fehler melden](https://github.com/RobertBagdahn/gruppenstunde/issues/new?template=bug_report.md) · [Feature vorschlagen](https://github.com/RobertBagdahn/gruppenstunde/issues/new?template=feature_request.md)

</div>

---

## Was ist Inspi?

**Inspi** steht für **Inspirator** – ein Glühwürmchen, das Pfadfinder-Gruppenleiter\*innen inspiriert, großartige Gruppenstunden zu gestalten.

Die Plattform bietet:

- 🔍 **Suche & Entdecke** – Volltextsuche, Tag-Filter, KI-basierte ähnliche Ideen
- ✍️ **Teile deine Ideen** – Einfaches Formular oder ausführlich mit KI-Unterstützung
- 🤖 **KI-Assistent** – Texte verbessern, Tags vorschlagen, Freitext in strukturierte Ideen verwandeln
- 📅 **Quartalskalender** – Plane kommende Gruppenstunden kollaborativ
- 📱 **Mobile-First** – Optimiert für Smartphones, funktioniert überall
- ⚡ **Schnell** – Lighthouse Performance Score > 90

## Tech Stack

<table>
<tr>
<td valign="top" width="50%">

### Backend
- **Django 5.x** + **Django Ninja** (REST API)
- **PostgreSQL 15** + **pgvector** (Vektor-Suche)
- **Pydantic** (Schema-Validierung)
- **Google Vertex AI** (Gemini – KI-Features)
- **Python 3.13+**, **uv** (Package Manager)

</td>
<td valign="top" width="50%">

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **shadcn/ui** (Radix + Tailwind CSS)
- **TanStack Query** (Data Fetching)
- **Zustand** (State Management)
- **Zod** (Schema-Validierung)

</td>
</tr>
<tr>
<td valign="top" width="50%">

### Infrastructure
- **Google Cloud Platform** (Cloud Run)
- **Terraform** (IaC)
- **Podman** / Docker (lokale Entwicklung)

</td>
<td valign="top" width="50%">

### Code-Qualität
- **Ruff** (Linting + Formatting)
- **Mypy** (Type Checking)
- **Pytest** (Testing)
- **ESLint** + **TypeScript strict**

</td>
</tr>
</table>
## Schnellstart

### Voraussetzungen

- [Python 3.13+](https://www.python.org/downloads/)
- [uv](https://docs.astral.sh/uv/) (Python Package Manager)
- [Node.js 20+](https://nodejs.org/)
- [Podman](https://podman.io/) oder Docker (für PostgreSQL)

### Installation

```bash
# Repo klonen
git clone https://github.com/RobertBagdahn/gruppenstunde.git
cd gruppenstunde

# Alles installieren (Backend + Frontend)
make install

# Datenbank starten
make db

# Migrationen ausführen & Admin-User erstellen
make migrate
make createsuperuser

# Backend + Frontend gleichzeitig starten
make dev
```

| Service       | URL                              |
|---------------|----------------------------------|
| Frontend      | http://localhost:5173             |
| Backend API   | http://localhost:8000             |
| API Docs      | http://localhost:8000/api/docs    |
| Django Admin  | http://localhost:8000/admin/      |

> **Tipp:** `make help` zeigt alle verfügbaren Befehle an.

## Projektstruktur

```
gruppenstunde/
├── backend/              # Django + Django Ninja API
│   ├── idea/             # Ideen (Kern-App)
│   ├── planner/          # Quartalskalender
│   ├── profiles/         # Benutzerprofile
│   ├── core/             # Shared Utilities
│   └── inspi/            # Django-Konfiguration
├── frontend/             # React SPA
│   └── src/
│       ├── components/   # UI-Komponenten (shadcn/ui)
│       ├── pages/        # Seiten
│       ├── api/          # TanStack Query Hooks
│       ├── schemas/      # Zod Schemas
│       └── store/        # Zustand Stores
├── terraform/            # GCP Infrastruktur (IaC)
├── docker-compose.yml    # Lokale PostgreSQL + pgvector
├── Makefile              # Entwicklungsbefehle
└── Dockerfile.backend    # Container-Build
```

## Features

- 🔍 **Hybrid-Suche** – Volltext + Vektor-Ähnlichkeit + Tag-Filter (pgvector)
- 🏷️ **Tags & Kategorien** – Hierarchische Tags mit Icons
- 📝 **Drei Idee-Typen** – Klassische Idee, Wissensbeitrag, Rezept
- 🤖 **KI-Assistent** – Text verbessern, Tags vorschlagen, Freitext → strukturierte Idee (Vertex AI / Gemini)
- ❤️ **Feedback** – Emoji-Reaktionen ohne Login
- 💬 **Kommentare** – Moderierte Kommentare
- 📅 **Quartalskalender** – Kollaborativer Gruppenplaner
- 📸 **Instagram-Export** – 3 quadratische Bilder (1080×1080) für Social Media
- 📄 **PDF-Export** – Druckversion von Ideen

## Entwicklung

### Häufige Befehle

```bash
make dev              # Backend + Frontend starten
make test             # Alle Tests ausführen
make lint             # Linter (Ruff) ausführen
make format           # Code formatieren
make typecheck        # Type Checking (Mypy)
make check            # Lint + Types + Tests (schnell)
make reset-db         # Datenbank zurücksetzen
```

### Frontend-Befehle

```bash
make frontend-build       # Produktions-Build
make frontend-lint        # ESLint
make frontend-typecheck   # TypeScript prüfen
```

### Architektur-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| Django Ninja statt DRF | Schneller, type-safe, automatische API-Docs |
| Pydantic ↔ Zod | Schema-Sync zwischen Backend und Frontend |
| pgvector | Vektor-Suche direkt in PostgreSQL, kein extra Service |
| Session-Auth statt JWT | Einfacher, sicherer für Web-Apps mit Same-Origin |
| uv statt pip | Schnelleres Dependency Management |

## Deployment

Die Infrastruktur läuft auf **Google Cloud Platform** und wird mit Terraform verwaltet:

```bash
make tf-init ENV=prod     # Terraform initialisieren
make tf-plan ENV=prod     # Änderungen planen
make tf-apply ENV=prod    # Änderungen anwenden
```

Für Container-Deployment:

```bash
make deploy               # Alles deployen (DB + Backend + Frontend)
```

## Mitmachen

Beiträge sind herzlich willkommen! Lies die [Contributing Guidelines](CONTRIBUTING.md) für Details.

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/mein-feature`)
3. Committe deine Änderungen (`git commit -m 'feat: mein neues feature'`)
4. Pushe den Branch (`git push origin feature/mein-feature`)
5. Öffne einen Pull Request

## Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert – siehe die Datei für Details.

---

<div align="center">

Gebaut mit ❤️ für die Pfadfinder-Community

[gruppenstunde.de](https://gruppenstunde.de/)

</div>