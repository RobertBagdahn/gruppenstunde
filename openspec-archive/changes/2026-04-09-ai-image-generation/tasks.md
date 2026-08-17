## 1. Wiederverwendbare Komponente erstellen

- [x] 1.1 `AiImageGenerateButton` Komponente erstellen — Props: `contentType`, `title`, `summary`, `contentId`, `onImageUploaded` Callback — Datei: `frontend/src/components/content/AiImageGenerateButton.tsx`
- [x] 1.2 Zauberstab-Icon (Wand/Sparkles) als schwebender Button über dem Bild-Bereich implementieren — Position: absolute, oben-rechts auf dem Hero-Bild
- [x] 1.3 Loading-State implementieren: Halbtransparentes Overlay über dem Bild mit Spinner und Text „Bild wird generiert... Das kann bis zu 4 Minuten dauern."
- [x] 1.4 Vorschau-State implementieren: Generiertes Bild als Overlay anzeigen mit „Übernehmen" (grün) und „Verwerfen" (grau) Buttons
- [x] 1.5 Übernehmen-Logik: Blob von URL fetchen, als FormData über die Content-Typ-spezifische Upload-API senden, Query-Cache invalidieren
- [x] 1.6 Fehler-Handling: Toast bei Generierungsfehler, Button-Re-Aktivierung
- [x] 1.7 Berechtigungsprüfung: Button nur rendern wenn `user.isStaff || content.authors.includes(user.id)`

## 2. Integration auf Detailseiten

- [x] 2.1 `RecipeDetailPage.tsx`: `AiImageGenerateButton` über dem Hero-Bild einbauen mit `contentType="recipe"` und `useUploadRecipeImage` Mutation
- [x] 2.2 `SessionDetailPage.tsx`: `AiImageGenerateButton` einbauen mit `contentType="session"` und passender Upload-Mutation
- [x] 2.3 `GameDetailPage.tsx`: `AiImageGenerateButton` einbauen mit `contentType="game"` und passender Upload-Mutation
- [x] 2.4 `BlogDetailPage.tsx`: `AiImageGenerateButton` einbauen mit `contentType="blog"` und passender Upload-Mutation

## 3. Testing

- [x] 3.1 Manuelle Tests: Button-Sichtbarkeit für Staff vs. normale User prüfen
- [x] 3.2 Manuelle Tests: Vollständiger Generierungs-Flow (Klick → Laden → Vorschau → Übernehmen → Bild aktualisiert)
- [x] 3.3 Manuelle Tests: Fehlerfall (Netzwerk-Fehler, Timeout) → Fehler-Toast und Button-Re-Aktivierung
