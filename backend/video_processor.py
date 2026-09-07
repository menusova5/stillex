import json
import os
import shutil
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

# Base temp directory for sessions
STORAGE_DIR = Path(tempfile.gettempdir()) / "frameforge_ai_sessions"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def parse_fraction(val: Optional[str]) -> float:
    if not val:
        return 0.0
    try:
        if "/" in val:
            num, den = val.split("/", 1)
            den_f = float(den)
            return float(num) / den_f if den_f != 0 else 0.0
        return float(val)
    except Exception:
        return 0.0


def format_duration(seconds: float) -> str:
    if seconds <= 0:
        return "00:00.000"
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    if mins >= 60:
        hours = mins // 60
        mins = mins % 60
        return f"{hours:02d}:{mins:02d}:{secs:02d}.{millis:03d}"
    return f"{mins:02d}:{secs:02d}.{millis:03d}"


def format_filesize(bytes_count: int) -> str:
    if bytes_count < 1024:
        return f"{bytes_count} B"
    elif bytes_count < 1024 * 1024:
        return f"{bytes_count / 1024:.1f} KB"
    elif bytes_count < 1024 * 1024 * 1024:
        return f"{bytes_count / (1024 * 1024):.2f} MB"
    return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"


def get_video_metadata(file_path: str) -> Dict[str, Any]:
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Chyba pri čítaní metadát videa: {result.stderr}")

    info = json.loads(result.stdout)
    streams = info.get("streams", [])
    fmt = info.get("format", {})

    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

    if not video_stream:
        raise ValueError("Nahraný súbor neobsahuje žiadnu video stopu.")

    width = int(video_stream.get("width") or 0)
    height = int(video_stream.get("height") or 0)

    # Frame rate
    fps_raw = video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate") or "0/1"
    fps = parse_fraction(fps_raw)

    # Duration
    duration_str = video_stream.get("duration") or fmt.get("duration") or "0"
    duration = float(duration_str)

    # Number of frames
    nb_frames_raw = video_stream.get("nb_frames")
    if nb_frames_raw and nb_frames_raw.isdigit():
        nb_frames = int(nb_frames_raw)
    else:
        nb_frames = round(duration * fps) if fps > 0 and duration > 0 else 0

    # Aspect Ratio
    dar = video_stream.get("display_aspect_ratio")
    if not dar or dar == "0:1":
        if width > 0 and height > 0:
            import math
            gcd = math.gcd(width, height)
            dar = f"{width // gcd}:{height // gcd}"
        else:
            dar = "N/A"

    # Bitrate
    bitrate = int(video_stream.get("bit_rate") or fmt.get("bit_rate") or 0)
    bitrate_formatted = f"{bitrate / 1_000_000:.2f} Mbps" if bitrate > 0 else "Neznámy"

    # Pixel format & bit depth
    pix_fmt = video_stream.get("pix_fmt", "unknown")
    bits = video_stream.get("bits_per_raw_sample")
    bit_depth = f"{bits}-bit" if bits else ("10-bit" if "10" in pix_fmt else "8-bit")

    # File size
    file_size = int(fmt.get("size") or os.path.getsize(file_path))

    return {
        "filename": os.path.basename(file_path),
        "filesize_bytes": file_size,
        "filesize_formatted": format_filesize(file_size),
        "duration_seconds": duration,
        "duration_formatted": format_duration(duration),
        "width": width,
        "height": height,
        "resolution": f"{width} × {height}",
        "aspect_ratio": dar,
        "fps": round(fps, 3),
        "total_frames": nb_frames,
        "video_codec": video_stream.get("codec_name", "unknown").upper(),
        "video_codec_long": video_stream.get("codec_long_name", ""),
        "profile": video_stream.get("profile", ""),
        "pixel_format": pix_fmt,
        "bit_depth": bit_depth,
        "bitrate_bps": bitrate,
        "bitrate_formatted": bitrate_formatted,
        "container_format": fmt.get("format_name", ""),
        "container_long": fmt.get("format_long_name", ""),
        "has_audio": audio_stream is not None,
        "audio_codec": audio_stream.get("codec_name", "").upper() if audio_stream else None,
    }


def create_session() -> str:
    session_id = str(uuid.uuid4())
    session_path = STORAGE_DIR / session_id
    session_path.mkdir(parents=True, exist_ok=True)
    return session_id


