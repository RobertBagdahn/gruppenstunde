# Superseded

This change (`enrich-vector-embeddings`) was superseded by `ingredient-embedding-simplification` (2026-07-09).

**Reason:** The approach shifted from using Cloud SQL's native `google_ml_integration.embedding()` SQL function + PCA dimension reduction to direct Vertex AI `gemini-embedding-001` with native `output_dimensionality` support. The new approach is simpler, faster, and doesn't require `google_ml_integration` extension.

All 38 tasks remain unchecked — the entire scope was replaced by the newer change.
