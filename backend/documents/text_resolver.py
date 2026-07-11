"""Text block resolution: presets, template variables, AI generation."""

from __future__ import annotations

import datetime

from schema import EventConfig, RegistrationConfig

GERMAN_WEEKDAYS = {
    0: "Montag",
    1: "Dienstag",
    2: "Mittwoch",
    3: "Donnerstag",
    4: "Freitag",
    5: "Samstag",
    6: "Sonntag",
}


def german_weekday(d: datetime.date) -> str:
    return GERMAN_WEEKDAYS[d.weekday()]


def format_date_german(d: datetime.date) -> str:
    """Format date as DD.MM.YYYY."""
    return d.strftime("%d.%m.%Y")


def format_date_range(event: EventConfig) -> str:
    """Generate 'Freitag, 29.05.2026 bis Sonntag, 31.05.2026'."""
    start = f"{german_weekday(event.start_date)}, {format_date_german(event.start_date)}"
    end = f"{german_weekday(event.end_date)}, {format_date_german(event.end_date)}"
    return f"{start} bis {end}"


def format_meeting_point(event: EventConfig) -> str:
    """Generate 'Freitag um 16:30 Uhr am Bahnhof Korschenbroich'."""
    weekday = german_weekday(event.start_date)
    if event.start_time:
        return f"{weekday} um {event.start_time} Uhr am {event.meeting_point}"
    return f"{weekday} am {event.meeting_point}"


def format_return_point(event: EventConfig) -> str:
    """Generate 'Sonntag gegen 15:00 Uhr am Bahnhof Korschenbroich'."""
    weekday = german_weekday(event.end_date)
    return_point = event.return_point or event.meeting_point
    if event.end_time:
        return f"{weekday} gegen {event.end_time} Uhr am {return_point}"
    return f"{weekday} am {return_point}"


def format_fee(event: EventConfig) -> str:
    """Generate '25,00 € (passend in bar mitbringen)'."""
    fee_str = f"{event.fee:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if event.fee_note:
        return f"{fee_str} € ({event.fee_note})"
    return f"{fee_str} €"


def format_deadline(event: EventConfig) -> str:
    """Generate 'Bitte bis zum 22. Mai 2026 abgeben!'."""
    months = [
        "",
        "Januar",
        "Februar",
        "März",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember",
    ]
    d = event.registration_deadline
    return f"Bitte bis zum {d.day}. {months[d.month]} {d.year} abgeben!"


def generate_details(event: EventConfig) -> list[tuple[str, str]]:
    """Generate the key-value detail rows from structured event data."""
    details: list[tuple[str, str]] = []
    details.append(("Wann", format_date_range(event)))
    details.append(("Treffpunkt", format_meeting_point(event)))
    details.append(("Rückkehr", format_return_point(event)))
    if event.location or event.area:
        location_parts = []
        if event.area:
            location_parts.append(event.area)
        if event.location and event.location not in (event.area or ""):
            loc_str = f"in der Nähe von {event.location}" if event.area else event.location
            location_parts.append(loc_str)
        details.append(("Ort", " ".join(location_parts) if location_parts else event.location))
    details.append(("Beitrag", format_fee(event)))
    details.append(("Anmeldefrist", format_deadline(event)))
    return details


def build_template_context(config: RegistrationConfig) -> dict[str, str]:
    """Build the variable context for template substitution."""
    event = config.event
    duration = (event.end_date - event.start_date).days
    # Extract city from meeting_point (last word or full string)
    meeting_city = event.meeting_point.split()[-1] if event.meeting_point else ""

    return {
        "event.name": event.name,
        "event.type": event.type,
        "event.location": event.location,
        "event.area": event.area,
        "event.theme": event.theme or "",
        "participants.type": config.participants.type,
        "group.name": config.group.name,
        "duration_days": str(duration),
        "formatted_date_range": format_date_range(event),
        "meeting_city": meeting_city,
        "article": "das" if event.area.startswith("das ") else "den" if event.area.startswith("den ") else "",
    }


def substitute_variables(template: str, context: dict[str, str]) -> str:
    """Replace {variable} placeholders with context values."""
    result = template
    for key, value in context.items():
        result = result.replace(f"{{{key}}}", value)
    return result


def resolve_text(
    block_type: str,
    value: str,
    config: RegistrationConfig,
    defaults: dict,
) -> str:
    """Resolve a text block value to its final string.

    Resolution order:
    1. If value is 'ai' -> generate with AI
    2. If value is a known preset key -> load template and substitute
    3. If value is 'default' -> load template for event.type or 'default'
    4. Otherwise -> use verbatim
    """
    context = build_template_context(config)
    text_blocks = defaults.get("text_blocks", {})

    if value == "ai":
        return generate_ai_text(block_type, config, context)

    block_category = text_blocks.get(block_type, {})

    if value == "default":
        # Try event type first, then fall back to 'default'
        template = block_category.get(config.event.type, block_category.get("default", ""))
    elif value in block_category:
        template = block_category[value]
    else:
        # Verbatim text
        return value

    return substitute_variables(template, context).strip()


def generate_ai_text(
    block_type: str,
    config: RegistrationConfig,
    context: dict[str, str],
) -> str:
    """Generate text using Google Gemini AI."""
    try:
        from core.services.gemini import gemini_call

        block_labels = {
            "greeting": "Begrüßungstext",
            "additional_info": "Zusatzinformationen",
            "consent": "Einverständniserklärung",
        }
        block_label = block_labels.get(block_type, block_type)

        theme_line = ""
        if config.event.theme:
            theme_line = f"\nMotto/Thema: {config.event.theme}. Baue das Thema kreativ in den Text ein."

        prompt = f"""Du schreibst einen {block_label} für eine Pfadfinder-Anmeldung.

Event: {config.event.name} in {config.event.location}
Datum: {context["formatted_date_range"]}
Teilnehmer: {config.participants.type}{theme_line}

Schreibe 3-5 Sätze. Sachlich, freundlich, an Eltern und Pfadfinder gerichtet.
Keine Anrede (die kommt separat). Kein Markdown. Nur Fließtext."""

        response, _interaction_id = gemini_call(
            user=None,
            model="gemini-3.1-flash-lite",
            contents=prompt,
            bypass_limits=True,
            context="document_text_generation",
        )
        if response is None:
            raise ValueError("KI-Client nicht verfügbar")
        text = response.text.strip() if response.text else ""
        if not text:
            raise ValueError("KI hat leere Antwort generiert")
        return text

    except ImportError:
        raise RuntimeError("KI-Textgenerierung benötigt google-genai. Installiere es mit: uv add google-genai")
    except Exception as e:
        raise RuntimeError(f"KI-Textgenerierung fehlgeschlagen: {e}") from e
