import asyncio
import logging
import os
import shutil
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, File, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, field_validator

from core.asr import transcribe_audio
from core.database import init_db, save_project, get_projects, get_project, delete_project, get_all_settings, set_setting
from core.export import burn_subtitles_async, generate_ass_content, get_video_info
from core.fonts import get_available_fonts, get_font_path
from core.segmentation import segment_subtitles
from core.text_correction import correct_subtitles

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
FILE_MAX_AGE_SECONDS = 60 * 60  # 1 hour
CLEANUP_INTERVAL_SECONDS = 30 * 60  # 30 minutes

# ---------------------------------------------------------------------------
# In-memory task progress store
# ---------------------------------------------------------------------------
# task_id -> {"progress": int, "status": str, "result": any}
task_store: Dict[str, dict] = {}
# task_id -> set of WebSocket connections
ws_connections: Dict[str, set] = {}

# ---------------------------------------------------------------------------
# Background cleanup
# ---------------------------------------------------------------------------
async def cleanup_old_files():
    """Periodically delete files older than FILE_MAX_AGE_SECONDS from uploads/."""
    while True:
        try:
            now = time.time()
            count = 0
            for fname in os.listdir(UPLOAD_DIR):
                fpath = os.path.join(UPLOAD_DIR, fname)
                if os.path.isfile(fpath):
                    age = now - os.path.getmtime(fpath)
                    if age > FILE_MAX_AGE_SECONDS:
                        os.remove(fpath)
                        count += 1
            if count:
                logger.info("Cleanup: removed %d old files from %s", count, UPLOAD_DIR)
        except Exception:
            logger.exception("Error during file cleanup")
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)

# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(cleanup_old_files())
    logger.info("Started background file cleanup task")
    await init_db()
    logger.info("Database initialized")
    yield
    cleanup_task.cancel()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(lifespan=lifespan)

# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("%s %s", request.method, request.url.path)
    response = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
    return response

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
]
_env_origins = os.environ.get("CORS_ORIGINS", "")
origins = ([o.strip() for o in _env_origins.split(",") if o.strip()] + _default_origins) if _env_origins else _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class SubtitleItem(BaseModel):
    start: float
    end: float
    text: str

    @field_validator("start", "end")
    @classmethod
    def must_be_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Timestamp must be non-negative")
        return v

    @field_validator("text")
    @classmethod
    def text_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Subtitle text must not be empty")
        return v


class SubtitlePosition(BaseModel):
    x: float
    y: float


class SubtitleStyles(BaseModel):
    fontFamily: str = "Arial"
    fontSize: int = 24
    textColor: str = "#FFFFFF"
    position: SubtitlePosition
    uppercase: bool = False
    outlineWidth: float = 2.0
    outlineColor: str = "#000000"
    shadowDepth: float = 2.0
    bold: bool = True


class ExportRequest(BaseModel):
    filename: str
    subtitles: List[SubtitleItem]
    styles: SubtitleStyles
    task_id: Optional[str] = None

    @field_validator("subtitles")
    @classmethod
    def must_have_subtitles(cls, v):
        if not v:
            raise ValueError("Subtitles list must not be empty")
        return v


class ProcessRequest(BaseModel):
    filename: str
    language: Optional[str] = None
    task_id: Optional[str] = None

    @field_validator("language")
    @classmethod
    def validate_language(cls, v):
        if v is not None:
            v = v.strip().lower()
            if len(v) < 2 or len(v) > 3:
                raise ValueError("Language must be an ISO 639-1 code (e.g. 'en', 'ru', 'es')")
        return v


class SaveProjectRequest(BaseModel):
    id: Optional[str] = None
    name: str
    video_filename: Optional[str] = None
    subtitles: List[SubtitleItem] = []
    styles: Optional[SubtitleStyles] = None
    language: Optional[str] = None
    duration: float = 0
    width: int = 1080
    height: int = 1920


