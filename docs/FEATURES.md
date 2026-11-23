# Implemented capabilities and honest status

## Desktop foundation
- Windows desktop application shell built with Tauri 2, React and TypeScript.
- Local dashboard and navigation for Writer, Sheets, Slides, PDF Studio, AI Agent, Models & Runtimes, Devices & Printing, Data & Backup and Settings.
- Local browser-profile persistence for workbook cells, slide outlines, task list, model chat history and preferences.
- Light, dark and system theme; compact/comfortable density; editor font size; spell-check toggle and English/Urdu language hint; default text format.
- Stored and restored preferences are normalized against an allow-list, numeric limits and known settings; malformed or unknown values fall back safely.
- Configurable autosave delay and restore confirmation; destructive workspace reset with explicit confirmation.

## Writer and document formats
- UTF-8 text/Markdown editor, edit/preview, word/character counts, find/replace-all, native Windows open/save.
- Basic DOCX text import through Mammoth. Formatting and layout are not preserved.
- Basic DOCX export with headings, paragraphs and bullet lists.
- Basic RTF export. RTF import and rich formatting round-trip are not implemented.

## Sheets and presentations
- CSV import/export, quoted fields, multiline values, cell editing, row/column extension and basic formula engine.
- XLSX first-worksheet import and single-sheet XLSX export. Other worksheets, formatting, charts, pivot tables and macros are not preserved.
- Slide outline editing, slide move up/down, duplicate and delete.
- PPTX import extracts slide text; PPTX export creates simple editable title/body slides. Visual layout, media, transitions and speaker-note fidelity are not preserved.

## PDF Studio
- Local PDF preview using the Windows WebView PDF viewer.
- Merge PDFs, extract selected pages, rotate, delete, reorder, duplicate and insert blank pages.
- Add a simple text stamp to the selected page and download the edited PDF.
- PDF OCR, signatures, interactive form fields, freehand/highlight annotations, redaction and full layout editing are not implemented.

## AI and device integration
- Google LiteRT-LM Python API bridge for a local .litertlm model, CPU/GPU/NPU backend selection (NPU is hardware/runtime dependent), configurable thinking mode, thinking-token budget, output-token limit, optional speculative decoding/MTP, runtime check, local prompt/response and persisted local chat history.
- LiteRT-LM Python package and model weights are not embedded in the default application installer. Use the offline preparation scripts to assemble an offline payload.
- AI Agent page supports a deterministic safe checklist and optional LiteRT-LM-generated task proposals. Proposed steps are added as checklist items; they are not executed automatically.
- Scoped local file tools allow the user to choose one folder, list top-level files, read UTF-8 text, create/edit/save and delete individual files. File writes and deletes require confirmation; path traversal and symlink escapes are rejected. Access can be revoked from the page.
- Printer action opens the Windows/WebView print dialog and uses the configured page size, orientation and margins.
- Windows USB detection lists drives classified as DRIVE_REMOVABLE. Export current text document, CSV or full JSON workspace backup. Exports use create-new semantics, flush the file and refuse to overwrite an existing filename. Some external USB drives report DRIVE_FIXED and are not listed. No USB serial/HID/camera/MTP support.

## Data portability and offline deployment
- PC open/save/import/export actions for supported formats.
- Versioned JSON workspace backup/restore includes document, workbook, slides, tasks, preferences, model configuration/history and recovery data. Manual backups can include the currently open PDF up to 12 MB; larger PDFs are explicitly omitted with a warning. Autosave snapshots omit PDF bytes to avoid filling the WebView local-storage quota. Files inside the separately selected agent folder are not copied into workspace backups.
- Autosave recovery now snapshots the full workspace, not only the Writer document.
- Backup restore validates schema and data sections before applying; 20 MB import limit.
- Windows scripts prepare local Python wheels, optional Python/WebView2/model installers and application installer packaging. The Rust build script generates a fallback Windows ICO before Tauri bundle validation so a clean checkout can build without a separately committed binary icon. The output still requires clean-machine offline verification.

## Not implemented / next milestones
- Full-fidelity DOCX editor, ODT/ODS/ODP/RTF import and complete format round-trip.
- Multi-sheet XLSX editor, advanced formulas, charts, pivot tables and workbook styling.
- Visual PowerPoint canvas, full PPTX import fidelity and animation/media editing.
- PDF OCR, annotation suite, signatures, forms, redaction and page thumbnails.
- Built-in offline speech, vision, document RAG, embeddings and model manager with download/checksum/unload.
- Real agent tool execution, permission scopes, approval gates, workflow builder and audit log.
- Enforced network isolation, encrypted/scheduled backups, portable runtime/model installer validation and signed production releases.

All document conversion and editing described above is performed locally in the app. Features are only considered complete when implementation and automated tests are present; Windows hardware/installer validation remains separate.
