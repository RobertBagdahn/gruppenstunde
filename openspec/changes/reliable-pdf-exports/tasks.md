## 1. Container and Cloud Run reliability

- [x] 1.1 Explicitly install WeasyPrint's runtime libraries and run a build-time render smoke test.
- [x] 1.2 Bound backend instance concurrency, reduce Gunicorn worker memory, and raise the Cloud Run memory limit to 1 GiB.

## 2. PDF rendering improvements

- [x] 2.1 Add a shared WeasyPrint helper with base URL, output optimization, and logged German errors.
- [x] 2.2 Use it in meal-plan, cooking-schedule, and recipe PDF services.
- [x] 2.3 Downsample/compress recipe images before embedding them.
- [x] 2.4 Apply page format reliably in the meal-plan PDF.
- [x] 2.5 Skip excluded meal-plan calculations and release raw prefetched objects before rendering.

## 3. Verification

- [x] 3.1 Add tests for renderer error handling, recipe image bounds, and meal-plan page format.
- [x] 3.2 Run focused PDF tests and backend checks. Docker is unavailable locally; the image build now performs the render smoke test in CI.
