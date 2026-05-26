## Why

The registration PDF generator (`documents/pdf_builder.py`) produces form field underlines that overflow past the right page margin, and the Stammes-Logo in the header is too small. The underlines use hardcoded character-count divisors (2.5, 2.8, 3.0) that don't match the actual glyph width of `_` in Times-Roman, causing lines to extend beyond the printable area. The logo at 25mm height is barely visible next to the title.

## What Changes

- **Fix underline width calculation**: Replace hardcoded divisors with `pdfmetrics.stringWidth`-based measurement so underlines fit exactly within the available line width
- **Account for label text width**: For `text_line` fields, subtract the label text width so the underline fills only the remaining space on the line
- **Increase logo size**: Increase the logo height from 25mm to ~35-40mm for better visibility
- **Make logo size configurable**: Add `logo_height` to `LayoutParams` so it can be tuned per document

## Capabilities

### New Capabilities

_None — this is a bugfix/improvement to existing PDF generation._

### Modified Capabilities

- `registration-pdf`: Fix underline overflow and increase default logo size

## Impact

- **Affected code**: `backend/documents/pdf_builder.py` — functions `build_form_fields_block`, `build_signature_block`, `build_header_block`, and helper `_draw_line`
- **Affected apps**: `documents` (backend only)
- **No schema changes**: No Pydantic or Zod schema changes needed
- **No migrations**: No database changes
- **No API changes**: PDF generation is CLI-driven via `generate.py`
