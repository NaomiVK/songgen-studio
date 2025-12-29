from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


# Settings schemas
class Settings(BaseModel):
    low_mem: bool = False
    flash_attn: bool = True
    output_dir: str = "./data/outputs"
    current_model: Optional[str] = None


class SettingsUpdate(BaseModel):
    low_mem: Optional[bool] = None
    flash_attn: Optional[bool] = None
    output_dir: Optional[str] = None


class GPUInfo(BaseModel):
    name: str
    vram_total: float  # GB
    vram_used: float   # GB
    vram_free: float   # GB
    cuda_version: Optional[str] = None


# Setup/Model schemas
class SetupStatus(BaseModel):
    installed: bool
    models: list[str]
    current_model: Optional[str]
    runtime_installed: bool


class ModelDownloadRequest(BaseModel):
    model: Literal[
        "SongGeneration-base",
        "SongGeneration-base-new",
        "SongGeneration-base-full",
        "SongGeneration-large"
    ]


class ModelSelectRequest(BaseModel):
    model: str


# Song/Library schemas
StemType = Literal["full", "vocal", "bgm", "separate"]


class Song(BaseModel):
    id: str
    title: Optional[str] = None
    created_at: datetime
    lyrics: str
    description: str
    reference_audio_path: Optional[str] = None
    stem_type: StemType
    output_path: Optional[str] = None
    output_vocal_path: Optional[str] = None
    output_bgm_path: Optional[str] = None
    duration_seconds: Optional[float] = None
    model_version: Optional[str] = None


class SongCreate(BaseModel):
    title: Optional[str] = None
    lyrics: str
    description: str
    stem_type: StemType = "full"


class SongUpdate(BaseModel):
    title: Optional[str] = None


class SongList(BaseModel):
    songs: list[Song]
    total: int
    page: int
    limit: int


# Generation schemas
class GenerationRequest(BaseModel):
    lyrics: str = Field(..., description="Formatted lyric string with sections")
    description: str = Field(..., description="Style description string")
    stem_type: StemType = "full"
    title: Optional[str] = None
    auto_style: Optional[str] = None  # Alternative to reference_audio


class GenerationStatus(BaseModel):
    job_id: str
    status: Literal["preparing", "generating", "converting", "done", "error"]
    progress: Optional[float] = None
    message: str
    song_id: Optional[str] = None


# SSE Event schemas
class SSEEvent(BaseModel):
    event: str
    data: dict
