@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Meadowmint Draw - 你画我猜

echo ========================================
echo   Meadowmint Draw - 本地双人你画我猜
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 没有检测到 Node.js，请先安装 Node.js 18+： https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [1/2] 首次运行，正在安装依赖（需要联网）...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
) else (
  echo [1/2] 依赖已存在，跳过安装。
)

echo [2/2] 正在启动本地服务器并打开浏览器...
echo       两人共用一台电脑，依次看词-作画-交接-猜词。
echo       关闭游戏时，直接关掉这个黑窗口即可。
echo.
start "" http://localhost:5173
call npm run dev

pause
