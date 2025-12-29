from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="SongGeneration Studio API",
    description="API for generating AI songs with Tencent's SongGeneration model",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Angular dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Import and include routers
from settings import router as settings_router
from library import router as library_router
from models import router as models_router
from generation import router as generation_router

app.include_router(settings_router, prefix="/api", tags=["Settings"])
app.include_router(library_router, prefix="/api", tags=["Library"])
app.include_router(models_router, prefix="/api", tags=["Setup"])
app.include_router(generation_router, prefix="/api", tags=["Generation"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
