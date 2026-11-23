param([string]$BundleRoot = "")
$ErrorActionPreference = "Stop"
if (-not $BundleRoot) { $BundleRoot = $PSScriptRoot }
$webview = Join-Path $BundleRoot "WebView2-Offline-Installer.exe"
if (Test-Path $webview) {
  Write-Host "Installing Microsoft Edge WebView2 Runtime..."
  Start-Process -FilePath $webview -ArgumentList "/silent", "/install" -Wait
}
$installerDir = Join-Path $BundleRoot "application-installers"
if (-not (Test-Path $installerDir)) { throw "Application installer folder missing: $installerDir" }
$msi = Get-ChildItem $installerDir -Filter "*.msi" -File | Select-Object -First 1
$exe = Get-ChildItem $installerDir -Filter "*.exe" -File | Select-Object -First 1
if ($msi) {
  Write-Host "Installing AI Agent Office MSI..."
  Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $msi.FullName, "/passive", "/norestart" -Wait
} elseif ($exe) {
  Write-Host "Installing AI Agent Office..."
  Start-Process -FilePath $exe.FullName -ArgumentList "/S" -Wait
} else { throw "No MSI or EXE application installer found" }
$runtimeInstaller = Join-Path $BundleRoot "Install-LiteRTLM-Offline.ps1"
if (Test-Path $runtimeInstaller) {
  & $runtimeInstaller -BundlePath $BundleRoot
} else {
  Write-Warning "LiteRT-LM offline setup script not found; the desktop app is installed but its local model runtime is not."
}
Write-Host "Offline setup sequence completed."
