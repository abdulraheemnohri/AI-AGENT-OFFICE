param(
  [string]$ModelPath = "",
  [string]$PythonInstallerPath = "",
  [string]$WebView2InstallerPath = ""
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$bundle = Join-Path $root "offline-bundle"
if (Test-Path $bundle) { Remove-Item $bundle -Recurse -Force }
$wheels = Join-Path $bundle "wheels"
New-Item -ItemType Directory -Force -Path $wheels | Out-Null

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { throw "Python 3 is required on the preparation PC. Install 64-bit Python 3.10, 3.11 or 3.12." }
$pythonVersion = (& python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
$pythonBits = (& python -c "import struct; print(struct.calcsize('P') * 8)").Trim()
if ($pythonVersion -notmatch '^3\.(10|11|12)$' -or $pythonBits -ne "64") {
  throw "Prepare the offline wheels with 64-bit Python 3.10, 3.11 or 3.12. Detected Python $pythonVersion ($pythonBits-bit)."
}

Write-Host "Downloading LiteRT-LM and dependencies for Python $pythonVersion (64-bit)..."
& python -m pip download -r (Join-Path $root "requirements-litertlm.txt") --only-binary=:all: --dest $wheels
if ($LASTEXITCODE -ne 0) { throw "pip download failed. Check Python version, architecture and package wheel availability." }
if (-not (Get-ChildItem $wheels -File)) { throw "No dependency wheels were downloaded." }

if ($PythonInstallerPath) {
  if (-not (Test-Path $PythonInstallerPath -PathType Leaf)) { throw "Python installer not found: $PythonInstallerPath" }
  Copy-Item $PythonInstallerPath (Join-Path $bundle "python-installer.exe") -Force
}
if ($WebView2InstallerPath) {
  if (-not (Test-Path $WebView2InstallerPath -PathType Leaf)) { throw "WebView2 installer not found: $WebView2InstallerPath" }
  Copy-Item $WebView2InstallerPath (Join-Path $bundle "WebView2-Offline-Installer.exe") -Force
}
if ($ModelPath) {
  if (-not (Test-Path $ModelPath -PathType Leaf)) { throw "Model file not found: $ModelPath" }
  if ([IO.Path]::GetExtension($ModelPath) -ine ".litertlm") { throw "Model must use the .litertlm format" }
  $models = Join-Path $bundle "models"
  New-Item -ItemType Directory -Force -Path $models | Out-Null
  Copy-Item $ModelPath $models -Force
}

$manifest = @{
  product = "AI Agent Office"
  os = "Windows"
  architecture = "x64"
  python_version = $pythonVersion
  python_bits = 64
  package = "litert-lm-api"
}
$manifest | ConvertTo-Json | Set-Content (Join-Path $bundle "runtime-manifest.json") -Encoding UTF8
@"
AI Agent Office offline runtime payload
- wheels/: LiteRT-LM Python package and all downloaded wheel dependencies.
- models/: optional .litertlm model supplied during preparation.
- python-installer.exe: optional Python installer; must match the Python version recorded in runtime-manifest.json.
- WebView2-Offline-Installer.exe: optional Microsoft WebView2 offline installer.
Required target: Windows x64 and Python $pythonVersion (64-bit).
Run Install-AI-Agent-Office-Offline.ps1 to install the application and LiteRT-LM without internet access.
"@ | Set-Content (Join-Path $bundle "OFFLINE-README.txt") -Encoding UTF8

Copy-Item (Join-Path $PSScriptRoot "install-offline.ps1") (Join-Path $bundle "Install-LiteRTLM-Offline.ps1") -Force
Write-Host "Offline runtime payload prepared at $bundle"
