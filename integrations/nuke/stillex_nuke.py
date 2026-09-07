"""
STILLEX - Foundry Nuke Integration
Extracts Start & End frame still plates and creates AI conditioning FrameHold rigs
directly inside Foundry Nuke (v12, v13, v14, v15+).
"""

import os
import sys
import json
import subprocess
from pathlib import Path

# Detect if running inside Foundry Nuke
try:
    import nuke
    IN_NUKE = True
except ImportError:
    nuke = None
    IN_NUKE = False


def extract_stills_via_ffmpeg(
    video_path: str,
    output_dir: str = "",
    custom_prefix: str = "",
    format: str = "png",
    pad_64: bool = False,
    extract_start: bool = True,
    extract_end: bool = True,
) -> dict:
    """
    Extracts start and end frames from video using FFmpeg.
    Can be called standalone or from inside Nuke.
    """
    v_path = Path(video_path).resolve()
    if not v_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    out_dir = Path(output_dir).resolve() if output_dir else v_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)

    prefix = custom_prefix.strip() if custom_prefix else v_path.stem
    safe_prefix = "".join(c for c in prefix if c.isalnum() or c in ("-", "_")).strip() or "stillex"

    # Probe duration and fps
    probe_cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", str(v_path)
    ]
    duration = 1.0
    fps = 24.0
    try:
        res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        data = json.loads(res.stdout)
        dur = float(data.get("format", {}).get("duration", 0) or 1.0)
        v_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), {})
        duration = dur
        fps_str = v_stream.get("r_frame_rate", "24/1")
        if "/" in fps_str:
            n, d = fps_str.split("/", 1)
            fps = float(n) / float(d) if float(d) != 0 else 24.0
    except Exception:
        pass

    scale_filter = ["-vf", "pad=ceil(iw/64)*64:ceil(ih/64)*64:(ow-iw)/2:(oh-ih)/2:black"] if pad_64 else []
    results = {}

    # Start Frame
    if extract_start:
        start_file = out_dir / f"{safe_prefix}_start_frame_stillex.{format}"
        cmd_start = [
            "ffmpeg", "-ss", "00:00:00.000", "-i", str(v_path),
            "-map", "0:v:0", "-frames:v", "1",
            *scale_filter, str(start_file), "-y"
        ]
        subprocess.run(cmd_start, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        results["start_frame"] = str(start_file)

    # End Frame
    if extract_end:
        end_file = out_dir / f"{safe_prefix}_end_frame_stillex.{format}"
        seek_window = max(0.5, 3.0 / fps)
        cmd_end = [
            "ffmpeg", "-sseof", f"-{seek_window:.3f}", "-i", str(v_path),
            "-map", "0:v:0", "-update", "1",
            *scale_filter, str(end_file), "-y"
        ]
        subprocess.run(cmd_end, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        results["end_frame"] = str(end_file)

    return results


def extract_from_selected_read():
    """
    Nuke Action: Reads the currently selected Read node in Nuke,
    extracts its start and end frame still plates, and adds new Read nodes to the DAG.
    """
    if not IN_NUKE:
        print("[STILLEX] Error: Must be executed inside Foundry Nuke.")
        return

    selected = nuke.selectedNodes("Read")
    if not selected:
        nuke.message("STILLEX: Please select at least one Read node in the Node Graph.")
        return

    for node in selected:
        file_path = node["file"].value()
        first_frame = int(node["first"].value())
        last_frame = int(node["last"].value())

        # If it's a single video file (e.g. .mp4, .mov, .mkv)
        if any(file_path.lower().endswith(ext) for ext in [".mp4", ".mov", ".mkv", ".webm", ".avi"]):
            stills = extract_stills_via_ffmpeg(file_path)

            # Create new Read node for start frame
            if "start_frame" in stills:
                r_start = nuke.createNode("Read", inpanel=False)
                r_start["file"].setValue(stills["start_frame"])
                r_start.setXpos(node.xpos() - 120)
                r_start.setYpos(node.ypos() + 100)
                r_start.setName("Read_StartFrame_STILLEX")

            # Create new Read node for end frame
            if "end_frame" in stills:
                r_end = nuke.createNode("Read", inpanel=False)
                r_end["file"].setValue(stills["end_frame"])
                r_end.setXpos(node.xpos() + 120)
                r_end.setYpos(node.ypos() + 100)
                r_end.setName("Read_EndFrame_STILLEX")

            nuke.message(f"STILLEX: Successfully extracted start & end frames for {node.name()}!")
        else:
            # For image sequences: create FrameHold rig
            create_framehold_rig(node, first_frame, last_frame)


def create_framehold_rig(node=None, first_frame=None, last_frame=None):
    """
    Nuke Action: Creates a dual FrameHold rig connected to a Read node
    for instant Start & End frame clean-up, AI projection, and painting.
    """
    if not IN_NUKE:
        return

    if node is None:
        sel = nuke.selectedNodes()
        if not sel:
            nuke.message("STILLEX: Please select a node to create FrameHold rig.")
            return
        node = sel[0]

    if first_frame is None:
        first_frame = int(node["first"].value()) if "first" in node.knobs() else int(nuke.root()["first_frame"].value())
    if last_frame is None:
        last_frame = int(node["last"].value()) if "last" in node.knobs() else int(nuke.root()["last_frame"].value())

    # Create Start FrameHold
    fh_start = nuke.createNode("FrameHold", inpanel=False)
    fh_start.setInput(0, node)
    fh_start["firstFrame"].setValue(first_frame)
    fh_start.setName("STILLEX_StartFrameHold")
    fh_start.setXpos(node.xpos() - 100)
    fh_start.setYpos(node.ypos() + 80)

    # Create End FrameHold
    fh_end = nuke.createNode("FrameHold", inpanel=False)
    fh_end.setInput(0, node)
    fh_end["firstFrame"].setValue(last_frame)
    fh_end.setName("STILLEX_EndFrameHold")
    fh_end.setXpos(node.xpos() + 100)
    fh_end.setYpos(node.ypos() + 80)

    # Add backdrop node
    nuke.selectAll()
    nuke.invertSelection()


def create_stillex_node():
    """
    Nuke Action: Creates a STILLEX Custom Tool Group node with UI knobs
    for video extraction and AI plate management directly in Nuke.
    """
    if not IN_NUKE:
        return

    group = nuke.createNode("Group")
    group.setName("STILLEX_Extractor")

    # Add Custom Knobs
    tab = nuke.Tab_Knob("stillex_tab", "STILLEX")
    group.addKnob(tab)

    title = nuke.Text_Knob("title_lbl", "", "<font color='#ffffff' size='4'><b>STILLEX</b></font> // Start & End Frame AI Extractor")
    group.addKnob(title)

    video_file = nuke.File_Knob("video_file", "Video Source")
    group.addKnob(video_file)

    out_folder = nuke.File_Knob("output_dir", "Export Folder")
    group.addKnob(out_folder)

    fmt = nuke.Enumeration_Knob("format", "Image Format", ["png", "jpg", "exr", "tiff"])
    group.addKnob(fmt)

    pad_64 = nuke.Boolean_Knob("pad_64", "AI Smart-Padding (64px)", True)
    group.addKnob(pad_64)

    py_script = """
import stillex_nuke
node = nuke.thisNode()
vf = node['video_file'].value()
out = node['output_dir'].value()
f = node['format'].value()
p = node['pad_64'].value()
if vf:
    res = stillex_nuke.extract_stills_via_ffmpeg(vf, output_dir=out, format=f, pad_64=p)
    nuke.message(f"STILLEX: Extracted\\nStart: {res.get('start_frame')}\\nEnd: {res.get('end_frame')}")
else:
    nuke.message("STILLEX: Please select a video file first.")
"""
    btn_extract = nuke.PyScript_Knob("extract_btn", "▷ EXTRACT START & END FRAMES", py_script)
    group.addKnob(btn_extract)

    py_hold = """
import stillex_nuke
stillex_nuke.create_framehold_rig(nuke.thisNode())
"""
    btn_hold = nuke.PyScript_Knob("hold_btn", "Create Start/End FrameHold Rig", py_hold)
    group.addKnob(btn_hold)

    return group


if __name__ == "__main__":
    if len(sys.argv) > 1:
        video = sys.argv[1]
        print(f"STILLEX CLI: Extracting frames for {video}...")
        res = extract_stills_via_ffmpeg(video)
        print("Done:", json.dumps(res, indent=2))
    else:
        print("STILLEX Nuke Module loaded.")
