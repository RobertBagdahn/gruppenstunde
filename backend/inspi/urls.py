from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from ninja import NinjaAPI

from core.api import auth_router
from content.admin_api import router as admin_router
from content.api import router as content_router
from recipe.api import router as recipe_router
from recipe.api.cockpit import cockpit_router, health_rule_router
from planner.api import router as planner_router
from planner.meal_plan_api import meal_plan_router
from profiles.api import group_router, profile_router
from event.api import event_router, location_router, person_router
from packinglist.api import packing_list_router
from shopping.api import shopping_router
from session.api import router as session_router
from supply.api import router as supply_router, ingredient_router, retail_section_router, norm_person_router
from blog.api import router as blog_router
from game.api import router as game_router
from content.tags_api import tags_router, scout_levels_router

api = NinjaAPI(
    title="Inspi API",
    description="API für die Pfadfinder-Gruppenstunden-Plattform",
    version="2.0.0",
)

api.add_router("/auth/", auth_router)
api.add_router("/admin/", admin_router)
api.add_router("/planner/", planner_router)
api.add_router("/meal-events/", meal_plan_router)
api.add_router("/profile/", profile_router)
api.add_router("/groups/", group_router)
api.add_router("/events/", event_router)
api.add_router("/persons/", person_router)
api.add_router("/locations/", location_router)
api.add_router("/packing-lists/", packing_list_router)
api.add_router("/shopping-lists/", shopping_router)
api.add_router("/ingredients/", ingredient_router)
api.add_router("/retail-sections/", retail_section_router)
api.add_router("/recipes/", recipe_router)
api.add_router("/health-rules/", health_rule_router)
api.add_router("/", cockpit_router)
# Content-type routers
api.add_router("/sessions/", session_router)
api.add_router("/supplies/", supply_router)
api.add_router("/norm-person/", norm_person_router)
api.add_router("/blogs/", blog_router)
api.add_router("/games/", game_router)
api.add_router("/tags/", tags_router)
api.add_router("/scout-levels/", scout_levels_router)
api.add_router("/content/", content_router)


def sitemap_xml(request):
    """Generate sitemap.xml for search engine crawlers."""
    from content.choices import ContentStatus
    from session.models import GroupSession
    from blog.models import Blog
    from game.models import Game
    from recipe.models import Recipe

    domain = request.get_host()
    scheme = "https" if request.is_secure() else "http"
    frontend_base = f"{scheme}://{domain}"

    urls = []
    # Static pages
    for loc in ["/", "/search"]:
        urls.append(
            f"  <url><loc>{frontend_base}{loc}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>"
        )

    # Content pages with slug
    content_types = [
        (GroupSession, "/sessions/"),
        (Blog, "/blogs/"),
        (Game, "/games/"),
        (Recipe, "/recipes/"),
    ]
    for Model, prefix in content_types:
        items = Model.objects.filter(status=ContentStatus.APPROVED).values("slug", "updated_at")
        for item in items:
            lastmod = item["updated_at"].strftime("%Y-%m-%d")
            urls.append(
                f"  <url><loc>{frontend_base}{prefix}{item['slug']}</loc>"
                f"<lastmod>{lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>"
            )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>"
    )
    return HttpResponse(xml, content_type="application/xml")


def robots_txt(request):
    """Serve robots.txt for search engine crawlers."""
    domain = request.get_host()
    scheme = "https" if request.is_secure() else "http"
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /api/",
        "Disallow: /profile",
        "Disallow: /login",
        "Disallow: /register",
        "",
        f"Sitemap: {scheme}://{domain}/sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
    path("sitemap.xml", sitemap_xml, name="sitemap"),
    path("robots.txt", robots_txt, name="robots"),
]

if settings.DEBUG:
    from django.conf.urls.static import static

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    try:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
