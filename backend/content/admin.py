"""Django admin configuration for the content app.

Includes model registrations, custom actions, and a reusable
ContentApprovalMixin for content-type admins (session, blog, game, recipe).
"""

from django.contrib import admin

from .models import (
    ApprovalLog,
    ContentComment,
    ContentEmotion,
    ContentLink,
    ContentView,
    EmbeddingFeedback,
    FeaturedContent,
    ScoutLevel,
    SearchLog,
    Tag,
    TagSuggestion,
)


# ---------------------------------------------------------------------------
# Reusable mixin for content-type admins (GroupSession, Blog, Game, Recipe)
# ---------------------------------------------------------------------------


class ContentApprovalMixin:
    """
    Mixin providing approval/reject/archive actions and embedding updates
    for any admin class whose model inherits from Content.

    Usage:
        class GroupSessionAdmin(ContentApprovalMixin, admin.ModelAdmin):
            actions = [...existing_actions..., *ContentApprovalMixin.approval_actions]
    """

    @admin.action(description="Ausgewählte genehmigen (approved)")
    def approve_selected(self, request, queryset):
        from content.choices import ContentStatus

        count = queryset.filter(status=ContentStatus.SUBMITTED).update(status=ContentStatus.APPROVED)
        self.message_user(request, f"{count} Inhalt(e) genehmigt.")

    @admin.action(description="Ausgewählte ablehnen (rejected)")
    def reject_selected(self, request, queryset):
        from content.choices import ContentStatus

        count = queryset.filter(status=ContentStatus.SUBMITTED).update(status=ContentStatus.REJECTED)
        self.message_user(request, f"{count} Inhalt(e) abgelehnt.")

    @admin.action(description="Ausgewählte archivieren (archived)")
    def archive_selected(self, request, queryset):
        from content.choices import ContentStatus

        count = queryset.filter(status=ContentStatus.APPROVED).update(status=ContentStatus.ARCHIVED)
        self.message_user(request, f"{count} Inhalt(e) archiviert.")

    @admin.action(description="Embeddings aktualisieren")
    def update_embeddings(self, request, queryset):
        from content.services.embedding_service import update_content_embedding

        updated = 0
        failed = 0
        for item in queryset:
            try:
                if update_content_embedding(item, force=True):
                    updated += 1
            except Exception:
                failed += 1
        self.message_user(
            request,
            f"Embeddings: {updated} aktualisiert, {failed} fehlgeschlagen.",
        )

    approval_actions = [
        "approve_selected",
        "reject_selected",
        "archive_selected",
        "update_embeddings",
    ]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "sort_order", "is_approved", "icon"]
    list_filter = ["is_approved", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["sort_order", "name"]
    list_editable = ["sort_order", "is_approved"]
    list_per_page = 50


@admin.register(ScoutLevel)
class ScoutLevelAdmin(admin.ModelAdmin):
    list_display = ["name", "sorting", "icon"]
    ordering = ["sorting"]


@admin.register(TagSuggestion)
class TagSuggestionAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "suggested_by", "is_processed", "created_at"]
    list_filter = ["is_processed"]
    search_fields = ["name"]
    ordering = ["-created_at"]
    actions = ["mark_processed"]

    @admin.action(description="Als verarbeitet markieren")
    def mark_processed(self, request, queryset):
        queryset.update(is_processed=True)


