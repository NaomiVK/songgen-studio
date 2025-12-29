# SongGeneration Studio

A web-based UI for [Tencent AI Lab's SongGeneration (LeVo)](https://github.com/tencent-ailab/SongGeneration) model. Generate AI songs with vocals, lyrics, and instrumental tracks through a user-friendly interface.

![Angular](https://img.shields.io/badge/Angular-17+-red)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **Song Builder** - Visual drag-and-drop editor for song structure (intro, verse, chorus, bridge, outro)
- **Style Controls** - Configure genre, mood, voice gender, timbre, instruments, and BPM
- **Reference Audio** - Upload audio for style cloning
- **Stem Selection** - Output full mix, vocals only, instrumental, or separate stems
- **Model Management** - Download and switch between model variants
- **Library** - Browse, play, and download your generated songs

## Requirements

- **Python 3.8+**
- **Node.js 18+**
- **NVIDIA GPU** with 10-22GB VRAM (depending on model)
- **CUDA 11.8+**
- **FFmpeg** (for audio conversion)

## Installation

### 1. Clone the repositories

```bash
# Clone this repo
git clone https://github.com/NaomiVK/songgen-studio.git
cd songgen-studio

# Clone the SongGeneration model repo
git clone https://github.com/tencent-ailab/SongGeneration.git
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Set up SongGeneration dependencies

```bash
cd ../SongGeneration
pip install -r requirements.txt
pip install -r requirements_nodeps.txt --no-deps
```

### 4. Set up the frontend

```bash
cd ../frontend
npm install
```

### 5. Install FFmpeg

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows - Download from https://ffmpeg.org/download.html
```

## Running the App

### Start the backend

```bash
cd backend
source venv/bin/activate
python main.py
# API runs on http://localhost:8000
```

### Start the frontend (in a new terminal)

```bash
cd frontend
npm start
# App runs on http://localhost:4200
```

### Download a model

1. Open http://localhost:4200
2. Go to **Setup** page
3. Click **Download** on your preferred model:
   - **Base** - 10GB VRAM, Chinese only
   - **Base New** - 10GB VRAM, Chinese + English
   - **Base Full** - 12GB VRAM, longer songs (up to 4m30s)
   - **Large** - 22GB VRAM, best quality

## Usage

### Creating a Song

1. **Build Structure** - Add sections (intro, verse, chorus, etc.) and enter lyrics
2. **Set Style** - Choose genre, mood, voice, instruments, and BPM
3. **Optional: Upload Reference** - Add audio for style cloning
4. **Select Output Type** - Full mix, vocals, instrumental, or separate
5. **Generate** - Click generate and wait 3-6 minutes

### Lyric Format

Each lyric line should end with a period:
```
First line of the verse.
Second line of the verse.
```

The app automatically formats this as:
```
[verse] First line of the verse. Second line of the verse
```

## Project Structure

```
songgen-studio/
├── backend/           # Python FastAPI server
│   ├── main.py        # Entry point
│   ├── generation.py  # Model wrapper
│   ├── library.py     # Songs CRUD
│   └── ...
├── frontend/          # Angular app
│   └── src/app/
│       ├── components/
│       └── services/
├── SongGeneration/    # Cloned model repo (not in git)
├── models/            # Downloaded checkpoints (not in git)
└── data/              # SQLite DB + generated audio (not in git)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/gpu` | GPU information |
| GET | `/api/setup/status` | Model installation status |
| POST | `/api/setup/download` | Download model (SSE) |
| POST | `/api/generate` | Generate song (SSE) |
| GET | `/api/library` | List songs |
| GET | `/api/library/{id}/audio` | Stream audio |
| DELETE | `/api/library/{id}` | Delete song |

## Troubleshooting

### "No GPU detected"
- Ensure NVIDIA drivers and CUDA are installed
- Check with `nvidia-smi`

### Generation fails
- Verify SongGeneration repo is cloned in the project root
- Check that a model is downloaded and selected
- Ensure FFmpeg is installed

### Frontend can't connect to backend
- Verify backend is running on port 8000
- Check CORS settings in `backend/main.py`

## Credits

- [SongGeneration (LeVo)](https://github.com/tencent-ailab/SongGeneration) by Tencent AI Lab
- Inspired by [BazedFrog's SongGeneration-Studio](https://github.com/BazedFrog/SongGeneration-Studio)

## License

MIT
