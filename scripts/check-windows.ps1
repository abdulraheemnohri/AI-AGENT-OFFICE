$ErrorActionPreference="Stop"
if($env:OS -ne "Windows_NT"){throw "Run on Windows"}
foreach($c in @("node","npm","rustc","cargo")){if(-not(Get-Command $c -ErrorAction SilentlyContinue)){throw "Missing $c"};& $c --version}
Write-Host "Install Rust MSVC, Visual Studio C++ Build Tools, Windows SDK and WebView2."