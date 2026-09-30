@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: 本项目所有进程一律直连：清空 HTTP_PROXY 等环境变量 + 设置 NO_PROXY
:: （走代理时本机站点与隧道域名会直接连不上）
call "%~dp0scripts\no-proxy-env.bat"

echo ============================================
echo   声优猜 (Seiyuu Guess)
echo ============================================
echo.
echo [注意] 这是开发模式:Vite 开发服务器会占用 5173,
echo        而 Cloudflare 隧道的公网入口正是 5173。
echo        对外提供访问请用 start-prod.bat(同样是 5173,但直接给构建产物)。
echo.

:: 把本地地址与站点域名写进系统代理例外列表。
:: Clash 等工具每次开关系统代理都会重写这份列表，所以每次启动都自愈一次。
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\direct-connection.ps1" -Quiet

:: 首次运行自动安装
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    call pnpm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请先运行 install.bat
        pause
        exit /b 1
    )
    call pnpm migrate
)

:: 检查 .env
if not exist ".env" (
    echo REDIS_REQUIRED=false > .env
    echo DB_CLIENT=sqlite >> .env
    echo DB_URL=./data/seiyuu-guess.sqlite3 >> .env
)

echo 启动中...
echo   前端: http://localhost:5173
echo   后端: http://localhost:3000
echo.
echo 按 Ctrl+C 停止
echo ============================================

pnpm dev
