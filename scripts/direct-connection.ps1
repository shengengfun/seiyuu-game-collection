<#
  direct-connection.ps1

  Make this project reachable WITHOUT any proxy.

  Why this exists
  ---------------
  With a system proxy switched on (Clash Verge / v2ray / Steam++ ...), the
  browser sends requests for the local site (http://localhost:5173,
  http://192.168.0.108:5173) and for the tunnel domain (homoto-akina.top) to
  the proxy. A remote proxy node cannot reach your own machine, so the page
  simply fails to connect. The same applies to env proxies
  (HTTP_PROXY / HTTPS_PROXY / ALL_PROXY) inherited by node, pnpm or
  cloudflared.

  What it does
  ------------
    1. Adds the local hosts, the LAN range and the site domain to the Windows
       proxy bypass list (HKCU\...\Internet Settings\ProxyOverride), so the
       browser goes straight to this machine / to the tunnel edge.
    2. Clears the proxy environment variables of this session and sets
       NO_PROXY / no_proxy.
    3. Reports the current proxy state and tests the local ports.

  Usage
  -----
    powershell -NoProfile -ExecutionPolicy Bypass -File scripts\direct-connection.ps1
    powershell ... -Check        report only, change nothing (exit 1 if a host is not bypassed)
    powershell ... -Revert       restore the previous bypass list
    powershell ... -Persist      also write NO_PROXY (and drop local proxy vars) in the user environment
    powershell ... -TestSite     additionally test the tunnel domain on port 443

  NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads .ps1 files as
  ANSI; non-ASCII text gets mangled and can even eat quotes and break parsing.
#>

param(
    [switch]$Check,
    [switch]$Revert,
    [switch]$Quiet,
    [switch]$Persist,
    [switch]$TestSite
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$logDir = Join-Path $repoRoot 'logs'
$backupPath = Join-Path $logDir 'proxy-override.bak.txt'

$siteHosts = @('homoto-akina.top', 'www.homoto-akina.top')
$requiredHosts = @('<local>', 'localhost', '127.*', '10.*', '172.16.*', '192.168.*') + @('*.homoto-akina.top') + $siteHosts
$noProxyValue = 'localhost,127.0.0.1,::1,192.168.0.108,' + ($siteHosts -join ',')

$regPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
$proxyEnvNames = @(
    'HTTP_PROXY', 'http_proxy',
    'HTTPS_PROXY', 'https_proxy',
    'ALL_PROXY', 'all_proxy',
    'FTP_PROXY', 'ftp_proxy',
    'npm_config_proxy', 'npm_config_https_proxy'
)

function Write-Line {
    param([string]$Text, [string]$Kind = 'info')
    if ($Quiet -and $Kind -eq 'info') { return }
    if ($Kind -eq 'head') {
        Write-Host ''
        Write-Host ('== ' + $Text) -ForegroundColor Cyan
        return
    }
    $prefix = '    '
    $color = 'Gray'
    if ($Kind -eq 'ok') { $prefix = '  OK  '; $color = 'Green' }
    if ($Kind -eq 'warn') { $prefix = ' WARN '; $color = 'Yellow' }
    if ($Kind -eq 'fail') { $prefix = ' FAIL '; $color = 'Red' }
    Write-Host ($prefix + $Text) -ForegroundColor $color
}

function Get-ProxyState {
    $props = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
    $state = @{
        Enable = 0
        Server = ''
        Override = $null
    }
    if ($null -ne $props) {
        if ($null -ne $props.ProxyEnable) { $state.Enable = [int]$props.ProxyEnable }
        if ($null -ne $props.ProxyServer) { $state.Server = [string]$props.ProxyServer }
        if ($null -ne $props.ProxyOverride) { $state.Override = [string]$props.ProxyOverride }
    }
    return $state
}

function Split-Bypass {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
    return @($Value.Split(';') | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Test-Port {
    param([string]$Target, [int]$Port, [int]$TimeoutMs = 1200)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($Target, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

# ---------------------------------------------------------------- revert
if ($Revert) {
    if (Test-Path $backupPath) {
        $saved = @(Get-Content -LiteralPath $backupPath -Encoding UTF8)[0]
        if ($saved -eq '__ABSENT__') {
            Remove-ItemProperty -Path $regPath -Name 'ProxyOverride' -ErrorAction SilentlyContinue
            Write-Line 'ProxyOverride removed (it did not exist before)' 'ok'
        } else {
            Set-ItemProperty -Path $regPath -Name 'ProxyOverride' -Value $saved -Type String
            Write-Line ('ProxyOverride restored: ' + $saved) 'ok'
        }
        Remove-Item -LiteralPath $backupPath -Force
    } else {
        $state = Get-ProxyState
        $kept = @(Split-Bypass $state.Override | Where-Object { $requiredHosts -notcontains $_ })
        Set-ItemProperty -Path $regPath -Name 'ProxyOverride' -Value ($kept -join ';') -Type String
        Write-Line ('our bypass entries removed, now: ' + ($kept -join ';')) 'ok'
    }
    exit 0
}

# ---------------------------------------------------------------- report
$state = Get-ProxyState
$current = @(Split-Bypass $state.Override)
$missing = @($requiredHosts | Where-Object { $current -notcontains $_ })

Write-Line 'windows proxy state' 'head'
Write-Line ('ProxyEnable   : ' + $state.Enable)
Write-Line ('ProxyServer   : ' + $state.Server)
Write-Line ('ProxyOverride : ' + ($current -join ';'))

if ($missing.Count -eq 0) {
    Write-Line 'every local / site host already bypasses the proxy' 'ok'
} else {
    if ($state.Enable -eq 1) {
        Write-Line ('the system proxy is ON and these hosts are NOT bypassed: ' + ($missing -join ';')) 'warn'
    } else {
        Write-Line ('the system proxy is OFF, still missing bypass entries: ' + ($missing -join ';')) 'warn'
    }
    Write-Line 'through a proxy these hosts can not be reached (localhost / tunnel domain)' 'warn'
}

# ---------------------------------------------------------------- apply
if (-not $Check -and $missing.Count -gt 0) {
    try {
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        if (-not (Test-Path $backupPath)) {
            $raw = '__ABSENT__'
            if ($null -ne $state.Override) { $raw = $state.Override }
            Set-Content -LiteralPath $backupPath -Value $raw -Encoding UTF8
        }
        $merged = (@($current) + @($missing)) -join ';'
        Set-ItemProperty -Path $regPath -Name 'ProxyOverride' -Value $merged -Type String
        Write-Line ('bypass list updated: ' + $merged) 'ok'
    } catch {
        Write-Line ('could not update ProxyOverride: ' + $_.Exception.Message) 'fail'
    }
}

if (-not $Check) {
    $cleared = @()
    foreach ($name in $proxyEnvNames) {
        $value = [Environment]::GetEnvironmentVariable($name, 'Process')
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            [Environment]::SetEnvironmentVariable($name, $null, 'Process')
            $cleared += ($name + '=' + $value)
        }
    }
    [Environment]::SetEnvironmentVariable('NO_PROXY', $noProxyValue, 'Process')
    [Environment]::SetEnvironmentVariable('no_proxy', $noProxyValue, 'Process')
    [Environment]::SetEnvironmentVariable('NODE_USE_ENV_PROXY', '0', 'Process')

    Write-Line 'session environment' 'head'
    if ($cleared.Count -gt 0) {
        Write-Line ('cleared: ' + ($cleared -join ', ')) 'ok'
    } else {
        Write-Line 'no proxy env vars were set in this session' 'ok'
    }
    Write-Line ('NO_PROXY=' + $noProxyValue) 'ok'

    if ($Persist) {
        $removed = 0
        foreach ($name in @('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy')) {
            $value = [Environment]::GetEnvironmentVariable($name, 'User')
            if ([string]::IsNullOrWhiteSpace($value)) { continue }
            if ($value -match '(127\.0\.0\.1|localhost|0\.0\.0\.0):\d+') {
                [Environment]::SetEnvironmentVariable($name, $null, 'User')
                Write-Line ('user env cleared: ' + $name + '=' + $value) 'ok'
                $removed++
            }
        }
        [Environment]::SetEnvironmentVariable('NO_PROXY', $noProxyValue, 'User')
        [Environment]::SetEnvironmentVariable('no_proxy', $noProxyValue, 'User')
        if ($removed -eq 0) { Write-Line 'no local proxy vars in the user environment' 'ok' }
        Write-Line ('user NO_PROXY=' + $noProxyValue) 'ok'
    }
}

# ---------------------------------------------------------------- ports
Write-Line 'direct connectivity' 'head'
$targets = @(
    @{ Name = 'backend    127.0.0.1:3000'; Target = '127.0.0.1'; Port = 3000 },
    @{ Name = 'dev client 127.0.0.1:5173'; Target = '127.0.0.1'; Port = 5173 }
)
if ($TestSite) {
    $targets += @{ Name = 'site       homoto-akina.top:443'; Target = 'homoto-akina.top'; Port = 443 }
}
foreach ($target in $targets) {
    if (Test-Port -Target $target.Target -Port $target.Port) {
        Write-Line ($target.Name + ' reachable directly') 'ok'
    } else {
        Write-Line ($target.Name + ' not reachable (service stopped, or blocked)') 'warn'
    }
}

# ---------------------------------------------------------------- hints
$vergeYaml = Join-Path $env:APPDATA 'io.github.clash-verge-rev.clash-verge-rev\verge.yaml'
if (Test-Path $vergeYaml) {
    Write-Line 'clash verge detected' 'head'
    Write-Line 'Verge rewrites the Windows bypass list every time its system proxy is toggled,'
    Write-Line 'so run this script again after toggling (run.bat and the launcher do it for you),'
    Write-Line 'or set the same value once in Verge: Settings > System Proxy > Bypass'
    Write-Line ('  ' + ($requiredHosts -join ';'))
}

if ($Check -and $missing.Count -gt 0) { exit 1 }
exit 0
