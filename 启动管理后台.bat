@echo off
chcp 65001 >nul
title 智能会员商城 - 管理后台
cd /d "%~dp0"

echo.
echo   ╔════════════════════════════════════╗
echo   ║   智能会员商城 · 管理后台        ║
echo   ╚════════════════════════════════════╝
echo.
echo   正在启动服务...
echo.

:: Start both API and Admin together
start "智能会员商城" /min cmd /c "cd /d %~dp0 && npm run dev"

:: Wait a bit then open browser to admin
echo   等待服务启动 (约5秒)...
timeout /t 5 /nobreak >nul
start "" http://127.0.0.1:5173

echo.
echo   ╔════════════════════════════════════╗
echo   ║  管理后台已打开!                 ║
echo   ║                                  ║
echo   ║  管理员: admin / admin123         ║
echo   ║  会  员: 13800138000 / member123  ║
echo   ║                                  ║
echo   ║  关闭此窗口即可停止服务          ║
echo   ╚════════════════════════════════════╝
echo.
pause
