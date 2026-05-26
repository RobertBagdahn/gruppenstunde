"""InvitationPdfService — generate branded invitation PDFs with group CI."""

from __future__ import annotations

import io
import re
from typing import TYPE_CHECKING

import qrcode
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .ci_helper import CIData, get_event_ci

if TYPE_CHECKING:
    from event.models import Event


def _hex_to_color(hex_str: str) -> colors.Color:
    """Convert a hex color string to a ReportLab Color."""
    hex_str = hex_str.lstrip("#")
    r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
    return colors.Color(r / 255, g / 255, b / 255)


def _markdown_to_paragraphs(text: str, style: ParagraphStyle) -> list:
    """Convert basic markdown text to ReportLab Paragraph elements.

    Supports: **bold**, *italic*, bullet lists (- item), headings (### heading).
    """
    elements = []
    if not text:
        return elements

    bold_style = ParagraphStyle("bold", parent=style, fontName="Helvetica-Bold")
    heading_style = ParagraphStyle(
        "heading",
        parent=style,
        fontName="Helvetica-Bold",
        fontSize=14,
        spaceBefore=10,
        spaceAfter=4,
    )

    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            elements.append(Spacer(1, 4 * mm))
            continue

        # Headings
        if stripped.startswith("###"):
            heading_text = stripped.lstrip("#").strip()
            elements.append(Paragraph(heading_text, heading_style))
            continue
        if stripped.startswith("##"):
            heading_text = stripped.lstrip("#").strip()
            elements.append(Paragraph(heading_text, heading_style))
            continue

        # Bullet list
        if stripped.startswith("- ") or stripped.startswith("* "):
            bullet_text = stripped[2:]
            bullet_text = _convert_inline_markdown(bullet_text)
            elements.append(Paragraph(f"&bull; {bullet_text}", style))
            continue

        # Regular paragraph with inline formatting
        para_text = _convert_inline_markdown(stripped)
        elements.append(Paragraph(para_text, style))

    return elements


def _convert_inline_markdown(text: str) -> str:
    """Convert inline markdown (**bold**, *italic*) to ReportLab XML tags."""
    # Bold: **text** -> <b>text</b>
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # Italic: *text* -> <i>text</i>
    text = re.sub(r"\*(.+?)\*", r"<i>\1</i>", text)
    return text


class InvitationPdfService:
    """Generate branded invitation PDFs for events."""

    @staticmethod
    def generate(event: Event) -> tuple[bytes, str, str]:
        """Generate invitation PDF for an event.

        Returns: (file_bytes, content_type, filename)
        """
        ci = get_event_ci(event)

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=2.5 * cm,
            rightMargin=2.5 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        styles = getSampleStyleSheet()
        primary = _hex_to_color(ci.primary_color)
        secondary = _hex_to_color(ci.secondary_color)

        body_style = ParagraphStyle(
            "body",
            parent=styles["Normal"],
            fontSize=11,
            leading=15,
            spaceAfter=4,
        )
        title_style = ParagraphStyle(
            "event_title",
            parent=styles["Title"],
            textColor=primary,
            fontSize=22,
            spaceAfter=8,
        )
        section_heading = ParagraphStyle(
            "section_heading",
            parent=styles["Heading2"],
            textColor=primary,
            fontSize=14,
            spaceBefore=14,
            spaceAfter=6,
        )
        meta_style = ParagraphStyle(
            "meta",
            parent=body_style,
            fontSize=11,
            textColor=colors.Color(0.3, 0.3, 0.3),
        )
        footer_style = ParagraphStyle(
            "footer_text",
            parent=body_style,
            fontSize=9,
            textColor=colors.Color(0.4, 0.4, 0.4),
            leading=12,
        )

        elements: list = []

        # --- HEADER ---
        elements.extend(_build_header(ci, primary, title_style, meta_style))

        # Colored line
        elements.append(Spacer(1, 4 * mm))
        elements.append(HRFlowable(width="100%", thickness=2, color=primary, spaceAfter=10))

        # --- EVENT INFO ---
        elements.append(Paragraph(event.name, title_style))

        # Date
        if event.start_date:
            date_text = f"<b>Datum:</b> {event.start_date.strftime('%d.%m.%Y %H:%M')}"
            if event.end_date:
                date_text += f" – {event.end_date.strftime('%d.%m.%Y %H:%M')}"
            elements.append(Paragraph(date_text, meta_style))

        # Location
        location_text = ""
        if event.event_location:
            location_text = event.event_location.name
            if event.event_location.full_address:
                location_text += f" ({event.event_location.full_address})"
        elif event.location:
            location_text = event.location
        if location_text:
            elements.append(Paragraph(f"<b>Ort:</b> {location_text}", meta_style))

        elements.append(Spacer(1, 8 * mm))

        # --- GREETING ---
        if ci.greeting_text:
            elements.append(Paragraph(ci.greeting_text, body_style))
            elements.append(Spacer(1, 4 * mm))

        # --- INVITATION TEXT ---
        if event.invitation_text:
            elements.extend(_markdown_to_paragraphs(event.invitation_text, body_style))
            elements.append(Spacer(1, 6 * mm))

        # --- PACKING LIST (optional) ---
        if event.packing_list:
            elements.extend(_build_packing_list_section(event, section_heading, body_style))

        # --- BOOKING OPTIONS ---
        booking_options = list(event.booking_options.filter(is_system=False).order_by("name"))
        if booking_options:
            elements.extend(
                _build_booking_options_section(booking_options, section_heading, primary, secondary, body_style)
            )

        # --- PAYMENT INFO ---
        if ci.payment_info:
            elements.append(Paragraph("Zahlungsinformationen", section_heading))
            elements.append(Paragraph(ci.payment_info.replace("\n", "<br/>"), body_style))

        # --- QR CODE ---
        elements.extend(_build_qr_code_section(event, section_heading, body_style))

        # --- SIGNATURE ---
        if ci.signature_text:
            elements.append(Spacer(1, 10 * mm))
            elements.append(Paragraph(ci.signature_text.replace("\n", "<br/>"), body_style))

        # --- FOOTER ---
        if ci.footer_text:
            elements.append(Spacer(1, 15 * mm))
            elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey, spaceAfter=6))
            elements.append(Paragraph(ci.footer_text.replace("\n", "<br/>"), footer_style))

        doc.build(elements)
        buf.seek(0)

        return (
            buf.getvalue(),
            "application/pdf",
            f"einladung-{event.slug}.pdf",
        )


