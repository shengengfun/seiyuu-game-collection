@echo off
chcp 65001 >nul
cd /d "%~dp0"

:: 本项目的公网入口(Cloudflare 隧道)源站写死为 http://localhost:5173,
:: 而 5173 以前跑的是 Vite **开发服务器** —— 浏览器要为此下载上百个未打包、
:: 未压缩、且带 no-store 的模块,弱网下首屏动辄十几秒。
:: 这个脚本改为在同一个 5173 端口上跑 `vite preview`(直接提供构建产物),
:: 隧道侧不需要做任何改动。开发调试仍然用 run.bat。
::
:: 本项目所有进程一律直连：清空 HTTP_PROXY 等环境变量 + 设置 NO_PROXY
call "%~dp0scripts\no-proxy-env.bat"

echo ============================================
echo   声优猜 (Seiyuu Guess) - 生产预览模式
echo ============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\direct-connection.ps1" -Quiet

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

if not exist ".env" (
    echo REDIS_REQUIRED=false > .env
    echo DB_CLIENT=sqlite >> .env
    echo DB_URL=./data/seiyuu-guess.sqlite3 >> .env
)

echo 构建中（首次约 1 分钟）...
call pnpm build
if %errorlevel% neq 0 (
    echo [错误] 构建失败，已停留在开发模式所需的原状
    pause
    exit /b 1
)

echo.
echo 启动中...
echo   前端(构建产物，隧道入口): http://localhost:5173
echo   后端: http://localhost:3000
echo.
echo 注意：此模式与 run.bat(开发模式)不能同时运行，两者都占用 5173。
echo 按 Ctrl+C 停止
echo ============================================

call pnpm start:prod
