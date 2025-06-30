@echo off
REM — Change into the directory where this .bat resides
cd /d "%~dp0"

REM — Run the deploy-commands script with Node
node deploy-commands.js

REM — Keep the window open so you can read any output
pause
