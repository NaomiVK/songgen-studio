from fastapi import APIRouter
import subprocess

from database import get_db
from schemas import Settings, SettingsUpdate, GPUInfo

router = APIRouter()


@router.get("/settings", response_model=Settings)
async def get_settings():
    """Get current application settings."""
    async with get_db() as db:
        cursor = await db.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()

        settings_dict = {row["key"]: row["value"] for row in rows}

        return Settings(
            low_mem=settings_dict.get("low_mem", "false").lower() == "true",
            flash_attn=settings_dict.get("flash_attn", "true").lower() == "true",
            output_dir=settings_dict.get("output_dir", "./data/outputs"),
            current_model=settings_dict.get("current_model") or None
        )


@router.put("/settings", response_model=Settings)
async def update_settings(update: SettingsUpdate):
    """Update application settings."""
    async with get_db() as db:
        if update.low_mem is not None:
            await db.execute(
                "UPDATE settings SET value = ? WHERE key = ?",
                (str(update.low_mem).lower(), "low_mem")
            )
        if update.flash_attn is not None:
            await db.execute(
                "UPDATE settings SET value = ? WHERE key = ?",
                (str(update.flash_attn).lower(), "flash_attn")
            )
        if update.output_dir is not None:
            await db.execute(
                "UPDATE settings SET value = ? WHERE key = ?",
                (update.output_dir, "output_dir")
            )
        await db.commit()

    return await get_settings()


@router.get("/gpu", response_model=GPUInfo)
async def get_gpu_info():
    """Get GPU information using nvidia-smi."""
    try:
        # Get GPU name and memory info
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits"
            ],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode != 0:
            return GPUInfo(
                name="No GPU detected",
                vram_total=0,
                vram_used=0,
                vram_free=0
            )

        line = result.stdout.strip().split("\n")[0]  # Get first GPU
        parts = [p.strip() for p in line.split(",")]

        # Get CUDA version
        cuda_result = subprocess.run(
            ["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=10
        )
        cuda_version = cuda_result.stdout.strip().split("\n")[0] if cuda_result.returncode == 0 else None

        return GPUInfo(
            name=parts[0],
            vram_total=float(parts[1]) / 1024,  # Convert MiB to GB
            vram_used=float(parts[2]) / 1024,
            vram_free=float(parts[3]) / 1024,
            cuda_version=cuda_version
        )

    except FileNotFoundError:
        return GPUInfo(
            name="nvidia-smi not found",
            vram_total=0,
            vram_used=0,
            vram_free=0
        )
    except Exception as e:
        return GPUInfo(
            name=f"Error: {str(e)}",
            vram_total=0,
            vram_used=0,
            vram_free=0
        )
