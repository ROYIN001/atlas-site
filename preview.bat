@echo off
title Atlas preview
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0preview.ps1"
pause
