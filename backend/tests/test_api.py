"""Tests for FastAPI API endpoints in main.py"""
import os
import pytest


@pytest.mark.asyncio
class TestUploadEndpoint:
    async def test_upload_valid_mp4(self, client, upload_dir):
        # Create a dummy mp4 file
        test_file = upload_dir / "test.mp4"
        test_file.write_bytes(b"\x00" * 1024)

        with open(test_file, "rb") as f:
            response = await client.post(
                "/api/upload",
                files={"file": ("test.mp4", f, "video/mp4")},
            )
        assert response.status_code == 200
        data = response.json()
        assert "filename" in data
        assert data["filename"].endswith(".mp4")

    async def test_upload_invalid_extension(self, client, upload_dir):
        response = await client.post(
            "/api/upload",
            files={"file": ("test.txt", b"hello", "text/plain")},
        )
        assert response.status_code == 422

    async def test_upload_no_file(self, client):
        response = await client.post("/api/upload")
        assert response.status_code == 422


@pytest.mark.asyncio
class TestFontsEndpoint:
    async def test_list_fonts(self, client):
        response = await client.get("/api/fonts")
        assert response.status_code == 200
        data = response.json()
        assert "fonts" in data
        assert isinstance(data["fonts"], list)

    async def test_font_file_not_found(self, client):
        response = await client.get("/api/font-file/nonexistent.ttf")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestProcessEndpoint:
    async def test_process_file_not_found(self, client, upload_dir):
        response = await client.post(
            "/api/process",
            json={"filename": "nonexistent.mp4"},
        )
        assert response.status_code == 404

    async def test_process_invalid_language(self, client, upload_dir):
        # Create a dummy file first
        test_file = upload_dir / "test.mp4"
        test_file.write_bytes(b"\x00" * 100)

        response = await client.post(
            "/api/process",
            json={"filename": "test.mp4", "language": "toolong"},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestExportEndpoint:
    async def test_export_file_not_found(self, client, upload_dir):
        response = await client.post(
            "/api/export",
            json={
                "filename": "nonexistent.mp4",
                "subtitles": [{"start": 0.0, "end": 1.0, "text": "Hello"}],
                "styles": {
                    "fontFamily": "Arial",
                    "fontSize": 24,
                    "textColor": "#FFFFFF",
                    "position": {"x": 0, "y": 0},
                },
            },
        )
        assert response.status_code == 404

    async def test_export_empty_subtitles(self, client, upload_dir):
        response = await client.post(
            "/api/export",
            json={
                "filename": "test.mp4",
                "subtitles": [],
                "styles": {
                    "fontFamily": "Arial",
                    "fontSize": 24,
                    "textColor": "#FFFFFF",
                    "position": {"x": 0, "y": 0},
                },
            },
        )
        # Validation error: subtitles list must not be empty
        assert response.status_code == 422

    async def test_export_invalid_timestamp(self, client, upload_dir):
        response = await client.post(
            "/api/export",
            json={
                "filename": "test.mp4",
                "subtitles": [{"start": -1.0, "end": 1.0, "text": "Hello"}],
                "styles": {
                    "fontFamily": "Arial",
                    "fontSize": 24,
                    "textColor": "#FFFFFF",
                    "position": {"x": 0, "y": 0},
                },
            },
        )
        assert response.status_code == 422

    async def test_export_empty_subtitle_text(self, client, upload_dir):
        response = await client.post(
            "/api/export",
            json={
                "filename": "test.mp4",
                "subtitles": [{"start": 0.0, "end": 1.0, "text": "  "}],
                "styles": {
                    "fontFamily": "Arial",
                    "fontSize": 24,
                    "textColor": "#FFFFFF",
                    "position": {"x": 0, "y": 0},
                },
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestProjectsEndpoint:
    async def test_create_project(self, client):
        response = await client.post(
            "/api/projects",
            json={
                "name": "Test Project",
                "video_filename": "test.mp4",
                "subtitles": [],
                "language": "en",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["status"] == "saved"

    async def test_list_projects(self, client):
        # Create a project first
        await client.post(
            "/api/projects",
            json={"name": "List Test", "subtitles": []},
        )
        response = await client.get("/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert "total" in data

    async def test_get_project_not_found(self, client):
        response = await client.get("/api/projects/nonexistent-id")
        assert response.status_code == 404

    async def test_delete_project(self, client):
        # Create then delete
        resp = await client.post(
            "/api/projects",
            json={"name": "To Delete", "subtitles": []},
        )
        pid = resp.json()["id"]
        response = await client.delete(f"/api/projects/{pid}")
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"


@pytest.mark.asyncio
class TestSettingsEndpoint:
    async def test_get_settings(self, client):
        response = await client.get("/api/settings")
        assert response.status_code == 200

    async def test_update_settings(self, client):
        response = await client.put(
            "/api/settings",
            json={"settings": {"default_language": "en", "default_preset": "classic"}},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "updated"

        # Verify
        response = await client.get("/api/settings")
        data = response.json()
        assert data.get("default_language") == "en"
        assert data.get("default_preset") == "classic"

    async def test_update_settings_rejects_invalid_keys(self, client):
        response = await client.put(
            "/api/settings",
            json={"settings": {"theme": "dark"}},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
class TestDownloadEndpoint:
    async def test_download_not_found(self, client, upload_dir):
        response = await client.get("/api/download/nonexistent.mp4")
        assert response.status_code == 404

    async def test_download_existing(self, client, upload_dir):
        # Create a file in upload dir
        test_file = upload_dir / "exported_test.mp4"
        test_file.write_bytes(b"\x00" * 100)

        response = await client.get("/api/download/exported_test.mp4")
        assert response.status_code == 200
