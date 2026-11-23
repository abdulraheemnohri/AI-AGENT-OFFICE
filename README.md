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

## Not yet implemented
Native DOCX/ODT/RTF, XLSX/XLS/ODS, PPTX/PPT/ODP and PDF engines; advanced spreadsheet formulas/charts; PDF rendering/OCR; local model inference and runtime adapters; model downloads; agent tool execution and workflow automation. Settings such as offline-only and telemetry are preferences only and do not enforce network isolation. USB listing is limited to Windows drives classified as removable; some USB external disks may identify as fixed drives. Printer availability depends on Windows-installed printer drivers. No installer has been built or verified by this repository update.

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

## Documentation
- [Feature status](docs/FEATURES.md)
- [Settings behavior](docs/SETTINGS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Runtime catalog](docs/RUNTIMES.md)
- [Delivery roadmap](docs/ROADMAP.md)

## Project principles
Local-first, no mandatory account, no subscription requirement. Donation support can be added as an optional funding channel without blocking core offline functionality.
