"""PDF generation using reportlab Platypus layout engine."""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib import colors
from reportlab.pdfbase.pdfmetrics import stringWidth

from schema import FormFieldConfig, RegistrationConfig


@dataclass
class LayoutParams:
    """Tunable layout parameters for the page optimizer."""

    body_font_size: float = 11.0
    header_font_size: float = 18.0
    subtitle_font_size: float = 14.0
    leading_factor: float = 1.3  # leading = font_size * factor
    paragraph_spacing: float = 6.0  # mm
    block_spacing: float = 8.0  # mm
    margin_top: float = 20.0  # mm
    margin_bottom: float = 20.0  # mm
    margin_left: float = 20.0  # mm
    margin_right: float = 20.0  # mm
    consent_font_size: float = 8.5
    detail_label_width: float = 30.0  # mm
    logo_height: float = 35.0  # mm

    @property
    def leading(self) -> float:
        return self.body_font_size * self.leading_factor

    @property
    def header_leading(self) -> float:
        return self.header_font_size * 1.2


def _build_styles(params: LayoutParams) -> dict[str, ParagraphStyle]:
    """Create paragraph styles from layout parameters."""
    return {
        "title": ParagraphStyle(
            "title",
            fontName="Times-Roman",
            fontSize=params.header_font_size,
            leading=params.header_leading,
            alignment=TA_CENTER,
            spaceAfter=2 * mm,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName="Times-Roman",
            fontSize=params.subtitle_font_size,
            leading=params.subtitle_font_size * 1.2,
            alignment=TA_CENTER,
            spaceAfter=params.block_spacing * mm,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Times-Roman",
            fontSize=params.body_font_size,
            leading=params.leading,
            alignment=TA_LEFT,
            spaceAfter=params.paragraph_spacing * mm,
        ),
        "body_justified": ParagraphStyle(
            "body_justified",
            fontName="Times-Roman",
            fontSize=params.body_font_size,
            leading=params.leading,
            alignment=TA_JUSTIFY,
            spaceAfter=params.paragraph_spacing * mm,
        ),
        "italic": ParagraphStyle(
            "italic",
            fontName="Times-Italic",
            fontSize=params.body_font_size,
            leading=params.leading,
            alignment=TA_LEFT,
            spaceAfter=params.paragraph_spacing * mm,
        ),
        "consent": ParagraphStyle(
            "consent",
            fontName="Times-Roman",
            fontSize=params.consent_font_size,
            leading=params.consent_font_size * 1.3,
            alignment=TA_JUSTIFY,
            spaceAfter=params.paragraph_spacing * mm,
        ),
        "detail_label": ParagraphStyle(
            "detail_label",
            fontName="Times-Roman",
            fontSize=params.body_font_size,
            leading=params.leading,
            bulletIndent=15,
        ),
        "detail_value": ParagraphStyle(
            "detail_value",
            fontName="Times-Roman",
            fontSize=params.body_font_size,
            leading=params.leading,
        ),
        "form_label": ParagraphStyle(
            "form_label",
            fontName="Times-Roman",
            fontSize=params.body_font_size,
            leading=params.leading,
            spaceAfter=2 * mm,
        ),
        "signature_label": ParagraphStyle(
            "signature_label",
            fontName="Times-Roman",
            fontSize=params.body_font_size - 1,
            leading=params.leading,
        ),
    }


def build_header_block(
    config: RegistrationConfig,
    subtitle: str,
    logo_path: Path,
    params: LayoutParams,
) -> list:
    """Build header with title centered and logo top-right."""
    styles = _build_styles(params)
    elements = []

    title_text = f"Anmeldung<br/>{config.event.name} in {config.event.location}"
    title_para = Paragraph(title_text, styles["title"])
    subtitle_para = Paragraph(subtitle, styles["subtitle"])

    # Logo scaled proportionally
    if logo_path.exists():
        logo = Image(str(logo_path))
        logo_height = params.logo_height * mm
        aspect = logo.imageWidth / logo.imageHeight
        logo_width = logo_height * aspect
        logo.drawWidth = logo_width
        logo.drawHeight = logo_height

        page_width = A4[0] - (params.margin_left + params.margin_right) * mm
        title_width = page_width - logo_width - 5 * mm

        header_table = Table(
            [[title_para, logo]],
            colWidths=[title_width, logo_width + 5 * mm],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (0, 0), (0, 0), "CENTER"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ]))
        elements.append(header_table)
    else:
        elements.append(title_para)

    elements.append(subtitle_para)
    return [KeepTogether(elements)]


