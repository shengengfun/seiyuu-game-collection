@echo off
REM ==========================================================
REM  Cloudflare Tunnel 启动脚本(前台调试用)
REM ----------------------------------------------------------
REM  生产环境请用系统服务(开机自启,启动器可一键修复):
REM     install-service.bat
REM  本脚本只是在前台跑一个连接器,关窗口就停,方便看日志。
REM
REM  前置条件:
REM    1. C:\ProgramData\cloudflared\token 存在(隧道 token,见 README)
REM    2. 本机服务已启动(启动器点「启动服务」)
REM ==========================================================
chcp 65001 >nul
cd /d "%~dp0"

:: 隧道必须直连 Cloudflare 边缘：清空代理环境变量，
:: 否则流量被本地代理接管后隧道建立不起来（站点报 1033 / 连不上）
call "%~dp0..\scripts\no-proxy-env.bat"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\direct-connection.ps1" -Quiet

echo ================================================
echo   Cloudflare Tunnel 启动(前台调试)
echo   配置: %CD%\config.yml
echo   关掉本窗口 = 停掉这个连接器
echo ================================================
echo.

if not exist "C:\ProgramData\cloudflared\token" (
    echo [X] 找不到 C:\ProgramData\cloudflared\token
    echo     请从 Cloudflare 后台 -^> Networks -^> Tunnels -^> Configure 复制 token,
    echo     保存到上面这个文件^(只放 token 一行^)。
    echo.
    pause
    exit /b 1
)

REM token 模式:隧道 ID 与密钥都在 token 里,不用再写 tunnel / credentials-file
.\cloudflared.exe tunnel --config .\config.yml run

pause
