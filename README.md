# STILLEX • Start & End Frame Extractor 🎬✨

A minimalist, high-speed, technical drawing-style creative web application engineered for **AI video & image conditioning workflows** (Runway Gen-3 Alpha, Kling AI, Luma Dream Machine, Sora, Hailuo/Minimax, Wan2.1, ComfyUI, Stable Video Diffusion).

STILLEX extracts **pixel-perfect, 100% lossless start & end frames** from any video format, with custom frame precision, zero server fees, and full support for running both locally via FFmpeg and serverless via **GitHub Pages**.

---

## ⚡ Deployment & Hosting

### Option 1: Live on GitHub Pages (100% Serverless & Client-Side)
STILLEX includes an in-browser WebEngine (HTML5 Video + Canvas + JSZip) that extracts frames directly on your GPU/CPU with zero cloud uploads and zero server costs.
- Automatically builds and deploys via GitHub Actions (`.github/workflows/deploy.yml`).
- Works on any static host (GitHub Pages, Vercel, Netlify, Cloudflare Pages).

### Option 2: Local Launch (FastAPI + Native FFmpeg 7.1)
1. Double-click **`run.bat`** (or run `./run.ps1` in PowerShell).
2. The script boots the local server and opens your browser at:
   ```
   http://localhost:8000
   ```

---

## 🌟 Features

### 1. Minimalist Technical Drawing & CAD Aesthetic
- Pure black & white high-contrast drafting style (`#000000` base, `#ffffff` accents).
- Hairline borders, corner registration marks (`+`), monospace technical coordinates, and zero visual clutter.

### 2. Guided 3-Step Auto-Scroll UX
1. **01 / Source Video:** Drag & drop any video format.
2. **02 / Settings & Specs:** Automatic smooth scroll to the video inspection table and extraction parameters.
3. **03 / Extracted Frames:** Automatic smooth scroll to side-by-side Start & End frames with one-click download & copy.

### 3. Unique `_stillex` Suffix File Naming
All exported files strictly follow the naming convention:
- Start Frame: `{video_name}_start_frame_stillex.png`
- End Frame: `{video_name}_end_frame_stillex.png`
- Mid Frame: `{video_name}_mid_frame_stillex.png`
- Custom Frame: `{video_name}_custom_frame_stillex.png`
- ZIP Bundle: `{video_name}_stillex_bundle.zip` (includes all frames + `manifest.json`)

### 4. Creator PRO Features
- **Unlimited Multi-Video Batch Queue:** Process multiple videos simultaneously.
- **Custom Frame Extraction:** Select exact time (seconds) or exact frame number with PTS calculation.
- **Custom Filename Prefix:** Set pipeline prefix (e.g. `scene01_take02`).
- **AI Smart-Padding (64px):** Automatically pad to multiples of 64px for diffusion neural networks (ComfyUI / Kling).
- **Metadata Manifest:** `manifest.json` included in ZIP with full technical specs and AI prompt conditioning guidance.

### 5. Multi-Language Support (7 Languages, English Default)
- English 🇺🇸 • Slovenčina 🇸🇰 • Deutsch 🇩🇪 • Español 🇪🇸 • Français 🇫🇷 • 日本語 🇯🇵 • 简体中文 🇨🇳

---

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, JSZip.
- **Backend (Optional Local):** FastAPI, Uvicorn, Native FFmpeg 7.1 & FFprobe.
- **CI/CD:** GitHub Actions -> GitHub Pages automated deployment.
