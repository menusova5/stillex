import json
import os
import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from video_processor import (
    STORAGE_DIR,
    cleanup_old_sessions,
    create_session,
    extract_frames,
    get_session_dir,
    get_video_metadata,
)

app = FastAPI(
    title="AI Video Frame Extractor API",
    description="Vysoko presný extraktor prvého a posledného framu z akéhokoľvek videa pre AI nástroje",
    version="1.0.0"
)

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    import subprocess
    ffmpeg_ok = False
    ffprobe_ok = False
    try:
        r1 = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        ffmpeg_ok = r1.returncode == 0
        r2 = subprocess.run(["ffprobe", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        ffprobe_ok = r2.returncode == 0
    except Exception:
        pass

    return {
        "status": "ok",
        "ffmpeg_available": ffmpeg_ok,
        "ffprobe_available": ffprobe_ok,
        "storage_dir": str(STORAGE_DIR),
    }


@app.post("/api/probe")
async def probe_video_endpoint(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...)
):
    """
    Nahranie videa a okamžité získanie detailných transparentných metadát.
    Uloží video do session adresára pre okamžitú následnú extrakciu.
    """
    background_tasks.add_task(cleanup_old_sessions)
    session_id = create_session()
    session_dir = get_session_dir(session_id)

    # Save uploaded video
    safe_filename = Path(video.filename or "video.mp4").name
    file_path = session_dir / f"source_{safe_filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    try:
        metadata = get_video_metadata(str(file_path))
        # Save session info
        session_info = {
            "source_file": str(file_path),
            "original_filename": safe_filename,
            "metadata": metadata
        }
        with open(session_dir / "session.json", "w", encoding="utf-8") as f:
            json.dump(session_info, f)

        return {
            "session_id": session_id,
            "metadata": metadata,
            "original_filename": safe_filename
        }
    except Exception as e:
        shutil.rmtree(session_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail=f"Chyba pri analýze videa: {str(e)}")


@app.post("/api/extract")
async def extract_frames_endpoint(
    background_tasks: BackgroundTasks,
    session_id: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None),
    frame_types: str = Form("first,last"),  # comma-separated: first,last,middle,custom
    custom_time: Optional[float] = Form(None),
    custom_frame: Optional[int] = Form(None),
    custom_mode: str = Form("seconds"),  # "seconds" or "frame"
    output_format: str = Form("png"),  # png, webp, jpg
    quality: int = Form(100),
    scale: str = Form("original"),  # original, 4k, 1080p, 720p, square_1024
    custom_prefix: Optional[str] = Form(None),
    pad_to_multiple_of_64: bool = Form(False),
    include_manifest: bool = Form(True),
):
    """
    Extrahuje požadované framy (prvý, posledný, stredový, vlastný) v špecifikovanej kvalite a formáte.
    Podporuje Creator Pro funkcie: custom_prefix, smart aspect padding, manifest.json, custom frame selection.
    """
    background_tasks.add_task(cleanup_old_sessions)
    types_list = [t.strip().lower() for t in frame_types.split(",") if t.strip()]
    if not types_list:
        types_list = ["first", "last"]

    if session_id:
        session_dir = get_session_dir(session_id)
        info_file = session_dir / "session.json"
        if not info_file.exists():
            raise HTTPException(status_code=404, detail="Relácia (session) nebola nájdená alebo vypršala.")

        with open(info_file, "r", encoding="utf-8") as f:
            session_info = json.load(f)

        source_file = session_info["source_file"]
        original_filename = session_info["original_filename"]
    elif video:
        # Direct one-shot upload and extract
        session_id = create_session()
        session_dir = get_session_dir(session_id)
        original_filename = Path(video.filename or "video.mp4").name
        source_file = str(session_dir / f"source_{original_filename}")
        with open(source_file, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    else:
        raise HTTPException(status_code=400, detail="Chýba buď session_id alebo súbor videa.")

    try:
        result = extract_frames(
            session_id=session_id,
            video_path=source_file,
            original_filename=original_filename,
            frame_types=types_list,
            custom_time=custom_time,
            custom_frame=custom_frame,
            custom_mode=custom_mode,
            output_format=output_format,
            quality=quality,
            scale=scale,
            custom_prefix=custom_prefix,
            pad_to_multiple_of_64=pad_to_multiple_of_64,
            include_manifest=include_manifest,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chyba pri extrakcii snímok: {str(e)}")


@app.get("/api/frames/{session_id}/{filename}")
async def get_frame(session_id: str, filename: str):
    session_dir = get_session_dir(session_id)
    frame_path = session_dir / filename

    if not frame_path.exists():
        raise HTTPException(status_code=404, detail="Snímka nebola nájdená.")

    ext = frame_path.suffix.lower()
    media_types = {
        ".png": "image/png",
        ".webp": "image/webp",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(frame_path),
        media_type=media_type,
        filename=filename,
        content_disposition_type="inline"
    )


@app.get("/api/download-zip/{session_id}/{filename}")
async def download_zip(session_id: str, filename: str):
    session_dir = get_session_dir(session_id)
    zip_path = session_dir / filename

    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="ZIP archív nebol nájdený.")

    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename=filename,
        content_disposition_type="attachment"
    )


# Frontend static files mounting
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(str(frontend_dist / "index.html"))

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
