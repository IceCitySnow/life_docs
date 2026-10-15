# Smoke-test critical public API endpoints.
# Usage:
#   .\ops\smoke-api.ps1
#   .\ops\smoke-api.ps1 -BaseUrl https://api.example.com/api/v1

param(
  [string]$BaseUrl = 'http://127.0.0.1:3000/api/v1'
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')

function Assert-Ok($Name, $Script) {
  Write-Host "[CHECK] $Name ..."
  & $Script
  Write-Host "[OK]    $Name"
}

Assert-Ok 'health' {
  $health = Invoke-RestMethod -Uri "$BaseUrl/health"
  if ($health.data.status -ne 'ok') { throw "Unexpected health status: $($health.data.status)" }
  if ($health.data.database -ne 'up') { throw 'Database is not up' }
}

Assert-Ok 'categories' {
  $categories = Invoke-RestMethod -Uri "$BaseUrl/categories"
  if (-not ($categories.data -is [System.Array])) { throw 'categories.data is not an array' }
}

Assert-Ok 'tasks' {
  $tasks = Invoke-RestMethod -Uri "$BaseUrl/tasks?page=1&pageSize=5"
  if (-not ($tasks.data -is [System.Array])) { throw 'tasks.data is not an array' }
  if (-not $tasks.pagination) { throw 'tasks.pagination missing' }
}

Write-Host ''
Write-Host "Smoke passed against $BaseUrl"
