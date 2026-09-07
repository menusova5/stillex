"""
STILLEX - Verification Tests for ComfyUI and Nuke Integrations
"""

import os
import sys
import subprocess
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(PROJECT_ROOT / "integrations" / "comfyui"))
sys.path.insert(0, str(PROJECT_ROOT / "integrations" / "nuke"))

from integrations.comfyui.stillex_node import STILLEX_VideoExtractor, STILLEX_BatchVideoExtractor
from integrations.nuke.stillex_nuke import extract_stills_via_ffmpeg


def generate_test_video(filename: str = "test_integration.mp4"):
    cmd = [
        "ffmpeg", "-f", "lavfi",
        "-i", "testsrc=duration=1.5:size=320x240:rate=24",
        "-c:v", "libx264", filename, "-y"
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return filename


def test_comfyui_node():
    print("\n--- Testovanie ComfyUI STILLEX Custom Node ---")
    video_file = generate_test_video("test_comfy.mp4")

    extractor = STILLEX_VideoExtractor()
    (
        start_img,
        end_img,
        mid_img,
        custom_img,
        s_path,
        e_path,
        meta_json
    ) = extractor.extract(
        video_path=video_file,
        pad_to_multiple_of_64=True,
        scale="original",
        extract_start=True,
        extract_end=True,
        extract_mid=True,
        custom_frame_number=10,
        save_stills_to_disk=True,
    )

    assert start_img is not None, "Chýba start_img v ComfyUI node"
    assert end_img is not None, "Chýba end_img v ComfyUI node"
    assert os.path.exists(s_path), f"Start frame súbor neexistuje: {s_path}"
    assert os.path.exists(e_path), f"End frame súbor neexistuje: {e_path}"
    assert s_path.endswith("_start_frame_stillex.png"), f"Nesprávna prípona: {s_path}"
    assert e_path.endswith("_end_frame_stillex.png"), f"Nesprávna prípona: {e_path}"

    print(f"[OK] ComfyUI Start Frame Shape: {start_img.shape}")
    print(f"[OK] ComfyUI End Frame Shape: {end_img.shape}")
    print(f"[OK] Start Frame Path: {s_path}")
    print(f"[OK] End Frame Path: {e_path}")

    # Clean up generated files
    for p in [video_file, s_path, e_path, s_path.replace("start", "mid"), s_path.replace("start", "custom")]:
        if os.path.exists(p):
            os.remove(p)

    print("[OK] ComfyUI STILLEX node funguje na 100%!")


def test_nuke_integration():
    print("\n--- Testovanie Foundry Nuke STILLEX Modulu ---")
    video_file = generate_test_video("test_nuke.mp4")

    res = extract_stills_via_ffmpeg(
        video_path=video_file,
        format="png",
        pad_64=True,
        extract_start=True,
        extract_end=True,
    )

    assert "start_frame" in res, "Chýba start_frame v Nuke extrakcii"
    assert "end_frame" in res, "Chýba end_frame v Nuke extrakcii"
    assert os.path.exists(res["start_frame"]), f"Nuke start frame neexistuje: {res['start_frame']}"
    assert os.path.exists(res["end_frame"]), f"Nuke end frame neexistuje: {res['end_frame']}"
    assert res["start_frame"].endswith("_start_frame_stillex.png")
    assert res["end_frame"].endswith("_end_frame_stillex.png")

    print(f"[OK] Nuke Start Frame: {res['start_frame']}")
    print(f"[OK] Nuke End Frame: {res['end_frame']}")

    # Clean up
    for p in [video_file, res["start_frame"], res["end_frame"]]:
        if os.path.exists(p):
            os.remove(p)

    print("[OK] Foundry Nuke modul funguje na 100%!")


if __name__ == "__main__":
    test_comfyui_node()
    test_nuke_integration()
    print("\n========================================================")
    print(" VŠETKY TESTY PRE COMFYUI AJ NUKE ÚSPEŠNE PREBEHLI! ")
    print("========================================================")
