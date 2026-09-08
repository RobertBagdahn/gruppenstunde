"""Image management utilities for content types.

Provides shared logic for downloading images from URLs and validating
that URLs point to the application's own storage.
"""

import logging
import socket
import uuid
from urllib.parse import urlparse

import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from core.services.url_safety import (
    hostname_is_blocked,
    is_blocked_address,
    resolve_public_addresses,
)

logger = logging.getLogger(__name__)

DEFAULT_EXTERNAL_IMAGE_MAX_BYTES = 10 * 1024 * 1024
SUPPORTED_EXTERNAL_IMAGE_TYPES = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _get_allowed_url_prefixes() -> list[str]:
    """Return allowed URL prefixes for image-from-url operations."""
    prefixes = []

    # Local media URL
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if media_url:
        prefixes.append(media_url)

    # GCS bucket URL pattern
    storages_config = getattr(settings, "STORAGES", {})
    default_backend = storages_config.get("default", {})
    options = default_backend.get("OPTIONS", {})
    bucket_name = options.get("bucket_name", "")
    if bucket_name:
        prefixes.append(f"https://storage.googleapis.com/{bucket_name}/")

    return prefixes


def validate_image_url(image_url: str) -> bool:
    """Validate that an image URL points to our own storage."""
    allowed_prefixes = _get_allowed_url_prefixes()

    for prefix in allowed_prefixes:
        if image_url.startswith(prefix):
            return True

    return False


def download_and_save_image(image_url: str, upload_to: str) -> str:
    """Download an image from a URL and save it to Django storage.

    Args:
        image_url: The URL to download the image from (must be from own storage).
        upload_to: The upload directory path (e.g., 'content/').

    Returns:
        The saved file path in storage.

    Raises:
        ValueError: If the URL is not from allowed storage.
        RuntimeError: If download or save fails.
    """
    if not validate_image_url(image_url):
        raise ValueError("URL verweist nicht auf den eigenen Speicher.")

    # Local media path (no scheme) — read directly from storage
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if image_url.startswith(media_url) and not image_url.startswith("http"):
        storage_path = image_url[len(media_url) :]
        try:
            with default_storage.open(storage_path, "rb") as f:
                file_bytes = f.read()
        except Exception as exc:
            logger.error("Failed to read local file %s: %s", storage_path, exc)
            raise RuntimeError("Bild konnte nicht gelesen werden.") from exc

        ext = storage_path.rsplit(".", 1)[-1] if "." in storage_path else "webp"
        filename = f"{upload_to}img_{uuid.uuid4().hex[:12]}.{ext}"
        saved_path = default_storage.save(filename, ContentFile(file_bytes))
        return saved_path

    # Remote URL — download via HTTP
    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.error("Failed to download image from %s: %s", image_url, exc)
        raise RuntimeError("Bild konnte nicht heruntergeladen werden.") from exc

    content_type = response.headers.get("content-type", "")
    if "webp" in content_type:
        ext = "webp"
    elif "png" in content_type:
        ext = "png"
    elif "jpeg" in content_type or "jpg" in content_type:
        ext = "jpg"
    else:
        ext = "webp"

    filename = f"{upload_to}img_{uuid.uuid4().hex[:12]}.{ext}"
    content = ContentFile(response.content)
    saved_path = default_storage.save(filename, content)

    return saved_path


def download_external_image(image_url: str, upload_to: str) -> str:
    """Download a public external image with SSRF and size protection."""
    max_bytes = getattr(
        settings,
        "RECIPE_EXTERNAL_IMAGE_MAX_BYTES",
        DEFAULT_EXTERNAL_IMAGE_MAX_BYTES,
    )
    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Ungültige Bild-URL")
    if parsed.username or parsed.password:
        raise ValueError("Bild-URL ist nicht zulässig")
    if hostname_is_blocked(parsed.hostname):
        raise ValueError("Bild-URL ist nicht zulässig")
    try:
        addresses = resolve_public_addresses(parsed.hostname)
    except socket.gaierror as exc:
        raise ValueError("Bild-URL konnte nicht aufgelöst werden") from exc
    if any(is_blocked_address(address) for address in addresses):
        raise ValueError("Bild-URL ist nicht zulässig")

    try:
        response = requests.get(
            image_url,
            timeout=30,
            allow_redirects=False,
            stream=True,
        )
    except requests.RequestException as exc:
        raise RuntimeError("Bild konnte nicht heruntergeladen werden") from exc

    try:
        if 300 <= response.status_code < 400:
            raise ValueError("Bild-URL darf nicht weiterleiten")
        response.raise_for_status()

        content_length = response.headers.get("content-length")
        if content_length is not None:
            try:
                declared_size = int(content_length)
            except (TypeError, ValueError) as exc:
                raise ValueError("Ungültige Bildgröße") from exc
            if declared_size < 0 or declared_size > max_bytes:
                raise ValueError("Das Bild ist zu groß")

        content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        extension = SUPPORTED_EXTERNAL_IMAGE_TYPES.get(content_type)
        if extension is None:
            raise ValueError("Die URL verweist nicht auf ein unterstütztes Bild")

        content = bytearray()
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            content.extend(chunk)
            if len(content) > max_bytes:
                raise ValueError("Das Bild ist zu groß")

        return default_storage.save(
            f"{upload_to}img_{uuid.uuid4().hex[:12]}.{extension}",
            ContentFile(bytes(content)),
        )
    except requests.RequestException as exc:
        raise RuntimeError("Bild konnte nicht heruntergeladen werden") from exc
    finally:
        if response is not None:
            response.close()
