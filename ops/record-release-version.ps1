# Record deployable version metadata for rollback (Phase D3).
# Does not include secrets. Safe to commit the generated JSON if desired.
#
# Usage:
#   .\ops\record-release-version.ps1
#   .\ops\record-release-version.ps1 -Note 'prod deploy 2026-10-15' -ImageTag 'life-exploration-api:14437fd'

param(
  [string]$Note = '',
  [string]$ImageTag = '',
  [string]$OutDir = (Join-Path $PSScriptRoot 'releases')
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $commit = (git rev-parse HEAD).Trim()
  $short = (git rev-parse --short HEAD).Trim()
  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  $dirty = -not [string]::IsNullOrWhiteSpace((git status --porcelain))
}
finally {
  Pop-Location
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$payload = [ordered]@{
  recordedAt     = (Get-Date).ToString('o')
  gitCommit      = $commit
  gitCommitShort = $short
  gitBranch      = $branch
  workingTreeDirty = $dirty
  imageTag       = $ImageTag
  note           = $Note
  composeFile    = 'docker-compose.prod.yml'
  rollbackHint   = 'Redeploy previous image/tag or git checkout prior commit; restore DB from ops/backups if migration unsafe.'
}

$outFile = Join-Path $OutDir "release-$stamp-$short.json"
$payload | ConvertTo-Json -Depth 4 | Set-Content -Path $outFile -Encoding UTF8

Write-Host "Wrote $outFile"
Write-Output $outFile
