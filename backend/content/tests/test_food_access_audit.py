from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone
from model_bakery import baker

from content.models import StaffFoodAccessLog
from content.services.audit_service import log_private_staff_food_access
from recipe.models import Recipe


@pytest.mark.django_db
def test_private_staff_detail_access_is_logged():
    staff = baker.make("auth.User", is_staff=True)
    recipe = baker.make(Recipe, owner=baker.make("auth.User"), visibility="private", status="draft")

    log_private_staff_food_access(staff, recipe, "/api/recipes/1/")

    assert StaffFoodAccessLog.objects.filter(user=staff, object_id=recipe.id).count() == 1


@pytest.mark.django_db
def test_public_access_is_not_logged():
    staff = baker.make("auth.User", is_staff=True)
    recipe = baker.make(Recipe, owner=None, visibility="public", status="approved")

    log_private_staff_food_access(staff, recipe, "/api/recipes/1/")

    assert not StaffFoodAccessLog.objects.filter(object_id=recipe.id).exists()


@pytest.mark.django_db
def test_staff_food_access_cleanup_uses_thirty_day_retention():
    old = StaffFoodAccessLog.objects.create(
        user=baker.make("auth.User", is_staff=True),
        resource_type="Recipe",
        object_id=1,
        endpoint="/api/recipes/1/",
    )
    old.accessed_at = timezone.now() - timedelta(days=31)
    old.save(update_fields=["accessed_at"])
    fresh = StaffFoodAccessLog.objects.create(
        user=old.user,
        resource_type="Recipe",
        object_id=2,
        endpoint="/api/recipes/2/",
    )

    call_command("cleanup_audit_logs")

    assert not StaffFoodAccessLog.objects.filter(pk=old.pk).exists()
    assert StaffFoodAccessLog.objects.filter(pk=fresh.pk).exists()
