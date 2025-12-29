from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pathlib import Path
from datetime import datetime
import asyncio
import json
import uuid
import subprocess
import shutil

from database import get_db
from schemas import GenerationRequest, StemType
from sse import format_sse_event

router = APIRouter()

# Paths
BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "models"
SONGGEN_DIR = BASE_DIR / "SongGeneration"
DATA_DIR = BASE_DIR / "data"
OUTPUTS_DIR = DATA_DIR / "outputs"
TEMP_DIR = DATA_DIR / "temp"


async def get_current_settings() -> dict:
    """Get current settings from database."""
    async with get_db() as db:
        cursor = await db.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}


def get_audio_duration(file_path: Path) -> float:
    """Get audio duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(file_path)
            ],
            capture_output=True,
            text=True,
            timeout=30
        )
        return float(result.stdout.strip())
    except Exception:
        return 0.0


def convert_to_mp3(input_path: Path, output_path: Path) -> bool:
    """Convert audio file to MP3."""
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(input_path),
                "-codec:a", "libmp3lame", "-qscale:a", "2",
                str(output_path)
            ],
            capture_output=True,
            timeout=120
        )
        return result.returncode == 0
    except Exception:
        return False


@router.post("/generate")
async def generate_song(
    lyrics: str = Form(...),
    description: str = Form(...),
    stem_type: StemType = Form("full"),
    title: str = Form(None),
    auto_style: str = Form(None),
    reference_audio: UploadFile = File(None)
):
    """Generate a song with SSE progress updates."""

    async def generate():
        job_id = str(uuid.uuid4())[:8]
        song_id = f"song_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{job_id}"

        yield format_sse_event("status", {
            "job_id": job_id,
            "status": "preparing",
            "message": "Preparing generation..."
        })

        try:
            # Get settings
            settings = await get_current_settings()
            current_model = settings.get("current_model")

            if not current_model:
                yield format_sse_event("error", {
                    "message": "No model selected. Please download and select a model first."
                })
                return

            model_path = MODELS_DIR / current_model
            if not model_path.exists():
                yield format_sse_event("error", {
                    "message": f"Model not found: {current_model}"
                })
                return

            # Create directories
            TEMP_DIR.mkdir(parents=True, exist_ok=True)
            OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

            job_temp_dir = TEMP_DIR / job_id
            job_temp_dir.mkdir(exist_ok=True)

            job_output_dir = OUTPUTS_DIR / song_id
            job_output_dir.mkdir(exist_ok=True)

            # Handle reference audio
            reference_path = None
            if reference_audio:
                ref_ext = Path(reference_audio.filename).suffix or ".wav"
                reference_path = job_temp_dir / f"reference{ref_ext}"
                with open(reference_path, "wb") as f:
                    content = await reference_audio.read()
                    f.write(content)

            # Create JSONL input file
            input_data = {
                "idx": song_id,
                "gt_lyric": lyrics,
                "descriptions": description,
            }

            if reference_path:
                input_data["prompt_audio_path"] = str(reference_path)
            if auto_style:
                input_data["auto_prompt_audio_type"] = auto_style

            jsonl_path = job_temp_dir / "input.jsonl"
            with open(jsonl_path, "w") as f:
                f.write(json.dumps(input_data) + "\n")

            yield format_sse_event("status", {
                "job_id": job_id,
                "status": "generating",
                "message": "Starting generation (this may take 3-6 minutes)..."
            })

            # Build command
            cmd = [
                "bash", str(SONGGEN_DIR / "generate.sh"),
                str(model_path),
                str(jsonl_path),
                str(job_temp_dir / "output")
            ]

            # Add flags
            if settings.get("low_mem", "false").lower() == "true":
                cmd.append("--low_mem")
            if settings.get("flash_attn", "true").lower() != "true":
                cmd.append("--not_use_flash_attn")

            # Stem type flags
            if stem_type == "vocal":
                cmd.append("--vocal")
            elif stem_type == "bgm":
                cmd.append("--bgm")
            elif stem_type == "separate":
                cmd.append("--separate")

            # Run generation
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(SONGGEN_DIR)
            )

            # Stream output
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                line_text = line.decode().strip()
                if line_text:
                    yield format_sse_event("progress", {
                        "job_id": job_id,
                        "message": line_text
                    })

            await process.wait()

            if process.returncode != 0:
                yield format_sse_event("error", {
                    "job_id": job_id,
                    "message": "Generation failed. Check logs for details."
                })
                return

            yield format_sse_event("status", {
                "job_id": job_id,
                "status": "converting",
                "message": "Converting to MP3..."
            })

            # Find and convert output files
            output_temp = job_temp_dir / "output"
            output_path = None
            output_vocal_path = None
            output_bgm_path = None
            duration = None

            # Look for generated WAV files
            wav_files = list(output_temp.rglob("*.wav")) if output_temp.exists() else []

            for wav_file in wav_files:
                mp3_name = wav_file.stem + ".mp3"
                mp3_path = job_output_dir / mp3_name

                if convert_to_mp3(wav_file, mp3_path):
                    # Determine type based on filename
                    if "vocal" in wav_file.stem.lower():
                        output_vocal_path = str(mp3_path)
                    elif "bgm" in wav_file.stem.lower() or "instrumental" in wav_file.stem.lower():
                        output_bgm_path = str(mp3_path)
                    else:
                        output_path = str(mp3_path)
                        duration = get_audio_duration(mp3_path)

            # If only one file and stem_type is full, use it as main output
            if not output_path and wav_files:
                first_wav = wav_files[0]
                mp3_path = job_output_dir / (first_wav.stem + ".mp3")
                if convert_to_mp3(first_wav, mp3_path):
                    output_path = str(mp3_path)
                    duration = get_audio_duration(mp3_path)

            if not output_path and not output_vocal_path and not output_bgm_path:
                yield format_sse_event("error", {
                    "job_id": job_id,
                    "message": "No output files generated"
                })
                return

            # Save reference audio if provided
            saved_reference_path = None
            if reference_path and reference_path.exists():
                saved_reference_path = str(job_output_dir / reference_path.name)
                shutil.copy(reference_path, saved_reference_path)

            # Save to database
            async with get_db() as db:
                await db.execute("""
                    INSERT INTO songs (
                        id, title, lyrics, description, reference_audio_path,
                        stem_type, output_path, output_vocal_path, output_bgm_path,
                        duration_seconds, model_version
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    song_id,
                    title or f"Song {job_id}",
                    lyrics,
                    description,
                    saved_reference_path,
                    stem_type,
                    output_path,
                    output_vocal_path,
                    output_bgm_path,
                    duration,
                    current_model
                ))
                await db.commit()

            # Cleanup temp directory
            shutil.rmtree(job_temp_dir, ignore_errors=True)

            yield format_sse_event("done", {
                "job_id": job_id,
                "status": "done",
                "message": "Generation complete!",
                "song_id": song_id
            })

        except Exception as e:
            yield format_sse_event("error", {
                "job_id": job_id,
                "message": f"Error: {str(e)}"
            })

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/generate/status/{job_id}")
async def get_generation_status(job_id: str):
    """Get status of a generation job (placeholder for future job queue)."""
    # In a more complex implementation, this would check a job queue
    # For now, status is streamed via SSE
    return {
        "job_id": job_id,
        "message": "Use SSE stream from /api/generate for real-time status"
    }
