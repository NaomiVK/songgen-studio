# SongGeneration Studio - Project Context

This file provides context for Claude Code sessions working on this project.

## Project Status: MVP Complete

The basic application structure is built and functional. The app wraps Tencent AI Lab's SongGeneration (LeVo) model with a web UI.

**GitHub:** https://github.com/NaomiVK/songgen-studio

## What's Built

### Backend (Python FastAPI) - `backend/`
- `main.py` - Entry point with CORS configured for localhost:4200
- `database.py` - SQLite setup with songs and settings tables
- `schemas.py` - Pydantic models for all API request/response types
- `settings.py` - GET/PUT settings, GET GPU info
- `library.py` - Full CRUD for songs, audio streaming, downloads
- `models.py` - Model download via huggingface-cli with SSE progress
- `generation.py` - Song generation wrapping generate.sh with SSE progress
- `sse.py` - SSE helper utilities

### Frontend (Angular 17+ with Material) - `frontend/`
- **Services:** `api.service.ts`, `sse.service.ts`, `audio.service.ts`
- **Components:**
  - `song-builder/` - Main page with drag-drop sections, style panel, reference audio upload
  - `library/` - Song grid with playback, download, delete
  - `setup/` - Model download cards, GPU info, settings toggles
  - `audio-player/` - Persistent bottom bar player

### External Dependencies (not in repo)
- `SongGeneration/` - Must clone: `git clone https://github.com/tencent-ailab/SongGeneration`
- `models/` - Downloaded via Setup UI (10-22GB each)
- `data/` - Created at runtime (SQLite DB + generated audio)

## What Still Needs Work

### High Priority
1. **Test end-to-end generation** - The generation.py code hasn't been tested with the actual model yet
2. **SongGeneration Python environment** - Need to set up venv with its requirements
3. **Error handling** - Add better error messages when model/ffmpeg not found
4. **Output file detection** - The WAV file naming pattern from generate.sh needs verification

### Medium Priority
1. **Loading states** - Add spinners/skeletons while fetching data
2. **Form validation** - Validate lyrics format, required fields
3. **Reference audio warning** - Warn when using both reference audio and style description
4. **Cancel generation** - Add ability to cancel running generation

### Nice to Have
1. **Style presets** - Quick buttons for common genre/mood combinations
2. **Waveform visualization** - Show audio waveform in player
3. **Dark mode** - Theme toggle
4. **Export/import** - Save/load song configurations

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Angular 17+, Angular Material, CDK Drag-Drop |
| Backend | Python FastAPI, aiosqlite, SSE |
| Database | SQLite |
| AI Model | SongGeneration (LeVo) via CLI |
| Audio | FFmpeg for WAV→MP3 conversion |

## Key Files to Know

**Backend entry:** `backend/main.py`
**Frontend entry:** `frontend/src/main.ts`
**API service:** `frontend/src/app/services/api.service.ts`
**Generation logic:** `backend/generation.py`
**Model wrapper:** Calls `SongGeneration/generate.sh`

## Running Locally

```bash
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
python main.py  # Runs on :8000

# Terminal 2 - Frontend
cd frontend
npm install
npm start  # Runs on :4200
```

## Model Generation Flow

1. Frontend POSTs to `/api/generate` with lyrics, description, stem_type
2. Backend creates JSONL input file
3. Backend runs `generate.sh <model_path> <input.jsonl> <output_dir> [flags]`
4. Progress streamed via SSE
5. WAV converted to MP3 via FFmpeg
6. Song saved to SQLite, files to `data/outputs/`

## SongGeneration Model Info

**Repo:** https://github.com/tencent-ailab/SongGeneration
**Models (HuggingFace):**
- `lglg666/SongGeneration-base` - 10GB VRAM, Chinese
- `lglg666/SongGeneration-base-new` - 10GB VRAM, Chinese + English
- `lglg666/SongGeneration-base-full` - 12GB VRAM, longer songs
- `lglg666/SongGeneration-large` - 22GB VRAM, best quality

**Runtime also required:** `lglg666/SongGeneration-Runtime`

## Lyric Format

```
[intro-short] ; [verse] First line. Second line ; [chorus] Chorus here ; [outro-short]
```

Sections: intro-short, intro-medium, verse, chorus, bridge, inst-short, inst-medium, outro-short, outro-medium

## Style Description Format

```
female, bright, pop, happy, piano and drums, the bpm is 120
```
