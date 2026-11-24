@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting local CORS proxy for AI add-on (127.0.0.1:8787)...
echo Close this window to stop the proxy. The game works without it.
node proxy\ai-proxy.mjs
pause
