# Verify production HTTPS surface for Phase D (OPS-01 / OPS-02 / health shape).
# Usage:
#   .\ops\verify-prod-surface.ps1 -HttpsBaseUrl https://api.example.com/api/v1
#   .\ops\verify-prod-surface.ps1 -HttpsBaseUrl https://api.example.com/api/v1 -SkipHttpRedirectCheck

param(
  [Parameter(Mandatory = $true)]
  [string]$HttpsBaseUrl,

  [switch]$SkipHttpRedirectCheck
)

$ErrorActionPreference = 'Stop'
$HttpsBaseUrl = $HttpsBaseUrl.TrimEnd('/')

if ($HttpsBaseUrl -notmatch '^https://') {
  throw 'HttpsBaseUrl must start with https://'
}

function Assert-Ok([string]$Name, [scriptblock]$Script) {
  Write-Host "[CHECK] $Name ..."
  & $Script
  Write-Host "[OK]    $Name"
}

Assert-Ok 'https-health' {
  $response = Invoke-WebRequest -Uri "$HttpsBaseUrl/health" -UseBasicParsing
  if ($response.StatusCode -ne 200) {
    throw "Expected 200, got $($response.StatusCode)"
  }
  $json = $response.Content | ConvertFrom-Json
  if ($json.data.status -ne 'ok') {
    throw "Unexpected health status: $($json.data.status)"
  }
  if ($json.data.database -ne 'up') {
    throw 'Database is not up'
  }
  $body = $response.Content
  if ($body -match 'stack|AppSecret|Bearer |postgresql://') {
    throw 'Health/error body appears to leak sensitive details'
  }
  $requestId = $response.Headers['X-Request-Id']
  if (-not $requestId) {
    Write-Host '[WARN]  X-Request-Id header missing (recommended for OPS-08)'
  }
}

if (-not $SkipHttpRedirectCheck) {
  Assert-Ok 'http-to-https-redirect' {
    $uri = [System.Uri]$HttpsBaseUrl
    $httpHealth = "http://$($uri.Host)/api/v1/health"
    try {
      $redirect = Invoke-WebRequest -Uri $httpHealth -MaximumRedirection 0 -ErrorAction Stop -UseBasicParsing
      throw "Expected redirect, got status $($redirect.StatusCode)"
    }
    catch {
      $resp = $_.Exception.Response
      if (-not $resp) { throw $_ }
      $code = [int]$resp.StatusCode
      if ($code -notin 301, 302, 307, 308) {
        throw "Expected HTTP redirect status, got $code"
      }
      $location = $resp.Headers['Location']
      if (-not $location) {
        throw 'Redirect response missing Location header'
      }
      if ($location -notmatch '^https://') {
        throw "Location is not HTTPS: $location"
      }
    }
  }
}

Write-Host ''
Write-Host "Production surface checks passed for $HttpsBaseUrl"
