"""HTTP layer: thin routers per area. Business logic lives in `ruebert.domain`, never here."""

from fastapi import APIRouter

from ruebert.api import (
    app_settings,
    cases,
    events,
    feedback,
    health,
    order_plans,
    products,
    quality,
    questions,
    status,
    stockouts,
    supplier_orders,
    traffic_light,
    wiki,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(app_settings.router)
api_router.include_router(status.router)
api_router.include_router(traffic_light.router)
api_router.include_router(order_plans.router)
api_router.include_router(products.router)
api_router.include_router(cases.router)
api_router.include_router(stockouts.router)
api_router.include_router(events.router)
api_router.include_router(supplier_orders.router)
api_router.include_router(quality.router)
api_router.include_router(feedback.router)
api_router.include_router(questions.router)
api_router.include_router(wiki.router)
