@echo off
title GODLOG - Avvio
color 0A

echo.
echo  ============================================
echo       GODLOG - Abaco Server Log Analyzer
echo                   by EM
echo  ============================================
echo.

cd /d "%~dp0"

:: Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo  [*] Prima esecuzione: installazione dipendenze...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [!] ERRORE: npm install fallito.
        echo      Assicurati che Node.js sia installato.
        echo      Scaricalo da: https://nodejs.org
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dipendenze installate!
    echo.
)

echo  [*] Avvio GODLOG in modalita' sviluppo...
echo  [*] Attendi che si apra la finestra dell'app...
echo.
echo  Premi Ctrl+C per fermare l'app.
echo.

call npm run electron:dev

echo.
echo  [*] GODLOG terminato.
pause
