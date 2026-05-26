## 1. Underline Helper Refactor

- [x] 1.1 Add `from reportlab.pdfbase.pdfmetrics import stringWidth` import to `pdf_builder.py`
- [x] 1.2 Replace `_draw_line` with `_underline(target_width: float, font_name: str, font_size: float) -> str` that uses `stringWidth` to calculate exact character count
- [x] 1.3 Add `logo_height: float = 35.0` field to `LayoutParams` dataclass

## 2. Fix Form Field Underlines

- [x] 2.1 Update `build_form_fields_block` `text_line` (no partner): subtract label width from available width, use `_underline`
- [x] 2.2 Update `build_form_fields_block` `text_line` with `same_line_with`: use `_underline` with column-appropriate widths
- [x] 2.3 Update `build_form_fields_block` `checkboxes`: use `_underline` with page width
- [x] 2.4 Update `build_form_fields_block` `text_area`: use `_underline` with page width

## 3. Fix Signature and Logo

- [x] 3.1 Update `build_signature_block` to use `_underline` with page width
- [x] 3.2 Update `build_header_block` to use `params.logo_height` instead of hardcoded `25 * mm`

## 4. Verify

- [x] 4.1 Regenerate the sippentippel PDF and visually verify lines don't overflow and logo is larger
