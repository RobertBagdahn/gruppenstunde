from django.contrib import admin

from content.admin import ContentApprovalMixin

from .models import Blog


@admin.register(Blog)
class BlogAdmin(ContentApprovalMixin, admin.ModelAdmin):
    list_display = ("title", "blog_type", "status", "reading_time_minutes", "view_count", "like_score", "created_at")
    list_filter = ("blog_type", "status", "difficulty")
    search_fields = ("title", "summary", "description")
    readonly_fields = ("slug", "reading_time_minutes", "view_count", "like_score", "created_at", "updated_at")
    filter_horizontal = ("tags", "scout_levels", "authors")
    ordering = ("-created_at",)
    actions = ContentApprovalMixin.approval_actions
