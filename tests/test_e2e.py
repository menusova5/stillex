import os
import subprocess
import sys
from pathlib import Path
import zipfile

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=== SPUŠŤAM E2E TESTY PRE FRAMEFORGE AI ===")
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check zlyhal: {res.text}"
    health_data = res.json()
    assert health_data["ffmpeg_available"] is True, "FFmpeg nie je dostupný!"
    assert health_data["ffprobe_available"] is True, "FFprobe nie je dostupný!"
    print("[OK] 1. Kontrola systemu: FFmpeg a FFprobe su plne funkcne.")

    # 2. Testovanie rôznych formátov videa
    formats_to_test = [
        ("test_video.mp4", "libx264", 1920, 1080, 2.0, 30),
        ("test_video.mkv", "libx264", 1280, 720, 1.5, 60),
        ("test_video.webm", "libvpx-vp9", 640, 360, 1.0, 25),
    ]

    for fname, vcodec, w, h, dur, fps in formats_to_test:
        print(f"\n--- Testujem formát: {fname} ({w}x{h}, {fps}fps, {vcodec}) ---")
        
        # Vytvorenie testovacieho videa
        cmd = [
            "ffmpeg", "-f", "lavfi",
            "-i", f"testsrc=duration={dur}:size={w}x{h}:rate={fps}",
            "-c:v", vcodec, fname, "-y"
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        # Probe test
        with open(fname, "rb") as f:
            res_probe = client.post("/api/probe", files={"video": (fname, f, "video/octet-stream")})
        
        assert res_probe.status_code == 200, f"Probe zlyhal pre {fname}: {res_probe.text}"
        pdata = res_probe.json()
        sid = pdata["session_id"]
        meta = pdata["metadata"]
        
        assert meta["width"] == w, f"Nesprávna šírka: {meta['width']} != {w}"
        assert meta["height"] == h, f"Nesprávna výška: {meta['height']} != {h}"
        assert abs(meta["duration_seconds"] - dur) < 0.1, f"Nesprávna dĺžka: {meta['duration_seconds']}"
        print(f"✓ Probe úspešný: Rozlíšenie {meta['resolution']}, Kodek {meta['video_codec']}, Celkovo snímok: {meta['total_frames']}")

        # Extrakcia test (PNG Lossless, first + last + middle)
        res_extract = client.post("/api/extract", data={
            "session_id": sid,
            "frame_types": "first,last,middle",
            "output_format": "png",
            "quality": 100,
            "scale": "original"
        })
        assert res_extract.status_code == 200, f"Extrakcia zlyhala: {res_extract.text}"
        edata = res_extract.json()
        frames = edata["frames"]
        assert len(frames) == 3, f"Očakávané 3 framy, prišlo {len(frames)}"

        types_found = [f["type"] for f in frames]
        assert "first" in types_found, "Chýba prvý frame!"
        assert "last" in types_found, "Chýba posledný frame!"
        assert "middle" in types_found, "Chýba stredový frame!"

        # Overenie stiahnutia jednotlivého framu
        first_frame = next(f for f in frames if f["type"] == "first")
        assert first_frame["filename"].endswith("_start_frame_stillex.png"), f"Nesprávne meno prvého framu: {first_frame['filename']}"
        res_img = client.get(f"/api/frames/{sid}/{first_frame['filename']}")
        assert res_img.status_code == 200, f"Stiahnutie framu zlyhalo: {res_img.status_code}"
        assert res_img.headers.get("content-type") == "image/png"
        assert len(res_img.content) > 1000, "Súbor obrázku je príliš malý!"
        print(f"✓ Extrahovaný Start frame: {first_frame['filename']} ({first_frame['filesize_formatted']})")

        last_frame = next(f for f in frames if f["type"] == "last")
        assert last_frame["filename"].endswith("_end_frame_stillex.png"), f"Nesprávne meno posledného framu: {last_frame['filename']}"
        print(f"✓ Extrahovaný End frame: {last_frame['filename']} ({last_frame['filesize_formatted']}) na čase {last_frame['timestamp_formatted']}")

        # Overenie ZIP archívu
        zip_url = edata["zip_url"]
        zip_filename = zip_url.split("/")[-1]
        assert "_stillex_bundle.zip" in zip_filename, f"ZIP názov neobsahuje _stillex_bundle.zip: {zip_filename}"
        res_zip = client.get(f"/api/download-zip/{sid}/{zip_filename}")
        assert res_zip.status_code == 200, "Stiahnutie ZIP zlyhalo"
        assert res_zip.headers.get("content-type") == "application/zip"
        
        # Test obsahu ZIP
        zip_temp_path = f"temp_{zip_filename}"
        with open(zip_temp_path, "wb") as zf:
            zf.write(res_zip.content)
        with zipfile.ZipFile(zip_temp_path, "r") as zf:
            zip_files = zf.namelist()
            assert "manifest.json" in zip_files, f"ZIP neobsahuje manifest.json: {zip_files}"
            image_files = [f for f in zip_files if f.endswith(".png")]
            assert len(image_files) == 3, f"ZIP neobsahuje 3 snímky: {zip_files}"
        os.remove(zip_temp_path)
        print(f"✓ ZIP balík overený: {zip_filename} obsahuje 3 snímky + manifest.json.")

        # Upratanie testovacieho videa
        if os.path.exists(fname):
            os.remove(fname)

    # 3. Testovanie Creator Pro funkcií (custom prefix, custom frame number, smart padding, manifest)
    print("\n--- Testujem Creator Pro funkcie ---")
    pro_video = "test_pro.mp4"
    cmd_pro = [
        "ffmpeg", "-f", "lavfi",
        "-i", "testsrc=duration=2.0:size=854x480:rate=24",
        "-c:v", "libx264", pro_video, "-y"
    ]
    subprocess.run(cmd_pro, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    with open(pro_video, "rb") as f:
        res_pro = client.post(
            "/api/extract",
            files={"video": (pro_video, f, "video/mp4")},
            data={
                "frame_types": "first,last,custom",
                "output_format": "png",
                "custom_prefix": "scene01_take02",
                "custom_mode": "frame",
                "custom_frame": 12,
                "pad_to_multiple_of_64": "true",
                "include_manifest": "true",
            }
        )
    assert res_pro.status_code == 200, f"Pro extract zlyhal: {res_pro.text}"
    pdata = res_pro.json()
    assert "manifest_url" in pdata, "Chýba manifest_url v Pro odpovedi"
    p_frames = pdata["frames"]
    assert len(p_frames) == 3, f"Očakávané 3 framy, prišlo {len(p_frames)}"
    assert p_frames[0]["filename"] == "scene01_take02_start_frame_stillex.png", f"Nesprávny start frame: {p_frames[0]['filename']}"
    assert p_frames[1]["filename"] == "scene01_take02_end_frame_stillex.png", f"Nesprávny end frame: {p_frames[1]['filename']}"
    assert p_frames[2]["filename"] == "scene01_take02_custom_frame_stillex.png", f"Nesprávny custom frame: {p_frames[2]['filename']}"
    assert "Custom Frame #12" in p_frames[2]["label"], f"Nesprávny label: {p_frames[2]['label']}"
    if os.path.exists(pro_video):
        os.remove(pro_video)
    print("✓ Creator Pro úspešne overený: Vlastný prefix (scene01_take02), Custom Frame #12 a STILLEX prípona.")

    # 4. Testovanie statických súborov frontendu
    print("\n--- Testujem servovanie frontendu ---")
    res_root = client.get("/")
    assert res_root.status_code == 200, f"Root zlyhal: {res_root.status_code}"
    assert "STILLEX" in res_root.text, "Index.html neobsahuje STILLEX"
    print("✓ Frontend index.html a assety sa úspešne servujú z FastAPI.")

    print("\n========================================================")
    print("  VŠETKY TESTY PREBEHLI NA 100% ÚSPEŠNE! PRIpravené.   ")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
