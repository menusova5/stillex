"""
STILLEX ComfyUI Custom Node
Extracts pixel-perfect, lossless Start & End frames for AI video conditioning workflows
(Runway Gen-3, Kling AI, Luma Dream Machine, Wan2.1, ComfyUI Diffusion Models).
"""

import json
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image

try:
    import torch
except ImportError:
    torch = None


def pil_to_tensor(image: Image.Image):
    """Converts a PIL Image to a ComfyUI standard torch.Tensor with shape [1, H, W, C] normalized to 0.0 - 1.0"""
    image_np = np.array(image).astype(np.float32) / 255.0
    if len(image_np.shape) == 2:  # Grayscale
        image_np = np.stack([image_np] * 3, axis=-1)
    elif image_np.shape[2] == 4:  # RGBA -> RGB
        image_np = image_np[:, :, :3]

    if torch is not None:
        tensor = torch.from_numpy(image_np)[None,]
        return tensor
    return image_np[None,]


def create_blank_tensor(width: int = 512, height: int = 512):
    """Creates a blank black image tensor for unselected frames."""
    blank = np.zeros((height, width, 3), dtype=np.float32)
    if torch is not None:
        return torch.from_numpy(blank)[None,]
    return blank[None,]


class STILLEX_VideoExtractor:
    """
    STILLEX Start & End Frame Extractor Node for ComfyUI.
    Extracts 1:1 original quality Start Frame, End Frame, Mid Frame, or Custom Frame
    from any video file with optional 64px VAE alignment padding.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "video_path": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "C:/path/to/video.mp4 or relative path"
                }),
                "pad_to_multiple_of_64": ("BOOLEAN", {
                    "default": True,
                    "label_on": "Enabled (Ideal for VAE)",
                    "label_off": "Disabled (Raw Aspect)"
                }),
                "scale": ([
                    "original",
                    "1080p",
                    "720p",
                    "4k",
                    "square_1024"
                ], {
                    "default": "original"
                }),
                "extract_start": ("BOOLEAN", {"default": True}),
                "extract_end": ("BOOLEAN", {"default": True}),
                "extract_mid": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "custom_frame_number": ("INT", {
                    "default": -1,
                    "min": -1,
                    "max": 1000000,
                    "step": 1,
                    "display": "number"
                }),
                "custom_time_seconds": ("FLOAT", {
                    "default": -1.0,
                    "min": -1.0,
                    "max": 86400.0,
                    "step": 0.01,
                    "display": "number"
                }),
                "custom_prefix": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "Optional custom filename prefix"
                }),
                "save_stills_to_disk": ("BOOLEAN", {
                    "default": True
                }),
                "output_directory": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "Leave empty for video's folder or temp directory"
                }),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE", "IMAGE", "IMAGE", "STRING", "STRING", "STRING")
    RETURN_NAMES = (
        "start_frame",
        "end_frame",
        "mid_frame",
        "custom_frame",
        "start_frame_path",
        "end_frame_path",
        "metadata_json"
    )
    FUNCTION = "extract"
    CATEGORY = "STILLEX"

    def extract(
        self,
        video_path: str,
        pad_to_multiple_of_64: bool = True,
        scale: str = "original",
        extract_start: bool = True,
        extract_end: bool = True,
        extract_mid: bool = False,
        custom_frame_number: int = -1,
        custom_time_seconds: float = -1.0,
        custom_prefix: str = "",
        save_stills_to_disk: bool = True,
        output_directory: str = "",
    ) -> Tuple[Any, Any, Any, Any, str, str, str]:
        if not video_path or not os.path.exists(video_path):
            raise FileNotFoundError(f"STILLEX Error: Video file not found: {video_path}")

        video_path_obj = Path(video_path).resolve()
        raw_prefix = custom_prefix.strip() if custom_prefix and custom_prefix.strip() else video_path_obj.stem
        safe_prefix = "".join(c for c in raw_prefix if c.isalnum() or c in ("-", "_")).strip() or "video"

        # Determine output directory
        if output_directory and output_directory.strip():
            out_dir = Path(output_directory.strip()).resolve()
        else:
            out_dir = video_path_obj.parent
        out_dir.mkdir(parents=True, exist_ok=True)

        # Probe video using ffprobe
        metadata = self._probe_video(str(video_path_obj))
        duration = metadata.get("duration_seconds", 1.0)
        fps = metadata.get("fps", 30.0)

        # Build scale filter
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
            vf_filters.append("pad=ceil(iw/64)*64:ceil(ih/64)*64:(ow-iw)/2:(oh-ih)/2:black")

        scale_filter = ["-vf", ",".join(vf_filters)] if vf_filters else []

        start_img, start_path = create_blank_tensor(), ""
        end_img, end_path = create_blank_tensor(), ""
        mid_img = create_blank_tensor()
        custom_img = create_blank_tensor()

        # 1. Start Frame
        if extract_start:
            target_file = out_dir / f"{safe_prefix}_start_frame_stillex.png"
            self._extract_frame_ffmpeg(
                str(video_path_obj),
                seek_time=0.0,
                out_path=str(target_file),
                scale_filter=scale_filter
            )
            if target_file.exists():
                start_path = str(target_file)
                pil_img = Image.open(target_file).convert("RGB")
                start_img = pil_to_tensor(pil_img)
                if not save_stills_to_disk:
                    target_file.unlink(missing_ok=True)

        # 2. End Frame
        if extract_end:
            target_file = out_dir / f"{safe_prefix}_end_frame_stillex.png"
            seek_window = max(0.5, min(duration, 3.0 / fps))
            self._extract_last_frame_ffmpeg(
                str(video_path_obj),
                seek_window=seek_window,
                out_path=str(target_file),
                scale_filter=scale_filter
            )
            if target_file.exists():
                end_path = str(target_file)
                pil_img = Image.open(target_file).convert("RGB")
                end_img = pil_to_tensor(pil_img)
                if not save_stills_to_disk:
                    target_file.unlink(missing_ok=True)

        # 3. Middle Frame
        if extract_mid:
            target_file = out_dir / f"{safe_prefix}_mid_frame_stillex.png"
            mid_time = duration / 2.0
            self._extract_frame_ffmpeg(
                str(video_path_obj),
                seek_time=mid_time,
                out_path=str(target_file),
                scale_filter=scale_filter
            )
            if target_file.exists():
                pil_img = Image.open(target_file).convert("RGB")
                mid_img = pil_to_tensor(pil_img)
                if not save_stills_to_disk:
                    target_file.unlink(missing_ok=True)

        # 4. Custom Frame
        if custom_frame_number >= 0 or custom_time_seconds >= 0:
            target_file = out_dir / f"{safe_prefix}_custom_frame_stillex.png"
            if custom_frame_number >= 0:
                c_time = max(0.0, min(duration, custom_frame_number / fps))
            else:
                c_time = max(0.0, min(duration, custom_time_seconds))

            self._extract_frame_ffmpeg(
                str(video_path_obj),
                seek_time=c_time,
                out_path=str(target_file),
                scale_filter=scale_filter
            )
            if target_file.exists():
                pil_img = Image.open(target_file).convert("RGB")
                custom_img = pil_to_tensor(pil_img)
                if not save_stills_to_disk:
                    target_file.unlink(missing_ok=True)

        manifest = {
            "source_video": str(video_path_obj),
            "prefix": safe_prefix,
            "metadata": metadata,
            "settings": {
                "pad_to_multiple_of_64": pad_to_multiple_of_64,
                "scale": scale,
            },
            "outputs": {
                "start_frame_path": start_path,
                "end_frame_path": end_path,
            }
        }

        return (
            start_img,
            end_img,
            mid_img,
            custom_img,
            start_path,
            end_path,
            json.dumps(manifest, indent=2)
        )

    def _probe_video(self, file_path: str) -> Dict[str, Any]:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
        ]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
            data = json.loads(res.stdout)
            format_info = data.get("format", {})
            v_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})

            dur = float(format_info.get("duration", 0) or v_stream.get("duration", 0) or 1.0)
            fps_str = v_stream.get("r_frame_rate", "30/1")
            if "/" in fps_str:
                n, d = fps_str.split("/", 1)
                fps = float(n) / float(d) if float(d) != 0 else 30.0
            else:
                fps = float(fps_str or 30.0)

            return {
                "width": int(v_stream.get("width", 1920)),
                "height": int(v_stream.get("height", 1080)),
                "duration_seconds": dur,
                "fps": fps,
                "codec": v_stream.get("codec_name", "unknown"),
            }
        except Exception:
            return {"width": 1920, "height": 1080, "duration_seconds": 1.0, "fps": 30.0}

    def _extract_frame_ffmpeg(self, video_path: str, seek_time: float, out_path: str, scale_filter: list):
        cmd = [
            "ffmpeg",
            "-ss", f"{seek_time:.4f}",
            "-i", video_path,
            "-map", "0:v:0",
            "-frames:v", "1",
            *scale_filter,
            "-c:v", "png",
            "-pix_fmt", "rgb24",
            out_path,
            "-y"
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    def _extract_last_frame_ffmpeg(self, video_path: str, seek_window: float, out_path: str, scale_filter: list):
        cmd = [
            "ffmpeg",
            "-sseof", f"-{seek_window:.3f}",
            "-i", video_path,
            "-map", "0:v:0",
            "-update", "1",
            *scale_filter,
            "-c:v", "png",
            "-pix_fmt", "rgb24",
            out_path,
            "-y"
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


class STILLEX_BatchVideoExtractor:
    """
    STILLEX Batch Video Frame Extractor Node for ComfyUI.
    Scans a folder for all video files and extracts start & end frame pairs in bulk.
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {
                    "default": "",
                    "multiline": False,
                    "placeholder": "C:/path/to/videos_folder"
                }),
                "pad_to_multiple_of_64": ("BOOLEAN", {"default": True}),
                "scale": (["original", "1080p", "720p", "4k", "square_1024"], {"default": "original"}),
            },
            "optional": {
                "output_directory": ("STRING", {"default": ""}),
                "max_videos": ("INT", {"default": 50, "min": 1, "max": 1000}),
            }
        }

    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("batch_summary_json", "processed_video_count")
    FUNCTION = "batch_extract"
    CATEGORY = "STILLEX"

    def batch_extract(
        self,
        folder_path: str,
        pad_to_multiple_of_64: bool = True,
        scale: str = "original",
        output_directory: str = "",
        max_videos: int = 50,
    ):
        p = Path(folder_path).resolve()
        if not p.exists() or not p.is_dir():
            raise NotADirectoryError(f"Folder not found: {folder_path}")

        valid_exts = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".flv", ".wmv"}
        video_files = [f for f in p.iterdir() if f.suffix.lower() in valid_exts][:max_videos]

        extractor = STILLEX_VideoExtractor()
        results = []

        for v in video_files:
            try:
                _, _, _, _, s_path, e_path, meta = extractor.extract(
                    video_path=str(v),
                    pad_to_multiple_of_64=pad_to_multiple_of_64,
                    scale=scale,
                    extract_start=True,
                    extract_end=True,
                    save_stills_to_disk=True,
                    output_directory=output_directory,
                )
                results.append({
                    "video": v.name,
                    "start_frame": s_path,
                    "end_frame": e_path,
                })
            except Exception as e:
                results.append({"video": v.name, "error": str(e)})

        summary = {
            "total_processed": len(results),
            "videos": results
        }
        return (json.dumps(summary, indent=2), len(results))
