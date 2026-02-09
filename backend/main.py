from typing import List, Dict
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import shutil
import os
import uuid
from core.asr import transcribe_audio
from core.segmentation import segment_subtitles
from core.fonts import get_available_fonts, get_font_path
from core.export import get_video_info, generate_ass_content, burn_subtitles
from pydantic import BaseModel

app = FastAPI()

class ExportRequest(BaseModel):
    filename: str
    subtitles: List[Dict]
    styles: Dict


# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    try:
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"filename": filename, "path": file_path}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process")
async def process_video(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Step 1: ASR
        # For MVP, we pass the video file directly to Whisper which handles audio extraction if ffmpeg is present
        words = transcribe_audio(file_path)

        # Step 2: Segmentation
        subtitles = segment_subtitles(words)

        return {"subtitles": subtitles}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fonts")
async def list_fonts():
    try:
        fonts = get_available_fonts()
        return {"fonts": fonts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/font-file/{filename}")
async def get_font(filename: str):
    path = get_font_path(filename)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Font not found")
    return FileResponse(path)

@app.post("/api/export")
async def export_video(request: ExportRequest):
    input_path = os.path.join(UPLOAD_DIR, request.filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Original video not found")
        
    try:
        # 1. Get Video info
        info = get_video_info(input_path)
        
        # 2. Generate ASS file
        ass_filename = f"{uuid.uuid4()}.ass"
        ass_path = os.path.join(UPLOAD_DIR, ass_filename)
        ass_content = generate_ass_content(request.subtitles, request.styles, info["width"], info["height"])
        
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(ass_content)
            
        # 3. Burn Subtitles
        output_filename = f"exported_{uuid.uuid4()}.mp4"
        output_path = os.path.join(UPLOAD_DIR, output_filename)
        
        burn_subtitles(input_path, output_path, ass_path)
        
        # Clean up temporary ASS file
        if os.path.exists(ass_path):
            os.remove(ass_path)
            
        return {"filename": output_filename}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{filename}")
async def download_video(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename="reels_subtitles.mp4", media_type="video/mp4")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
