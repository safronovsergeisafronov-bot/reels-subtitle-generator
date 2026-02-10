"""Tests for core/database.py"""
import pytest
from core.database import (
    init_db,
    save_project,
    get_projects,
    get_project,
    delete_project,
    get_setting,
    set_setting,
    get_all_settings,
)


@pytest.mark.asyncio
class TestProjectCRUD:
    async def test_save_and_get_project(self, db):
        project_id = await save_project(
            "test-1", "Test Project", "video.mp4",
            [{"start": 0.0, "end": 1.0, "text": "Hello"}],
            {"fontFamily": "Arial"},
            "en", 10.0, 1080, 1920
        )
        assert project_id == "test-1"

        project = await get_project("test-1")
        assert project is not None
        assert project["name"] == "Test Project"
        assert project["video_filename"] == "video.mp4"
        assert project["language"] == "en"
        assert project["duration"] == 10.0
        assert project["width"] == 1080
        assert project["height"] == 1920
        assert len(project["subtitles"]) == 1
        assert project["subtitles"][0]["text"] == "Hello"
        assert project["styles"]["fontFamily"] == "Arial"

    async def test_get_nonexistent_project(self, db):
        project = await get_project("nonexistent")
        assert project is None

    async def test_update_project(self, db):
        await save_project("test-2", "Original", "v.mp4", [], {}, "en")
        await save_project("test-2", "Updated", "v.mp4", [], {}, "ru")

        project = await get_project("test-2")
        assert project["name"] == "Updated"
        assert project["language"] == "ru"

    async def test_delete_project(self, db):
        await save_project("test-3", "To Delete", "v.mp4", [], {}, "en")
        await delete_project("test-3")

        project = await get_project("test-3")
        assert project is None

    async def test_list_projects(self, db):
        await save_project("p1", "Project 1", "v1.mp4", [], {}, "en")
        await save_project("p2", "Project 2", "v2.mp4", [], {}, "ru")

        result = await get_projects()
        assert result["total"] == 2
        assert len(result["projects"]) == 2

    async def test_list_projects_pagination(self, db):
        for i in range(5):
            await save_project(f"p{i}", f"Project {i}", f"v{i}.mp4", [], {}, "en")

        result = await get_projects(limit=2, offset=0)
        assert result["total"] == 5
        assert len(result["projects"]) == 2

        result2 = await get_projects(limit=2, offset=2)
        assert len(result2["projects"]) == 2

    async def test_save_project_defaults(self, db):
        await save_project("pd", "Defaults", None, [], {}, None)
        project = await get_project("pd")
        assert project["duration"] == 0
        assert project["width"] == 1080
        assert project["height"] == 1920

    async def test_delete_nonexistent_project(self, db):
        # Should not raise
        await delete_project("nonexistent-id")


@pytest.mark.asyncio
class TestSettingsCRUD:
    async def test_set_and_get_setting(self, db):
        await set_setting("theme", "dark")
        result = await get_setting("theme")
        assert result == "dark"

    async def test_get_nonexistent_setting(self, db):
        result = await get_setting("nonexistent")
        assert result is None

    async def test_update_setting(self, db):
        await set_setting("lang", "en")
        await set_setting("lang", "ru")
        result = await get_setting("lang")
        assert result == "ru"

    async def test_get_all_settings(self, db):
        await set_setting("key1", "val1")
        await set_setting("key2", {"nested": True})

        all_settings = await get_all_settings()
        assert all_settings["key1"] == "val1"
        assert all_settings["key2"] == {"nested": True}

    async def test_setting_with_complex_value(self, db):
        value = {"colors": ["red", "blue"], "count": 42}
        await set_setting("complex", value)
        result = await get_setting("complex")
        assert result == value
