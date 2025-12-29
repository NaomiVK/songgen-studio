from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pathlib import Path
import asyncio
import subprocess

from database import get_db
from schemas import SetupStatus, ModelDownloadRequest, ModelSelectRequest
from sse import format_sse_event

router = APIRouter()

# Paths
BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
RUNTIME_DIR = MODELS_DIR / "runtime"

# Model repository mapping
MODEL_REPOS = {
    "SongGeneration-base": "lglg666/SongGeneration-base",
    "SongGeneration-base-new": "lglg666/SongGeneration-base-new",
    "SongGeneration-base-full": "lglg666/SongGeneration-base-full",
    "SongGeneration-large": "lglg666/SongGeneration-large",
}

RUNTIME_REPO = "lglg666/SongGeneration-Runtime"


def get_installed_models() -> list[str]:
    """Get list of installed model names."""
    if not MODELS_DIR.exists():
        return []

    installed = []
    for model_name in MODEL_REPOS.keys():
        model_dir = MODELS_DIR / model_name
        # Check if model directory exists and has checkpoint files
        if model_dir.exists() and any(model_dir.glob("*.pt")) or any(model_dir.glob("*.safetensors")):
            installed.append(model_name)
        # Also check for model.safetensors or pytorch_model.bin
        elif model_dir.exists() and (
            (model_dir / "model.safetensors").exists() or
            (model_dir / "pytorch_model.bin").exists() or
            any(model_dir.rglob("*.pt"))
        ):
            installed.append(model_name)

    return installed


def is_runtime_installed() -> bool:
    """Check if runtime files are installed."""
    if not RUNTIME_DIR.exists():
        return False
    # Check for some expected runtime files
    return any(RUNTIME_DIR.iterdir())


@router.get("/setup/status", response_model=SetupStatus)
async def get_setup_status():
    """Get current setup/installation status."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT value FROM settings WHERE key = 'current_model'"
        )
        row = await cursor.fetchone()
        current_model = row["value"] if row and row["value"] else None

    models = get_installed_models()
    runtime = is_runtime_installed()

    return SetupStatus(
        installed=len(models) > 0 and runtime,
        models=models,
        current_model=current_model,
        runtime_installed=runtime
    )


@router.post("/setup/download")
async def download_model(request: ModelDownloadRequest):
    """Download a model from HuggingFace with SSE progress."""

    async def generate():
        model_name = request.model
        repo = MODEL_REPOS.get(model_name)

        if not repo:
            yield format_sse_event("error", {"message": f"Unknown model: {model_name}"})
            return

        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        model_dir = MODELS_DIR / model_name

        # First, download runtime if not installed
        if not is_runtime_installed():
            yield format_sse_event("status", {
                "message": "Downloading runtime files...",
                "stage": "runtime"
            })

            try:
                process = await asyncio.create_subprocess_exec(
                    "huggingface-cli", "download",
                    RUNTIME_REPO,
                    "--local-dir", str(RUNTIME_DIR),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT
                )

                while True:
                    line = await process.stdout.readline()
                    if not line:
                        break
                    line_text = line.decode().strip()
                    if line_text:
                        yield format_sse_event("progress", {"message": line_text})

                await process.wait()

                if process.returncode != 0:
                    yield format_sse_event("error", {"message": "Runtime download failed"})
                    return

                yield format_sse_event("status", {
                    "message": "Runtime downloaded successfully",
                    "stage": "runtime_complete"
                })

            except FileNotFoundError:
                yield format_sse_event("error", {
                    "message": "huggingface-cli not found. Install with: pip install huggingface_hub"
                })
                return

        # Download the model
        yield format_sse_event("status", {
            "message": f"Downloading {model_name}...",
            "stage": "model"
        })

        try:
            process = await asyncio.create_subprocess_exec(
                "huggingface-cli", "download",
                repo,
                "--local-dir", str(model_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT
            )

            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                line_text = line.decode().strip()
                if line_text:
                    # Try to parse progress percentage
                    yield format_sse_event("progress", {"message": line_text})

            await process.wait()

            if process.returncode != 0:
                yield format_sse_event("error", {"message": f"Model download failed"})
                return

            # Set as current model
            async with get_db() as db:
                await db.execute(
                    "UPDATE settings SET value = ? WHERE key = 'current_model'",
                    (model_name,)
                )
                await db.commit()

            yield format_sse_event("done", {
                "message": f"{model_name} downloaded successfully",
                "model": model_name
            })

        except FileNotFoundError:
            yield format_sse_event("error", {
                "message": "huggingface-cli not found. Install with: pip install huggingface_hub"
            })
        except Exception as e:
            yield format_sse_event("error", {"message": str(e)})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.post("/setup/select-model")
async def select_model(request: ModelSelectRequest):
    """Select which model to use for generation."""
    installed = get_installed_models()

    if request.model not in installed:
        return {"error": f"Model {request.model} is not installed"}

    async with get_db() as db:
        await db.execute(
            "UPDATE settings SET value = ? WHERE key = 'current_model'",
            (request.model,)
        )
        await db.commit()

    return {"status": "ok", "current_model": request.model}
