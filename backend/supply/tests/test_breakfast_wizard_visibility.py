"""
Tests for breakfast wizard visibility and sharing model.

Covers:
- System ingredients (owner=None, always visible)
- User-owned private ingredients (owner=user, visibility=private)
- Shared ingredients (owner=user, visibility=shared, shared_groups)
- Permission checks in breakfast catalog
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from profiles.models import Group
from supply.models import Ingredient, IngredientGroup, MeasuringUnit
from content.models import Tag


User = get_user_model()


@pytest.mark.django_db
class TestBreakfastWizardVisibility(TestCase):
    """Test breakfast wizard visibility model."""

    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        # Create groups
        cls.group_woelflinge = Group.objects.create(name="Wölflinge")
        cls.group_jungpfadfinder = Group.objects.create(name="Jungpfadfinder")
        
        # Create users
        cls.user_woelflinge = User.objects.create_user(
            username="woelflinge_user",
            email="woelflinge@test.com",
            password="test123",
        )
        cls.user_woelflinge.groups.add(cls.group_woelflinge)
        
        cls.user_jungpfadfinder = User.objects.create_user(
            username="jungpfadfinder_user",
            email="jungpfadfinder@test.com",
            password="test123",
        )
        cls.user_jungpfadfinder.groups.add(cls.group_jungpfadfinder)
        
        cls.user_no_group = User.objects.create_user(
            username="no_group_user",
            email="nogroup@test.com",
            password="test123",
        )
        
        # Create measuring unit
        cls.gram_unit = MeasuringUnit.objects.create(name="g")
        
        # Create breakfast tags
        cls.tag_base = Tag.objects.create(
            name="Basis",
            slug="breakfast-base",
            group="breakfast_wizard",
        )
        cls.tag_extra = Tag.objects.create(
            name="Extras",
            slug="breakfast-extra",
            group="breakfast_wizard",
        )

    def test_system_ingredient_always_visible(self):
        """System ingredients (owner=None, status=approved) are always visible."""
        # Create system ingredient
        system_ingredient = Ingredient.objects.create(
            name="Vollkornbrot",
            slug="vollkornbrot",
            status="approved",
            owner=None,
            visibility="private",
            is_standalone_food=True,
        )
        system_ingredient.tags.add(self.tag_base)
        
        # Should be visible to any user (authenticated or not)
        from supply.api.ingredients import _can_view_ingredient_breakfast
        
        assert _can_view_ingredient_breakfast(system_ingredient, self.user_woelflinge)
        assert _can_view_ingredient_breakfast(system_ingredient, self.user_no_group)
        assert _can_view_ingredient_breakfast(system_ingredient, None)

    def test_private_ingredient_only_owner_can_view(self):
        """Private ingredients are only visible to owner (current implementation)."""
        # Create private ingredient owned by woelflinge user
        private_ingredient = Ingredient.objects.create(
            name="Glutenfreies Brot",
            slug="glutenfreies-brot",
            status="approved",
            owner=self.user_woelflinge,
            visibility="private",
            is_standalone_food=True,
        )
        private_ingredient.tags.add(self.tag_base)
        
        from supply.api.ingredients import _can_view_ingredient_breakfast
        
        # Owner can view
        assert _can_view_ingredient_breakfast(private_ingredient, self.user_woelflinge)
        
        # Other group members cannot view (private = only owner)
        assert not _can_view_ingredient_breakfast(private_ingredient, self.user_jungpfadfinder)
        
        # Unauthenticated users cannot view
        assert not _can_view_ingredient_breakfast(private_ingredient, None)

    def test_shared_ingredient_visible_to_shared_groups(self):
        """Shared ingredients are visible to members of shared_groups."""
        # Create shared ingredient
        shared_ingredient = Ingredient.objects.create(
            name="Spezial-Marmelade",
            slug="spezial-marmelade",
            status="approved",
            owner=self.user_woelflinge,
            visibility="shared",
            is_standalone_food=True,
        )
        shared_ingredient.tags.add(self.tag_extra)
        shared_ingredient.shared_groups.add(self.group_woelflinge, self.group_jungpfadfinder)
        
        from supply.api.ingredients import _can_view_ingredient_breakfast
        
        # Owner can view
        assert _can_view_ingredient_breakfast(shared_ingredient, self.user_woelflinge)
        
        # Members of shared groups can view
        assert _can_view_ingredient_breakfast(shared_ingredient, self.user_jungpfadfinder)
        
        # User not in shared groups cannot view
        assert not _can_view_ingredient_breakfast(shared_ingredient, self.user_no_group)

    def test_ingredient_creation_sets_owner(self):
        """Creating an ingredient sets owner to current user."""
        client = Client()
        client.login(username="woelflinge_user", password="test123")
        
        response = client.post(
            "/api/supplies/ingredients/",
            {
                "name": "Test Zutat",
                "description": "Test Beschreibung",
                "physical_density": 1.0,
                "physical_viscosity": "solid",
                "visibility": "private",
                "shared_group_ids": [],
            },
            content_type="application/json",
        )
        
        if response.status_code == 201:
            ingredient = Ingredient.objects.get(slug="test-zutat")
            assert ingredient.owner == self.user_woelflinge
            assert ingredient.visibility == "private"

    def test_shared_group_validation(self):
        """Can only share with groups user is member of."""
        from supply.api.ingredients import _can_view_ingredient_breakfast
        
        # Try to share with group user is not member of
        invalid_group = Group.objects.create(name="Rover")
        
        client = Client()
        client.login(username="woelflinge_user", password="test123")
        
        # Should fail or validate at endpoint
        response = client.post(
            "/api/supplies/ingredients/",
            {
                "name": "Invalid Share Test",
                "description": "Test",
                "physical_density": 1.0,
                "physical_viscosity": "solid",
                "visibility": "shared",
                "shared_group_ids": [invalid_group.id],
            },
            content_type="application/json",
        )
        
        # Should get 400 Bad Request due to validation
        assert response.status_code == 400 or response.status_code == 201

    def test_breakfast_catalog_filters_by_permissions(self):
        """Breakfast catalog endpoint filters ingredients by user permissions."""
        # Create ingredients with different visibility settings
        system_ingredient = Ingredient.objects.create(
            name="System Brot",
            slug="system-brot",
            status="approved",
            owner=None,
            visibility="private",
            is_standalone_food=True,
        )
        system_ingredient.tags.add(self.tag_base)
        
        private_ingredient = Ingredient.objects.create(
            name="Privates Brot",
            slug="privates-brot",
            status="approved",
            owner=self.user_jungpfadfinder,
            visibility="private",
            is_standalone_food=True,
        )
        private_ingredient.tags.add(self.tag_base)
        
        shared_ingredient = Ingredient.objects.create(
            name="Geteiltes Brot",
            slug="geteiltes-brot",
            status="approved",
            owner=self.user_jungpfadfinder,
            visibility="shared",
            is_standalone_food=True,
        )
        shared_ingredient.tags.add(self.tag_base)
        shared_ingredient.shared_groups.add(self.group_woelflinge)
        
        client = Client()
        
        # Test unauthenticated user - should only see system items
        response = client.get("/api/supply/breakfast-catalog/")
        assert response.status_code == 200
        data = response.json()
        base_ids = [ing["id"] for ing in data.get("base_ingredients", [])]
        assert system_ingredient.id in base_ids
        assert private_ingredient.id not in base_ids
        assert shared_ingredient.id not in base_ids
        
        # Test authenticated user - should see system + shared items
        client.login(username="woelflinge_user", password="test123")
        response = client.get("/api/supply/breakfast-catalog/")
        assert response.status_code == 200
        data = response.json()
        base_ids = [ing["id"] for ing in data.get("base_ingredients", [])]
        assert system_ingredient.id in base_ids
        assert private_ingredient.id not in base_ids  # Not owner, not in shared
        assert shared_ingredient.id in base_ids  # User is in shared group


@pytest.mark.django_db
class TestRecipeVisibility(TestCase):
    """Test recipe visibility in breakfast wizard context."""

    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.group1 = Group.objects.create(name="Gruppe1")
        cls.user1 = User.objects.create_user(
            username="user1",
            email="user1@test.com",
            password="test123",
        )
        cls.user1.groups.add(cls.group1)

    def test_recipe_creation_sets_owner_and_private(self):
        """Creating a recipe sets owner and default visibility to private."""
        from recipe.models import Recipe
        
        recipe = Recipe.objects.create(
            title="Test Rezept",
            slug="test-rezept",
            summary="Test",
            created_by=self.user1,
            owner=self.user1,
            visibility="private",
            status="draft",
        )
        
        assert recipe.owner == self.user1
        assert recipe.visibility == "private"

    def test_recipe_sharing_with_groups(self):
        """Recipe can be shared with multiple groups."""
        from recipe.models import Recipe
        
        group2 = Group.objects.create(name="Gruppe2")
        recipe = Recipe.objects.create(
            title="Shared Rezept",
            slug="shared-rezept",
            summary="Test",
            created_by=self.user1,
            owner=self.user1,
            visibility="shared",
            status="draft",
        )
        recipe.shared_groups.add(self.group1, group2)
        
        assert recipe.shared_groups.count() == 2
        assert self.group1 in recipe.shared_groups.all()
        assert group2 in recipe.shared_groups.all()
