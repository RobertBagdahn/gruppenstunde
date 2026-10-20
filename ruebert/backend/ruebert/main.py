"""Application factory. Run with `make backend` (uvicorn ruebert.main:app)."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from ruebert import __version__
from ruebert.api import api_router
from ruebert.api.errors import register_error_handlers
from ruebert.settings import get_settings


def create_app(*extra_routers: APIRouter) -> FastAPI:
    """Build the app. `extra_routers` lets tests mount helper routes under `/api`."""
    app = FastAPI(
        title="Rübert API",
        version=__version__,
        description="Bedarfsprognose und Bestellplanung für DeineGartenwelt (Version 2).",
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    register_error_handlers(app)
    app.include_router(api_router)
    for router in extra_routers:
        app.include_router(router, prefix="/api")
    frontend = get_settings().frontend_dist
    if frontend is not None and frontend.is_dir():
        mount_frontend(app, frontend)
    return app


def mount_frontend(app: FastAPI, directory: Path) -> None:
    """Serves the built single-page app. Unknown paths get index.html; /api paths never fall through."""
    root = directory.resolve()
    assets = root / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def single_page_app(full_path: str) -> FileResponse:
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(404, "Nicht gefunden.")
        candidate = (root / full_path).resolve()
        if full_path and candidate.is_file() and root in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(root / "index.html")


app = create_app()
