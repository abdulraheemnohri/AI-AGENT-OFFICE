$ErrorActionPreference="Stop"
./scripts/check-windows.ps1
npm install
npm run test
npm run tauri:build
Write-Host "Inspect src-tauri/target/release/bundle for installer outputs."