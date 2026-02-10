import os
import tempfile

import pytest
import pytest_asyncio
import aiosqlite

# Point database to a temp file for testing
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()

# Patch DB_PATH before importing any app modules
import core.database as db_module
db_module.DB_PATH = _tmp_db.name


from httpx import AsyncClient, ASGITransport
from main import app


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing FastAPI endpoints."""
    await db_module.init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db():
    """Initialize a clean test database for each test."""
    # Re-create tables
    await db_module.init_db()
    yield
    # Clean up after test
    async with aiosqlite.connect(db_module.DB_PATH) as conn:
        await conn.execute("DELETE FROM projects")
        await conn.execute("DELETE FROM settings")
        await conn.commit()


@pytest.fixture
def upload_dir(tmp_path):
    """Provide a temporary upload directory."""
    import main
    original = main.UPLOAD_DIR
    main.UPLOAD_DIR = str(tmp_path)
    yield tmp_path
    main.UPLOAD_DIR = original
