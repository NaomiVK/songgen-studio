# SongGeneration Studio

A web-based UI for Tencent AI Lab's SongGeneration (LeVo) model. This project provides a clean interface for generating AI songs with vocals, lyrics, and instrumental tracks.

## Project Overview

Build a local web application that wraps the SongGeneration model with a user-friendly interface. The app should handle model setup/download, provide a visual song builder, and manage a library of generated songs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 17+ (standalone components) |
| Backend | Python FastAPI |
| Real-time | Server-Sent Events (SSE) |
| Database | SQLite |
| Storage | Local filesystem |
| Audio | FFmpeg (for MP3 conversion) |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Angular Frontend                     │
├──────────┬──────────┬───────────┬──────────────────┤
│  Song    │  Style   │  Library  │  Settings/       │
│  Builder │  Panel   │  View     │  Model Setup     │
└────┬─────┴────┬─────┴─────┬─────┴────────┬─────────┘
     │          │           │              │
     └──────────┴─────┬─────┴──────────────┘
                      │ HTTP + SSE
     ┌────────────────▼────────────────────┐
     │         FastAPI Backend             │
     ├─────────────┬───────────────────────┤
     │  Generation │  Model    │  Library  │
     │  Engine     │  Manager  │  CRUD     │
     └──────┬──────┴─────┬─────┴─────┬─────┘
            │            │           │
     ┌──────▼──────┐  ┌──▼───┐  ┌───▼────┐
     │ SongGen     │  │ HF   │  │ SQLite │
     │ Model       │  │ CLI  │  │ + /out │
     └─────────────┘  └──────┘  └────────┘
