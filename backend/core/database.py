import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "app.db")

async def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                video_filename TEXT,
                subtitles TEXT DEFAULT '[]',
                styles TEXT DEFAULT '{}',
                language TEXT,
                duration REAL DEFAULT 0,
                width INTEGER DEFAULT 1080,
                height INTEGER DEFAULT 1920,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        await db.commit()

async def save_project(project_id, name, video_filename, subtitles, styles, language, duration=0, width=1080, height=1920):
    async with aiosqlite.connect(DB_PATH) as db:
        now = datetime.utcnow().isoformat()
        await db.execute("""
            INSERT INTO projects (id, name, video_filename, subtitles, styles, language, duration, width, height, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                video_filename=excluded.video_filename,
                subtitles=excluded.subtitles,
                styles=excluded.styles,
                language=excluded.language,
                duration=excluded.duration,
                width=excluded.width,
                height=excluded.height,
                updated_at=excluded.updated_at
        """, (project_id, name, video_filename, json.dumps(subtitles), json.dumps(styles), language, duration, width, height, now, now))
        await db.commit()
        return project_id

async def get_projects(limit=50, offset=0):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, name, video_filename, language, duration, width, height, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = await cursor.fetchall()
        # Also get total count
        count_cursor = await db.execute("SELECT COUNT(*) FROM projects")
        total = (await count_cursor.fetchone())[0]
        return {"projects": [dict(row) for row in rows], "total": total}

async def get_project(project_id):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = await cursor.fetchone()
        if row:
            result = dict(row)
            result["subtitles"] = json.loads(result["subtitles"]) if result["subtitles"] else []
            result["styles"] = json.loads(result["styles"]) if result["styles"] else {}
            return result
        return None

async def delete_project(project_id):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        await db.commit()

async def get_setting(key):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = await cursor.fetchone()
        return json.loads(row[0]) if row else None

async def set_setting(key, value):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, json.dumps(value))
        )
        await db.commit()

async def get_all_settings():
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()
        return {row[0]: json.loads(row[1]) for row in rows}
