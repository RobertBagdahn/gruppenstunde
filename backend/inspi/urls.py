from django.conf import settings
from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from ninja import NinjaAPI

from core.api import auth_router, search_router
from idea.api import admin_router, ai_router, material_router, router as idea_router, tag_router, user_router
from idea.ingredient_api import ingredient_router, retail_section_router
from recipe.api import router as recipe_router
from planner.api import router as planner_router
from planner.meal_plan_api import meal_plan_router
from profiles.api import group_router, profile_router
from event.api import event_router, location_router, person_router
from packinglist.api import packing_list_router

api = NinjaAPI(
    title="Inspi API",
    description="API für die Pfadfinder-Gruppenstunden-Plattform",
    version="2.0.0",
)

api.add_router("/auth/", auth_router)
api.add_router("/search/", search_router)
api.add_router("/ideas/", idea_router)
api.add_router("/tags/", tag_router)
api.add_router("/ai/", ai_router)
api.add_router("/users/", user_router)
api.add_router("/planner/", planner_router)
api.add_router("/meal-plans/", meal_plan_router)
api.add_router("/materials/", material_router)
api.add_router("/admin/", admin_router)
api.add_router("/profile/", profile_router)
api.add_router("/groups/", group_router)
api.add_router("/events/", event_router)
api.add_router("/persons/", person_router)
api.add_router("/locations/", location_router)
api.add_router("/packing-lists/", packing_list_router)
api.add_router("/ingredients/", ingredient_router)
api.add_router("/retail-sections/", retail_section_router)
api.add_router("/recipes/", recipe_router)


def sitemap_xml(request):
    """Generate sitemap.xml for search engine crawlers."""
    from idea.models import Idea
    from idea.choices import StatusChoices

    domain = request.get_host()
    scheme = "https" if request.is_secure() else "http"
    frontend_base = f"{scheme}://{domain}"

    urls = []
    # Static pages
    for loc in ["/", "/search"]:
        urls.append(
            f"  <url><loc>{frontend_base}{loc}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>"
        )

    # Idea pages with slug
    ideas = Idea.objects.filter(status=StatusChoices.PUBLISHED).values("slug", "updated_at")
    for idea in ideas:
        lastmod = idea["updated_at"].strftime("%Y-%m-%d")
        urls.append(
            f"  <url><loc>{frontend_base}/idea/{idea['slug']}</loc>"
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
    try:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
    except ImportError:
        pass
