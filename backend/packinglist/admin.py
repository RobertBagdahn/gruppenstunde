from django.contrib import admin

from .models import PackingCategory, PackingItem, PackingList


class PackingCategoryInline(admin.TabularInline):
    model = PackingCategory
    extra = 1


class PackingItemInline(admin.TabularInline):
    model = PackingItem
    extra = 1


@admin.register(PackingList)
class PackingListAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "group", "is_template", "category_count", "created_at"]
    list_filter = ["group", "is_template"]
    search_fields = ["title", "description", "owner__email"]
    raw_id_fields = ["owner", "group"]
    inlines = [PackingCategoryInline]
    list_per_page = 25

    @admin.display(description="Kategorien")
    def category_count(self, obj):
        return obj.categories.count()


@admin.register(PackingCategory)
class PackingCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "packing_list", "sort_order", "item_count"]
    list_filter = ["packing_list"]
    search_fields = ["name"]
    inlines = [PackingItemInline]
    list_per_page = 25

    @admin.display(description="Gegenstände")
    def item_count(self, obj):
        return obj.items.count()


@admin.register(PackingItem)
class PackingItemAdmin(admin.ModelAdmin):
    list_display = ["name", "quantity", "is_checked", "category", "sort_order"]
    list_filter = ["is_checked"]
    search_fields = ["name"]
    list_per_page = 25