```

## Directory Structure

```
songgen-studio/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── generation.py        # Wraps SongGeneration model CLI
│   ├── models.py            # Model download/management via huggingface-cli
│   ├── library.py           # SQLite CRUD operations
│   ├── schemas.py           # Pydantic request/response models
│   ├── sse.py               # Server-Sent Events helpers
│   └── requirements.txt
├── frontend/                # Angular project
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── song-builder/      # Drag/drop section editor
│   │   │   │   ├── style-panel/       # Genre, mood, voice controls
│   │   │   │   ├── reference-audio/   # Upload for style cloning
│   │   │   │   ├── stem-selector/     # Full/vocals/instrumental toggle
│   │   │   │   ├── generation-progress/  # Real-time progress display
│   │   │   │   ├── library/           # List/play/delete generations
│   │   │   │   └── setup/             # Model download UI
│   │   │   ├── services/
│   │   │   │   ├── api.service.ts
│   │   │   │   ├── sse.service.ts
│   │   │   │   └── audio.service.ts
│   │   │   └── models/
│   │   │       └── song.models.ts
│   │   └── ...
│   └── ...
├── data/
│   ├── library.db           # SQLite database
│   └── outputs/             # Generated audio files
├── models/                  # Downloaded SongGeneration checkpoints
└── README.md
```

## Features

### 1. Model Setup & Download

The app should handle first-time setup:

- Check if models exist in `./models/` directory
- Download required models via `huggingface-cli`:
  - Runtime files: `huggingface-cli download lglg666/SongGeneration-Runtime --local-dir ./models/runtime`
  - Model checkpoint (user selects which):
    - `lglg666/SongGeneration-base` (10GB VRAM, Chinese)
    - `lglg666/SongGeneration-base-new` (10GB VRAM, Chinese + English)
    - `lglg666/SongGeneration-base-full` (12GB VRAM, 4m30s songs)
    - `lglg666/SongGeneration-large` (22GB VRAM, best quality)
- Show download progress
- Verify installation

### 2. Song Builder

Visual editor for constructing song structure:

**Section Types:**
| Section | Has Lyrics | Duration |
|---------|------------|----------|
| `[intro-short]` | No | ~0-10s |
| `[intro-medium]` | No | ~10-20s |
| `[verse]` | Yes | Variable |
| `[chorus]` | Yes | Variable |
| `[bridge]` | Yes | Variable |
| `[inst-short]` | No | ~0-10s |
| `[inst-medium]` | No | ~10-20s |
| `[outro-short]` | No | ~0-10s |
| `[outro-medium]` | No | ~10-20s |

**UI Requirements:**
- Drag and drop to reorder sections
- Add/remove sections
- Lyrics text input for vocal sections (verse/chorus/bridge)
- Each lyric line should end with a period
- Preview of formatted output

**Output Format:**
Sections separated by `;`, lyrics within sections separated by `.`
```
[intro-short] ; [verse] First line of lyrics. Second line of lyrics ; [chorus] Chorus line one. Chorus line two ; [outro-short]
```

### 3. Style Panel

Controls for musical attributes:

| Control | Type | Options/Range |
|---------|------|---------------|
| Genre | Dropdown/Multi | Pop, Rock, Hip-Hop, R&B, Electronic, Jazz, Metal, Folk, Dance, Reggae, Chinese Style, Chinese Tradition, Chinese Opera |
| Mood/Emotion | Dropdown/Multi | Happy, Sad, Energetic, Romantic, Melancholic, Uplifting, Dark, Bright, Soft |
| Voice Gender | Toggle | Male, Female |
| Timbre | Dropdown | Dark, Bright, Soft, Warm, Clear, Raspy |
| Instruments | Multi-select | Piano, Guitar, Drums, Bass, Synth, Strings, Brass, etc. |
| BPM | Slider/Input | 60-180 |

**Output Format:**
Comma-separated string:
```
female, dark, pop, sad, piano and drums, the bpm is 120
```

### 4. Reference Audio

- File upload (accepts audio files)
- Only first 10 seconds used
- Optional - when provided, style description may conflict (warn user)
- Preview playback
- Clear/remove option

### 5. Stem Selection

Radio button or toggle for output type:
- **Full Mix** - Combined vocals + instrumental (default)
- **Vocals Only** - Isolated vocal track (`--vocal` flag)
- **Instrumental Only** - No vocals (`--bgm` flag)
- **Separate Stems** - Outputs both tracks separately (`--separate` flag)

### 6. Generation

**Process:**
1. Validate inputs
2. Create JSONL input file with format:
```json
{
  "idx": "unique_id",
  "gt_lyric": "[intro-short] ; [verse] Lyrics here...",
  "descriptions": "female, pop, happy, piano",
  "prompt_audio_path": "/path/to/reference.wav",
  "auto_prompt_audio_type": "Pop"
}
```
3. Call SongGeneration model:
```bash
cd /path/to/SongGeneration
sh generate.sh <ckpt_path> <input.jsonl> <output_path> [--low_mem] [--vocal|--bgm|--separate]
```
4. Stream progress via SSE
5. Convert output to MP3 via FFmpeg
6. Save to library

**SSE Events:**
- `status`: Current stage (preparing, generating, converting, done, error)
- `progress`: Percentage if available
- `message`: Human-readable status text

### 7. Library

SQLite database storing generation history:

**Schema:**
```sql
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  lyrics TEXT,
  description TEXT,
  reference_audio_path TEXT,
  stem_type TEXT,  -- 'full', 'vocal', 'bgm', 'separate'
  output_path TEXT,
  output_vocal_path TEXT,  -- for separate stems
  output_bgm_path TEXT,    -- for separate stems
  duration_seconds REAL,
  model_version TEXT
);
```

**UI Features:**
- List view with title, date, duration
- Play audio inline
- Download as MP3
- Delete with confirmation
- Edit title

### 8. Settings

- Model selection (switch between downloaded models)
- Low memory mode toggle (`--low_mem` flag)
- Flash attention toggle (`--not_use_flash_attn` flag)
- Output directory configuration
- GPU info display

## API Endpoints

### Setup & Models

```
GET  /api/setup/status
     Response: { installed: bool, models: string[], current_model: string }

