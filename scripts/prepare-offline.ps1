param(
  [string]$ModelPath = "",
  [string]$PythonInstallerPath = "",
  [string]$WebView2InstallerPath = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$bundle = Join-Path $root "offline-bundle"
$wheels = Join-Path $bundle "wheels"
New-Item -ItemType Directory -Force -Path $wheels | Out-Null
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { throw "Python 3 is required on the preparation PC. Install Python 3.10+ first." }
Write-Host "Downloading LiteRT-LM and all wheel dependencies for offline installation..."
& python -m pip download -r (Join-Path $root "requirements-litertlm.txt") --only-binary=:all: --dest $wheels
if ($LASTEXITCODE -ne 0) { throw "pip download failed" }
if ($PythonInstallerPath) {
  if (-not (Test-Path $PythonInstallerPath)) { throw "Python installer not found: $PythonInstallerPath" }
  Copy-Item $PythonInstallerPath (Join-Path $bundle "python-installer.exe") -Force
}
if ($WebView2InstallerPath) {
  if (-not (Test-Path $WebView2InstallerPath)) { throw "WebView2 installer not found: $WebView2InstallerPath" }
  Copy-Item $WebView2InstallerPath (Join-Path $bundle "WebView2-Offline-Installer.exe") -Force
}
if ($ModelPath) {
  if (-not (Test-Path $ModelPath)) { throw "Model file not found: $ModelPath" }
  if ([IO.Path]::GetExtension($ModelPath) -ne ".litertlm") { throw "Model must use the .litertlm format" }
  $models = Join-Path $bundle "models"
  New-Item -ItemType Directory -Force -Path $models | Out-Null
  Copy-Item $ModelPath $models -Force
}
@"
AI Agent Office offline runtime payload
- wheels/: LiteRT-LM Python package and dependencies for this Windows/Python version.
- models/: optional .litertlm model files supplied during preparation.
- python-installer.exe: optional official Python installer supplied by the packager.
Run Install-AI-Agent-Office-Offline.ps1 to install WebView2 (if supplied), AI Agent Office and LiteRT-LM offline.
This payload is platform/Python-version specific; prepare it on Windows for the target architecture.
"@ | Set-Content (Join-Path $bundle "OFFLINE-README.txt") -Encoding UTF8
Copy-Item (Join-Path $PSScriptRoot "install-offline.ps1") (Join-Path $bundle "Install-LiteRTLM-Offline.ps1") -Force
Write-Host "Offline payload prepared at $bundle"
