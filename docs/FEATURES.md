# Implemented capabilities and honest status

This document distinguishes working foundation features from planned integrations.

## Working in this branch
- Windows desktop shell built with Tauri 2, React and TypeScript.
- Module navigation and dashboard.
- UTF-8 text/Markdown Writer with edit/preview, word and character counts, find/replace-all, native open/save dialogs, and optional local recovery snapshot.
- CSV grid editor with quoted-field parsing and escaping, import, cell editing, row extension, and CSV export.
- Presentation outline editor with slide add/delete/edit and Markdown outline export.
- Local task checklist and deterministic safe-plan template. It does not invoke an LLM, run commands, or modify external files.\n- Local persistence for spreadsheet contents, slide outlines and task lists in the desktop WebView profile.
- Local preferences for theme, editor font size, autosave recovery, offline preference, telemetry preference and default format.
- Runtime compatibility catalog with clear "planned" status.

## Not implemented yet
- Native DOCX/ODT/RTF rich document editing; XLSX/XLS/ODS, formulas, charts and pivot tables; PPTX/PPT/ODP slide rendering; PDF rendering/annotation/OCR.
- Local model inference, model downloads, runtime adapters, embeddings, RAG, speech, vision or AI chat.
- Agent tool execution, workflow triggers, scheduler, background services, plugin/connector system.
- Enforced network isolation, native overwrite confirmation, cloud sync or multi-device collaboration.

## Format policy
The current Writer edits UTF-8 text formats only. CSV is the only spreadsheet import/export format. Slides export to Markdown outline only. Do not rename these exports to DOCX, XLSX or PPTX; those formats require real format engines.
\n\n## Windows device integration\n- Printer: invokes the WebView/Windows print dialog; printer selection, copies and driver features are handled by Windows. Print stylesheet supports configured A4/Letter, portrait/landscape and margins.\n- USB: enumerates Windows removable logical drives and allows exporting the current Markdown/text document or CSV workbook to the drive root. Exports are size-limited to 20 MB, filenames are sanitized, and existing files are never overwritten.\n- USB limitations: only drives reported by Windows as `DRIVE_REMOVABLE` are shown. Some USB external HDD/SSD devices report `DRIVE_FIXED` and are intentionally not listed by this implementation. No arbitrary USB HID, serial, camera or phone/MTP device access is implemented.\n

## PC file transfer and workspace backup
- Open local PC text/Markdown files through the native file picker and save/export the current Writer document to a chosen PC path.
- Import/export CSV workbooks and export presentation outlines as Markdown.
- Export a versioned JSON backup containing Writer document, CSV grid, slide outline, tasks, preferences and recovery data.
- Restore validates schema and section types before applying the backup. Restore replaces the current workspace data, not arbitrary files on the PC.
- JSON backup import limit is 20 MB; the native text-file picker also enforces a 20 MB file limit.

## Google LiteRT-LM integration
- Native Tauri command bridge calls Google's litert_lm Python API using a local .litertlm model path.
- Supports CPU and GPU backend selection, runtime availability check, model-file picker and local text prompt/response.
- Long inference runs on a blocking worker thread, not the UI thread.
- The runtime bridge is implemented; the Python package and model are not embedded in the installer by default. Use the offline wheel payload scripts to prepare them.

## Offline distribution
- scripts/prepare-offline.ps1 downloads Python wheel dependencies on a preparation PC and optionally includes Python installer/model payloads.
- scripts/install-offline.ps1 installs LiteRT-LM from local wheels only (--no-index).
- scripts/package-offline.ps1 builds the Windows Tauri installer and packages the app installer with the offline runtime payload.
- The offline bundle is Windows/architecture/Python-version specific. The application can run without a network connection after installation; model acquisition and payload preparation happen before moving the bundle to an offline PC.


## Office file-format milestone
- DOCX: import text with Mammoth and export basic Word documents with headings, paragraphs and bullet lists. Formatting/layout fidelity and full DOCX editing are not supported.
- XLSX: import the first worksheet and export a single worksheet. Cell values and formula expressions are transferred; this app's own formula engine remains the calculation authority.
- PPTX: export the slide outline to editable PowerPoint title/body slides. Existing PPTX import and visual slide editing are not implemented.
- PDF: local preview through the Windows WebView PDF viewer; merge multiple PDFs, extract selected pages, rotate or delete pages, add a simple text stamp and download edited PDF.
- PDF OCR, digital signatures, interactive form fields, freehand/highlight annotation, and full layout editing remain pending.
- All imported office files are processed locally in the WebView. No cloud conversion service is used.
