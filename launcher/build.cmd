@echo off
rem 编译并发布单文件启动器到 launcher\dist\SeiyuuGuessLauncher.exe
setlocal
cd /d "%~dp0"

echo [1/2] 发布（依赖已安装的 .NET 桌面运行时，体积约 200KB）
dotnet publish SeiyuuGuessLauncher.csproj -c Release -r win-x64 --self-contained false -p:PublishSingleFile=true -p:DebugType=none -o dist
if errorlevel 1 goto :fail

echo.
echo [2/2] 完成：%CD%\dist\SeiyuuGuessLauncher.exe
echo 如需在没有 .NET 运行时的机器上运行，改用自带运行时：
echo   dotnet publish SeiyuuGuessLauncher.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:DebugType=none -o dist
exit /b 0

:fail
echo 发布失败，请确认已安装 .NET SDK。
exit /b 1
