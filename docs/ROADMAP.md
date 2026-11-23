# AI Agent Office — implementation checklist

All ongoing work is committed to `development`. Do not merge to `main` without an explicit release decision.

Legend: [x] implemented in the repository; [ ] remaining or not yet verified. Basic format support is not equivalent to full Office compatibility.

## Completed and present in GitHub

- [x] Tauri 2 + React + TypeScript + Rust Windows desktop foundation.
- [x] Dashboard and navigation: Home, Writer, Sheets, Slides, PDF Studio, AI Agent, Models & Runtimes, Devices & Printing, Data & Backup and Settings.
- [x] Writer Markdown/text editing, preview, find/replace, word count, native open/save and local recovery.
- [x] Basic DOCX, RTF and ODT text import/export.
- [x] CSV editing/import/export; multi-sheet XLSX and ODS import/export.
- [x] Spreadsheet formula subset, formula results, sort, filter, header preservation, worksheet tabs, insert/delete rows and columns by position.
- [x] Slide outline editing and basic PPTX/ODP text import/export.
- [x] PDF preview, merge, extract, rotate, reorder, duplicate, delete, blank-page insertion, text stamp, flattened highlight/note and basic AcroForm filling.
- [x] Local AI checklist and LiteRT-LM bridge; model proposals are not autonomously executed.
- [x] Scoped local file tools with confirmation and traversal/symlink protections.
- [x] Windows print dialog and removable USB storage exports.
- [x] PC file import/export, versioned workspace JSON backup/restore and password-protected AES-GCM backup.
- [x] Local preferences: theme, density, editor font, autosave/recovery, print setup, CSV delimiter, spell-check and preference validation.
- [x] Windows offline preparation scripts and fallback icon generation.
- [x] CI frontend build/tests and Rust cargo check passed in run 45240949775, commit 9f02a9ee.
- [x] Adaptive layout implementation: 320px+ phone, tablet, laptop and desktop breakpoints; mobile horizontal navigation; reflowing cards/toolbars/editors; reduced-motion support; removed fixed 850px page width.

## Remaining implementation backlog

### P0 — reliability and release
- [ ] Clean Windows 10/11 build, installer and upgrade/uninstall validation.
- [ ] Verify offline installation on a clean PC with network disconnected; document WebView2/Python/runtime prerequisites.
- [ ] Signed Windows installer, versioning, release artifacts and rollback guide.
- [ ] Review npm audit vulnerabilities and upgrade dependencies safely.
- [ ] End-to-end UI tests for navigation, import/export, restore and destructive confirmations.
- [ ] Crash-safe atomic writes, backup retention and recovery verification.

### P1 — adaptive UI and accessibility
- [ ] Manually verify 320, 360, 390, 768, 1024, 1366px and ultrawide viewports in Windows WebView.
- [ ] Keyboard navigation, visible focus, screen-reader labels, contrast and accessible dialogs.
- [ ] User-configurable interface scaling and per-screen density, if device testing requires it.
- [ ] Verify PDF, data grids and dialogs at 125–200% Windows DPI scaling.

### P1 — Sheets and Slides
- [ ] Cell formatting: number/date/currency, font, fill, borders, alignment and wrapping.
- [x] Per-column dropdown data validation: persisted allowed values, in-cell suggestions, invalid-value rejection, and formula/blank exemptions.
- [ ] Numeric/date validation bounds and configurable blank handling.
- [ ] Editable charts and export; more Excel-compatible formulas, named ranges and conditional formatting.
- [ ] Freeze panes, pivot tables and advanced XLSX formatting compatibility.
- [ ] Visual slide canvas, shapes, images, themes, notes, transitions and media.
- [ ] Higher-fidelity PPTX/ODP import/export and undo/redo.

### P1 — PDF and Writer
- [ ] Offline OCR engine and language packs with checksum validation.
- [ ] Searchable PDF text extraction and page thumbnails.
- [ ] Native editable PDF comments and freehand ink.
- [ ] Secure redaction that removes underlying content and is automatically verified.
- [ ] Certificate-based digital signatures and validation.
- [ ] Rich DOCX/ODT editing: tables, images, styles, headers/footers and page layout.

### P2 — local AI and agents
- [ ] Model download manager with source/license, size, checksum and storage checks.
- [ ] Runtime compatibility detection, model unload and resource monitoring.
- [ ] Offline speech-to-text, text-to-speech and vision workflows.
- [ ] Local document indexing, embeddings, RAG and source citations.
- [ ] Tool execution with permission scopes, per-action approval and audit log.
- [ ] Workflow builder, triggers, schedules, retry policies and run history.
- [ ] Enforced network isolation; current offline preference is not a firewall.

### P2 — data and devices
- [ ] Scheduled encrypted backups, retention and restore-point browser.
- [ ] Optional backup of explicitly approved agent folders.
- [ ] Optional fixed USB disk detection and safe-eject workflow; serial/HID/MTP only after explicit scope.
- [ ] Printer queue/status and printer-specific capabilities where Windows APIs permit.

### P3 — product polish
- [ ] First-run setup wizard and diagnostics.
- [ ] In-app help, keyboard shortcut reference and troubleshooting.
- [ ] Optional donation/support page; no mandatory subscription.
- [ ] Security threat model, privacy review and dependency/license inventory.
- [ ] Public release checklist and support policy.

## Definition of done

Mark a feature complete only after implementation, automated tests, documentation and passing CI. Platform-specific functionality also requires a real Windows validation pass. Placeholder adapters and unverified hardware integrations stay unchecked.
