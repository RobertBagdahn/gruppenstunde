## Why

Der "Zurück"-Button wird auf 15+ Detail-Seiten inkonsistent implementiert: unterschiedliche Icons (Material Symbols vs. Lucide), verschiedene HTML-Elemente (button vs. Link), unterschiedliche Labels ("Zurück", "Zurück zur Übersicht", "Zurück zur Benutzerliste") und verschiedene Platzierungen (über dem Titel vs. neben dem Titel). Das erschwert Wartung und bietet eine uneinheitliche UX.

## What Changes

- Neue shared Komponente `<BackButton />` in beiden Frontends (`frontend/`, `frontend-food/`)
- Einheitliches Design: Lucide `ChevronLeft` Icon, Label immer "Zurück", Breadcrumb-artige Platzierung (gleiche Zeile wie Titel auf Desktop)
- Alle bestehenden Zurück-Buttons auf allen Detail-Seiten werden durch `<BackButton />` ersetzt
- Layout-Anpassung der Page-Header: Button und Titel nebeneinander statt übereinander

## Capabilities

### New Capabilities
- `back-button-component`: Einheitliche, wiederverwendbare BackButton-Komponente mit konsistentem Styling und Verhalten (Link oder navigate(-1) Fallback)

### Modified Capabilities

## Impact

- **Frontend Pages (frontend/)**: AdminUserDetailPage, GroupDetailPage, GroupCorporateIdentityPage, NewEventPage, PackingListDetailPage, QRCodePage, PrivacyPage, RecipeDetailPage, RecipeCookingMode, ShoppingListDetailPage, MealEventDetailPage, IngredientDetailPage, MaterialDetailPage, ApprovalQueuePage, EmbeddingFeedbackPage, EmbeddingViewerPage, ContentStepper
- **Frontend Pages (frontend-food/)**: MealEventDetailPage, RecipeDetailPage, RecipeCookingMode, ShoppingListDetailPage, ContentStepper
- **Keine Backend-Änderungen**: Rein Frontend-Refactoring
- **Keine Schema-Änderungen**: Keine Pydantic/Zod-Anpassungen nötig
- **Keine Migrations nötig**
