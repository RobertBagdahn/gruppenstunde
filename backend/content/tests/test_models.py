"""Tests for content app models."""

import pytest
from django.contrib.contenttypes.models import ContentType

from content.models import (
    ApprovalLog,
    ContentComment,
    ContentEmotion,
    ContentLink,
    ContentView,
    FeaturedContent,
    ScoutLevel,
    SearchLog,
    Tag,
    TagSuggestion,
)
from supply.models import Material


# ---------------------------------------------------------------------------
# SoftDeleteModel Tests (via Material which inherits Supply → SoftDeleteModel)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSoftDelete:
    def test_soft_delete_excludes_from_default_manager(self):
        mat = Material.objects.create(name="Schere", material_category="tools")
        assert Material.objects.count() == 1

        mat.soft_delete()
        assert Material.objects.count() == 0
        assert Material.all_objects.count() == 1

    def test_soft_delete_sets_deleted_at(self):
        mat = Material.objects.create(name="Papier", material_category="crafting")
        assert mat.deleted_at is None
        assert mat.is_deleted is False

        mat.soft_delete()
        mat.refresh_from_db()
        assert mat.deleted_at is not None
        assert mat.is_deleted is True

    def test_restore_brings_back_object(self):
        mat = Material.objects.create(name="Kleber", material_category="crafting")
        mat.soft_delete()
        assert Material.objects.count() == 0

        mat.restore()
        mat.refresh_from_db()
        assert mat.deleted_at is None
        assert mat.is_deleted is False
        assert Material.objects.count() == 1

    def test_all_objects_includes_deleted(self):
        Material.objects.create(name="Messer", material_category="tools")
        mat2 = Material.objects.create(name="Gabel", material_category="tools")
        mat2.soft_delete()

        assert Material.objects.count() == 1
        assert Material.all_objects.count() == 2


# ---------------------------------------------------------------------------
# Supply Slug Generation Tests (via Material)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSlugGeneration:
    def test_auto_generates_slug(self):
        mat = Material.objects.create(name="Schere Premium", material_category="tools")
        assert mat.slug == "schere-premium"

    def test_slug_collision_handling(self):
        Material.objects.create(name="Schere", material_category="tools")
        mat2 = Material.objects.create(name="Schere", material_category="tools")
        assert mat2.slug == "schere-1"

    def test_slug_not_overwritten_on_save(self):
        mat = Material.objects.create(name="Schere", material_category="tools")
        mat.name = "Große Schere"
        mat.save()
        assert mat.slug == "schere"  # slug stays the same

    def test_empty_name_gets_default_slug(self):
        mat = Material.objects.create(name="", material_category="tools")
        assert mat.slug == "item"


# ---------------------------------------------------------------------------
# Tag Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTag:
    def test_create_tag(self):
        tag = Tag.objects.create(name="Basteln", slug="basteln")
        assert str(tag) == "Basteln"
        assert tag.icon == ""
        assert tag.is_approved is True

    def test_tag_hierarchy(self):
        parent = Tag.objects.create(name="Outdoor", slug="outdoor")
        child = Tag.objects.create(name="Wandern", slug="wandern", parent=parent)
        assert child.parent == parent
        assert parent.children.count() == 1

    def test_get_descendants(self):
        root = Tag.objects.create(name="Root", slug="root")
        child = Tag.objects.create(name="Child", slug="child", parent=root)
        Tag.objects.create(name="Grandchild", slug="grandchild", parent=child)
        descendants = root.get_descendants()
        assert descendants.count() == 2

    def test_get_ancestor_ids(self):
        root = Tag.objects.create(name="Root", slug="root")
        child = Tag.objects.create(name="Child", slug="child", parent=root)
        grandchild = Tag.objects.create(name="Grandchild", slug="grandchild", parent=child)
        ancestors = grandchild.get_ancestor_ids()
        assert ancestors == [root.id, child.id]


# ---------------------------------------------------------------------------
# ScoutLevel Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestScoutLevel:
    def test_create_scout_level(self):
        level = ScoutLevel.objects.create(name="Wölflinge", sorting=1)
        assert str(level) == "Wölflinge"


# ---------------------------------------------------------------------------
# ContentComment Tests (using Material as the target content)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContentComment:
    def test_create_comment(self):
        mat = Material.objects.create(name="Schere", material_category="tools")
        ct = ContentType.objects.get_for_model(Material)
        comment = ContentComment.objects.create(
            content_type=ct,
            object_id=mat.id,
            text="Gutes Material!",
            author_name="Scout",
        )
        assert comment.status == "pending"
        assert comment.content_object == mat

    def test_nested_comments(self):
        mat = Material.objects.create(name="Schere", material_category="tools")
        ct = ContentType.objects.get_for_model(Material)
        parent = ContentComment.objects.create(
            content_type=ct,
            object_id=mat.id,
            text="Top-Level",
            author_name="Scout",
        )
        reply = ContentComment.objects.create(
            content_type=ct,
            object_id=mat.id,
            text="Reply",
            author_name="Scout2",
            parent=parent,
        )
        assert reply.parent == parent
        assert parent.replies.count() == 1


# ---------------------------------------------------------------------------
# ContentEmotion Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContentEmotion:
    def test_create_emotion(self):
        mat = Material.objects.create(name="Schere", material_category="tools")
        ct = ContentType.objects.get_for_model(Material)
        emotion = ContentEmotion.objects.create(
            content_type=ct,
            object_id=mat.id,
            emotion_type="in_love",
            session_key="test-session",
        )
        assert emotion.emotion_type == "in_love"


# ---------------------------------------------------------------------------
# ContentLink Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestContentLink:
    def test_create_link(self):
        mat1 = Material.objects.create(name="Schere", material_category="tools")
        mat2 = Material.objects.create(name="Papier", material_category="crafting")
        ct = ContentType.objects.get_for_model(Material)
        link = ContentLink.objects.create(
            source_content_type=ct,
            source_object_id=mat1.id,
            target_content_type=ct,
            target_object_id=mat2.id,
            link_type="manual",
        )
        assert link.source == mat1
        assert link.target == mat2


# ---------------------------------------------------------------------------
# FeaturedContent Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFeaturedContent:
    def test_create_featured(self):
        from datetime import date

        mat = Material.objects.create(name="Schere", material_category="tools")
        ct = ContentType.objects.get_for_model(Material)
        featured = FeaturedContent.objects.create(
            content_type=ct,
            object_id=mat.id,
            featured_from=date(2026, 4, 1),
            featured_until=date(2026, 4, 7),
            reason="Material der Woche",
        )
        assert featured.content_object == mat
