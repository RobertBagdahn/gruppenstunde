from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from content.admin import ContentApprovalMixin
from supply.models import ContentMaterialItem

from .models import Game


class ContentMaterialItemInline(GenericTabularInline):
    model = ContentMaterialItem
    extra = 1
    autocomplete_fields = ["material"]


@admin.register(Game)
class GameAdmin(ContentApprovalMixin, admin.ModelAdmin):
    list_display = ["title", "game_type", "play_area", "difficulty", "status", "created_at"]
    list_filter = ["game_type", "play_area", "difficulty", "status"]
    search_fields = ["title", "summary"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ContentMaterialItemInline]
    readonly_fields = ["view_count", "like_score", "created_at", "updated_at"]
    actions = ContentApprovalMixin.approval_actions
