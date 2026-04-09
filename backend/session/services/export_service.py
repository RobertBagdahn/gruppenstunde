"""
Export service for generating Instagram slides and other exports.
Generates 3 Instagram slides (1080x1080px) using Pillow.
"""

import io
import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def generate_instagram_slides(session) -> list[str]:
    """
    Generate 3 Instagram slides for a GroupSession.
    Returns list of base64-encoded PNG images.

    Slide 1: Title with background image
    Slide 2: Shortened description
    Slide 3: Meta info (tags, time, age, difficulty, costs)
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        logger.warning("Pillow not installed – Instagram export disabled")
        return []

    import base64

    SIZE = (1080, 1080)
    slides = []

    # Color scheme (Inspi brand)
    bg_color = (76, 175, 80)  # Primary green
    text_color = (255, 255, 255)
    dark_bg = (33, 33, 33)

    # Try to get a font; fall back to default
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
        font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        font_brand = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    except (OSError, IOError):
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_brand = ImageFont.load_default()

    watermark = "gruppenstunde.de"

    # --- Slide 1: Title with background ---
    img1 = Image.new("RGB", SIZE, bg_color)
    draw1 = ImageDraw.Draw(img1)

    # If session has an image, use it as background with overlay
    if session.image:
        try:
            bg_img = Image.open(session.image.path)
            bg_img = bg_img.resize(SIZE, Image.LANCZOS)
            # Dark overlay
            overlay = Image.new("RGBA", SIZE, (0, 0, 0, 150))
            img1 = bg_img.convert("RGB")
            img1.paste(Image.alpha_composite(img1.convert("RGBA"), overlay).convert("RGB"))
            draw1 = ImageDraw.Draw(img1)
        except Exception:
            pass

    # Title text (centered)
    title = session.title
    _draw_centered_text(draw1, title, font_title, text_color, SIZE, y_offset=-50)

    # Watermark
    _draw_watermark(draw1, watermark, font_brand, SIZE)

    slides.append(_image_to_base64(img1))

    # --- Slide 2: Description ---
    img2 = Image.new("RGB", SIZE, dark_bg)
    draw2 = ImageDraw.Draw(img2)

    # Use summary_long or summary
    desc = session.summary_long or session.summary or session.description
    # Truncate to ~150 words
    words = desc.split()
    if len(words) > 150:
        desc = " ".join(words[:150]) + "..."

    _draw_wrapped_text(draw2, desc, font_body, text_color, SIZE, margin=80, y_start=120)
    _draw_watermark(draw2, watermark, font_brand, SIZE)

    slides.append(_image_to_base64(img2))

    # --- Slide 3: Meta info ---
    img3 = Image.new("RGB", SIZE, bg_color)
    draw3 = ImageDraw.Draw(img3)

    # Collect meta info
    from content.choices import CostsRatingChoices, DifficultyChoices, ExecutionTimeChoices

    meta_lines = [
        f"⏱ Dauer: {ExecutionTimeChoices(session.execution_time).label}",
        f"📊 Schwierigkeit: {DifficultyChoices(session.difficulty).label}",
        f"💰 Kosten: {CostsRatingChoices(session.costs_rating).label}",
    ]

    # Scout levels
    levels = [sl.name for sl in session.scout_levels.all()]
    if levels:
        meta_lines.append(f"🏕 Stufen: {', '.join(levels)}")

    # Tags
    tags = [t.name for t in session.tags.all()[:8]]
    if tags:
        meta_lines.append(f"🏷 Tags: {', '.join(tags)}")

    y = 200
    for line in meta_lines:
        draw3.text((80, y), line, fill=text_color, font=font_body)
        y += 80

    _draw_watermark(draw3, watermark, font_brand, SIZE)

    slides.append(_image_to_base64(img3))

    return slides


def _draw_centered_text(draw, text: str, font, color, size: tuple, y_offset: int = 0):
    """Draw text centered on the image."""
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size[0] - text_w) // 2
    y = (size[1] - text_h) // 2 + y_offset
    draw.text((x, y), text, fill=color, font=font)


def _draw_wrapped_text(draw, text: str, font, color, size: tuple, margin: int = 80, y_start: int = 120):
    """Draw wrapped text within margins."""
    max_width = size[0] - 2 * margin
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    y = y_start
    for line in lines:
        draw.text((margin, y), line, fill=color, font=font)
        bbox = draw.textbbox((0, 0), line, font=font)
        y += (bbox[3] - bbox[1]) + 12
        if y > size[1] - 100:
            break


def _draw_watermark(draw, text: str, font, size: tuple):
    """Draw watermark at bottom right."""
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    x = size[0] - text_w - 30
    y = size[1] - 50
    draw.text((x, y), text, fill=(255, 255, 255, 180), font=font)


def _image_to_base64(img) -> str:
    """Convert PIL Image to base64 string."""
    import base64

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")
