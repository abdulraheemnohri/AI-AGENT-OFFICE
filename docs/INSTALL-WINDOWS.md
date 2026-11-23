# Windows build guide

Requirements: Windows 10/11 x64, Node.js 20+, Rust stable MSVC, Visual Studio C++ Build Tools with Windows SDK and WebView2.

    npm install
    ./scripts/check-windows.ps1
    npm run tauri:dev

Package with npm run test and npm run tauri:build. Inspect src-tauri/target/release/bundle. This foundation is not yet a complete office suite; publish installers only after module acceptance tests pass.