POST /api/setup/download
     Body: { model: "SongGeneration-base-new" }
     Response: SSE stream with download progress

POST /api/setup/select-model
     Body: { model: "SongGeneration-base-new" }
```

### Generation

```
POST /api/generate
     Body: {
       lyrics: string,        # Formatted lyric string
       description: string,   # Style description
       reference_audio?: File,
       auto_style?: string,   # Alternative to reference_audio
       stem_type: "full" | "vocal" | "bgm" | "separate",
       title?: string
     }
     Response: SSE stream with generation progress, final song ID

GET  /api/generate/status/{job_id}
     Response: { status, progress, message }
```

### Library

```
GET    /api/library
       Query: ?page=1&limit=20&sort=created_at&order=desc
       Response: { songs: Song[], total: number }

GET    /api/library/{id}
       Response: Song object

PATCH  /api/library/{id}
       Body: { title: string }

DELETE /api/library/{id}

GET    /api/library/{id}/audio
       Query: ?type=full|vocal|bgm
       Response: Audio file stream

GET    /api/library/{id}/download
       Query: ?type=full|vocal|bgm
       Response: MP3 file download
```

### Settings

```
GET  /api/settings
     Response: { low_mem: bool, flash_attn: bool, output_dir: string }

PUT  /api/settings
     Body: { low_mem?: bool, flash_attn?: bool, output_dir?: string }

GET  /api/gpu
     Response: { name: string, vram_total: number, vram_used: number }
```

## Frontend Components

### SongBuilderComponent
- Maintains array of sections
- CDK drag-drop for reordering
- Each section has type selector + optional lyrics textarea
- "Add Section" button with type picker
- Outputs formatted lyric string

### StylePanelComponent
- Form controls for each style attribute
- Outputs formatted description string
- Preset buttons for common combinations (optional)

### ReferenceAudioComponent
- File input (drag-drop zone nice to have)
- Audio preview with play/pause
- Clear button
- Warning when both reference and description provided

### StemSelectorComponent
- Radio group: Full Mix, Vocals Only, Instrumental, Separate
- Info tooltips explaining each option

### GenerationProgressComponent
- Subscribes to SSE during generation
- Progress bar or spinner
- Status text
- Cancel button (if feasible)

### LibraryComponent
- Table/list of songs
- Inline audio player
- Action buttons: download, delete, edit title
- Pagination or infinite scroll

### SetupComponent
- Model download cards
- Progress bars during download
- Status indicators (installed/not installed)

## External Dependencies

### SongGeneration Model
Repository: https://github.com/tencent-ailab/SongGeneration

The backend needs to:
1. Clone or reference the SongGeneration repo
2. Set up its Python environment (requirements.txt, requirements_nodeps.txt)
3. Download models to expected locations
4. Call `generate.sh` or `generate.py` directly

### FFmpeg
Required for MP3 conversion:
```bash
ffmpeg -i input.wav -codec:a libmp3lame -qscale:a 2 output.mp3
```

### huggingface-cli
For model downloads:
```bash
pip install huggingface_hub
huggingface-cli download <repo> --local-dir <path>
```

## Environment Setup

Backend should handle:
1. Check for Python 3.8+, CUDA 11.8+
2. Create venv for SongGeneration dependencies
3. Install FFmpeg if not present (or prompt user)
4. Set up directories (data/, models/, outputs/)

## Notes

- The SongGeneration model outputs WAV files - convert to MP3 for storage/download
- Generation takes 3-6 minutes typically
- Low memory mode reduces quality but allows 10GB VRAM GPUs
- Reference audio significantly improves style consistency
- The `[inst]` section label is noted as "less stable" in the original docs - consider hiding or warning

## Reference Repositories

- Original Model: https://github.com/tencent-ailab/SongGeneration
- BazedFrog Studio (inspiration): https://github.com/BazedFrog/SongGeneration-Studio
- Model Weights: https://huggingface.co/collections/lglg666/levo-68d0c3031c370cbfadade126
