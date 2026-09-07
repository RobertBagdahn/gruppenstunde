from unittest.mock import Mock, patch

import pytest
from django.test import override_settings

from content.services.image_service import download_external_image

PUBLIC_ADDRESS = [(2, 1, 6, "", ("93.184.216.34", 443))]


def make_response(
    *,
    status_code: int = 200,
    content_type: str = "image/png",
    content_length: str | None = "4",
    chunks: list[bytes] | None = None,
) -> Mock:
    response = Mock()
    response.status_code = status_code
    response.headers = {"content-type": content_type}
    if content_length is not None:
        response.headers["content-length"] = content_length
    response.iter_content.return_value = chunks if chunks is not None else [b"test"]
    return response


@pytest.fixture
def public_dns():
    with patch("content.services.image_service.socket.getaddrinfo", return_value=PUBLIC_ADDRESS):
        yield


@pytest.mark.django_db
def test_download_external_image_accepts_public_image(public_dns):
    response = make_response()
    with (
        patch("content.services.image_service.requests.get", return_value=response) as request_get,
        patch("content.services.image_service.default_storage.save", return_value="content/image.png") as save,
    ):
        result = download_external_image("https://example.test/recipe.png", "content/")

    assert result == "content/image.png"
    request_get.assert_called_once_with(
        "https://example.test/recipe.png",
        timeout=30,
        allow_redirects=False,
        stream=True,
    )
    save.assert_called_once()
    response.close.assert_called_once_with()


def test_download_external_image_rejects_private_ip():
    with (
        patch(
            "content.services.image_service.socket.getaddrinfo",
            return_value=[(2, 1, 6, "", ("127.0.0.1", 80))],
        ),
        patch("content.services.image_service.requests.get") as request_get,
    ):
        with pytest.raises(ValueError, match="nicht zulässig"):
            download_external_image("https://internal.example/recipe.png", "content/")

    request_get.assert_not_called()


def test_download_external_image_rejects_redirect(public_dns):
    response = make_response(status_code=302, content_length=None)
    response.headers["location"] = "http://127.0.0.1/admin"
    with patch("content.services.image_service.requests.get", return_value=response):
        with pytest.raises(ValueError, match="nicht weiterleiten"):
            download_external_image("https://example.test/redirect", "content/")

    response.close.assert_called_once_with()


def test_download_external_image_rejects_non_image_content(public_dns):
    response = make_response(content_type="text/html")
    with (
        patch("content.services.image_service.requests.get", return_value=response),
        patch("content.services.image_service.default_storage.save") as save,
    ):
        with pytest.raises(ValueError, match="unterstütztes Bild"):
            download_external_image("https://example.test/page", "content/")

    save.assert_not_called()
    response.close.assert_called_once_with()


@override_settings(RECIPE_EXTERNAL_IMAGE_MAX_BYTES=4)
def test_download_external_image_rejects_declared_oversized_response(public_dns):
    response = make_response(content_length="5")
    with patch("content.services.image_service.requests.get", return_value=response):
        with pytest.raises(ValueError, match="zu groß"):
            download_external_image("https://example.test/large.png", "content/")

    response.iter_content.assert_not_called()
    response.close.assert_called_once_with()


@override_settings(RECIPE_EXTERNAL_IMAGE_MAX_BYTES=4)
def test_download_external_image_rejects_stream_oversized_response(public_dns):
    response = make_response(content_length=None, chunks=[b"123", b"45"])
    with (
        patch("content.services.image_service.requests.get", return_value=response),
        patch("content.services.image_service.default_storage.save") as save,
    ):
        with pytest.raises(ValueError, match="zu groß"):
            download_external_image("https://example.test/large.png", "content/")

    save.assert_not_called()
    response.close.assert_called_once_with()
