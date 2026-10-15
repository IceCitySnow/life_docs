# Restore a pg_dump custom-format backup into an isolated verify database,
# then run a minimal row-count check. Does NOT overwrite the live DB by default.
#
# Usage:
#   .\ops\restore-db.ps1 -DumpFile .\ops\backups\life_exploration-....dump
#   .\ops\restore-db.ps1 -DumpFile .\ops\backups\....dump -TargetDb life_exploration_restore_drill

param(
  [Parameter(Mandatory = $true)]
  [string]$DumpFile,
  [string]$AdminUrl = $env:POSTGRES_ADMIN_URL,
  [string]$TargetDb = 'life_exploration_restore_drill',
  [switch]$DropTargetAfter
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $DumpFile)) {
  throw "Dump file not found: $DumpFile"
}

foreach ($tool in @('psql', 'pg_restore')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    throw "$tool not found. Install PostgreSQL client tools and ensure they are on PATH."
  }
}

if (-not $AdminUrl) {
  # Needs a role that can CREATE DATABASE (usually the postgres superuser).
  # App role life_exploration is intentionally least-privileged and cannot create DBs.
  $AdminUrl = 'postgresql://postgres@localhost:5432/postgres'
}

function Get-TargetUrl([string]$Admin, [string]$DbName) {
  if ($Admin -match '^(?<prefix>.*/)(?<db>[^/?]+)(?<suffix>(\?.*)?)$') {
    return "$($Matches.prefix)$DbName$($Matches.suffix)"
  }
  throw "Cannot derive target URL from admin URL: $Admin"
}

$targetUrl = Get-TargetUrl $AdminUrl $TargetDb

Write-Host "Preparing isolated database: $TargetDb"
& psql --dbname=$AdminUrl -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TargetDb' AND pid <> pg_backend_pid();" | Out-Null
& psql --dbname=$AdminUrl -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS `"$TargetDb`";"
if ($LASTEXITCODE -ne 0) { throw "DROP DATABASE failed: $LASTEXITCODE" }

& psql --dbname=$AdminUrl -v ON_ERROR_STOP=1 -c "CREATE DATABASE `"$TargetDb`";"
if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed: $LASTEXITCODE" }

Write-Host "Restoring $DumpFile -> $TargetDb"
& pg_restore --dbname=$targetUrl --clean --if-exists --no-owner --no-privileges $DumpFile
# pg_restore exit 1 can mean warnings; verify with SQL below.

Write-Host 'Verifying restored data...'
$simpleSql = "SELECT count(*)::text FROM information_schema.tables WHERE table_schema = 'public';"
$tableCount = & psql --dbname=$targetUrl -v ON_ERROR_STOP=1 -Atc $simpleSql
if ($LASTEXITCODE -ne 0) {
  throw "Verification query failed. Restore may be incomplete. psql exit=$LASTEXITCODE"
}
if ([int]$tableCount -lt 1) {
  throw "Verification failed: restored database has no public tables (count=$tableCount)."
}

$taskSqlFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $taskSqlFile -Value 'SELECT count(*)::text FROM public."Task";' -Encoding ascii
try {
  $taskRows = & psql --dbname=$targetUrl -v ON_ERROR_STOP=1 -Atf $taskSqlFile
  if ($LASTEXITCODE -ne 0) {
    throw 'Verification failed: public."Task" missing or unreadable.'
  }
} finally {
  Remove-Item -Force $taskSqlFile -ErrorAction SilentlyContinue
}
Write-Host "Verify OK: public_tables=$tableCount task_rows=$taskRows (database=$TargetDb)"


if ($DropTargetAfter) {
  Write-Host "Dropping drill database $TargetDb"
  & psql --dbname=$AdminUrl -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS `"$TargetDb`";"
}

Write-Host 'Restore drill finished.'
Write-Host 'Next app checks after a real restore:'
Write-Host '  1) point DATABASE_URL at the restored DB'
Write-Host '  2) npx prisma migrate deploy'
Write-Host '  3) .\ops\smoke-api.ps1'
