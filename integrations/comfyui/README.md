# STILLEX • ComfyUI Custom Node Extension

Extract pixel-perfect, 100% lossless Start & End frames directly inside **ComfyUI** for AI video-to-video, image-to-video, and interpolation pipelines (Runway Gen-3, Kling AI, Luma Dream Machine, Wan2.1, SVD).

---

## 🚀 Installation

1. Navigate to your ComfyUI directory:
   ```bash
   cd ComfyUI/custom_nodes/
   ```
2. Clone or copy the `integrations/comfyui` folder here:
   ```bash
   git clone https://github.com/menusova5/stillex.git
   cp -r stillex/integrations/comfyui ComfyUI-STILLEX
   ```
   *(Or simply symlink / copy `integrations/comfyui` into `ComfyUI/custom_nodes/ComfyUI-STILLEX`)*
3. Restart ComfyUI.

---

## 🧩 Included Nodes

### 1. `STILLEX • Video Start & End Frame Extractor`
- **Inputs:**
  - `video_path`: Absolute or relative path to video file (`.mp4`, `.mov`, `.mkv`, `.webm`, `.prores`, etc.).
  - `pad_to_multiple_of_64`: Automatically pads dimensions with black bars to multiples of 64 (mandatory for standard VAE encoders to prevent dimension mismatch crashes).
  - `scale`: Original 1:1, 1080p, 720p, 4K, or 1024×1024 square.
  - `extract_start`: Extracts the first frame (`0.000s`).
  - `extract_end`: Extracts the final terminal frame (avoiding black container padding).
  - `extract_mid`: Extracts the 50% midpoint frame.
  - `custom_frame_number` / `custom_time_seconds`: Optional specific frame or second.
  - `save_stills_to_disk`: Saves `{video}_start_frame_stillex.png` and `{video}_end_frame_stillex.png` on disk.
- **Outputs:**
  - `start_frame`: `IMAGE` tensor `[1, H, W, 3]` (Plug directly into `VAEEncode` or `PreviewImage`).
  - `end_frame`: `IMAGE` tensor `[1, H, W, 3]`.
  - `mid_frame`: `IMAGE` tensor `[1, H, W, 3]`.
  - `custom_frame`: `IMAGE` tensor `[1, H, W, 3]`.
  - `start_frame_path`: File path string.
  - `end_frame_path`: File path string.
  - `metadata_json`: Video specs JSON string.

### 2. `STILLEX • Batch Video Frame Extractor`
- Scans an entire folder of video files and extracts start & end plates in bulk.

---

## 💡 Typical ComfyUI Workflow

```
[ STILLEX Video Extractor ]
    ├── start_frame (IMAGE) ──> [ VAE Encode ] ──> [ Wan2.1 / Kling / SVD Model ]
    └── end_frame   (IMAGE) ──> [ VAE Encode ] ──> [ Wan2.1 / Kling / SVD Model ]
```
