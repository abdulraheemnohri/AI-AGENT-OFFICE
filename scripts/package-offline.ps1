param(
  [string]$ModelPath = "",
  [string]$PythonInstallerPath = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
& (Join-Path $PSScriptRoot "prepare-offline.ps1") -ModelPath $ModelPath -PythonInstallerPath $PythonInstallerPath
if ($LASTEXITCODE -ne 0) { throw "Offline runtime preparation failed" }
Push-Location $root
try {
  npm run tauri:build
  if ($LASTEXITCODE -ne 0) { throw "Tauri installer build failed" }
} finally { Pop-Location }
$bundle = Join-Path $root "offline-bundle"
$installerDir = Join-Path $root "src-tauri\target\release\bundle"
$installers = Get-ChildItem $installerDir -Recurse -File | Where-Object { $_.Extension -in ".msi", ".exe" }
if (-not $installers) { throw "No Windows installer was found under $installerDir" }
$dist = Join-Path $bundle "application-installers"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$installers | Copy-Item -Destination $dist -Force
$zip = Join-Path $root "AI-Agent-Office-Offline-Windows.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $bundle "*") -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Offline distribution created: $zip"
