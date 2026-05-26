## 1. Project Setup

- [x] 1.1 Create directory structure: `backend/documents/`, `defaults/`, `assets/logos/`, `templates/`, `output/`
- [x] 1.2 Add `pyyaml` dependency to `backend/pyproject.toml`
- [x] 1.3 Create placeholder logo PNG in `assets/logos/`

## 2. Pydantic Schema & YAML Validation

- [x] 2.1 Create `backend/documents/schema.py` with Pydantic models: `EventConfig`, `GroupConfig`, `ParticipantsConfig`, `TextsConfig`, `LayoutConfig`, `FormFieldConfig`, `RegistrationConfig` (root model)
- [x] 2.2 Implement YAML loading and validation with clear German error messages for missing/invalid fields
- [x] 2.3 Implement preset key resolution (detect string key vs inline list for `packlist` and `form_fields`)

## 3. Default Presets

- [x] 3.1 Create `defaults/text_blocks.yaml` with greeting templates (sippentippel, lager, hajk, default), additional_info templates (zelt_wanderung, festes_haus, default), and consent default text
- [x] 3.2 Create `defaults/packlists.yaml` with presets: wanderung, lager_haus, minimal
- [x] 3.3 Create `defaults/form_fields.yaml` with presets: standard, extended

## 4. Text Resolver

- [x] 4.1 Create `backend/documents/text_resolver.py` with `resolve_text(key, value, event_data, defaults)` function
- [x] 4.2 Implement template variable substitution (`{event.name}`, `{participants.type}`, `{event.location}`, etc.)
- [x] 4.3 Implement date/time string generation (German weekdays, DD.MM.YYYY format, "um HH:MM Uhr am ...")
- [x] 4.4 Implement detail row generation from structured event data (Wann, Treffpunkt, Rückkehr, Ort, Beitrag, Anmeldefrist)

## 5. AI Text Generation

- [x] 5.1 Implement AI text generation in `text_resolver.py` using `google-genai` SDK (ADC auth, no API keys)
- [x] 5.2 Build prompt templates for each text block type (greeting, additional_info) including event data and optional theme
- [x] 5.3 Handle AI errors gracefully (network failure, empty response) with clear error message

## 6. PDF Builder

- [x] 6.1 Create `backend/documents/pdf_builder.py` with reportlab Platypus-based layout engine
- [x] 6.2 Implement header block (title + subtitle centered, logo top-right scaled proportionally)
- [x] 6.3 Implement greeting block (paragraph text)
- [x] 6.4 Implement details block (key-value list with aligned labels)
- [x] 6.5 Implement additional info block (paragraph text + bold "Packliste:" inline list)
- [x] 6.6 Implement signup note block (italic text)
- [x] 6.7 Implement form fields: `text_line` (label + line), `same_line_with` (two fields side-by-side), `checkboxes` ([ ] options with optional other), `text_area` (label + N lines)
- [x] 6.8 Implement consent block (small font legal text)
- [x] 6.9 Implement signature block (line + label)
- [x] 6.10 Wrap each block in `KeepTogether` to prevent page-break splitting

## 7. Page Optimizer

- [x] 7.1 Create `backend/documents/page_optimizer.py` with parameter dataclass (paragraph_spacing, block_spacing, leading, body_font_size, header_font_size, margins) and min/max bounds
- [x] 7.2 Implement height measurement using `flowable.wrap()` to calculate total content height without writing PDF
- [x] 7.3 Implement compression loop (reduce parameters in priority order until target pages reached)
- [x] 7.4 Implement expansion loop (increase parameters in reverse priority order for multi-page targets)
- [x] 7.5 Implement error exit when content cannot fit, with message showing minimum pages needed
- [x] 7.6 Implement optimizer logging: print adjusted parameters with before/after values

## 8. CLI Entry Point

- [x] 8.1 Create `backend/documents/generate.py` with argparse: positional `yaml_path`, optional `--output`
- [x] 8.2 Wire pipeline: load YAML → validate → resolve texts → build PDF → optimize → write file
- [x] 8.3 Implement file existence checks (YAML file, logo file) with German error messages
- [x] 8.4 Default output path: `output/<yaml_filename>.pdf`

## 9. Example Template & README

- [x] 9.1 Create `templates/sippentippel_2026.yaml` example event (matching the reference image)
- [x] 9.2 Create `backend/documents/README.md` with usage instructions, YAML schema reference, preset keys, and example invocation
- [x] 9.3 Generate test PDF from example template and verify against reference image layout

## 10. Testing

- [x] 10.1 Test YAML validation: valid minimal, valid full, missing required fields, unknown preset keys
- [x] 10.2 Test text resolver: preset lookup, variable substitution, explicit override, unknown key error
- [x] 10.3 Test date/time formatting: German weekdays, date range, time formatting
- [x] 10.4 Test page optimizer: content fits default, compression needed, expansion needed, impossible fit error
- [x] 10.5 Test CLI: basic invocation, custom output path, missing file error
