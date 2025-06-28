@echo off
title P.A.R.K.Y - Bot Launcher
echo ?? Killing any existing node or nodemon processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM nodemon.exe >nul 2>&1

echo ?? Clean slate.
echo ?? Launching bot with nodemon...

cd /d "%~dp0"
start cmd /k nodemon index.js
