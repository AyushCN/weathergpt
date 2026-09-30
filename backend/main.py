from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import init_db, engine
from backend.api import weather, chat, auth
from contextlib import asynccontextmanager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    init_db()
    logger.info("Database initialized")
    yield
    # Shutdown events
    await weather.weather_service.close()
    logger.info("Weather service closed")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Conversational Weather Intelligence Platform",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(weather.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

if os.path.isdir(dist_dir):
    # Serve assets folder
    assets_dir = os.path.join(dist_dir, 'assets')
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    
    # Catch-all to serve index.html for React Router (and any root static files)
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        path = os.path.join(dist_dir, full_path)
        if os.path.isfile(path):
            return FileResponse(path)
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running API only (Frontend not built)",
            "docs": "/docs",
        }