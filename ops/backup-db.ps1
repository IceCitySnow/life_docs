# Create a PostgreSQL logical backup (pg_dump custom format).
# Usage:
#   .\ops\backup-db.ps1
#   .\ops\backup-db.ps1 -DatabaseUrl 'postgresql://user:pass@localhost:5432/life_exploration'

param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutDir = (Join-Path $PSScriptRoot 'backups')
)

$ErrorActionPreference = 'Stop'

if (-not $DatabaseUrl) {
  $DatabaseUrl = 'postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration'
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw 'pg_dump not found. Install PostgreSQL client tools and ensure they are on PATH.'
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outFile = Join-Path $OutDir "life_exploration-$stamp.dump"

Write-Host "Backing up to $outFile"
& pg_dump --dbname=$DatabaseUrl --format=custom --file=$outFile
if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

Write-Host "Backup complete: $outFile"
Write-Output $outFile
