from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from content.admin import ContentApprovalMixin
from content.models import ContentComment, ContentEmotion
from supply.models import ContentMaterialItem

from .models import Recipe, RecipeItem, RecipeHint


class RecipeItemInline(admin.TabularInline):
    model = RecipeItem
    extra = 0


class ContentMaterialItemInline(GenericTabularInline):
    model = ContentMaterialItem
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(ContentApprovalMixin, admin.ModelAdmin):
    list_display = ("title", "recipe_type", "status", "difficulty", "created_at")
    list_filter = ("status", "recipe_type", "difficulty")
    search_fields = ("title", "summary", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RecipeItemInline, ContentMaterialItemInline]
    readonly_fields = ("view_count", "like_score", "created_at", "updated_at")
    actions = ContentApprovalMixin.approval_actions


@admin.register(RecipeHint)
class RecipeHintAdmin(admin.ModelAdmin):
    list_display = ("name", "parameter", "hint_level", "recipe_type")
    list_filter = ("hint_level", "recipe_type", "recipe_objective")
