param([string]$BundlePath = "")
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $BundlePath) { $BundlePath = Join-Path $root "offline-bundle" }
$wheels = Join-Path $BundlePath "wheels"
if (-not (Test-Path $wheels)) { throw "Offline wheel folder not found: $wheels" }
$manifestPath = Join-Path $BundlePath "runtime-manifest.json"
if (-not (Test-Path $manifestPath)) { throw "Runtime manifest is missing. Rebuild the offline bundle using prepare-offline.ps1." }
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $installer = Join-Path $BundlePath "python-installer.exe"
  if (-not (Test-Path $installer)) { throw "Python 3 is missing. Include python-installer.exe when preparing the offline bundle, or install Python 3.10+ separately." }
  Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0" -Wait
  $python = Get-Command python -ErrorAction SilentlyContinue
}
if (-not $python) { throw "Python installation was not found in PATH. Restart PowerShell and run this script again." }
Write-Host "Installing LiteRT-LM from local wheel files only..."
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonExe) {
  $pythonRoot = Join-Path $env:LOCALAPPDATA "Programs\Python"
  $pythonExe = Get-ChildItem $pythonRoot -Filter python.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $pythonExe) { throw "Python was installed but python.exe could not be located. Restart Windows and rerun this script." }
$actualVersion = (& $pythonExe -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
$actualBits = (& $pythonExe -c "import struct; print(struct.calcsize('P') * 8)").Trim()
if ($actualVersion -ne [string]$manifest.python_version -or $actualBits -ne [string]$manifest.python_bits) {
  throw "Python does not match the offline wheels. Required Python $($manifest.python_version) ($($manifest.python_bits)-bit); found $actualVersion ($actualBits-bit)."
}
Write-Host "Installing LiteRT-LM from local wheel files only..."
& $pythonExe -m pip install --no-index --only-binary=:all: --find-links $wheels litert-lm-api
if ($LASTEXITCODE -ne 0) { throw "Offline LiteRT-LM installation failed" }
& $pythonExe -c "import litert_lm; print('LiteRT-LM import check passed')"
if ($LASTEXITCODE -ne 0) { throw "LiteRT-LM runtime import verification failed" }
Write-Host "LiteRT-LM installed and verified. Open AI Agent Office > Models & Runtimes > Check runtime."