@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ["query", "results_count", "user", "created_at"]
    search_fields = ["query"]
    list_filter = ["created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    readonly_fields = ["query", "results_count", "user", "created_at"]


@admin.register(ContentComment)
class ContentCommentAdmin(admin.ModelAdmin):
    list_display = ["short_text", "content_type", "object_id", "user", "author_name", "status", "created_at"]
    list_filter = ["status", "content_type", "created_at"]
    search_fields = ["text", "author_name"]
    ordering = ["-created_at"]
    list_editable = ["status"]
    date_hierarchy = "created_at"
    readonly_fields = ["content_type", "object_id", "user", "created_at", "updated_at"]
    actions = ["approve_comments", "reject_comments"]
    list_per_page = 30

    @admin.display(description="Text")
    def short_text(self, obj):
        return obj.text[:80] + "..." if len(obj.text) > 80 else obj.text

    @admin.action(description="Ausgewählte Kommentare freigeben")
    def approve_comments(self, request, queryset):
        count = queryset.update(status="approved")
        self.message_user(request, f"{count} Kommentar(e) freigegeben.")

    @admin.action(description="Ausgewählte Kommentare ablehnen")
    def reject_comments(self, request, queryset):
        count = queryset.update(status="rejected")
        self.message_user(request, f"{count} Kommentar(e) abgelehnt.")


@admin.register(ContentEmotion)
class ContentEmotionAdmin(admin.ModelAdmin):
    list_display = ["emotion_type", "content_type", "object_id", "user", "created_at"]
    list_filter = ["emotion_type", "content_type", "created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    readonly_fields = ["content_type", "object_id", "emotion_type", "user", "session_key", "created_at"]


@admin.register(ContentView)
class ContentViewAdmin(admin.ModelAdmin):
    list_display = ["content_type", "object_id", "session_key", "user", "created_at"]
    list_filter = ["content_type", "created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    readonly_fields = ["content_type", "object_id", "session_key", "ip_hash", "user_agent", "user", "created_at"]


@admin.register(ContentLink)
class ContentLinkAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "source_content_type",
        "source_object_id",
        "target_content_type",
        "target_object_id",
        "link_type",
        "relevance_score",
        "is_rejected",
        "created_at",
    ]
    list_filter = ["link_type", "is_rejected", "source_content_type", "target_content_type"]
    ordering = ["-created_at"]
    list_editable = ["is_rejected"]
    readonly_fields = ["created_at", "created_by"]
    actions = ["reject_links", "restore_links"]

    @admin.action(description="Ausgewählte Links ablehnen")
    def reject_links(self, request, queryset):
        count = queryset.update(is_rejected=True)
        self.message_user(request, f"{count} Link(s) abgelehnt.")

    @admin.action(description="Ausgewählte Links wiederherstellen")
    def restore_links(self, request, queryset):
        count = queryset.update(is_rejected=False)
        self.message_user(request, f"{count} Link(s) wiederhergestellt.")


@admin.register(EmbeddingFeedback)
class EmbeddingFeedbackAdmin(admin.ModelAdmin):
    list_display = ["id", "content_link", "feedback_type", "short_notes", "created_by", "created_at"]
    list_filter = ["feedback_type", "created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    readonly_fields = ["content_link", "feedback_type", "notes", "created_by", "created_at"]
    search_fields = ["notes"]

    @admin.display(description="Notizen")
    def short_notes(self, obj):
        return obj.notes[:60] + "..." if len(obj.notes) > 60 else obj.notes


@admin.register(ApprovalLog)
class ApprovalLogAdmin(admin.ModelAdmin):
    list_display = ["id", "content_type", "object_id", "action", "reviewer", "short_reason", "created_at"]
    list_filter = ["action", "content_type", "created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"
    readonly_fields = ["content_type", "object_id", "action", "reviewer", "reason", "created_at"]
    search_fields = ["reason"]

    @admin.display(description="Grund")
    def short_reason(self, obj):
        return obj.reason[:60] + "..." if len(obj.reason) > 60 else obj.reason


@admin.register(FeaturedContent)
class FeaturedContentAdmin(admin.ModelAdmin):
    list_display = ["content_type", "object_id", "featured_from", "featured_until", "reason", "created_by"]
    list_filter = ["content_type", "featured_from"]
    ordering = ["-featured_from"]
    readonly_fields = ["created_by", "created_at"]
    search_fields = ["reason"]
