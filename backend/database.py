import aiosqlite
from pathlib import Path
from contextlib import asynccontextmanager

DATABASE_PATH = Path(__file__).parent.parent / "data" / "library.db"


async def init_db():
    """Initialize the database with required tables."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Songs table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS songs (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                lyrics TEXT NOT NULL,
                description TEXT NOT NULL,
                reference_audio_path TEXT,
                stem_type TEXT NOT NULL DEFAULT 'full',
                output_path TEXT,
                output_vocal_path TEXT,
                output_bgm_path TEXT,
                duration_seconds REAL,
                model_version TEXT
            )
        """)

        # Settings table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """)

        # Insert default settings if not exist
        await db.execute("""
            INSERT OR IGNORE INTO settings (key, value) VALUES ('low_mem', 'false')
        """)
        await db.execute("""
            INSERT OR IGNORE INTO settings (key, value) VALUES ('flash_attn', 'true')
        """)
        await db.execute("""
            INSERT OR IGNORE INTO settings (key, value) VALUES ('output_dir', './data/outputs')
        """)
        await db.execute("""
            INSERT OR IGNORE INTO settings (key, value) VALUES ('current_model', '')
        """)

        await db.commit()


@asynccontextmanager
async def get_db():
    """Get a database connection."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
