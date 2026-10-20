[CmdletBinding()]
param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $root
$logDir = Join-Path $root 'tmp\startup'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$failures = [System.Collections.Generic.List[string]]::new()

function Test-Http([string]$Url) {
    try { $null = Invoke-RestMethod -Uri $Url -TimeoutSec 3; return $true } catch { return $false }
}
function Wait-Ready([scriptblock]$Check, [int]$Seconds = 120) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        if (& $Check) { return $true }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    return $false
}
function Start-LocalService([string]$Name, [string]$Batch, [string]$Url) {
    if (Test-Http $Url) { Write-Host "[OK] $Name already running."; return }
    Write-Host "Starting $Name..."
    $batchPath = Join-Path $PSScriptRoot $Batch
    $logPath = Join-Path $logDir "$Name.log"
    $command = '/d /c "call "{0}" > "{1}" 2>&1"' -f $batchPath, $logPath
    Start-Process -FilePath $env:ComSpec -ArgumentList $command -WorkingDirectory $root -WindowStyle Hidden | Out-Null
}

# Read only the AI settings; never execute .env contents as PowerShell.
$settings = @{ OLLAMA_URL = 'http://127.0.0.1:11434'; OLLAMA_MODEL = 'qwen3:8b' }
$envPath = Join-Path $root '.env'
if (Test-Path -LiteralPath $envPath) {
    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match '^\s*(OLLAMA_URL|OLLAMA_MODEL)\s*=\s*(.*?)\s*$') {
            $settings[$Matches[1]] = $Matches[2].Trim('"', "'")
        }
    }
}
foreach ($key in @('OLLAMA_URL', 'OLLAMA_MODEL')) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if ($value) { $settings[$key] = $value }
}
$ollamaUrl = $settings.OLLAMA_URL.TrimEnd('/')

Write-Host '=== PREORA: Docker + PostgreSQL + Ollama + AI + Backend + Frontend ==='
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop is not installed.' }
    & $env:ComSpec /d /c "docker info >nul 2>&1"
    if ($LASTEXITCODE -ne 0) {
        $desktop = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
        if (-not (Test-Path -LiteralPath $desktop)) { throw 'Cannot find Docker Desktop.' }
        Write-Host 'Starting Docker Desktop...'
        Start-Process -FilePath $desktop -WindowStyle Hidden | Out-Null
        if (-not (Wait-Ready { & $env:ComSpec /d /c "docker info >nul 2>&1"; $LASTEXITCODE -eq 0 } 180)) { throw 'Docker engine did not become ready within 180 seconds.' }
    }
    # Run PostgreSQL in Docker; keep local backend/account storage and avoid duplicate API ports.
    & docker compose up -d --wait --wait-timeout 90 db
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed. See docker compose logs db.' }
    Write-Host '[OK] Docker / PostgreSQL ready.'
} catch { $failures.Add("Docker: $($_.Exception.Message)"); Write-Warning $failures[$failures.Count - 1] }

try {
    if (-not (Test-Http "$ollamaUrl/api/tags")) {
        if ($ollamaUrl -notmatch '^http://(127\.0\.0\.1|localhost):11434$') { throw "Configured remote Ollama is unavailable: $ollamaUrl" }
        $ollama = Get-Command ollama -ErrorAction SilentlyContinue
        $ollamaExe = if ($ollama) { $ollama.Source } else { Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe' }
        if (-not (Test-Path -LiteralPath $ollamaExe)) { throw 'Ollama is not installed. Install Ollama and run this launcher again.' }
        Write-Host 'Starting Ollama...'
        Start-Process -FilePath $ollamaExe -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'ollama.log') -RedirectStandardError (Join-Path $logDir 'ollama-error.log') | Out-Null
        if (-not (Wait-Ready { Test-Http "$ollamaUrl/api/tags" } 60)) { throw 'Ollama did not become ready.' }
    }
    $tags = Invoke-RestMethod -Uri "$ollamaUrl/api/tags" -TimeoutSec 10
    $model = $settings.OLLAMA_MODEL
    $modelNames = @($tags.models | ForEach-Object { $_.name })
    if ($modelNames -notcontains $model -and $modelNames -notcontains "${model}:latest") {
        Write-Host "Downloading Ollama model $model (first run may take several minutes)..."
        $body = @{ model = $model; stream = $false } | ConvertTo-Json
        $pull = Invoke-RestMethod -Method Post -Uri "$ollamaUrl/api/pull" -ContentType 'application/json' -Body $body -TimeoutSec 7200
        if ($pull.error) { throw $pull.error }
    }
    Write-Host "[OK] Ollama model $model ready."
} catch { $failures.Add("Ollama: $($_.Exception.Message)"); Write-Warning $failures[$failures.Count - 1] }

Start-LocalService 'AI' 'START_AI.bat' 'http://127.0.0.1:8001/health'
Start-LocalService 'Backend' 'START_BACKEND.bat' 'http://127.0.0.1:8000/api/health'
Start-LocalService 'Frontend' 'START_FRONTEND.bat' 'http://127.0.0.1:5173'
foreach ($service in @(
    @{ Name = 'Frontend'; Url = 'http://127.0.0.1:5173' },
    @{ Name = 'Backend'; Url = 'http://127.0.0.1:8000/api/health' },
    @{ Name = 'AI'; Url = 'http://127.0.0.1:8001/health' }
)) {
    if (Wait-Ready { Test-Http $service.Url } 120) {
        Write-Host "[OK] $($service.Name): $($service.Url)"
        if ($service.Name -eq 'Frontend' -and -not $NoBrowser) { Start-Process 'http://127.0.0.1:5173' }
    } else {
        $failures.Add("$($service.Name) is unavailable. See $logDir\$($service.Name).log")
        Write-Warning $failures[$failures.Count - 1]
    }
}
Write-Host "Startup logs: $logDir"
Write-Host 'AI forecast endpoints are scaffolds; the support chatbot uses Ollama.'
if ($failures.Count) {
    Write-Host 'PREORA started with errors:' -ForegroundColor Yellow
    $failures | ForEach-Object { Write-Host " - $_" }
    exit 1
}
Write-Host 'All PREORA services are ready. Close this launcher safely; services stay running.' -ForegroundColor Green
exit 0