def build_greeting_block(text: str, params: LayoutParams) -> list:
    """Build greeting paragraph block."""
    styles = _build_styles(params)
    lines = text.strip().split("\n")
    paras = [Paragraph(line, styles["body"]) for line in lines if line.strip()]
    return [KeepTogether(paras + [Spacer(1, params.block_spacing * mm)])]


def build_details_block(
    details: list[tuple[str, str]],
    params: LayoutParams,
) -> list:
    """Build key-value detail rows with bullet points."""
    styles = _build_styles(params)
    elements = []

    for label, value in details:
        bullet_text = f"<bullet>&bull;</bullet> <b>{label}:</b>&nbsp;&nbsp;&nbsp;{value}"
        p = Paragraph(bullet_text, styles["detail_label"])
        elements.append(p)

    elements.append(Spacer(1, params.block_spacing * mm))
    return [KeepTogether(elements)]


def build_additional_info_block(
    text: str,
    packlist: list[str],
    packlist_note: str,
    params: LayoutParams,
) -> list:
    """Build additional info with packlist."""
    styles = _build_styles(params)
    elements = []

    # Main info text
    for line in text.strip().split("\n"):
        if line.strip():
            elements.append(Paragraph(line.strip(), styles["body_justified"]))

    # Packlist as inline
    if packlist:
        packlist_str = ", ".join(packlist)
        pack_text = f"<b>Packliste:</b> {packlist_str}."
        if packlist_note:
            pack_text += f" {packlist_note}"
        elements.append(Paragraph(pack_text, styles["body"]))

    elements.append(Spacer(1, params.block_spacing * mm))
    return [KeepTogether(elements)]


def build_signup_note_block(text: str, params: LayoutParams) -> list:
    """Build italic signup note."""
    if not text:
        return []
    styles = _build_styles(params)
    return [KeepTogether([
        Paragraph(text, styles["italic"]),
        Spacer(1, params.paragraph_spacing * mm),
    ])]


def _underline(target_width: float, font_name: str, font_size: float) -> str:
    """Return a string of '_' characters that fits within target_width points."""
    char_width = stringWidth("_", font_name, font_size)
    if char_width <= 0:
        return ""
    n = int(target_width / char_width)
    return "_" * n


def build_form_fields_block(
    fields: list[FormFieldConfig],
    params: LayoutParams,
) -> list:
    """Build form field section."""
    styles = _build_styles(params)
    elements = []
    page_width = A4[0] - (params.margin_left + params.margin_right) * mm

    font_name = "Times-Roman"
    font_size = params.body_font_size

    for field in fields:
        if field.type == "text_line":
            if field.same_line_with:
                # Two fields side by side
                half = page_width / 2 - 5 * mm
                label_w = stringWidth(f"{field.label}: ", font_name, font_size)
                left_line = _underline(half - label_w, font_name, font_size)
                left = Paragraph(f"{field.label}: {left_line}", styles["form_label"])
                label2_w = stringWidth(f"{field.same_line_with}: ", font_name, font_size)
                right_line = _underline(half - label2_w, font_name, font_size)
                right = Paragraph(f"{field.same_line_with}: {right_line}", styles["form_label"])
                t = Table([[left, right]], colWidths=[half, half])
                t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM")]))
                elements.append(t)
            else:
                label_text = f"{field.label}: "
                label_w = stringWidth(label_text, font_name, font_size)
                line = _underline(page_width - label_w, font_name, font_size)
                elements.append(Paragraph(f"{label_text}{line}", styles["form_label"]))

        elif field.type == "checkboxes":
            parts = []
            if field.options:
                for opt in field.options:
                    parts.append(f"[ ] {opt}")
            if field.has_other:
                parts.append(f"[ ] {field.other_label}:")
            checkbox_line = f"{field.label}:<br/>{';&nbsp;&nbsp;'.join(parts)}"
            elements.append(Paragraph(checkbox_line, styles["form_label"]))
            line = _underline(page_width, font_name, font_size)
            elements.append(Paragraph(line, styles["form_label"]))

        elif field.type == "text_area":
            elements.append(Paragraph(f"{field.label}:", styles["form_label"]))
            for _ in range(field.lines):
                elements.append(Spacer(1, 6 * mm))
                line = _underline(page_width, font_name, font_size)
                elements.append(Paragraph(line, styles["form_label"]))

        elements.append(Spacer(1, params.paragraph_spacing * mm))

    return [KeepTogether(elements)]


