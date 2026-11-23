# AI AGENT OFFICE

Offline-first Windows desktop productivity workspace built with Tauri 2, React, TypeScript and Rust.

> **Status:** foundation expansion. This is not yet a full Microsoft Office replacement or a complete AI agent. See [implemented features](docs/FEATURES.md) and [roadmap](docs/ROADMAP.md).

## Working features in this branch
- Dashboard and navigation across Writer, Sheets, Slides, PDF Studio, AI Agent, Models & Runtimes and Settings.
- Writer for UTF-8 plain text and Markdown, with edit/preview, word and character counts, find/replace-all, native open/save and optional local recovery snapshot.
- CSV spreadsheet grid with validated quoted/multiline CSV import/export, cell editing, row/column add/delete, duplicate rows, clear-sheet confirmation, and a local formula engine (arithmetic, cell references, ranges, SUM, AVERAGE, MIN, MAX and COUNT).
- Presentation outline editor with slide add/delete/edit and Markdown outline export.
- Local task checklist and safe-plan template (deterministic; no AI inference or system command execution).
- Locally persisted UI preferences: theme, editor font size, autosave recovery, offline preference, telemetry preference and print page layout.
- Windows print integration through the WebView print dialog for installed local/network printers and Windows PDF printers.
- Windows removable USB storage detection and guarded document/CSV export to detected removable drives.
- PC file import/export for UTF-8 text/Markdown, CSV workbook import/export and Markdown slide-outline export.
- Versioned full-workspace JSON backup/restore covering document, workbook, slides, tasks, preferences and recovery snapshot.
- Google LiteRT-LM Python API bridge for local .litertlm inference with CPU/GPU selection, model picker and local prompt UI.
- Windows offline dependency-wheel preparation, offline LiteRT-LM installation and installer packaging scripts.

## Not yet implemented
Native DOCX/ODT/RTF, XLSX/XLS/ODS, PPTX/PPT/ODP and PDF engines; advanced spreadsheet formulas/charts; PDF rendering/OCR; automatic model downloads; bundled Python/LiteRT-LM runtime and bundled model weights; agent tool execution and workflow automation. LiteRT-LM is integrated through its Python API, but its Python package and .litertlm model must be installed/copied separately using the offline payload scripts. Settings such as offline-only and telemetry are preferences only and do not enforce network isolation. USB listing is limited to Windows drives classified as removable; some USB external disks may identify as fixed drives. Printer availability depends on Windows-installed printer drivers. No installer has been built or verified by this repository update.

## Windows requirements
- Windows 10/11 x64
- Node.js 20+
- Rust stable with MSVC toolchain
- Visual Studio Build Tools with C++ workload and Windows SDK
- WebView2 Runtime

## Development

```powershell
git clone -b development https://github.com/abdulraheemnohri/AI-AGENT-OFFICE.git
cd AI-AGENT-OFFICE
npm install
npm run tauri:dev
```

## Tests and installer build

```powershell
npm run test
npm run tauri:build
```

Expected bundle output: `src-tauri/target/release/bundle`. These commands have not been executed in this update; build on Windows to verify your toolchain and installer output.


### Build an offline Windows distribution

On a Windows preparation PC with internet access, Python 3.10+ and the normal Tauri build toolchain:

```powershell
npm run package:offline -- -PythonInstallerPath "C:\\Installers\\python-3.13.x-amd64.exe" -ModelPath "D:\\Models\\your-model.litertlm"
```

Both optional paths may be omitted. Including a Python installer makes runtime setup self-contained; including a model places it in the offline payload. The command downloads Python wheels on the preparation PC, builds the Tauri installer and creates AI-Agent-Office-Offline-Windows.zip. On the offline PC, install the app from offline-bundle/application-installers, then run Install-LiteRTLM-Offline.ps1 from the extracted bundle. A model is not included unless -ModelPath is supplied. Prepare the payload on Windows for the same CPU architecture and Python version as the target PC.

## Documentation
- [Feature status](docs/FEATURES.md)
- [Settings behavior](docs/SETTINGS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Runtime catalog](docs/RUNTIMES.md)
- [Delivery roadmap](docs/ROADMAP.md)

## Project principles
Local-first, no mandatory account, no subscription requirement. Donation support can be added as an optional funding channel without blocking core offline functionality.
