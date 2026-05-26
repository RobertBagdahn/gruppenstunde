## Context

The registration PDF generator (`backend/documents/pdf_builder.py`) uses reportlab Platypus to create A4 registration forms for scout events. Form field underlines are built by repeating `_` characters with hardcoded divisors (2.5, 2.8, 3.0) to estimate character count. These divisors don't match the actual glyph width of `_` in Times-Roman at the configured font size, causing lines to overflow past the right margin. The header logo is fixed at 25mm height, which is too small.

**Affected files:**
- `backend/documents/pdf_builder.py` — all line-drawing and header logic

No API, database, or frontend changes needed.

## Goals / Non-Goals

**Goals:**
- Underlines in form fields MUST NOT exceed the available page width
- For labeled fields (`text_line`), the underline fills only the remaining space after the label
- Logo size is larger by default and configurable via `LayoutParams`
- The fix uses reportlab's font metrics for accurate width calculation

**Non-Goals:**
- Changing the visual style of underlines (e.g., using actual drawn lines instead of `_` characters)
- Modifying the YAML schema or Pydantic config models
- Changing the invitation PDF or export PDF generators

## Decisions

### 1. Use `pdfmetrics.stringWidth` for accurate character measurement

**Decision**: Replace hardcoded divisors with `reportlab.pdfbase.pdfmetrics.stringWidth("_", font_name, font_size)` to calculate exact underline character counts.

**Why**: The current approach uses magic numbers (2.5, 2.8, 3.0) that approximate the width of `_` in points. The actual width varies by font and size. `stringWidth` returns the exact typographic width, eliminating overflow.

**Alternative considered**: Using reportlab's `Drawing` or `HRFlowable` for actual graphical lines. Rejected because it would change the visual appearance and require more refactoring.

### 2. Refactor `_draw_line` into a `_underline` helper

**Decision**: Replace the existing `_draw_line` function with a `_underline(target_width, font_name, font_size)` helper that uses `stringWidth` internally and returns a string of `_` characters that fits within `target_width` points.

**Why**: Centralizes the width calculation. All call sites (`text_line`, `checkboxes`, `text_area`, `signature`) use the same correct logic.

### 3. Subtract label width for `text_line` fields

**Decision**: For `text_line` fields, measure the label text width with `stringWidth` and subtract it from the available width before generating the underline.

**Why**: Currently `f"{field.label}: {'_' * n}"` where `n` is based on full page width. The label text takes space, so the underline should only fill the remainder.

### 4. Increase default logo height to 35mm, make configurable

**Decision**: Add `logo_height: float = 35.0` to `LayoutParams`. Use it in `build_header_block` instead of the hardcoded `25 * mm`.

**Why**: 25mm is too small per user feedback. 35mm provides better visibility while leaving enough space for the title. Making it configurable allows per-document tuning via the page optimizer.

## Risks / Trade-offs

- **[Risk] Larger logo reduces title space** → Title column width adjusts automatically via the existing table layout. For very wide logos, the title may wrap more. Acceptable since logo aspect ratios are typically close to 1:1.
- **[Risk] Underline length changes may affect page optimizer** → The optimizer does trial builds, so it will automatically adapt to the new (shorter) line widths. No risk of breaking pagination.
