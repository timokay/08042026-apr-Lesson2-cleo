"""
Клёво AI Service — FastAPI application
Handles: CSV parsing, transaction categorization, parasite detection, roast generation
"""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import HealthResponse
from routers.analyze_router import router as analyze_router
from routers.roast_router import router as roast_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

WEB_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("Клёво AI Service starting up")
    yield
    logger.info("Клёво AI Service shutting down")


app = FastAPI(
    title="Клёво AI Service",
    description="AI financial analysis — CSV parsing, roast generation, parasite detection",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow only the web app (restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[WEB_URL, "http://web:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Routers
app.include_router(analyze_router)
app.include_router(roast_router)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check for Docker Compose and load balancer."""
    claude_key = os.getenv("CLAUDE_API_KEY", "")
    yandex_key = os.getenv("YANDEX_GPT_API_KEY", "")

    if claude_key:
        llm_status = "connected"
    elif yandex_key:
        llm_status = "fallback"
    else:
        llm_status = "unavailable"

    return HealthResponse(status="ok", version="0.1.0", llm=llm_status)
