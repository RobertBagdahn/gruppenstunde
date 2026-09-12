import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType

from content.models import ContentCollaborator, ContentCollaboratorRole
from content.services.food_access import can_delete, can_edit, can_read
from profiles.models import GroupMembership, UserGroup
from recipe.tests import make_recipe

User = get_user_model()


def make_user(username: str, *, is_staff: bool = False):
    return User.objects.create_user(username=username, password="testpass", is_staff=is_staff)


@pytest.mark.django_db
def test_recipe_owner_can_read_and_edit_private_recipe():
    owner = make_user("owner")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")

    assert can_read(recipe, owner)
    assert can_edit(recipe, owner)


@pytest.mark.django_db
def test_unrelated_user_cannot_read_private_recipe():
    owner = make_user("owner")
    other = make_user("other")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")

    assert not can_read(recipe, other)
    assert not can_edit(recipe, other)


@pytest.mark.django_db
def test_group_admin_can_edit_group_recipe():
    owner = make_user("owner")
    admin = make_user("admin")
    group = UserGroup.objects.create(name="Food Group")
    GroupMembership.objects.create(user=admin, group=group, role="admin", is_active=True)
    recipe = make_recipe(owner=owner, created_by=owner, visibility="group", status="approved")
    recipe.shared_groups.add(group)

    assert can_read(recipe, admin)
    assert can_edit(recipe, admin)


@pytest.mark.django_db
def test_staff_can_read_and_edit_private_recipe():
    staff = make_user("staff", is_staff=True)
    owner = make_user("owner")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")

    assert can_read(recipe, staff)
    assert can_edit(recipe, staff)


def _add_collaborator(recipe, user, role):
    content_type = ContentType.objects.get_for_model(recipe, for_concrete_model=False)
    return ContentCollaborator.objects.create(
        content_type=content_type,
        object_id=recipe.pk,
        user=user,
        role=role,
    )


@pytest.mark.django_db
def test_editor_collaborator_can_edit_but_not_delete():
    owner = make_user("owner")
    editor = make_user("editor")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")
    _add_collaborator(recipe, editor, ContentCollaboratorRole.EDITOR)

    assert can_edit(recipe, editor)
    assert not can_delete(recipe, editor)


@pytest.mark.django_db
def test_admin_collaborator_can_delete():
    owner = make_user("owner")
    admin = make_user("collab_admin")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")
    _add_collaborator(recipe, admin, ContentCollaboratorRole.ADMIN)

    assert can_edit(recipe, admin)
    assert can_delete(recipe, admin)


@pytest.mark.django_db
def test_owner_can_delete():
    owner = make_user("owner")
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")

    assert can_delete(recipe, owner)
