"""Tests for Idea models."""

import pytest

from idea.choices import CommentStatus, DifficultyChoices, StatusChoices
from idea.models import Comment, Idea, IdeaView, ScoutLevel, Tag
from idea.tests import make_comment, make_idea, make_tag


@pytest.mark.django_db
class TestIdea:
    def test_create_idea(self):
        idea = make_idea(title="Nachtwanderung")
        assert idea.pk is not None
        assert idea.title == "Nachtwanderung"
        assert idea.status == StatusChoices.PUBLISHED

    def test_default_values(self):
        idea = make_idea()
        assert idea.difficulty == DifficultyChoices.EASY
        assert idea.like_score == 0
        assert idea.view_count == 0

    def test_str_representation(self):
        idea = make_idea(title="Lagerfeuer")
        assert str(idea) == "Lagerfeuer"

    def test_m2m_tags(self):
        idea = make_idea()
        tag = make_tag(name="Natur", slug="natur")
        idea.tags.add(tag)
        assert tag in idea.tags.all()

    def test_m2m_scout_levels(self, db):
        from model_bakery import baker

        idea = make_idea()
        level = baker.make(ScoutLevel, name="Wölflinge")
        idea.scout_levels.add(level)
        assert level in idea.scout_levels.all()


@pytest.mark.django_db
class TestTag:
    def test_create_tag(self):
        tag = make_tag(name="Abenteuer", slug="abenteuer")
        assert tag.pk is not None
        assert str(tag) == "Abenteuer"

    def test_hierarchical_tags(self):
        parent = make_tag(name="Outdoor", slug="outdoor")
        child = make_tag(name="Wandern", slug="wandern", parent=parent)
        assert child.parent == parent
        assert child in parent.children.all()

    def test_get_descendants(self):
        root = make_tag(name="Spiel", slug="spiel")
        child = make_tag(name="Ballspiel", slug="ballspiel", parent=root)
        grandchild = make_tag(name="Fußball", slug="fussball", parent=child)

        descendants = root.get_descendants()
        assert child in descendants
        assert grandchild in descendants


@pytest.mark.django_db
class TestComment:
    def test_create_comment(self):
        idea = make_idea()
        comment = make_comment(idea=idea, text="Super Idee!")
        assert comment.pk is not None
        assert comment.idea == idea

    def test_nested_comment(self):
        idea = make_idea()
        parent = make_comment(idea=idea, text="Elternkommentar")
        child = make_comment(idea=idea, text="Antwort", parent=parent)
        assert child.parent == parent
        assert child in parent.replies.all()

    def test_default_status_pending(self, db):
        from model_bakery import baker

        idea = make_idea()
        comment = Comment.objects.create(idea=idea, text="Test")
        assert comment.status == CommentStatus.PENDING


@pytest.mark.django_db
class TestIdeaView:
    def test_hash_ip(self):
        ip_hash = IdeaView.hash_ip("192.168.1.1")
        assert len(ip_hash) == 64  # SHA-256
        assert ip_hash == IdeaView.hash_ip("192.168.1.1")  # Deterministic
        assert ip_hash != IdeaView.hash_ip("192.168.1.2")  # Different IPs