def _build_header(ci: CIData, primary: colors.Color, title_style: ParagraphStyle, meta_style: ParagraphStyle) -> list:
    """Build the PDF header with logo and group name."""
    elements = []

    header_parts = []

    # Logo (if available)
    if ci.logo_url:
        try:
            logo_img = Image(ci.logo_url, width=1.5 * cm, height=1.5 * cm)
            logo_img.hAlign = "LEFT"
            header_parts.append(logo_img)
        except Exception:
            pass

    # Group name + slogan
    group_name_style = ParagraphStyle(
        "group_name",
        parent=title_style,
        fontSize=16,
        textColor=primary,
        spaceAfter=0,
    )
    slogan_style = ParagraphStyle(
        "slogan",
        parent=meta_style,
        fontSize=10,
        textColor=colors.Color(0.5, 0.5, 0.5),
    )

    elements.append(Paragraph(ci.group_name, group_name_style))
    if ci.slogan:
        elements.append(Paragraph(ci.slogan, slogan_style))

    return elements


def _build_packing_list_section(event, heading_style: ParagraphStyle, body_style: ParagraphStyle) -> list:
    """Build the packing list section for the PDF."""
    elements = []
    packing_list = event.packing_list

    categories = packing_list.categories.prefetch_related("items").order_by("sort_order", "id")
    if not categories.exists():
        return elements

    elements.append(Paragraph("Packliste", heading_style))

    for category in categories:
        items = category.items.order_by("sort_order", "id")
        if not items.exists():
            continue
        elements.append(Paragraph(f"<b>{category.name}:</b>", body_style))
        for item in items:
            qty = f"{item.quantity}x " if item.quantity and item.quantity > 1 else ""
            elements.append(Paragraph(f"&bull; {qty}{item.name}", body_style))
    elements.append(Spacer(1, 4 * mm))
    return elements


def _build_booking_options_section(
    booking_options: list,
    heading_style: ParagraphStyle,
    primary: colors.Color,
    secondary: colors.Color,
    body_style: ParagraphStyle,
) -> list:
    """Build the booking options table for the PDF."""
    elements = []
    elements.append(Paragraph("Buchungsoptionen", heading_style))

    header = ["Option", "Preis"]
    table_data = [header]
    for opt in booking_options:
        price = f"{opt.price:.2f} EUR" if opt.price else "kostenlos"
        table_data.append([opt.name, price])

    available_width = A4[0] - 5 * cm
    col_widths = [available_width * 0.7, available_width * 0.3]

    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BACKGROUND", (0, 0), (-1, 0), secondary),
                ("TEXTCOLOR", (0, 0), (-1, 0), primary),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 6 * mm))
    return elements


def _build_qr_code_section(
    event: Event,
    heading_style: ParagraphStyle,
    body_style: ParagraphStyle,
) -> list:
    """Build a QR code section linking to the event registration page."""
    from django.conf import settings

    elements = []

    # Build the registration URL
    base_url = getattr(settings, "FRONTEND_BASE_URL", "https://gruppenstunde.de")
    registration_url = f"{base_url}/events/{event.slug}/register"

    # Generate QR code as in-memory PNG
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(registration_url)
    qr.make(fit=True)

    qr_buf = io.BytesIO()
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_img.save(qr_buf, format="PNG")
    qr_buf.seek(0)

    elements.append(Spacer(1, 6 * mm))
    elements.append(Paragraph("Anmeldung", heading_style))
    elements.append(
        Paragraph(
            "Scanne den QR-Code, um direkt zur Anmeldung zu gelangen:",
            body_style,
        )
    )
    elements.append(Spacer(1, 4 * mm))

    # Add QR code image (3cm x 3cm)
    qr_image = Image(qr_buf, width=3 * cm, height=3 * cm)
    qr_image.hAlign = "LEFT"
    elements.append(qr_image)

    elements.append(Spacer(1, 2 * mm))
    elements.append(
        Paragraph(
            f'<font size="9" color="#666666">{registration_url}</font>',
            body_style,
        )
    )
    elements.append(Spacer(1, 4 * mm))

    return elements
