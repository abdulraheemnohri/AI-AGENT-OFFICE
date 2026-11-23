# AI AGENT OFFICE

Offline-first Windows 10/11 x64 office suite. Current status: initial foundation scaffold, not a completed office suite. This branch contains the desktop shell, local settings, basic UTF-8 text open/save, model catalog metadata, build configuration and product roadmap.

Requirements: Windows 10/11 x64, Node.js 20+, Rust stable MSVC, Visual Studio C++ Build Tools, Windows SDK and WebView2.

Development:

    npm install
    npm run tauri:dev

Build installer:

    npm test
    npm run tauri:build

See docs/ for feature inventory, architecture, settings and runtime plan.