def get_session_dir(session_id: str) -> Path:
    return STORAGE_DIR / session_id


def extract_frames(
    session_id: str,
    video_path: str,
    original_filename: str,
    frame_types: List[str],  # ["first", "last", "middle", "custom"]
    custom_time: Optional[float] = None,
    custom_frame: Optional[int] = None,
    custom_mode: str = "seconds",  # "seconds" or "frame"
    output_format: str = "png",  # png, webp, jpg
    quality: int = 100,  # 1-100
    scale: str = "original",  # original, 4k, 1080p, 720p, square_1024
    custom_prefix: Optional[str] = None,
    pad_to_multiple_of_64: bool = False,
    include_manifest: bool = True,
) -> Dict[str, Any]:
    metadata = get_video_metadata(video_path)
    session_dir = get_session_dir(session_id)
    session_dir.mkdir(parents=True, exist_ok=True)

    if custom_prefix and custom_prefix.strip():
        base_name = custom_prefix.strip()
    else:
        base_name = Path(original_filename).stem

    # Sanitize base_name for file safety
    safe_base_name = "".join(c for c in base_name if c.isalnum() or c in ("-", "_", " ")).strip()
    if not safe_base_name:
        safe_base_name = "video"

    # Determine extension and ffmpeg flags
    ext = output_format.lower()
    if ext not in ("png", "webp", "jpg", "jpeg"):
        ext = "png"
    if ext == "jpeg":
        ext = "jpg"

    format_args = []
    if ext == "png":
        format_args = ["-c:v", "png", "-pix_fmt", "rgb24"]
    elif ext == "webp":
        if quality >= 100:
            format_args = ["-c:v", "libwebp", "-lossless", "1"]
        else:
            format_args = ["-c:v", "libwebp", "-q:v", str(quality)]
    elif ext == "jpg":
        q_scale = max(2, min(31, int(2 + (100 - quality) * 0.25)))
        format_args = ["-c:v", "mjpeg", "-q:v", str(q_scale), "-pix_fmt", "yuvj420p"]

    # Filter graph construction
    vf_filters = []
    if scale == "4k":
        vf_filters.append("scale=3840:2160:force_original_aspect_ratio=decrease")
    elif scale == "1080p":
        vf_filters.append("scale=1920:1080:force_original_aspect_ratio=decrease")
    elif scale == "720p":
        vf_filters.append("scale=1280:720:force_original_aspect_ratio=decrease")
    elif scale == "square_1024":
        vf_filters.append("scale=1024:1024:force_original_aspect_ratio=decrease")

    if pad_to_multiple_of_64:
        # Pad width and height to multiples of 64 (standard for neural latent diffusion models)
        vf_filters.append("pad=ceil(iw/64)*64:ceil(ih/64)*64:(ow-iw)/2:(oh-ih)/2:black")

    scale_filter = ["-vf", ",".join(vf_filters)] if vf_filters else []

    duration = metadata["duration_seconds"]
    fps = metadata["fps"] if metadata["fps"] > 0 else 30.0
    extracted_frames = []

    for ftype in frame_types:
        # STILLEX branding naming convention: always ends with _stillex
        suffix_map = {
            "first": "start_frame_stillex",
            "last": "end_frame_stillex",
            "middle": "mid_frame_stillex",
            "custom": "custom_frame_stillex",
        }
        suffix = suffix_map.get(ftype, f"{ftype}_stillex")
        out_filename = f"{safe_base_name}_{suffix}.{ext}"
        out_path = session_dir / out_filename
        timestamp_sec = 0.0

        label_map = {
            "first": "Start Frame",
            "last": "End Frame",
            "middle": "Mid Frame (50%)",
            "custom": "Custom Frame",
        }
        label = label_map.get(ftype, f"{ftype.capitalize()} Frame")

        if ftype == "first":
            timestamp_sec = 0.0
            cmd = [
                "ffmpeg",
                "-ss", "00:00:00.000",
                "-i", video_path,
                "-map", "0:v:0",
                "-frames:v", "1",
                *scale_filter,
                *format_args,
                str(out_path),
                "-y"
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        elif ftype == "last":
            seek_window = min(duration, max(0.5, 3.0 / fps))
            timestamp_sec = max(0.0, duration - (1.0 / fps if fps > 0 else 0.033))

            if duration <= 1.0:
                cmd = [
                    "ffmpeg",
                    "-i", video_path,
                    "-map", "0:v:0",
                    "-update", "1",
                    *scale_filter,
                    *format_args,
                    str(out_path),
                    "-y"
                ]
            else:
                cmd = [
                    "ffmpeg",
                    "-sseof", f"-{seek_window:.3f}",
                    "-i", video_path,
                    "-map", "0:v:0",
                    "-update", "1",
                    *scale_filter,
                    *format_args,
                    str(out_path),
                    "-y"
                ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        elif ftype == "middle":
            timestamp_sec = max(0.0, duration / 2.0)
            cmd = [
                "ffmpeg",
                "-ss", f"{timestamp_sec:.4f}",
                "-i", video_path,
                "-map", "0:v:0",
                "-frames:v", "1",
                *scale_filter,
                *format_args,
                str(out_path),
                "-y"
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        elif ftype == "custom":
            if custom_mode == "frame" and custom_frame is not None:
                timestamp_sec = max(0.0, min(duration, float(custom_frame) / fps))
                label = f"Custom Frame #{custom_frame} ({format_duration(timestamp_sec)})"
            elif custom_time is not None:
                timestamp_sec = max(0.0, min(duration, custom_time))
                label = f"Custom Frame ({format_duration(timestamp_sec)})"
            else:
                timestamp_sec = max(0.0, duration / 2.0)
                label = f"Custom Frame ({format_duration(timestamp_sec)})"

            cmd = [
                "ffmpeg",
                "-ss", f"{timestamp_sec:.4f}",
                "-i", video_path,
                "-map", "0:v:0",
                "-frames:v", "1",
                *scale_filter,
                *format_args,
                str(out_path),
                "-y"
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

        if out_path.exists() and out_path.stat().st_size > 0:
            frame_size = out_path.stat().st_size
            extracted_frames.append({
                "type": ftype,
                "label": label,
                "filename": out_filename,
                "url": f"/api/frames/{session_id}/{out_filename}",
                "timestamp_seconds": timestamp_sec,
                "timestamp_formatted": format_duration(timestamp_sec),
                "filesize_bytes": frame_size,
                "filesize_formatted": format_filesize(frame_size),
                "format": ext.upper(),
            })

    # Pre-generate ZIP file containing all extracted frames + optional manifest
    zip_filename = f"{safe_base_name}_stillex_bundle.zip"
    zip_path = session_dir / zip_filename

    manifest_data = {
        "generator": "STILLEX Pro",
        "video_source": original_filename,
        "export_prefix": safe_base_name,
        "metadata": metadata,
        "frames": extracted_frames,
        "settings": {
            "format": ext.upper(),
            "quality": quality,
            "scale": scale,
            "pad_to_multiple_of_64": pad_to_multiple_of_64,
        },
        "ai_conditioning_notes": {
            "runway_gen3": "Use start_frame_stillex for first frame, end_frame_stillex for last frame conditioning.",
            "kling_ai": "Supports 1:1, 16:9, 9:16 Start and End frame interpolation.",
            "luma_dream_machine": "Use start_frame_stillex and end_frame_stillex in Keyframes mode.",
            "comfyui": "Load with LoadImage node directly into VAEEncode for latent interpolation."
        }
    }

    manifest_path = session_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest_data, mf, indent=2)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for f in extracted_frames:
            f_path = session_dir / f["filename"]
            if f_path.exists():
                zipf.write(f_path, arcname=f["filename"])
        if include_manifest and manifest_path.exists():
            zipf.write(manifest_path, arcname="manifest.json")

    return {
        "session_id": session_id,
        "metadata": metadata,
        "frames": extracted_frames,
        "zip_url": f"/api/download-zip/{session_id}/{zip_filename}",
        "manifest_url": f"/api/frames/{session_id}/manifest.json",
        "settings_used": {
            "format": ext.upper(),
            "quality": quality,
            "scale": scale,
            "custom_prefix": safe_base_name,
            "pad_to_multiple_of_64": pad_to_multiple_of_64,
        }
    }


def cleanup_old_sessions(max_age_seconds: int = 3600):
    import time
    now = time.time()
    for item in STORAGE_DIR.iterdir():
        try:
            if item.is_dir() and (now - item.stat().st_mtime > max_age_seconds):
                shutil.rmtree(item, ignore_errors=True)
        except Exception:
            pass
