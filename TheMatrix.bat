@echo off
REM ─────────────────────────────────────────────────────
REM Deploy & Refresh Discord Bot
REM Double-click to run: stops old bot, deploys commands, then launches new bot
REM ─────────────────────────────────────────────────────

echo [INFO] Terminating existing bot instances...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Old Node.js processes terminated.
) else (
    echo [WARN] No Node.js processes found or failed to terminate.
)

echo.
echo [INFO] Deploying slash commands...
node deploy-commands.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] deploy-commands.js failed with exit code %ERRORLEVEL%.
    pause
    exit /B %ERRORLEVEL%
)
echo [INFO] Commands deployed successfully.

echo.
echo [INFO] Starting bot...
REM “start” opens a new window and /k keeps it open after launch
start "" cmd /k nodemon index.js

echo.
echo [INFO] Bot is launching in a new window. This window will now close.
exit
