@echo off
setlocal
set PORT=8935

cd /d "%~dp0"

echo Iniciando servidor local do BranchAndBound na porta %PORT%...
start "BranchAndBound server (feche esta janela para parar)" /min cmd /c "python -m http.server %PORT% --bind 127.0.0.1"

timeout /t 1 /nobreak >nul

start "" "http://localhost:%PORT%/index.html"
