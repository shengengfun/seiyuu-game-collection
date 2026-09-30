@echo off
REM ============================================================
REM  no-proxy-env.bat
REM ------------------------------------------------------------
REM  Clear every proxy-related environment variable and set
REM  NO_PROXY, so that all processes of this project connect
REM  directly (never through Clash / v2ray / Steam++ / corporate
REM  proxies). A proxy in front of the local site or the tunnel
REM  makes the site unreachable ("can not connect").
REM
REM  Usage (note the "call" - it must affect the caller):
REM    call "%~dp0no-proxy-env.bat"
REM
REM  Keep this file ASCII-only: cmd reads it with the console code
REM  page, non-ASCII text breaks parsing on some machines.
REM ============================================================

set "HTTP_PROXY="
set "http_proxy="
set "HTTPS_PROXY="
set "https_proxy="
set "ALL_PROXY="
set "all_proxy="
set "FTP_PROXY="
set "ftp_proxy="

REM npm / pnpm / corepack read their own copies
set "npm_config_proxy="
set "npm_config_https_proxy="

REM Node.js >= 24 only honours env proxies when this is 1
set "NODE_USE_ENV_PROXY=0"

REM Loopback, LAN and the public site must never be proxied
set "NO_PROXY=localhost,127.0.0.1,::1,192.168.0.108,homoto-akina.top,www.homoto-akina.top,.homoto-akina.top"
set "no_proxy=%NO_PROXY%"

exit /b 0
