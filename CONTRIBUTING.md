# Mitmachen bei Inspi

Vielen Dank für dein Interesse an Inspi! 🪲 Jeder Beitrag hilft, die Plattform für Pfadfinder-Gruppenleiter\*innen besser zu machen.

## Wie kann ich beitragen?

### Fehler melden

1. Prüfe ob der Fehler bereits in den [Issues](https://github.com/RobertBagdahn/gruppenstunde/issues) gemeldet wurde
2. Erstelle ein neues Issue mit dem **Bug Report** Template
3. Beschreibe den Fehler so genau wie möglich (Schritte zum Reproduzieren, erwartetes vs. tatsächliches Verhalten)

### Feature vorschlagen

1. Prüfe ob das Feature bereits vorgeschlagen wurde
2. Erstelle ein neues Issue mit dem **Feature Request** Template
3. Beschreibe den Anwendungsfall und warum das Feature hilfreich wäre

### Code beitragen

1. **Fork** das Repository
2. **Clone** deinen Fork lokal
3. Erstelle einen **Feature-Branch**: `git checkout -b feature/mein-feature`
4. Nimm deine Änderungen vor
5. **Committe** mit einer aussagekräftigen Nachricht (siehe Commit-Konventionen unten)
6. **Pushe** deinen Branch: `git push origin feature/mein-feature`
7. Öffne einen **Pull Request** gegen `main`

## Entwicklungsumgebung einrichten

```bash
# Repo klonen (deinen Fork)
git clone https://github.com/<dein-username>/gruppenstunde.git
cd gruppenstunde

# Abhängigkeiten installieren
make install

# Datenbank starten
make db

# Migrationen & Admin-User
make migrate
make createsuperuser

# Entwicklungsserver starten
make dev
```

Siehe [README.md](README.md) für Details.

## Coding-Richtlinien

### Allgemein

- **Code**: Englisch (Variablen, Funktionen, Kommentare)
- **UI-Texte**: Deutsch
- **Commit Messages**: Englisch
- **URLs**: Immer Englisch

### Backend (Python/Django)

- Code wird mit **Ruff** formatiert und gelintet
- Type Hints verwenden
- Tests mit **Pytest** schreiben
- `uv run` zum Ausführen von Python-Befehlen verwenden

```bash
make lint         # Linter prüfen
make format       # Code formatieren
make test         # Tests ausführen
make typecheck    # Type Checking
```

### Frontend (TypeScript/React)

- **TypeScript strict** – kein `any`
- **shadcn/ui** Komponenten verwenden
- **Zod** Schemas müssen mit Backend Pydantic Schemas synchron sein
- Mobile-First Design

```bash
make frontend-lint        # ESLint
make frontend-typecheck   # TypeScript prüfen
```

## Commit-Konventionen

Wir verwenden [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: neue Suchfilter-Komponente
fix: Pagination bei leerer Ergebnisliste
docs: README aktualisiert
refactor: Idee-Service aufgeräumt
test: Tests für Tag-API
chore: Dependencies aktualisiert
```

## Pull Request Prozess

1. Stelle sicher, dass alle Checks bestehen (`make check`)
2. Aktualisiere die Dokumentation falls nötig
3. Beschreibe deine Änderungen im PR
4. Ein Maintainer wird deinen PR reviewen

## Verhaltenskodex

Bitte halte dich an unseren [Code of Conduct](CODE_OF_CONDUCT.md). Wir wollen eine einladende und respektvolle Community sein.

## Fragen?

Erstelle ein [Issue](https://github.com/RobertBagdahn/gruppenstunde/issues) mit dem Label `question` oder starte eine [Discussion](https://github.com/RobertBagdahn/gruppenstunde/discussions).

---

Nochmals danke fürs Mitmachen! 🎉
