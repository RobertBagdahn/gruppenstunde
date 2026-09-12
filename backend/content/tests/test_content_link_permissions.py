"""Authorization tests for manual content link creation."""

import json

import pytest
from django.contrib.contenttypes.models import ContentType

from content.choices import ContentStatus
from game.models import Game


def _link_payload(src_id: int, tgt_id: int) -> dict:
    ct = ContentType.objects.get_for_model(Game).model
    return {
        "source_content_type": ct,
        "source_object_id": src_id,
        "target_content_type": ct,
        "target_object_id": tgt_id,
    }


@pytest.mark.django_db
class TestContentLinkAuthorization:
    def test_anonymous_cannot_create_link(self, api_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        g1 = Game.objects.create(title="A", status=ContentStatus.APPROVED, created_by=owner)
        g2 = Game.objects.create(title="B", status=ContentStatus.APPROVED, created_by=owner)
        resp = api_client.post(
            "/api/content/links/",
            data=json.dumps(_link_payload(g1.id, g2.id)),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_cannot_link_to_private_draft_target(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        draft = Game.objects.create(title="Draft", status=ContentStatus.DRAFT, created_by=owner)
        mine = Game.objects.create(title="Mine", status=ContentStatus.APPROVED, created_by=auth_client._user)
        resp = auth_client.post(
            "/api/content/links/",
            data=json.dumps(_link_payload(mine.id, draft.id)),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_can_link_two_public_contents(self, auth_client):
        g1 = Game.objects.create(title="A", status=ContentStatus.APPROVED, created_by=auth_client._user)
        g2 = Game.objects.create(title="B", status=ContentStatus.APPROVED, created_by=auth_client._user)
        resp = auth_client.post(
            "/api/content/links/",
            data=json.dumps(_link_payload(g1.id, g2.id)),
            content_type="application/json",
        )
        assert resp.status_code == 201
