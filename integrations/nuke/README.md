# STILLEX • Foundry Nuke Integration

VFX-grade Start & End frame extraction and AI conditioning rigs for **Foundry Nuke** (v12, v13, v14, v15+).

Designed for compositors, matte painters, and VFX artists who need to extract clean Start & End still plates from footage or 3D renders for AI inpainting (Runway Gen-3, Kling, Wan2.1, ComfyUI) or projection setups.

---

## 🚀 Installation

### Option 1: User Directory (Easiest)
Copy or symlink the `integrations/nuke` contents into your user `.nuke` folder:
- **Windows:** `C:\Users\<username>\.nuke\`
- **Linux:** `/home/<username>/.nuke/`
- **macOS:** `/Users/<username>/.nuke/`

If you already have `init.py` or `menu.py`, append this line to your existing files:
- In `init.py`:
  ```python
  nuke.pluginAddPath("/path/to/stillex/integrations/nuke")
  ```
- In `menu.py`:
  ```python
  import stillex_nuke
  import menu  # loads STILLEX menus
  ```

### Option 2: Studio Pipeline / Network Path
Add the `integrations/nuke` directory to the `NUKE_PATH` environment variable:
```bash
export NUKE_PATH="/tools/stillex/integrations/nuke:$NUKE_PATH"
```

---

## 🧩 Features & Tools

### 1. `STILLEX_FrameHold.gizmo`
- Connect directly downstream of any `Read` node or comp tree.
- Automatically reads the input sequence's `first` and `last` frame.
- Toggle between **Start Frame**, **End Frame**, or **Original Stream** via a simple dropdown knob.
- Built-in button: `▷ Extract PNG Stills to Disk`.

### 2. One-Click Read Node Splitter (`Alt + Shift + S`)
- Select any `Read` node in your Node Graph (video or image sequence).
- Press `Alt + Shift + S` (or click `STILLEX > Extract Start & End from Selected Read`).
- Instantly extracts `{shot}_start_frame_stillex.png` and `{shot}_end_frame_stillex.png` and imports them back into the DAG as two new clean `Read` nodes positioned side-by-side!

### 3. Dual FrameHold Rig Generator (`Alt + Shift + H`)
- Select any footage node.
- Press `Alt + Shift + H`.
- Spawns two calibrated `FrameHold` nodes:
  - `STILLEX_StartFrameHold` (held at first frame)
  - `STILLEX_EndFrameHold` (held at last frame)
- Perfect for matte painting, clean-plate projections, and temporal reference alignment.

### 4. Standalone CLI Execution
Can also be called from terminal without launching Nuke GUI:
```bash
python integrations/nuke/stillex_nuke.py C:/path/to/footage.mov
```
