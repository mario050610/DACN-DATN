param()
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
docker compose up -d db
if ($LASTEXITCODE -ne 0) { throw 'Start Docker Desktop (Linux containers), then retry.' }
$container = docker compose ps -q db
if (-not $container) { throw 'Database container not found.' }
# Copy avoids PowerShell native-pipe encoding differences for Vietnamese text.
docker cp database/schema.sql "${container}:/tmp/preora_schema.sql"
if ($LASTEXITCODE -ne 0) { throw 'Schema copy failed.' }
docker cp database/seeds/001_sample_data.sql "${container}:/tmp/preora_sample.sql"
if ($LASTEXITCODE -ne 0) { throw 'Sample copy failed.' }
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) { throw 'Database did not become ready.' }
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/preora_schema.sql -f /tmp/preora_sample.sql'
if ($LASTEXITCODE -ne 0) { throw 'Import failed; sample transaction rolled back. Existing accounts were not overwritten.' }
Write-Host 'PREORA sample imported. Frontend still uses localStorage until backend integration.'
