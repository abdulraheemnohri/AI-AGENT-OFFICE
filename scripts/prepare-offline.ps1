param(
  [string]$ModelPath = "",
  [string]$PythonInstallerPath = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$bundle = Join-Path $root "offline-bundle"
$wheels = Join-Path $bundle "wheels"
New-Item -ItemType Directory -Force -Path $wheels | Out-Null
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { throw "Python 3 is required on the preparation PC. Install Python 3.10+ first." }
Write-Host "Downloading LiteRT-LM and all wheel dependencies for offline installation..."
& python -m pip download -r (Join-Path $root "requirements-litertlm.txt") --dest $wheels
if ($LASTEXITCODE -ne 0) { throw "pip download failed" }
if ($PythonInstallerPath) {
  if (-not (Test-Path $PythonInstallerPath)) { throw "Python installer not found: $PythonInstallerPath" }
  Copy-Item $PythonInstallerPath (Join-Path $bundle "python-installer.exe") -Force
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
Run scripts\install-offline.ps1 from the project folder after installing AI Agent Office.
This payload is platform/Python-version specific; prepare it on Windows for the target architecture.
"@ | Set-Content (Join-Path $bundle "OFFLINE-README.txt") -Encoding UTF8
Copy-Item (Join-Path $PSScriptRoot "install-offline.ps1") (Join-Path $bundle "Install-LiteRTLM-Offline.ps1") -Force
Write-Host "Offline payload prepared at $bundle"
