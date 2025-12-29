from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pathlib import Path
from datetime import datetime
from typing import Optional

from database import get_db
from schemas import Song, SongUpdate, SongList

router = APIRouter()


def row_to_song(row) -> Song:
    """Convert a database row to a Song model."""
    return Song(
        id=row["id"],
        title=row["title"],
        created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else datetime.now(),
        lyrics=row["lyrics"],
        description=row["description"],
        reference_audio_path=row["reference_audio_path"],
        stem_type=row["stem_type"],
        output_path=row["output_path"],
        output_vocal_path=row["output_vocal_path"],
        output_bgm_path=row["output_bgm_path"],
        duration_seconds=row["duration_seconds"],
        model_version=row["model_version"]
    )


@router.get("/library", response_model=SongList)
async def list_songs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at"),
    order: str = Query("desc")
):
    """List all songs with pagination."""
    # Validate sort column
    valid_columns = ["created_at", "title", "duration_seconds"]
    if sort not in valid_columns:
        sort = "created_at"

    order = "DESC" if order.lower() == "desc" else "ASC"
    offset = (page - 1) * limit

    async with get_db() as db:
        # Get total count
        cursor = await db.execute("SELECT COUNT(*) as count FROM songs")
        row = await cursor.fetchone()
        total = row["count"]

        # Get paginated results
        cursor = await db.execute(
            f"SELECT * FROM songs ORDER BY {sort} {order} LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = await cursor.fetchall()

        songs = [row_to_song(row) for row in rows]

        return SongList(
            songs=songs,
            total=total,
            page=page,
            limit=limit
        )


@router.get("/library/{song_id}", response_model=Song)
async def get_song(song_id: str):
    """Get a single song by ID."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM songs WHERE id = ?",
            (song_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Song not found")

        return row_to_song(row)


@router.patch("/library/{song_id}", response_model=Song)
async def update_song(song_id: str, update: SongUpdate):
    """Update a song's metadata."""
    async with get_db() as db:
        # Check if song exists
        cursor = await db.execute(
            "SELECT * FROM songs WHERE id = ?",
            (song_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Song not found")

        # Update fields
        if update.title is not None:
            await db.execute(
                "UPDATE songs SET title = ? WHERE id = ?",
                (update.title, song_id)
            )
            await db.commit()

        # Return updated song
        cursor = await db.execute(
            "SELECT * FROM songs WHERE id = ?",
            (song_id,)
        )
        row = await cursor.fetchone()
        return row_to_song(row)


@router.delete("/library/{song_id}")
async def delete_song(song_id: str):
    """Delete a song and its audio files."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM songs WHERE id = ?",
            (song_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Song not found")

        # Delete audio files
        for path_col in ["output_path", "output_vocal_path", "output_bgm_path", "reference_audio_path"]:
            if row[path_col]:
                path = Path(row[path_col])
                if path.exists():
                    path.unlink()

        # Delete from database
        await db.execute("DELETE FROM songs WHERE id = ?", (song_id,))
        await db.commit()

        return {"status": "deleted", "id": song_id}


@router.get("/library/{song_id}/audio")
async def get_audio(
    song_id: str,
    type: Optional[str] = Query("full", regex="^(full|vocal|bgm)$")
):
    """Stream audio file for a song."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM songs WHERE id = ?",
            (song_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Song not found")

        # Determine which path to use
        if type == "vocal":
            path = row["output_vocal_path"]
        elif type == "bgm":
            path = row["output_bgm_path"]
        else:
            path = row["output_path"]

        if not path:
            raise HTTPException(status_code=404, detail=f"No {type} audio available")

        file_path = Path(path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")

        return FileResponse(
            file_path,
            media_type="audio/mpeg",
            filename=f"{row['title'] or song_id}_{type}.mp3"
        )


@router.get("/library/{song_id}/download")
async def download_audio(
    song_id: str,
    type: Optional[str] = Query("full", regex="^(full|vocal|bgm)$")
):
    """Download audio file as attachment."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM songs WHERE id = ?",
            (song_id,)
        )
        row = await cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Song not found")

        # Determine which path to use
        if type == "vocal":
            path = row["output_vocal_path"]
        elif type == "bgm":
            path = row["output_bgm_path"]
        else:
            path = row["output_path"]

        if not path:
            raise HTTPException(status_code=404, detail=f"No {type} audio available")

        file_path = Path(path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")

        filename = f"{row['title'] or song_id}_{type}.mp3"

        return FileResponse(
            file_path,
            media_type="audio/mpeg",
            filename=filename,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