class UpdateSettingsRequest(BaseModel):
    settings: dict


# ---------------------------------------------------------------------------
# Helper: broadcast progress to connected WebSockets
# ---------------------------------------------------------------------------
async def broadcast_progress(task_id: str, progress: int, status: str, result=None):
    """Send progress update to all WebSocket clients listening for this task."""
    msg = {"progress": progress, "status": status}
    if result is not None:
        msg["result"] = result
    task_store[task_id] = msg

    sockets = ws_connections.get(task_id, set()).copy()
    for ws in sockets:
        try:
            await ws.send_json(msg)
        except Exception:
            ws_connections.get(task_id, set()).discard(ws)

# ---------------------------------------------------------------------------
# WebSocket: export progress
# ---------------------------------------------------------------------------
@app.websocket("/ws/export-progress/{task_id}")
async def ws_export_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    ws_connections.setdefault(task_id, set()).add(websocket)
    logger.info("WebSocket connected for export progress: %s", task_id)
    try:
        # Send current state if task already exists
        if task_id in task_store:
            await websocket.send_json(task_store[task_id])
        # Keep connection alive until client disconnects
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_connections.get(task_id, set()).discard(websocket)
        logger.info("WebSocket disconnected for export progress: %s", task_id)

# ---------------------------------------------------------------------------
# WebSocket: process (transcription) progress
# ---------------------------------------------------------------------------
@app.websocket("/ws/process-progress/{task_id}")
async def ws_process_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    ws_connections.setdefault(task_id, set()).add(websocket)
    logger.info("WebSocket connected for process progress: %s", task_id)
    try:
        if task_id in task_store:
            await websocket.send_json(task_store[task_id])
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_connections.get(task_id, set()).discard(websocket)
        logger.info("WebSocket disconnected for process progress: %s", task_id)

# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    try:
        # Validate extension
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=422,
                detail=f"File type '{file_extension}' not allowed. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        # Validate file size by reading in chunks
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        total_size = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # 1 MB chunks
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=422,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024 * 1024)} MB.",
                    )
                buffer.write(chunk)

        logger.info("Uploaded file: %s (%d bytes)", filename, total_size)
        return {"filename": filename, "path": file_path}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail="Upload failed")

