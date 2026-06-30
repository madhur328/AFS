@echo off
cd /d "%~dp0"
echo Starting AFS Platform (API + Client)...
start "AFS API" cmd /c "node server/index.js"
timeout /t 2 /nobreak >nul
cd client
echo Client: http://localhost:5173
node node_modules\vite\bin\vite.js --port 5173