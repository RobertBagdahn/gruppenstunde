from django.contrib import admin

from .models import KitchenReminder, KitchenReminderCategory, ShoppingAllocationRule, Store


class KitchenReminderInline(admin.TabularInline):
    model = KitchenReminder
    extra = 1
    fields = ("name", "sort_order", "is_published", "suggested_by")
    readonly_fields = ("suggested_by",)


@admin.register(KitchenReminderCategory)
class KitchenReminderCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "sort_order", "reminder_count")
    list_editable = ("sort_order",)
    ordering = ("sort_order",)
    inlines = [KitchenReminderInline]

    def reminder_count(self, obj: KitchenReminderCategory) -> int:
        return obj.reminders.count()

    reminder_count.short_description = "Anzahl Artikel"  # type: ignore[attr-defined]


@admin.register(KitchenReminder)
class KitchenReminderAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_published", "suggested_by", "sort_order")
    list_filter = ("is_published", "category")
    list_editable = ("is_published", "category", "sort_order")
    search_fields = ("name",)
    ordering = ("category__sort_order", "sort_order", "name")


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__username")
    raw_id_fields = ("owner",)


@admin.register(ShoppingAllocationRule)
class ShoppingAllocationRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "event", "target", "ingredient", "material", "meal", "quantity")
    list_filter = ("event",)
    raw_id_fields = ("event", "target", "ingredient", "material", "meal", "created_by")