# ---------------------------------------------------------------------------
# Process (transcription)
# ---------------------------------------------------------------------------
@app.post("/api/process")
async def process_video(request: ProcessRequest):
    file_path = os.path.join(UPLOAD_DIR, request.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    task_id = request.task_id or str(uuid.uuid4())

    # Run transcription in background
    async def _run():
        try:
            await broadcast_progress(task_id, 0, "processing")
            loop = asyncio.get_event_loop()

            logger.info("Task %s: Starting transcription for %s (language=%s)", task_id, request.filename, request.language)
            await broadcast_progress(task_id, 10, "processing")

            words = await loop.run_in_executor(
                None, transcribe_audio, file_path, request.language
            )
            logger.info("Task %s: Transcription complete, %d words extracted", task_id, len(words))

            await broadcast_progress(task_id, 80, "processing")
            subtitles = segment_subtitles(words)
            logger.info("Task %s: Segmentation complete, %d subtitle segments", task_id, len(subtitles))

            # AI text correction
            await broadcast_progress(task_id, 85, "processing")
            try:
                subtitles = await loop.run_in_executor(
                    None, correct_subtitles, subtitles, request.language
                )
                logger.info("Task %s: Text correction complete", task_id)
            except Exception as e:
                logger.warning("Task %s: Text correction failed, using originals: %s", task_id, e)
            await broadcast_progress(task_id, 95, "processing")

            await broadcast_progress(task_id, 100, "complete", {"subtitles": subtitles})
            logger.info("Task %s: Processing complete, returning %d subtitles", task_id, len(subtitles))
        except Exception as e:
            logger.exception("Task %s: Processing failed: %s", task_id, str(e))
            await broadcast_progress(task_id, 0, "error", {"detail": str(e)})

    asyncio.create_task(_run())

    return {"task_id": task_id, "status": "processing"}

# ---------------------------------------------------------------------------
# Fonts
# ---------------------------------------------------------------------------
@app.get("/api/fonts")
async def list_fonts():
    try:
        fonts = get_available_fonts()
        return {"fonts": fonts}
    except Exception:
        logger.exception("Failed to list fonts")
        raise HTTPException(status_code=500, detail="Failed to list fonts")

@app.get("/api/font-file/{filename}")
async def get_font(filename: str):
    path = get_font_path(filename)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Font not found")
    return FileResponse(path)

# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
@app.post("/api/export")
async def export_video(request: ExportRequest):
    input_path = os.path.join(UPLOAD_DIR, request.filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Original video not found")

    task_id = request.task_id or str(uuid.uuid4())

    async def _run():
        try:
            await broadcast_progress(task_id, 0, "encoding")

            info = get_video_info(input_path)
            duration = info.get("duration", 0)

            ass_filename = f"{uuid.uuid4()}.ass"
            ass_path = os.path.join(UPLOAD_DIR, ass_filename)

            # Convert validated SubtitleItem models back to dicts for ASS generator
            subtitles_dicts = [s.model_dump() for s in request.subtitles]
            styles_dict = request.styles.model_dump()

            ass_content = generate_ass_content(subtitles_dicts, styles_dict, info["width"], info["height"])

            with open(ass_path, "w", encoding="utf-8") as f:
                f.write(ass_content)

            output_filename = f"exported_{uuid.uuid4()}.mp4"
            output_path = os.path.join(UPLOAD_DIR, output_filename)

            async def progress_cb(progress: int):
                await broadcast_progress(task_id, progress, "encoding")

            await burn_subtitles_async(input_path, output_path, ass_path, duration, progress_cb)

            # Clean up ASS file
            if os.path.exists(ass_path):
                os.remove(ass_path)

            await broadcast_progress(task_id, 100, "complete", {"filename": output_filename})

        except Exception as e:
            logger.exception("Export failed for task %s", task_id)
            await broadcast_progress(task_id, 0, "error", {"detail": str(e)})

    asyncio.create_task(_run())

    return {"task_id": task_id, "status": "encoding"}

# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------
@app.get("/api/download/{filename}")
async def download_video(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename="reels_subtitles.mp4", media_type="video/mp4")

# ---------------------------------------------------------------------------
# Projects API
# ---------------------------------------------------------------------------
@app.post("/api/projects")
async def create_or_update_project(request: SaveProjectRequest):
    project_id = request.id or str(uuid.uuid4())
    subtitles_dicts = [s.model_dump() for s in request.subtitles] if request.subtitles else []
    styles_dict = request.styles.model_dump() if request.styles else {}
    await save_project(
        project_id, request.name, request.video_filename,
        subtitles_dicts, styles_dict, request.language,
        request.duration, request.width, request.height
    )
    logger.info("Saved project: %s (%s)", project_id, request.name)
    return {"id": project_id, "status": "saved"}

@app.get("/api/projects")
async def list_projects(limit: int = 50, offset: int = 0):
    return await get_projects(limit, offset)

@app.get("/api/projects/{project_id}")
async def get_project_by_id(project_id: str):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.delete("/api/projects/{project_id}")
async def delete_project_by_id(project_id: str):
    await delete_project(project_id)
    return {"status": "deleted"}

# ---------------------------------------------------------------------------
# Settings API
# ---------------------------------------------------------------------------
@app.get("/api/settings")
async def get_settings():
    return await get_all_settings()

@app.put("/api/settings")
async def update_settings(request: UpdateSettingsRequest):
    for key, value in request.settings.items():
        await set_setting(key, value)
    return {"status": "updated"}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
