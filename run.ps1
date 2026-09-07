Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       FrameForge AI - Video Frame Extractor" -ForegroundColor White
Write-Host "  Extraktor prveho a posledneho framu v 100% kvalite" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[CHYBA] Python nie je nainštalovaný alebo nie je v PATH." -ForegroundColor Red
    Write-Host "Nainštalujte Python 3.10+ z https://www.python.org/"
    pause
    exit 1
}

$backendDir = Join-Path $PSScriptRoot "backend"
Set-Location $backendDir

Write-Host "[1/3] Kontrola závislostí..." -ForegroundColor Yellow
python -m pip install -r requirements.txt --quiet --disable-pip-version-check

Write-Host "[2/3] Otváram prehliadač..." -ForegroundColor Yellow
Start-Process "http://localhost:8000"

Write-Host "[3/3] Server beží na http://localhost:8000" -ForegroundColor Green
Write-Host "Pre zastavenie stlačte Ctrl+C." -ForegroundColor Gray
Write-Host ""

python -m uvicorn main:app --host 127.0.0.1 --port 8000
