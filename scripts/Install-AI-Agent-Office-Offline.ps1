param([string]$BundleRoot = "")
$ErrorActionPreference = "Stop"
if (-not $BundleRoot) { $BundleRoot = $PSScriptRoot }
$checksumFile = Join-Path $BundleRoot "SHA256SUMS.txt"
if (-not (Test-Path $checksumFile)) { throw "Offline bundle checksum manifest is missing. Re-extract the original package." }
$base = (Resolve-Path $BundleRoot).Path.TrimEnd('\') + '\'
foreach ($line in Get-Content $checksumFile) {
  if ($line -notmatch '^([A-Fa-f0-9]{64}) \*(.+)$webview = Join-Path $BundleRoot "WebView2-Offline-Installer.exe"
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
) { throw "Invalid checksum manifest entry: $line" }
  $expected = $Matches[1].ToUpperInvariant()
  $relative = $Matches[2]
  $candidate = Join-Path $BundleRoot $relative
  if (-not (Test-Path $candidate -PathType Leaf)) { throw "Offline bundle file is missing: $relative" }
  $resolved = (Resolve-Path $candidate).Path
  if (-not $resolved.StartsWith($base, [StringComparison]::OrdinalIgnoreCase)) { throw "Invalid path in checksum manifest: $relative" }
  $actual = (Get-FileHash $resolved -Algorithm SHA256).Hash
  if ($actual -ne $expected) { throw "Checksum verification failed: $relative" }
}
Write-Host "Offline bundle integrity verified."
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
