@echo off
REM ==========================================================
REM  安装 / 修复 Cloudflare Tunnel 系统服务(开机自启)
REM ----------------------------------------------------------
REM  管理员权限运行本脚本(没有权限时脚本会自己请求提权)
REM
REM  装好后:
REM    - 服务名 Cloudflared,启动类型「自动」,开机由 Windows 自己拉起
REM    - 运行命令: cloudflared.exe tunnel run --token-file C:\ProgramData\cloudflared\token
REM    - 查看: sc qc Cloudflared / sc query Cloudflared
REM    - 日常不要手动启停:用启动器界面的「修复隧道」按钮,它会先查再决定要不要重启
REM ==========================================================
chcp 65001 >nul
cd /d "%~dp0"

set "SERVICE_NAME=Cloudflared"
set "TOKEN_FILE=C:\ProgramData\cloudflared\token"

echo ================================================
echo   安装 / 修复 Cloudflare Tunnel 系统服务
echo ================================================
echo.

REM 以管理员权限检查
net session >nul 2>&1
if errorlevel 1 (
    echo [X] 需要管理员权限,正在请求...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

if not exist ".\cloudflared.exe" (
    echo [X] 当前目录找不到 cloudflared.exe
    pause
    exit /b 1
)

if exist "%TOKEN_FILE%" goto :has_token
echo [!] 没找到 %TOKEN_FILE%
echo     将按「本地配置文件」方式安装:服务启动时会去读 %%USERPROFILE%%\.cloudflared\config.yml
echo     装完记得把本目录的 config.yml 复制过去。
echo.
goto :remove_old

:has_token
echo [i] 检测到 %TOKEN_FILE%,按 token 方式安装(token 里已含隧道 ID 与密钥)。
echo.

:remove_old
REM 已装过就先卸载再装,否则 token / 启动参数不会更新
sc query %SERVICE_NAME% >nul 2>&1
if errorlevel 1 goto :install
echo [i] 服务已存在,先卸载再重新安装...
.\cloudflared.exe service uninstall
timeout /t 2 /nobreak >nul

:install
if not exist "%TOKEN_FILE%" goto :install_plain
set /p TOKEN=<"%TOKEN_FILE%"
if "%TOKEN%"=="" (
    echo [X] %TOKEN_FILE% 是空的,请先写入隧道 token
    pause
    exit /b 1
)
echo [i] 安装服务...
.\cloudflared.exe service install "%TOKEN%"
set "TOKEN="
goto :set_auto

:install_plain
echo [i] 安装服务...
.\cloudflared.exe service install

:set_auto
echo.
echo [i] 确保启动类型为「自动」...
sc config %SERVICE_NAME% start= auto

echo [i] 启动服务...
sc start %SERVICE_NAME%

echo.
echo ================================================
echo   完成,当前状态:
echo ================================================
sc query %SERVICE_NAME%
echo.
echo 验证: https://homoto-akina.top/api/health 返回 200 即隧道已通。
echo 日常修复请用启动器界面上的「修复隧道」按钮。
echo.
pause
