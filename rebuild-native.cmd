@echo off
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=amd64 -host_arch=amd64
cd /d C:\Seiyu-guess
C:\tools\node-v22.13.0-win-x64\pnpm.cmd rebuild better-sqlite3 --verbose
C:\tools\node-v22.13.0-win-x64\pnpm.cmd --filter server build
