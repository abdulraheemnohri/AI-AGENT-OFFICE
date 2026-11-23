param([string]$BundlePath = "")
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $BundlePath) { $BundlePath = Join-Path $root "offline-bundle" }
$wheels = Join-Path $BundlePath "wheels"
if (-not (Test-Path $wheels)) { throw "Offline wheel folder not found: $wheels" }
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $installer = Join-Path $BundlePath "python-installer.exe"
  if (-not (Test-Path $installer)) { throw "Python 3 is missing. Include python-installer.exe when preparing the offline bundle, or install Python 3.10+ separately." }
  Start-Process -FilePath $installer -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_pip=1 Include_test=0" -Wait
  $python = Get-Command python -ErrorAction SilentlyContinue
}
if (-not $python) { throw "Python installation was not found in PATH. Restart PowerShell and run this script again." }
Write-Host "Installing LiteRT-LM from local wheel files only..."
& python -m pip install --no-index --find-links $wheels litert-lm-api
if ($LASTEXITCODE -ne 0) { throw "Offline LiteRT-LM installation failed" }
Write-Host "LiteRT-LM installed. Open AI Agent Office > Models & Runtimes > Check runtime."
