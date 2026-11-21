import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth, invoices, validation, duplicates, vendors,
    purchase_orders, workflow, reports, settings as app_settings
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_TITLE,
    description="Automated invoice extraction, arithmetic reconciliation, Indian GST consistency, duplicate detection and 3-way matching workstation.",
    version=settings.VERSION
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(validation.router)
app.include_router(duplicates.router)
app.include_router(vendors.router)
app.include_router(purchase_orders.router)
app.include_router(workflow.router)
app.include_router(reports.router)
app.include_router(app_settings.router)

# Mount storage directory for document inspection previews
app.mount("/storage/invoices", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage_invoices")

# Mount frontend build if available
FRONTEND_DIST = settings.STORAGE_DIR.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        # Allow API routes and storage routes to bypass
        if full_path.startswith("api") or full_path.startswith("storage"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        target_file = FRONTEND_DIST / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def index_placeholder():
        return {
            "project": settings.PROJECT_NAME,
            "title": settings.PROJECT_TITLE,
            "tagline": settings.PROJECT_TAGLINE,
            "status": "API Server Operational",
            "docs": "/docs",
            "api_endpoints": "/api/invoices"
        }
