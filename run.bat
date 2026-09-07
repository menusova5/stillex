@echo off
title FrameForge AI - Video Frame Extractor
echo ========================================================
echo        FrameForge AI - Video Frame Extractor
echo   Extraktor prveho a posledneho framu v 100%% kvalite
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [CHYBA] Python nie je nainstalovany alebo nie je v premennej PATH.
    echo Prosim nainstalujte Python 3.10+ z https://www.python.org/
    pause
    exit /b 1
)

where ffmpeg >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [VAROVANIE] FFmpeg nebol najdeny v PATH. Uistite sa, ze FFmpeg je dostupny.
)

echo [1/3] Kontrola Python kniznic...
cd /d "%~dp0backend"
python -m pip install -r requirements.txt --quiet --disable-pip-version-check

echo [2/3] Otvaram prehliadac...
start "" "http://localhost:8000"

echo [3/3] Spustam FrameForge AI server na http://localhost:8000...
echo Pre ukoncenie stlacte Ctrl+C v tomto okne.
echo.
python -m uvicorn main:app --host 127.0.0.1 --port 8000

pause
