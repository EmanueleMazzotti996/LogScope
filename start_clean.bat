@echo off
title LogScope - Clean Start
echo [1/3] Terminazione processi pendenti...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM electron.exe /T >nul 2>&1

echo [2/3] Pulizia porta 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [3/3] Avvio LogScope in modalità sviluppo...
npm run electron:dev
pause
