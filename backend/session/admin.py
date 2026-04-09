"""Django admin configuration for the session app."""

from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from content.admin import ContentApprovalMixin
from supply.models import ContentMaterialItem

from .models import GroupSession


class ContentMaterialItemInline(GenericTabularInline):
    model = ContentMaterialItem
    extra = 0
    ct_field = "content_type"
    ct_fk_field = "object_id"


@admin.register(GroupSession)
class GroupSessionAdmin(ContentApprovalMixin, admin.ModelAdmin):
    list_display = [
        "title",
        "session_type",
        "location_type",
        "status",
        "difficulty",
        "like_score",
        "view_count",
        "created_at",
    ]
    list_filter = ["status", "session_type", "location_type", "difficulty"]
    search_fields = ["title", "summary", "description"]
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ["tags", "scout_levels", "authors"]
    readonly_fields = ["view_count", "like_score", "created_at", "updated_at"]
    inlines = [ContentMaterialItemInline]
    ordering = ["-created_at"]
    actions = ContentApprovalMixin.approval_actions
