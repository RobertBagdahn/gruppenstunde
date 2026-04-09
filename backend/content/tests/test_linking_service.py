"""
Tests for content/services/linking_service.py — ContentLink CRUD and recommendations.
"""

import pytest
from django.contrib.contenttypes.models import ContentType

from content.choices import ContentStatus, EmbeddingFeedbackType, LinkType
from content.models import ContentLink, EmbeddingFeedback
from content.services.linking_service import (
    create_embedding_links,
    create_manual_link,
    delete_link,
    get_links_for_content,
    get_links_grouped_by_type,
    reject_link,
    reject_link_with_feedback,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def session_obj(db):
    """Create a GroupSession."""
    from session.models import GroupSession

    return GroupSession.objects.create(
        title="Nachtwanderung",
        summary="Eine Nachtwanderung im Wald",
        status=ContentStatus.APPROVED,
        session_type="exploration",
    )


@pytest.fixture
def blog_obj(db):
    """Create a Blog."""
    from blog.models import Blog

    return Blog.objects.create(
        title="Knoten-Kunde",
        summary="Alles über wichtige Knoten",
        status=ContentStatus.APPROVED,
        blog_type="guide",
    )


@pytest.fixture
def game_obj(db):
    """Create a Game."""
    from game.models import Game

    return Game.objects.create(
        title="Capture the Flag",
        summary="Ein Geländespiel",
        status=ContentStatus.APPROVED,
        game_type="field_game",
    )


@pytest.fixture
def recipe_obj(db):
    """Create a Recipe."""
    from recipe.models import Recipe

    return Recipe.objects.create(
        title="Stockbrot",
        summary="Einfaches Stockbrot",
        status=ContentStatus.APPROVED,
        recipe_type="snack",
    )


@pytest.fixture
def test_user(db):
    """Create a regular test user."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(
        username="test@inspi.dev",
        email="test@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_superuser(
        username="admin@inspi.dev",
        email="admin@inspi.dev",
        password="adminpass123",
    )


# ---------------------------------------------------------------------------
# Manual Link Creation Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateManualLink:
    """Tests for create_manual_link."""

    def test_create_link_between_session_and_game(self, session_obj, game_obj, test_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        assert link.link_type == LinkType.MANUAL
        assert link.created_by == test_user
        assert link.source_object_id == session_obj.id
        assert link.target_object_id == game_obj.id

    def test_create_link_between_session_and_recipe(self, session_obj, recipe_obj, test_user):
        link = create_manual_link("groupsession", session_obj.id, "recipe", recipe_obj.id, user=test_user)
        assert link.link_type == LinkType.MANUAL
        assert link.source_object_id == session_obj.id
        assert link.target_object_id == recipe_obj.id

    def test_prevent_duplicate_link(self, session_obj, game_obj, test_user):
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        with pytest.raises(ValueError, match="existiert bereits"):
            create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)

    def test_prevent_reverse_duplicate_link(self, session_obj, game_obj, test_user):
        """Creating A→B then B→A should be detected as duplicate."""
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        with pytest.raises(ValueError, match="existiert bereits"):
            create_manual_link("game", game_obj.id, "groupsession", session_obj.id, user=test_user)

    def test_prevent_self_link(self, session_obj, test_user):
        with pytest.raises(ValueError, match="sich selbst"):
            create_manual_link("groupsession", session_obj.id, "groupsession", session_obj.id, user=test_user)

    def test_invalid_content_type(self, session_obj, test_user):
        with pytest.raises(ValueError, match="Unbekannter Content-Typ"):
            create_manual_link("nonexistent", 1, "groupsession", session_obj.id, user=test_user)

    def test_nonexistent_object(self, session_obj, test_user):
        with pytest.raises(ValueError, match="existiert nicht"):
            create_manual_link("groupsession", session_obj.id, "game", 99999, user=test_user)

    def test_create_link_without_user(self, session_obj, game_obj):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id)
        assert link.created_by is None


# ---------------------------------------------------------------------------
# Embedding Links Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateEmbeddingLinks:
    """Tests for create_embedding_links."""

    def test_create_multiple_embedding_links(self, session_obj, game_obj, recipe_obj, blog_obj):
        recommendations = [
            {"target_type": "game", "target_id": game_obj.id, "score": 0.95},
            {"target_type": "recipe", "target_id": recipe_obj.id, "score": 0.80},
            {"target_type": "blog", "target_id": blog_obj.id, "score": 0.75},
        ]
        links = create_embedding_links("groupsession", session_obj.id, recommendations)
        assert len(links) == 3
        assert all(l.link_type == LinkType.EMBEDDING for l in links)
        assert links[0].relevance_score == 0.95

    def test_skip_duplicate_embedding_links(self, session_obj, game_obj, test_user):
        # Create a manual link first
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)

        # Embedding recommendations should skip the duplicate
        recommendations = [
            {"target_type": "game", "target_id": game_obj.id, "score": 0.90},
        ]
        links = create_embedding_links("groupsession", session_obj.id, recommendations)
        assert len(links) == 0

    def test_skip_self_link_in_embedding(self, session_obj):
        recommendations = [
            {"target_type": "groupsession", "target_id": session_obj.id, "score": 1.0},
        ]
        links = create_embedding_links("groupsession", session_obj.id, recommendations)
        assert len(links) == 0

    def test_empty_recommendations(self, session_obj):
        links = create_embedding_links("groupsession", session_obj.id, [])
        assert len(links) == 0


# ---------------------------------------------------------------------------
# Get Links Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGetLinks:
    """Tests for get_links_for_content and get_links_grouped_by_type."""

    def test_get_outgoing_links(self, session_obj, game_obj, recipe_obj, test_user):
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        create_manual_link("groupsession", session_obj.id, "recipe", recipe_obj.id, user=test_user)

        links = get_links_for_content("groupsession", session_obj.id, direction="outgoing")
        assert len(links) == 2

    def test_get_incoming_links(self, session_obj, game_obj, test_user):
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)

        links = get_links_for_content("game", game_obj.id, direction="incoming")
        assert len(links) == 1

    def test_get_both_directions(self, session_obj, game_obj, recipe_obj, test_user):
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        create_manual_link("recipe", recipe_obj.id, "groupsession", session_obj.id, user=test_user)

        links = get_links_for_content("groupsession", session_obj.id, direction="both")
        assert len(links) == 2

    def test_get_links_excludes_rejected(self, session_obj, game_obj, test_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        link.is_rejected = True
        link.save(update_fields=["is_rejected"])

        links = get_links_for_content("groupsession", session_obj.id)
        assert len(links) == 0

    def test_get_links_includes_rejected_when_requested(self, session_obj, game_obj, test_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        link.is_rejected = True
        link.save(update_fields=["is_rejected"])

        links = get_links_for_content("groupsession", session_obj.id, include_rejected=True)
        assert len(links) == 1

    def test_get_links_invalid_type(self):
        links = get_links_for_content("nonexistent", 1)
        assert len(links) == 0

    def test_get_links_grouped_by_type(self, session_obj, game_obj, recipe_obj, blog_obj, test_user):
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        create_manual_link("groupsession", session_obj.id, "recipe", recipe_obj.id, user=test_user)
        create_manual_link("groupsession", session_obj.id, "blog", blog_obj.id, user=test_user)

        grouped = get_links_grouped_by_type("groupsession", session_obj.id)
        assert "game" in grouped
        assert "recipe" in grouped
        assert "blog" in grouped
        assert len(grouped["game"]) == 1
        assert grouped["game"][0]["title"] == "Capture the Flag"
        assert grouped["game"][0]["slug"] != ""

    def test_grouped_links_max_per_group(self, session_obj, test_user):
        """Ensure max_per_group is respected."""
        from game.models import Game

        # Create 8 games
        games = []
        for i in range(8):
            g = Game.objects.create(
                title=f"Game {i}",
                summary=f"Game number {i}",
                status=ContentStatus.APPROVED,
                game_type="field_game",
            )
            games.append(g)
            create_manual_link("groupsession", session_obj.id, "game", g.id, user=test_user)

        grouped = get_links_grouped_by_type("groupsession", session_obj.id, max_per_group=6)
        assert len(grouped["game"]) == 6

    def test_grouped_links_excludes_empty_groups(self, session_obj, game_obj, test_user):
        create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)

        grouped = get_links_grouped_by_type("groupsession", session_obj.id)
        # Only "game" group should be present
        assert "game" in grouped
        assert "recipe" not in grouped
        assert "blog" not in grouped


# ---------------------------------------------------------------------------
# Reject & Delete Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRejectAndDelete:
    """Tests for reject_link, reject_link_with_feedback, and delete_link."""

    def test_reject_link(self, session_obj, game_obj, test_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        updated = reject_link(link.id)
        assert updated.is_rejected is True

    def test_reject_nonexistent_link(self):
        with pytest.raises(ValueError, match="nicht gefunden"):
            reject_link(99999)

    def test_reject_link_with_feedback(self, session_obj, game_obj, test_user, admin_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)

        updated_link, feedback = reject_link_with_feedback(
            link.id,
            feedback_type=EmbeddingFeedbackType.NOT_RELEVANT,
            notes="These are not related",
            user=admin_user,
        )
        assert updated_link.is_rejected is True
        assert feedback.feedback_type == EmbeddingFeedbackType.NOT_RELEVANT
        assert feedback.notes == "These are not related"
        assert feedback.created_by == admin_user
        assert feedback.content_link_id == link.id

    def test_delete_link_as_creator(self, session_obj, game_obj, test_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        delete_link(link.id, user=test_user)
        assert not ContentLink.objects.filter(pk=link.id).exists()

    def test_delete_link_as_admin(self, session_obj, game_obj, test_user, admin_user):
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        delete_link(link.id, user=admin_user)
        assert not ContentLink.objects.filter(pk=link.id).exists()

    def test_delete_link_unauthorized(self, session_obj, game_obj, test_user):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        other_user = User.objects.create_user(
            username="other@inspi.dev",
            email="other@inspi.dev",
            password="testpass123",
        )
        link = create_manual_link("groupsession", session_obj.id, "game", game_obj.id, user=test_user)
        with pytest.raises(PermissionError, match="Keine Berechtigung"):
            delete_link(link.id, user=other_user)

    def test_delete_nonexistent_link(self, test_user):
        with pytest.raises(ValueError, match="nicht gefunden"):
            delete_link(99999, user=test_user)
