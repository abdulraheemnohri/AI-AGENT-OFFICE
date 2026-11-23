# Implemented capabilities and honest status

## Desktop foundation
- Windows desktop application shell built with Tauri 2, React and TypeScript.
- Local dashboard and navigation for Writer, Sheets, Slides, PDF Studio, AI Agent, Models & Runtimes, Devices & Printing, Data & Backup and Settings.
- Adaptive layout for phone screens (320px+), tablets, laptops and wide desktops; mobile navigation becomes horizontally scrollable, content grids reflow, editors/toolbars wrap, and reduced-motion preferences are respected. This is responsive desktop WebView UI, not a separate native Android application.
- Local browser-profile persistence for workbook cells, slide outlines, task list, model chat history and preferences.
- Light, dark and system theme; compact/comfortable density; editor font size; spell-check toggle and English/Urdu language hint; default text format.
- Stored and restored preferences are normalized against an allow-list, numeric limits and known settings; malformed or unknown values fall back safely.
- Configurable autosave delay and restore confirmation; destructive workspace reset with explicit confirmation.

## Writer and document formats
- UTF-8 text/Markdown editor, edit/preview, word/character counts, find/replace-all, native Windows open/save.
- Basic DOCX text import through Mammoth. Formatting and layout are not preserved.
- Basic DOCX export with headings, paragraphs and bullet lists.
- Basic RTF import/export with paragraph breaks, tabs, escaped characters and common Unicode controls. Rich formatting, embedded objects and exact page layout are not retained.
- ODT text import/export with editable paragraphs and heading levels. Complex styles, images, tables and page layout are not fully preserved.

## Sheets and presentations
- CSV import/export, quoted fields, multiline values, cell editing, row/column extension plus insert/delete at a chosen one-based row or column position, case-insensitive row filtering across raw/formula-result values, stable ascending/descending sorting by selected column (numeric-aware, blank values last, optional header preservation), and basic formula engine supporting arithmetic, cell references, ranges, SUM, AVERAGE, MIN, MAX, COUNT, PRODUCT, MEDIAN, ABS, SQRT, POWER, MOD, ROUND, ROUNDUP and ROUNDDOWN.
- Multi-worksheet XLSX and ODS import/export with worksheet tabs, add/delete/rename controls, formula preservation, safe unique XLSX worksheet names, a 50 MB XLSX import cap and a 50-sheet workspace cap. ODS import is bounded to 200,000 cells and 100 sheets. Workbook backups and autosave preserve all worksheets. Cell formatting, charts, pivot tables, macros and advanced OpenFormula compatibility are not preserved.
- Slide outline editing, slide move up/down, duplicate and delete.
- PPTX and ODP import/export for slide titles and body text. Exported ODP slides use a basic editable text layout; visual fidelity, media, transitions and speaker-note preservation are not implemented.

## PDF Studio
- Local PDF preview using the Windows WebView PDF viewer.
- Merge PDFs, extract selected pages, rotate, delete, reorder, duplicate and insert blank pages.
- Add a simple text stamp, flattened rectangular yellow highlight and flattened note box to the selected page. Annotation geometry uses page-relative percentage coordinates from the top-left.
- Inspect standard AcroForm text, checkbox and choice fields; fill text, checkbox, dropdown, radio and option-list values while keeping fields interactive. XFA and digital-signature fields are not supported.
- Highlights and note boxes are drawn into page content and are not editable PDF comment annotations. Secure redaction, OCR, certificate-based digital signatures, freehand ink and full layout editing are not implemented.

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
- Full-fidelity DOCX/ODT/RTF editor, OpenDocument formatting and full layout/media round-trip.
- Advanced spreadsheet formulas, charts, pivot tables, workbook styling and formula compatibility beyond the built-in arithmetic, reference, aggregate and numeric-function subset.
- Visual PowerPoint canvas, full PPTX import fidelity and animation/media editing.
- PDF OCR, native comment annotations, certificate-based signatures, secure redaction and page thumbnails.
- Built-in offline speech, vision, document RAG, embeddings and model manager with download/checksum/unload.
- Real agent tool execution, permission scopes, approval gates, workflow builder and audit log.
- Enforced network isolation, scheduled backups, portable runtime/model installer validation and signed production releases.\n- Password-protected workspace backup export/import is implemented using PBKDF2-SHA256 (310,000 iterations) and authenticated AES-256-GCM. Passwords are entered per operation and never persisted. Encrypted restore authenticates/decrypts first, then validates the normal versioned workspace schema before applying it.

All document conversion and editing described above is performed locally in the app. Features are only considered complete when implementation and automated tests are present; Windows hardware/installer validation remains separate.
- Per-column dropdown data validation with persisted allowed-value lists, in-cell suggestions, invalid-value rejection and formula/blank exemptions.