def build_consent_block(text: str, params: LayoutParams) -> list:
    """Build consent/legal text block in small font."""
    styles = _build_styles(params)
    elements = []
    elements.append(Spacer(1, params.block_spacing * mm))
    for line in text.strip().split("\n"):
        if line.strip():
            elements.append(Paragraph(line.strip(), styles["consent"]))
    return [KeepTogether(elements)]


def build_signature_block(params: LayoutParams) -> list:
    """Build signature line with label."""
    styles = _build_styles(params)
    page_width = A4[0] - (params.margin_left + params.margin_right) * mm
    line = _underline(page_width, "Times-Roman", params.body_font_size)
    elements = [
        Spacer(1, params.block_spacing * mm),
        Paragraph(line, styles["form_label"]),
        Paragraph(
            "Datum, Unterschrift (eines/einer Erziehungsberechtigten)",
            styles["signature_label"],
        ),
    ]
    return [KeepTogether(elements)]


def build_all_flowables(
    config: RegistrationConfig,
    resolved_texts: dict[str, str],
    details: list[tuple[str, str]],
    packlist: list[str],
    form_fields: list[FormFieldConfig],
    logo_path: Path,
    params: LayoutParams,
    target_pages: int = 1,
) -> list:
    """Build all document flowables in order.

    Returns a flat list of flowables (each major block wrapped in KeepTogether).
    """
    subtitle = resolved_texts.get("subtitle", "")
    greeting = resolved_texts.get("greeting", "")
    additional_info = resolved_texts.get("additional_info", "")
    signup_note = resolved_texts.get("signup_note", "")
    consent = resolved_texts.get("consent", "")
    packlist_note = resolved_texts.get("packlist_note", "Alles zusammen in einem Rucksack.")

    # Info blocks (page 1 for 2-page layouts)
    info_blocks = []
    info_blocks.extend(build_header_block(config, subtitle, logo_path, params))
    info_blocks.extend(build_greeting_block(greeting, params))
    info_blocks.extend(build_details_block(details, params))
    info_blocks.extend(build_additional_info_block(additional_info, packlist, packlist_note, params))

    # Form blocks (page 2 for 2-page layouts)
    form_blocks = []
    form_blocks.extend(build_signup_note_block(signup_note, params))
    form_blocks.extend(build_form_fields_block(form_fields, params))
    form_blocks.extend(build_consent_block(consent, params))
    form_blocks.extend(build_signature_block(params))

    if target_pages >= 2:
        return info_blocks + [PageBreak()] + form_blocks
    else:
        return info_blocks + form_blocks


def generate_pdf(
    flowables: list,
    output_path: Path,
    params: LayoutParams,
) -> int:
    """Generate PDF from flowables. Returns number of pages."""
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        topMargin=params.margin_top * mm,
        bottomMargin=params.margin_bottom * mm,
        leftMargin=params.margin_left * mm,
        rightMargin=params.margin_right * mm,
    )
    doc.build(flowables)
    return doc.page


def measure_content_height(
    flowables: list,
    params: LayoutParams,
) -> float:
    """Measure total content height by doing a trial PDF build.

    Returns total height in points (estimated from page count).
    """
    from io import BytesIO
    import copy

    buf = BytesIO()
    # Deep-copy flowables since build() consumes them
    trial_flowables = copy.deepcopy(flowables)
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=params.margin_top * mm,
        bottomMargin=params.margin_bottom * mm,
        leftMargin=params.margin_left * mm,
        rightMargin=params.margin_right * mm,
    )
    doc.build(trial_flowables)
    page_h = available_page_height(params)
    # Return height as fractional pages * page_height
    return doc.page * page_h


def trial_build_pages(
    flowables: list,
    params: LayoutParams,
) -> int:
    """Do a trial PDF build and return actual page count."""
    from io import BytesIO
    import copy

    buf = BytesIO()
    trial_flowables = copy.deepcopy(flowables)
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=params.margin_top * mm,
        bottomMargin=params.margin_bottom * mm,
        leftMargin=params.margin_left * mm,
        rightMargin=params.margin_right * mm,
    )
    doc.build(trial_flowables)
    return doc.page


def available_page_height(params: LayoutParams) -> float:
    """Calculate available content height per page in points."""
    return A4[1] - (params.margin_top + params.margin_bottom) * mm
