@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo   声优猜 (Seiyuu Guess) - 环境安装
echo ============================================
echo.

:: 检查 Node.js
echo [1/4] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 22+
    echo   下载: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo   已安装 %%v

:: 检查 pnpm
echo.
echo [2/4] 检查 pnpm...
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo   正在安装 pnpm...
    npm install -g pnpm
)
for /f "tokens=*" %%v in ('pnpm -v') do echo   已安装 pnpm %%v

:: 安装依赖
echo.
echo [3/4] 安装项目依赖...
pnpm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

:: 初始化数据库
echo.
echo [4/5] 初始化数据库...
pnpm migrate
echo   数据库初始化完成

:: 直连配置（避免系统代理导致站点连不上）
call "%~dp0scripts\no-proxy-env.bat"
echo.
echo [5/5] 配置直连：把本地地址与站点域名加入系统代理例外...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\direct-connection.ps1" -Quiet

echo.
echo ============================================
echo   安装完成！双击 run.bat 启动游戏
echo ============================================
pause
