from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from backend.database import init_db, engine
from backend.api import weather, chat, auth
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Initialize database on startup
init_db()
logger.info("Database initialized")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Conversational Weather Intelligence Platform",
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


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": "weathergpt-api",
    }