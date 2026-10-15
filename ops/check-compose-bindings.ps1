# Local safety check: ensure prod compose does not publish Postgres or bind API on 0.0.0.0.
# Usage:
#   .\ops\check-compose-bindings.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $root 'docker-compose.prod.yml'

if (-not (Test-Path $composePath)) {
  throw "Missing $composePath"
}

$content = Get-Content -Raw -Path $composePath

# Postgres service must not publish host ports.
$postgresBlock = [regex]::Match(
  $content,
  '(?s)postgres:\s*.*?(?=\r?\n  [a-zA-Z]|\r?\nvolumes:)'
).Value

if (-not $postgresBlock) {
  throw 'Could not locate postgres service block'
}

if ($postgresBlock -match '(?m)^\s*ports\s*:') {
  throw 'FAIL: postgres service publishes ports; production DB must stay on the compose network only.'
}

if ($content -notmatch "127\.0\.0\.1:3000:3000") {
  throw 'FAIL: API must bind 127.0.0.1:3000:3000 so it is not exposed on all interfaces.'
}

if ($content -match "ENABLE_DEV_AUTH:\s*'true'") {
  throw 'FAIL: ENABLE_DEV_AUTH must be false in prod compose.'
}

Write-Host '[OK] docker-compose.prod.yml bindings look safe (no DB host ports; API loopback; dev auth off).'
