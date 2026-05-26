"""Tests for profile picture upload/delete and is_public enforcement."""

import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from profiles.tests import make_user_profile


def _make_image(fmt: str = "JPEG", size: tuple[int, int] = (100, 100)) -> bytes:
    """Create a minimal valid image in memory."""
    from PIL import Image

    buf = io.BytesIO()
    img = Image.new("RGB", size, color="red")
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.read()


# ---------------------------------------------------------------------------
# Profile Picture Upload
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestProfilePictureUpload:
    def test_upload_jpeg(self, auth_client):
        data = _make_image("JPEG")
        f = SimpleUploadedFile("avatar.jpg", data, content_type="image/jpeg")
        resp = auth_client.post("/api/profile/me/picture/", {"file": f})
        assert resp.status_code == 200
        body = resp.json()
        assert body["profile_picture_url"] is not None
        assert "profiles/" in body["profile_picture_url"]

    def test_upload_png(self, auth_client):
        data = _make_image("PNG")
        f = SimpleUploadedFile("avatar.png", data, content_type="image/png")
        resp = auth_client.post("/api/profile/me/picture/", {"file": f})
        assert resp.status_code == 200

    def test_upload_webp(self, auth_client):
        data = _make_image("WEBP")
        f = SimpleUploadedFile("avatar.webp", data, content_type="image/webp")
        resp = auth_client.post("/api/profile/me/picture/", {"file": f})
        assert resp.status_code == 200

    def test_upload_invalid_format(self, auth_client):
        f = SimpleUploadedFile("doc.pdf", b"fake-pdf", content_type="application/pdf")
        resp = auth_client.post("/api/profile/me/picture/", {"file": f})
        assert resp.status_code == 422

    def test_upload_too_large(self, auth_client):
        # 600KB > 500KB limit
        data = b"x" * (600 * 1024)
        f = SimpleUploadedFile("big.jpg", data, content_type="image/jpeg")
        resp = auth_client.post("/api/profile/me/picture/", {"file": f})
        assert resp.status_code == 422

    def test_upload_unauthenticated(self, api_client):
        data = _make_image("JPEG")
        f = SimpleUploadedFile("avatar.jpg", data, content_type="image/jpeg")
        resp = api_client.post("/api/profile/me/picture/", {"file": f})
        assert resp.status_code == 403


@pytest.mark.django_db
class TestProfilePictureDelete:
    def test_delete_picture(self, auth_client):
        # First upload
        data = _make_image("JPEG")
        f = SimpleUploadedFile("avatar.jpg", data, content_type="image/jpeg")
        auth_client.post("/api/profile/me/picture/", {"file": f})

        # Then delete
        resp = auth_client.delete("/api/profile/me/picture/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["profile_picture_url"] is None

    def test_delete_no_picture(self, auth_client):
        resp = auth_client.delete("/api/profile/me/picture/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["profile_picture_url"] is None

    def test_delete_unauthenticated(self, api_client):
        resp = api_client.delete("/api/profile/me/picture/")
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# is_public Enforcement
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIsPublicEnforcement:
    def test_public_profile_visible(self, auth_client):
        """Public profile is visible to other users."""
        profile = make_user_profile(is_public=True)
        resp = auth_client.get(f"/api/profile/{profile.user_id}/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["scout_name"] == "Adler"

    def test_private_profile_returns_404(self, auth_client):
        """Private profile returns 404 for other users."""
        profile = make_user_profile(is_public=False)
        resp = auth_client.get(f"/api/profile/{profile.user_id}/")
        assert resp.status_code == 404

    def test_own_private_profile_visible(self, auth_client):
        """User can always see their own profile, even if private."""
        user = auth_client._user
        make_user_profile(user=user, is_public=False)
        resp = auth_client.get(f"/api/profile/{user.id}/")
        assert resp.status_code == 200

    def test_update_is_public(self, auth_client):
        """User can toggle is_public via PATCH."""
        import json

        resp = auth_client.patch(
            "/api/profile/me/",
            data=json.dumps({"is_public": True}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["is_public"] is True
